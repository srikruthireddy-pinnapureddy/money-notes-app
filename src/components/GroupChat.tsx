import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Send, Loader2 } from "lucide-react";
import { format } from "date-fns";

type Message = {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  profiles?: {
    display_name: string;
  };
};

type Member = {
  user_id: string;
  display_name: string;
};

interface GroupChatProps {
  groupId: string;
  currentUserId: string;
  members: Member[];
}

export function GroupChat({ groupId, currentUserId, members }: GroupChatProps) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchMessages();
      subscribeToMessages();
    }
  }, [groupId, isOpen]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("group_messages")
        .select("*, profiles(display_name)")
        .eq("group_id", groupId)
        .order("created_at", { ascending: true })
        .limit(100);

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      console.error("Failed to fetch messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`group-chat-${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "group_messages",
          filter: `group_id=eq.${groupId}`,
        },
        async (payload) => {
          // Get display name from members list
          const member = members.find(m => m.user_id === payload.new.user_id);
          const newMsg = {
            ...payload.new,
            profiles: { display_name: member?.display_name || "Unknown" }
          } as Message;
          setMessages((prev) => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      const { error } = await supabase.from("group_messages").insert({
        group_id: groupId,
        user_id: currentUserId,
        content: newMessage.trim(),
      });

      if (error) throw error;
      setNewMessage("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getMemberName = (userId: string) => {
    const member = members.find(m => m.user_id === userId);
    return member?.display_name || "Unknown";
  };

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        className="w-full"
        onClick={() => setIsOpen(true)}
      >
        <MessageCircle className="mr-2 h-4 w-4" />
        Open Group Chat
      </Button>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Group Chat
        </h2>
        <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
          Close
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <ScrollArea className="h-64 pr-4" ref={scrollRef}>
            {messages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No messages yet. Start the conversation!
              </p>
            ) : (
              <div className="space-y-3">
                {messages.map((message) => {
                  const isOwn = message.user_id === currentUserId;
                  return (
                    <div
                      key={message.id}
                      className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-2 ${
                          isOwn
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        {!isOwn && (
                          <p className="text-xs font-medium mb-1 opacity-70">
                            {message.profiles?.display_name || getMemberName(message.user_id)}
                          </p>
                        )}
                        <p className="text-sm break-words">{message.content}</p>
                      </div>
                      <span className="text-xs text-muted-foreground mt-1">
                        {format(new Date(message.created_at), "HH:mm")}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          <div className="flex gap-2 mt-4">
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={sending}
              className="flex-1"
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={sending || !newMessage.trim()}
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
