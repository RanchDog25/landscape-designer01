import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Upload, Plus, Trash2, ThumbsUp, ThumbsDown, Send } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { uploadFile } from "@/lib/uploadFile";
import { supabase } from "@/lib/supabase";
import { useAuth } from "../auth/AuthProvider";

interface MediaItem {
  id: string;
  url: string;
  title: string;
  description: string;
  is_private?: boolean;
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
  privateMedia?: MediaItem[];
  sharedMedia?: MediaItem[];
  onUpload?: (file: File, isPrivate: boolean) => void;
}

const defaultMedia: MediaItem[] = [];

const IdeaBoards: React.FC<IdeaBoardsProps> = ({
  privateMedia: initialPrivateMedia = defaultMedia,
  sharedMedia: initialSharedMedia = defaultMedia,
  onUpload = () => {},
}) => {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<MediaItem | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  const [isUploading, setIsUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [newNote, setNewNote] = useState("");

  const [privateMedia, setPrivateMedia] =
    useState<MediaItem[]>(initialPrivateMedia);
  const [sharedMedia, setSharedMedia] =
    useState<MediaItem[]>(initialSharedMedia);

  const handleReaction = async (
    mediaId: string,
    reaction: "like" | "dislike",
  ) => {
    if (!user?.id) return;

    try {
      const { data: existingReaction } = await supabase
        .from("image_reactions")
        .select()
        .eq("media_id", mediaId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingReaction) {
        if (existingReaction.reaction === reaction) {
          await supabase
            .from("image_reactions")
            .delete()
            .eq("id", existingReaction.id);
        } else {
          await supabase
            .from("image_reactions")
            .update({ reaction })
            .eq("id", existingReaction.id);
        }
      } else {
        await supabase.from("image_reactions").insert({
          media_id: mediaId,
          user_id: user.id,
          reaction,
        });
      }

      await loadMedia();
    } catch (error) {
      console.error("Error handling reaction:", error);
    }
  };

  const handleAddNote = async (mediaId: string, note: string) => {
    if (!user?.id || !note.trim()) return;

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .single();

      const { error } = await supabase.from("image_notes").insert({
        media_id: mediaId,
        user_id: user.id,
        note: note.trim(),
        user_name: profile?.full_name || user.email?.split("@")[0] || "User",
        user_avatar: profile?.avatar_url,
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

  const loadMedia = async () => {
    try {
      const { data: mediaData, error: mediaError } = await supabase
        .from("media")
        .select()
        .order("created_at", { ascending: false });

      if (mediaError) throw mediaError;

      const mediaItems = await Promise.all(
        (mediaData || []).map(async (item) => {
          const [{ data: reactions }, { data: notes }] = await Promise.all([
            supabase.from("image_reactions").select().eq("media_id", item.id),
            supabase
              .from("image_notes")
              .select()
              .eq("media_id", item.id)
              .order("created_at", { ascending: true }),
          ]);

          return {
            id: item.id,
            url: item.file_url,
            title: item.title || "",
            description: item.description || "",
            is_private: item.is_private,
            userReaction: reactions?.find((r) => r.user_id === user?.id)
              ?.reaction,
            notes: notes || [],
          };
        }),
      );

      setPrivateMedia(mediaItems.filter((item) => item.is_private));
      setSharedMedia(mediaItems.filter((item) => !item.is_private));

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

    setIsUploading(true);
    try {
      const file = files[0];

      if (!file.type.startsWith("image/")) {
        throw new Error("Please upload an image file");
      }

      const result = await uploadFile(file, "media", undefined, {
        title,
        description,
        isPrivate,
      });

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setTitle("");
      setDescription("");
      setIsPrivate(false);
      setIsUploadDialogOpen(false);

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

  const MediaGrid: React.FC<{ items: MediaItem[] }> = ({ items }) => (
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
            <div className="flex gap-2 mt-2">
              <Button
                variant={item.userReaction === "like" ? "default" : "outline"}
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleReaction(item.id, "like");
                }}
              >
                <ThumbsUp className="h-4 w-4" />
              </Button>
              <Button
                variant={
                  item.userReaction === "dislike" ? "default" : "outline"
                }
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleReaction(item.id, "dislike");
                }}
              >
                <ThumbsDown className="h-4 w-4" />
              </Button>
              <Button
                variant="destructive"
                size="icon"
                className="ml-auto"
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
      <Tabs defaultValue="private" className="w-full">
        <div className="flex items-center justify-between border-b px-4">
          <TabsList>
            <TabsTrigger value="private">Private Board</TabsTrigger>
            <TabsTrigger value="shared">Shared Board</TabsTrigger>
          </TabsList>
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
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload New Media</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
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
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="Enter media title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
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
                <div className="flex items-center space-x-2">
                  <Label htmlFor="private">Private</Label>
                  <Input
                    id="private"
                    type="checkbox"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                  />
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <ScrollArea className="h-[calc(100vh-12rem)]">
          <TabsContent value="private">
            <MediaGrid items={privateMedia} />
          </TabsContent>
          <TabsContent value="shared">
            <MediaGrid items={sharedMedia} />
          </TabsContent>
        </ScrollArea>
      </Tabs>

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
                        <div
                          key={note.id}
                          className={`flex ${note.user_id === user?.id ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`flex ${note.user_id === user?.id ? "flex-row-reverse" : "flex-row"} items-start gap-2 max-w-[80%]`}
                          >
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
                            <div
                              className={`p-3 rounded-lg ${note.user_id === user?.id ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                            >
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">
                                  {note.user_name || "User"}
                                </span>
                                <p className="text-sm whitespace-pre-wrap">
                                  {note.note}
                                </p>
                                <span className="text-xs opacity-70 mt-1">
                                  {new Date(note.created_at).toLocaleTimeString(
                                    [],
                                    { hour: "2-digit", minute: "2-digit" },
                                  )}
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
                      if (e.key === "Enter" && !e.shiftKey && newNote.trim()) {
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
  );
};

export default IdeaBoards;
