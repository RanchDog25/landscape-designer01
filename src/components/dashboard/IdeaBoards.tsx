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
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { uploadFile } from "@/lib/uploadFile";
import { supabase } from "@/lib/supabase";

interface MediaItem {
  id: string;
  url: string;
  title: string;
  description: string;
  created_at?: string;
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
}

const IdeaBoards: React.FC<IdeaBoardsProps> = ({ projectId }) => {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<MediaItem | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [newNote, setNewNote] = useState("");
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const loadMedia = async () => {
    try {
      const { data: mediaData, error: mediaError } = await supabase
        .from("media")
        .select()
        .order("created_at", { ascending: false });

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
            notes: notes || [],
          };
        }),
      );

      setMedia(mediaItems);

      // Update selected image if it exists
      if (selectedImage) {
        const updatedImage = mediaItems.find(
          (item) => item.id === selectedImage.id,
        );
        if (updatedImage) {
          setSelectedImage(updatedImage);
        }
      }
    } catch (error) {
      console.error("Error loading media:", error);
    }
  };

  useEffect(() => {
    loadMedia();
  }, []);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (!title.trim()) {
      alert("Please enter a title for the image");
      return;
    }

    setIsUploading(true);
    try {
      const file = files[0];

      if (!file.type.startsWith("image/")) {
        throw new Error("Please upload an image file");
      }

      const result = await uploadFile(file, "media", undefined, {
        title,
        description,
      });

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setTitle("");
      setDescription("");
      setIsUploadDialogOpen(false);
      setEditingItemId(null);

      await loadMedia();
    } catch (error) {
      console.error("Error uploading file:", error);
      alert(error instanceof Error ? error.message : "Error uploading file");
    } finally {
      setIsUploading(false);
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
            <img
              src={item.url}
              alt={item.title}
              className="object-cover w-full h-full"
              onError={(e) => {
                console.error("Image failed to load:", item.url);
                e.currentTarget.src = `https://picsum.photos/seed/${item.id}/800/600`;
              }}
              loading="lazy"
            />
          </div>
          <div className="p-4">
            <h3 className="font-semibold">{item.title}</h3>
            <p className="text-sm text-gray-500">{item.description}</p>
            {item.created_at && (
              <p className="text-xs text-gray-400 mt-1">
                {new Date(item.created_at).toLocaleDateString()}
              </p>
            )}
            <div className="flex gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                className="ml-auto"
                onClick={(e) => {
                  e.stopPropagation();
                  setTitle(item.title);
                  setDescription(item.description || "");
                  setIsUploadDialogOpen(true);
                  // Store the current item ID for editing
                  setEditingItemId(item.id);
                }}
              >
                Edit
              </Button>
              <Button
                variant="destructive"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(item.id, item.url);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

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
                      accept="image/*"
                    />
                    <div
                      className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Plus className="w-12 h-12 mx-auto text-gray-400" />
                      <p className="mt-2 text-sm text-gray-500">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Supported formats: PNG, JPG, GIF
                      </p>
                    </div>
                  </>
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
                    <img
                      src={selectedImage.url}
                      alt={selectedImage.title}
                      className="object-cover w-full h-full rounded-lg"
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
