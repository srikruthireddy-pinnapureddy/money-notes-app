import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Send, Loader2, Paperclip, Image, FileText, X } from "lucide-react";
import { format } from "date-fns";

type Message = {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  file_url?: string | null;
  file_type?: string | null;
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchMessages();
      const cleanup = subscribeToMessages();
      return cleanup;
    }
  }, [groupId, isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (selectedFile && selectedFile.type.startsWith("image/")) {
      const url = URL.createObjectURL(selectedFile);
      setFilePreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setFilePreview(null);
    }
  }, [selectedFile]);

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

  const uploadFile = async (file: File): Promise<{ url: string; type: string } | null> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${currentUserId}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from("chat-attachments")
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from("chat-attachments")
      .getPublicUrl(fileName);

    return {
      url: publicUrl,
      type: file.type.startsWith("image/") ? "image" : "file"
    };
  };

  const handleSend = async () => {
    if (!newMessage.trim() && !selectedFile) return;

    setSending(true);
    setUploading(!!selectedFile);

    try {
      let fileData: { url: string; type: string } | null = null;

      if (selectedFile) {
        fileData = await uploadFile(selectedFile);
      }

      const { error } = await supabase.from("group_messages").insert({
        group_id: groupId,
        user_id: currentUserId,
        content: newMessage.trim() || (selectedFile ? selectedFile.name : ""),
        file_url: fileData?.url || null,
        file_type: fileData?.type || null,
      });

      if (error) throw error;
      
      setNewMessage("");
      setSelectedFile(null);
      setFilePreview(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Maximum file size is 10MB",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getMemberName = (userId: string) => {
    const member = members.find(m => m.user_id === userId);
    return member?.display_name || "Unknown";
  };

  const renderAttachment = (message: Message) => {
    if (!message.file_url) return null;

    if (message.file_type === "image") {
      return (
        <a href={message.file_url} target="_blank" rel="noopener noreferrer">
          <img
            src={message.file_url}
            alt="Shared image"
            className="max-w-full max-h-48 rounded-md mt-2 cursor-pointer hover:opacity-90 transition-opacity"
          />
        </a>
      );
    }

    return (
      <a
        href={message.file_url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 mt-2 p-2 bg-background/50 rounded-md hover:bg-background/80 transition-colors"
      >
        <FileText className="h-4 w-4" />
        <span className="text-xs underline truncate max-w-[150px]">
          {message.content || "Download file"}
        </span>
      </a>
    );
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
                        {message.content && !message.file_url && (
                          <p className="text-sm break-words">{message.content}</p>
                        )}
                        {message.file_url && message.file_type !== "image" && (
                          <p className="text-sm break-words">{message.content}</p>
                        )}
                        {renderAttachment(message)}
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

          {/* File Preview */}
          {selectedFile && (
            <div className="mt-4 p-2 bg-muted rounded-lg flex items-center gap-2">
              {filePreview ? (
                <img src={filePreview} alt="Preview" className="h-12 w-12 object-cover rounded" />
              ) : (
                <div className="h-12 w-12 bg-background rounded flex items-center justify-center">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={removeSelectedFile}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.doc,.docx,.txt"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
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
              disabled={sending || (!newMessage.trim() && !selectedFile)}
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          {uploading && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Uploading file...
            </p>
          )}
        </>
      )}
    </Card>
  );
}