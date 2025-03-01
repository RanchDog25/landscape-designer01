import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Send, MessageCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface ChatMessage {
  id: string;
  content: string;
  created_at: string;
  user_name: string;
  user_avatar: string;
}

interface ChatButtonProps {
  projectId?: string;
}

const ChatButton: React.FC<ChatButtonProps> = ({ projectId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!projectId || !isOpen) return;

    loadMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`chat-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage]);
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, isOpen]);

  const loadMessages = async () => {
    if (!projectId) return;

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });

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

  const handleSendMessage = async () => {
    const content = newMessage.trim();
    if (!content || !projectId) return;

    try {
      const { error } = await supabase.from("messages").insert({
        project_id: projectId,
        content,
        user_name: "Anonymous",
        user_avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}`,
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

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon">
          <MessageCircle className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[400px] sm:w-[540px] p-0">
        <div className="flex flex-col h-full">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>Project Chat</SheetTitle>
          </SheetHeader>

          <ScrollArea className="flex-1" ref={scrollAreaRef}>
            <div className="p-4 space-y-4">
              {messages.map((message) => (
                <div key={message.id} className="flex justify-start">
                  <div className="flex flex-row items-start gap-2 max-w-[80%]">
                    <Avatar className="w-8 h-8">
                      <AvatarImage
                        src={message.user_avatar}
                        alt={message.user_name}
                      />
                      <AvatarFallback>
                        {(message.user_name || "U")[0]}
                      </AvatarFallback>
                    </Avatar>
                    <Card className="p-3 bg-muted">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {message.user_name}
                        </span>
                        <p className="text-sm whitespace-pre-wrap">
                          {message.content}
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

          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyPress}
              />
              <Button onClick={handleSendMessage}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ChatButton;
