import React, { useState, useEffect, useRef } from "react";
import { getCurrentUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, Paperclip } from "lucide-react";
import { uploadFile } from "@/lib/uploadFile";

interface Message {
  id: string;
  content: string;
  created_at: string;
  user_name: string;
  user_avatar?: string;
  project_id: string;
}

interface ChatInterfaceProps {
  projectId?: string;
  isAllProjects?: boolean;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  projectId,
  isAllProjects = false,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const user = getCurrentUser();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([]);
    loadMessages();

    // Subscribe to new messages
    let channel;

    if (isAllProjects) {
      // Subscribe to all messages
      channel = supabase
        .channel(`messages-all`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
          },
          (payload) => {
            setMessages((prev) => [payload.new as Message, ...prev]);
            // Scroll to bottom on new message
            setTimeout(() => {
              scrollAreaRef.current?.scrollTo({
                top: scrollAreaRef.current.scrollHeight,
                behavior: "smooth",
              });
            }, 100);
          },
        )
        .subscribe();
    } else if (projectId) {
      // Subscribe to project-specific messages
      channel = supabase
        .channel(`messages-${projectId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `project_id=eq.${projectId}`,
          },
          (payload) => {
            setMessages((prev) => [payload.new as Message, ...prev]);
            // Scroll to bottom on new message
            setTimeout(() => {
              scrollAreaRef.current?.scrollTo({
                top: scrollAreaRef.current.scrollHeight,
                behavior: "smooth",
              });
            }, 100);
          },
        )
        .subscribe();
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [projectId, isAllProjects]);

  const loadMessages = async () => {
    let query = supabase
      .from("messages")
      .select("*, projects(name)")
      .order("created_at", { ascending: false });

    // Only filter by project if not in "All Projects" view
    if (!isAllProjects && projectId) {
      query = query.eq("project_id", projectId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error loading messages:", error);
      return;
    }

    setMessages(data || []);
    // Scroll to bottom after loading messages
    setTimeout(() => {
      scrollAreaRef.current?.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: "auto",
      });
    }, 100);
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !user?.id || !projectId) return;

    try {
      const file = files[0];
      if (!file.type.startsWith("image/")) {
        alert("Please upload an image file");
        return;
      }

      const result = await uploadFile(file, "media");
      if (result?.url) {
        const message = `![${file.name}](${result.url})`;
        await handleSendMessage(message);
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Error uploading image");
    }
  };

  const handleSendMessage = async (messageContent?: string) => {
    const content = messageContent || newMessage.trim();
    if (!user?.id || !content) return;

    // Determine which project ID to use
    const targetProjectId = isAllProjects
      ? selectedProjectForMessage
      : projectId;
    if (!targetProjectId) return;

    try {
      const { error } = await supabase.from("messages").insert({
        project_id: targetProjectId,
        content: content,
        user_name: user.username,
        user_avatar:
          user.avatar_url ||
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
      });

      if (error) {
        console.error("Error sending message:", error);
        return;
      }

      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // State for project selection when in All Projects view
  const [selectedProjectForMessage, setSelectedProjectForMessage] =
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
          setSelectedProjectForMessage(data[0].id);
        }
      };

      loadProjects();
    }
  }, [isAllProjects]);

  return (
    <div className="flex flex-col h-full bg-background border rounded-lg">
      {/* Chat Header */}
      <div className="p-4 border-b bg-card flex-none">
        <h2 className="text-xl font-semibold">Project Chat</h2>
      </div>

      {/* Message Input Area */}
      <div className="p-4 border-b bg-card flex-none">
        {isAllProjects && (
          <div className="mb-2">
            <select
              className="w-full p-2 border rounded mb-2"
              value={selectedProjectForMessage}
              onChange={(e) => setSelectedProjectForMessage(e.target.value)}
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex gap-2 max-w-full">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept="image/*"
          />
          <Button
            variant="outline"
            size="icon"
            className="shrink-0"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          <Input
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            className="flex-1"
          />
          <Button onClick={() => handleSendMessage()} className="shrink-0">
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden min-h-0">
        <ScrollArea className="h-full" ref={scrollAreaRef}>
          <div className="p-4 flex flex-col-reverse gap-4">
            {[...messages].map((message) => (
              <div
                key={message.id}
                className={`flex ${message.user_name === user?.username ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`flex ${message.user_name === user?.username ? "flex-row-reverse" : "flex-row"} items-start gap-2 max-w-[80%]`}
                >
                  <Avatar className="w-8 h-8">
                    <AvatarImage
                      src={
                        message.user_avatar ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${message.user_name}`
                      }
                      alt={message.user_name || "User"}
                    />
                    <AvatarFallback>
                      {(message.user_name || "U")[0]}
                    </AvatarFallback>
                  </Avatar>
                  <Card
                    className={`p-3 ${message.user_name === user?.username ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                  >
                    {isAllProjects && message.projects?.name && (
                      <div className="mb-1">
                        <Badge variant="outline" className="text-xs">
                          {message.projects.name}
                        </Badge>
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {message.user_name || "User"}
                      </span>
                      <p className="text-sm whitespace-pre-wrap">
                        {message.content.startsWith("![") ? (
                          <img
                            src={message.content.match(/\((.+)\)/)?.[1]}
                            alt={message.content.match(/\[(.+)\]/)?.[1]}
                            className="max-w-xs rounded-lg"
                          />
                        ) : (
                          message.content
                        )}
                      </p>
                      <span className="text-xs opacity-70 mt-1">
                        {new Date(message.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </Card>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default ChatInterface;
