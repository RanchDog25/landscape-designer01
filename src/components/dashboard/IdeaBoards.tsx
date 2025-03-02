import React, { useState, useEffect } from "react";
import { getCurrentUser } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Upload,
  Plus,
  Trash2,
  ThumbsUp,
  ThumbsDown,
  Send,
  Edit,
  FileText,
  FileVideo,
  File,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { uploadFile } from "@/lib/uploadFile";
import { supabase } from "@/lib/supabase";
import MediaRenderer from "./MediaRenderer";

interface MediaItem {
  id: string;
  url: string;
  title: string;
  description: string;
  created_at?: string;
  file_type?: string;
  file_size?: number;
  project_name?: string;
  userReaction?: "like" | "dislike";
  notes?: {
    id: string;
    note: string;
    user_id: string;
    user_name?: string;
    user_avatar?: string;
    created_at: string;
  }[];
}

interface IdeaBoardsProps {
  projectId?: string;
  isAllProjects?: boolean;
}

// Maximum file size in bytes (500MB for chunked uploads)
const MAX_FILE_SIZE = 500 * 1024 * 1024;
// Size threshold for using chunked uploads (files larger than 10MB)
const CHUNKED_UPLOAD_THRESHOLD = 10 * 1024 * 1024;

// Format file size to human-readable format
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const IdeaBoards: React.FC<IdeaBoardsProps> = ({
  projectId,
  isAllProjects = false,
}) => {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<MediaItem | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [newNote, setNewNote] = useState("");
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Load media when component mounts or when project changes
  useEffect(() => {
    loadMedia();
  }, [projectId, isAllProjects]);

  // Set up real-time subscription for media changes
  useEffect(() => {
    // Subscribe to media changes
    const channel = supabase
      .channel("media-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "media",
        },
        () => {
          loadMedia();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadMedia = async () => {
    try {
      console.log(
        "Loading media for",
        isAllProjects ? "all projects" : projectId,
      );
      // Load media for the current project or all projects
      let query = supabase
        .from("media")
        .select("*, projects(name)")
        .order("created_at", { ascending: false });

      // Only filter by project if not in "All Projects" view
      if (!isAllProjects && projectId) {
        query = query.eq("project_id", projectId);
      }

      const { data: mediaData, error: mediaError } = await query;

      if (mediaError) throw mediaError;

      const mediaItems = await Promise.all(
        (mediaData || []).map(async (item) => {
          const { data: notes } = await supabase
            .from("image_notes")
            .select()
            .eq("media_id", item.id)
            .order("created_at", { ascending: true });

          return {
            id: item.id,
            url: item.file_url,
            title: item.title || "",
            description: item.description || "",
            created_at: item.created_at,
            file_type: item.file_type,
            file_size: item.file_size,
            project_name: item.projects?.name,
            notes: notes || [],
          };
        }),
      );

      console.log("Loaded media items:", mediaItems.length);
      setMedia(mediaItems);

      // Update selected image if it exists
      if (selectedImage) {
        const updatedImage = mediaItems.find(
          (item) => item.id === selectedImage.id,
        );
        if (updatedImage) {
          setSelectedImage(updatedImage);
        } else {
          // If the selected image is no longer in the current project, deselect it
          setSelectedImage(null);
        }
      }
    } catch (error) {
      console.error("Error loading media:", error);
    }
  };

  // Generate a title from filename or timestamp if none provided
  const generateTitle = (file: File): string => {
    if (title.trim()) return title;

    // Try to use the original filename without extension
    const fileName = file.name.split(".")[0];
    if (fileName) return fileName;

    // Fallback to timestamp-based name
    return `File ${new Date().toLocaleString()}`;
  };

  // Process a single file upload
  const processFile = async (
    file: File,
    index: number,
    totalFiles: number,
    selectedProjectForUpload?: string,
  ) => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      console.error(
        `File ${file.name} is too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}. File size is ${formatFileSize(file.size)}.`,
      );
      return { success: false, error: "File too large", fileName: file.name };
    }

    try {
      // Determine file type
      let fileType = "unknown";
      if (file.type.startsWith("image/")) {
        fileType = "image";
      } else if (file.type.startsWith("video/")) {
        fileType = "video";
      } else if (file.type === "application/pdf") {
        fileType = "pdf";
      } else if (
        file.type.includes("document") ||
        file.type.includes("msword") ||
        file.type.includes("officedocument")
      ) {
        fileType = "document";
      }

      // Generate title for this file
      const fileTitle = generateTitle(file);
      const fileDescription = description;

      let result;

      // Use chunked upload for large files
      if (file.size > CHUNKED_UPLOAD_THRESHOLD) {
        // Import chunkedUpload dynamically to avoid loading it unnecessarily
        const { chunkedUpload } = await import("@/lib/chunkedUpload");
        result = await chunkedUpload(file, "media", {
          onProgress: (progress) => {
            // Calculate overall progress if multiple files
            if (totalFiles > 1) {
              const fileProgress = progress / totalFiles;
              const baseProgress = (index / totalFiles) * 100;
              setUploadProgress(Math.round(baseProgress + fileProgress));
            } else {
              setUploadProgress(progress);
            }
          },
          metadata: {
            title: fileTitle,
            description: fileDescription,
            file_type: fileType,
            project_id: selectedProjectForUpload || projectId,
          },
        });
      } else {
        // Use regular upload for smaller files
        result = await uploadFile(
          file,
          "media",
          selectedProjectForUpload || projectId,
          {
            title: fileTitle,
            description: fileDescription,
            file_type: fileType,
            file_size: file.size,
          },
        );

        // Update progress for multiple files
        if (totalFiles > 1) {
          setUploadProgress(Math.round(((index + 1) / totalFiles) * 100));
        }
      }

      return { success: true, result, fileName: file.name };
    } catch (error) {
      console.error(`Error uploading file ${file.name}:`, error);
      return { success: false, error, fileName: file.name };
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const fileArray = Array.from(files);
      const totalFiles = fileArray.length;

      // Process files sequentially to avoid overwhelming the server
      const results = [];
      for (let i = 0; i < fileArray.length; i++) {
        const result = await processFile(fileArray[i], i, totalFiles);
        results.push(result);
      }

      // Check if any files failed
      const failedFiles = results.filter((r) => !r.success);
      if (failedFiles.length > 0) {
        console.warn(
          `${failedFiles.length} of ${totalFiles} files failed to upload`,
        );
        if (failedFiles.length < totalFiles) {
          // Some files succeeded, so we'll continue but warn the user
          alert(
            `${failedFiles.length} of ${totalFiles} files failed to upload. Check console for details.`,
          );
        }
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setTitle("");
      setDescription("");
      setIsUploadDialogOpen(false);
      setEditingItemId(null);

      await loadMedia();
    } catch (error) {
      console.error("Error uploading files:", error);
      // Check for 413 Payload Too Large error
      if (
        error.statusCode === 413 ||
        (error.message && error.message.includes("too large"))
      ) {
        alert(
          `File is too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}.`,
        );
      } else {
        alert(error instanceof Error ? error.message : "Error uploading files");
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (id: string, url: string) => {
    try {
      const fileName = url.split("/").pop();
      if (fileName) {
        await supabase.storage.from("media").remove([fileName]);
      }

      await supabase.from("media").delete().eq("id", id);

      await loadMedia();
    } catch (error) {
      console.error("Error deleting media:", error);
      alert("Error deleting media");
    }
  };

  const handleAddNote = async (mediaId: string, note: string) => {
    if (!note.trim()) return;

    try {
      const user = getCurrentUser();
      const { error } = await supabase.from("image_notes").insert({
        media_id: mediaId,
        note: note.trim(),
        user_name: user?.username || "Anonymous",
        user_avatar:
          user?.avatar_url ||
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id || Math.random()}`,
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error("Error inserting note:", error);
        return;
      }

      // Refresh the selected image data
      if (selectedImage) {
        const { data: notes } = await supabase
          .from("image_notes")
          .select("*")
          .eq("media_id", selectedImage.id)
          .order("created_at", { ascending: true });

        setSelectedImage({
          ...selectedImage,
          notes: notes || [],
        });
      }

      setNewNote("");
      await loadMedia();
    } catch (error) {
      console.error("Error adding note:", error);
    }
  };

  const MediaGrid = ({ items }: { items: MediaItem[] }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {items.map((item) => (
        <Card
          key={item.id}
          className="overflow-hidden hover:shadow-lg transition-shadow group relative bg-white"
        >
          <div
            className="aspect-video relative cursor-pointer"
            onClick={() => setSelectedImage(item)}
          >
            <MediaRenderer
              url={item.url}
              title={item.title}
              fileType={item.file_type}
              className="rounded-t-lg"
            />
          </div>
          <div className="p-4">
            <h3 className="font-semibold">{item.title}</h3>
            <p className="text-sm text-gray-500">{item.description}</p>
            <div className="flex justify-between items-center mt-1">
              {item.created_at && (
                <p className="text-xs text-gray-400">
                  {new Date(item.created_at).toLocaleDateString()}
                </p>
              )}
              {item.file_size && (
                <p className="text-xs text-gray-400">
                  {formatFileSize(item.file_size)}
                </p>
              )}
            </div>
            {isAllProjects && item.project_name && (
              <Badge variant="outline" className="mt-1">
                {item.project_name}
              </Badge>
            )}
            <div className="flex gap-2 mt-2">
              <Button
                variant="secondary"
                size="sm"
                className="ml-auto flex items-center gap-1"
                onClick={(e) => {
                  e.stopPropagation();
                  setTitle(item.title);
                  setDescription(item.description || "");
                  setIsUploadDialogOpen(true);
                  // Store the current item ID for editing
                  setEditingItemId(item.id);
                }}
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="flex items-center gap-1"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(item.id, item.url);
                }}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  // State for project selection when in All Projects view
  const [selectedProjectForUpload, setSelectedProjectForUpload] =
    useState<string>("");
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);

  // Load projects for the dropdown
  useEffect(() => {
    if (isAllProjects) {
      const loadProjects = async () => {
        const { data } = await supabase
          .from("projects")
          .select("id, name")
          .is("deleted_at", null)
          .order("name");

        setProjects(data || []);
        if (data && data.length > 0) {
          setSelectedProjectForUpload(data[0].id);
        }
      };

      loadProjects();
    }
  }, [isAllProjects]);

  return (
    <div className="bg-white h-full">
      <div className="w-full">
        <div className="flex items-center justify-between border-b px-4 py-2">
          <h2 className="text-xl font-semibold">Idea Gallery</h2>
          <Dialog
            open={isUploadDialogOpen}
            onOpenChange={setIsUploadDialogOpen}
          >
            <DialogTrigger asChild>
              <Button>
                <Upload className="w-4 h-4 mr-2" />
                Upload Media
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingItemId ? "Edit Media" : "Upload New Media"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {!editingItemId && (
                  <>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden"
                      multiple
                      accept="image/*,video/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    />
                    <div
                      className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        e.currentTarget.classList.add("border-primary");
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        e.currentTarget.classList.remove("border-primary");
                      }}
                      onDrop={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        e.currentTarget.classList.remove("border-primary");

                        if (
                          e.dataTransfer.files &&
                          e.dataTransfer.files.length > 0
                        ) {
                          const droppedFiles = Array.from(e.dataTransfer.files);
                          const totalFiles = droppedFiles.length;

                          setIsUploading(true);
                          setUploadProgress(0);

                          try {
                            // Process files sequentially
                            const results = [];
                            for (let i = 0; i < droppedFiles.length; i++) {
                              const result = await processFile(
                                droppedFiles[i],
                                i,
                                totalFiles,
                                isAllProjects
                                  ? selectedProjectForUpload
                                  : undefined,
                              );
                              results.push(result);
                            }

                            // Check if any files failed
                            const failedFiles = results.filter(
                              (r) => !r.success,
                            );
                            if (failedFiles.length > 0) {
                              console.warn(
                                `${failedFiles.length} of ${totalFiles} files failed to upload`,
                              );
                              if (failedFiles.length < totalFiles) {
                                // Some files succeeded, so we'll continue but warn the user
                                alert(
                                  `${failedFiles.length} of ${totalFiles} files failed to upload. Check console for details.`,
                                );
                              }
                            }

                            setTitle("");
                            setDescription("");
                            setIsUploadDialogOpen(false);
                            setEditingItemId(null);
                            await loadMedia();
                          } catch (error) {
                            console.error("Error uploading files:", error);
                            // Check for 413 Payload Too Large error
                            if (
                              error.statusCode === 413 ||
                              (error.message &&
                                error.message.includes("too large"))
                            ) {
                              alert(
                                `File is too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}.`,
                              );
                            } else {
                              alert(
                                error instanceof Error
                                  ? error.message
                                  : "Error uploading files",
                              );
                            }
                          } finally {
                            setIsUploading(false);
                            setUploadProgress(0);
                          }
                        }
                      }}
                    >
                      <Plus className="w-12 h-12 mx-auto text-gray-400" />
                      <p className="mt-2 text-sm text-gray-500">
                        {isUploading
                          ? uploadProgress > 0
                            ? `Uploading... ${uploadProgress}%`
                            : "Preparing upload..."
                          : "Click to upload or drag and drop multiple files"}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Supported formats: Images, Videos, PDF, DOC, DOCX
                      </p>
                      <p className="text-xs text-gray-400">
                        Maximum file size: {formatFileSize(MAX_FILE_SIZE)}
                      </p>
                    </div>
                  </>
                )}
                {isAllProjects && (
                  <div className="space-y-2">
                    <Label htmlFor="project">Project</Label>
                    <select
                      id="project"
                      className="w-full p-2 border rounded"
                      value={selectedProjectForUpload}
                      onChange={(e) =>
                        setSelectedProjectForUpload(e.target.value)
                      }
                      required
                    >
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="title">
                    Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    placeholder="Enter media title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="Enter media description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                {editingItemId && (
                  <Button
                    variant="outline"
                    onClick={async () => {
                      if (!title.trim()) {
                        alert("Please enter a title");
                        return;
                      }

                      try {
                        const { error } = await supabase
                          .from("media")
                          .update({
                            title,
                            description,
                          })
                          .eq("id", editingItemId);

                        if (error) throw error;

                        setIsUploadDialogOpen(false);
                        setEditingItemId(null);
                        setTitle("");
                        setDescription("");
                        await loadMedia();
                      } catch (error) {
                        console.error("Error updating media:", error);
                        alert("Error updating media");
                      }
                    }}
                  >
                    Save Changes
                  </Button>
                )}
                <Button
                  variant="ghost"
                  onClick={() => {
                    setIsUploadDialogOpen(false);
                    setEditingItemId(null);
                    setTitle("");
                    setDescription("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <ScrollArea className="h-[calc(100vh-12rem)]">
          <MediaGrid items={media} />
        </ScrollArea>

        {selectedImage && (
          <Dialog
            open={!!selectedImage}
            onOpenChange={() => setSelectedImage(null)}
          >
            <DialogContent className="max-h-[90vh] h-[90vh] w-[90vw] max-w-[1200px] flex flex-col overflow-hidden">
              <DialogHeader>
                <DialogTitle>{selectedImage.title}</DialogTitle>
              </DialogHeader>
              <div className="flex gap-6 flex-1 min-h-0">
                <div className="w-1/2 flex-shrink-0">
                  <div className="aspect-video relative">
                    <MediaRenderer
                      url={selectedImage.url}
                      title={selectedImage.title}
                      fileType={selectedImage.file_type}
                      className="rounded-lg"
                      controls={true}
                      autoPlay={selectedImage.file_type === "video"}
                      fullView={true}
                    />
                  </div>
                  <p className="text-gray-500 mt-2">
                    {selectedImage.description}
                  </p>
                </div>

                <div className="w-1/2 flex flex-col">
                  <h3 className="font-semibold mb-2">Discussion</h3>
                  <ScrollArea className="flex-1 h-full">
                    <div className="pr-4 space-y-4">
                      <div>
                        {selectedImage.notes?.map((note) => (
                          <div key={note.id} className="flex justify-start">
                            <div className="flex flex-row items-start gap-2 max-w-[80%]">
                              <Avatar className="w-8 h-8">
                                <AvatarImage
                                  src={
                                    note.user_avatar ||
                                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${note.user_id}`
                                  }
                                  alt={note.user_name || "User"}
                                />
                                <AvatarFallback>
                                  {(note.user_name || "U")[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div className="p-3 rounded-lg bg-muted">
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium">
                                    {note.user_name || "User"}
                                  </span>
                                  <p className="text-sm whitespace-pre-wrap">
                                    {note.note}
                                  </p>
                                  <span className="text-xs opacity-70 mt-1">
                                    {new Date(
                                      note.created_at,
                                    ).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </ScrollArea>
                  <div className="flex gap-2 pt-4 mt-2 border-t">
                    <Input
                      placeholder="Type your message..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      onKeyDown={(e) => {
                        if (
                          e.key === "Enter" &&
                          !e.shiftKey &&
                          newNote.trim()
                        ) {
                          e.preventDefault();
                          handleAddNote(selectedImage.id, newNote);
                        }
                      }}
                    />
                    <Button
                      onClick={() => {
                        if (newNote.trim()) {
                          handleAddNote(selectedImage.id, newNote);
                        }
                      }}
                    >
                      <Send className="h-4 w-4" />
                    </Button>

                    {selectedImage && selectedImage.project_name && (
                      <div className="absolute bottom-4 right-4">
                        <Badge variant="outline">
                          {selectedImage.project_name}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
};

export default IdeaBoards;
