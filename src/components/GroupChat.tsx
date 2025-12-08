import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Send, Loader2, Paperclip, FileText, X, Reply, CornerDownRight, Check, CheckCheck } from "lucide-react";
import { format } from "date-fns";
import type { RealtimeChannel } from "@supabase/supabase-js";

type TypingUser = {
  user_id: string;
  display_name: string;
};

type ReadReceipt = {
  message_id: string;
  user_id: string;
  read_at: string;
};

type Message = {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  file_url?: string | null;
  file_type?: string | null;
  reply_to_id?: string | null;
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
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [readReceipts, setReadReceipts] = useState<Record<string, ReadReceipt[]>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasMarkedReadRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      fetchMessages();
      const cleanupMessages = subscribeToMessages();
      const cleanupPresence = subscribeToPresence();
      const cleanupReadReceipts = subscribeToReadReceipts();
      return () => {
        cleanupMessages();
        cleanupPresence();
        cleanupReadReceipts();
      };
    }
  }, [groupId, isOpen]);

  const subscribeToPresence = () => {
    const currentMember = members.find(m => m.user_id === currentUserId);
    const channel = supabase.channel(`typing-${groupId}`);
    
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const typing: TypingUser[] = [];
        
        Object.values(state).forEach((presences: any[]) => {
          presences.forEach((presence) => {
            if (presence.user_id !== currentUserId && presence.is_typing) {
              typing.push({
                user_id: presence.user_id,
                display_name: presence.display_name,
              });
            }
          });
        });
        
        setTypingUsers(typing);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: currentUserId,
            display_name: currentMember?.display_name || 'Unknown',
            is_typing: false,
          });
        }
      });

    presenceChannelRef.current = channel;

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      supabase.removeChannel(channel);
      presenceChannelRef.current = null;
    };
  };

  const updateTypingStatus = useCallback((isTyping: boolean) => {
    const currentMember = members.find(m => m.user_id === currentUserId);
    if (presenceChannelRef.current) {
      presenceChannelRef.current.track({
        user_id: currentUserId,
        display_name: currentMember?.display_name || 'Unknown',
        is_typing: isTyping,
      });
    }
  }, [currentUserId, members]);

  const handleTyping = useCallback(() => {
    updateTypingStatus(true);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      updateTypingStatus(false);
    }, 2000);
  }, [updateTypingStatus]);

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

  useEffect(() => {
    if (replyingTo && inputRef.current) {
      inputRef.current.focus();
    }
  }, [replyingTo]);

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
      
      // Fetch read receipts and mark messages as read
      const messageIds = (data || []).map((m: Message) => m.id);
      if (messageIds.length > 0) {
        fetchReadReceipts(messageIds);
        // Mark other users' messages as read
        const otherUserMessages = (data || [])
          .filter((m: Message) => m.user_id !== currentUserId)
          .map((m: Message) => m.id);
        markMessagesAsRead(otherUserMessages);
      }
    } catch (error: any) {
      console.error("Failed to fetch messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReadReceipts = async (messageIds: string[]) => {
    if (messageIds.length === 0) return;
    
    try {
      const { data, error } = await supabase
        .from("message_reads")
        .select("*")
        .in("message_id", messageIds);

      if (error) throw error;

      const receiptsByMessage: Record<string, ReadReceipt[]> = {};
      (data || []).forEach((receipt: ReadReceipt) => {
        if (!receiptsByMessage[receipt.message_id]) {
          receiptsByMessage[receipt.message_id] = [];
        }
        receiptsByMessage[receipt.message_id].push(receipt);
      });
      
      setReadReceipts(prev => ({ ...prev, ...receiptsByMessage }));
    } catch (error) {
      console.error("Failed to fetch read receipts:", error);
    }
  };

  const markMessagesAsRead = useCallback(async (messageIds: string[]) => {
    const unreadIds = messageIds.filter(id => !hasMarkedReadRef.current.has(id));
    if (unreadIds.length === 0) return;

    unreadIds.forEach(id => hasMarkedReadRef.current.add(id));

    try {
      const inserts = unreadIds.map(messageId => ({
        message_id: messageId,
        user_id: currentUserId,
      }));

      await supabase
        .from("message_reads")
        .upsert(inserts, { onConflict: 'message_id,user_id', ignoreDuplicates: true });
    } catch (error) {
      console.error("Failed to mark messages as read:", error);
    }
  }, [currentUserId]);

  const subscribeToReadReceipts = () => {
    const channel = supabase
      .channel(`read-receipts-${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "message_reads",
        },
        (payload) => {
          const receipt = payload.new as ReadReceipt;
          setReadReceipts(prev => ({
            ...prev,
            [receipt.message_id]: [...(prev[receipt.message_id] || []), receipt],
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
          
          // Mark new messages from others as read
          if (payload.new.user_id !== currentUserId) {
            markMessagesAsRead([payload.new.id]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const uploadFile = async (file: File): Promise<{ url: string; type: string; path: string } | null> => {
    const fileExt = file.name.split(".").pop();
    const filePath = `${currentUserId}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from("chat-attachments")
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("chat-attachments")
      .createSignedUrl(filePath, 3600);

    if (signedUrlError) throw signedUrlError;

    return {
      url: signedUrlData.signedUrl,
      type: file.type.startsWith("image/") ? "image" : "file",
      path: filePath
    };
  };

  const MAX_MESSAGE_LENGTH = 5000;

  const handleSend = async () => {
    if (!newMessage.trim() && !selectedFile) return;
    
    if (newMessage.length > MAX_MESSAGE_LENGTH) {
      toast({
        title: "Message too long",
        description: `Maximum message length is ${MAX_MESSAGE_LENGTH} characters`,
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    setUploading(!!selectedFile);

    try {
      let fileData: { url: string; type: string; path: string } | null = null;

      if (selectedFile) {
        fileData = await uploadFile(selectedFile);
      }

      const { error } = await supabase.from("group_messages").insert({
        group_id: groupId,
        user_id: currentUserId,
        content: newMessage.trim() || (selectedFile ? selectedFile.name : ""),
        file_url: fileData?.path || null,
        file_type: fileData?.type || null,
        reply_to_id: replyingTo?.id || null,
      });

      if (error) throw error;
      
      setNewMessage("");
      setSelectedFile(null);
      setFilePreview(null);
      setReplyingTo(null);
      updateTypingStatus(false);
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

  const getSignedUrl = async (filePath: string): Promise<string | null> => {
    if (signedUrls[filePath]) return signedUrls[filePath];
    
    const { data, error } = await supabase.storage
      .from("chat-attachments")
      .createSignedUrl(filePath, 3600);
    
    if (error || !data) return null;
    
    setSignedUrls(prev => ({ ...prev, [filePath]: data.signedUrl }));
    return data.signedUrl;
  };

  const getReplyMessage = (replyToId: string | null | undefined): Message | undefined => {
    if (!replyToId) return undefined;
    return messages.find(m => m.id === replyToId);
  };

  const handleReply = (message: Message) => {
    setReplyingTo(message);
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const ReadReceiptIndicator = ({ 
    messageId, 
    receipts, 
    members: groupMembers,
    currentUserId: ownUserId 
  }: { 
    messageId: string; 
    receipts: ReadReceipt[]; 
    members: Member[];
    currentUserId: string;
  }) => {
    // Count how many other users have read this message
    const readByOthers = receipts.filter(r => r.user_id !== ownUserId);
    const totalOtherMembers = groupMembers.filter(m => m.user_id !== ownUserId).length;
    
    if (readByOthers.length === 0) {
      // Message sent but not read by anyone
      return <Check className="h-3 w-3 text-muted-foreground" />;
    }
    
    if (readByOthers.length >= totalOtherMembers) {
      // Read by all members
      return <CheckCheck className="h-3 w-3 text-primary" />;
    }
    
    // Read by some members
    return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
  };

  const AttachmentRenderer = ({ message }: { message: Message }) => {
    const [url, setUrl] = useState<string | null>(null);
    
    useEffect(() => {
      if (message.file_url) {
        getSignedUrl(message.file_url).then(setUrl);
      }
    }, [message.file_url]);

    if (!message.file_url || !url) return null;

    if (message.file_type === "image") {
      return (
        <a href={url} target="_blank" rel="noopener noreferrer">
          <img
            src={url}
            alt="Shared image"
            className="max-w-full max-h-48 rounded-md mt-2 cursor-pointer hover:opacity-90 transition-opacity"
          />
        </a>
      );
    }

    return (
      <a
        href={url}
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

  const ReplyPreview = ({ replyToId, isOwn }: { replyToId: string | null | undefined; isOwn: boolean }) => {
    const replyMessage = getReplyMessage(replyToId);
    if (!replyMessage) return null;

    const replyAuthor = replyMessage.profiles?.display_name || getMemberName(replyMessage.user_id);
    const previewText = replyMessage.content?.slice(0, 50) + (replyMessage.content?.length > 50 ? "..." : "") || "Attachment";

    return (
      <div className={`flex items-start gap-1 mb-1 text-xs ${isOwn ? "opacity-80" : "opacity-70"}`}>
        <CornerDownRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
        <div className="truncate">
          <span className="font-medium">{replyAuthor}:</span>{" "}
          <span className="opacity-80">{previewText}</span>
        </div>
      </div>
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
                      className={`group flex flex-col ${isOwn ? "items-end" : "items-start"}`}
                    >
                      <div className={`flex items-center gap-1 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
                        <div
                          className={`max-w-[80%] rounded-lg px-3 py-2 ${
                            isOwn
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          {message.reply_to_id && (
                            <ReplyPreview replyToId={message.reply_to_id} isOwn={isOwn} />
                          )}
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
                          <AttachmentRenderer message={message} />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleReply(message)}
                        >
                          <Reply className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className={`flex items-center gap-1 mt-1 ${isOwn ? "justify-end" : "justify-start"}`}>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(message.created_at), "HH:mm")}
                        </span>
                        {isOwn && (
                          <ReadReceiptIndicator 
                            messageId={message.id} 
                            receipts={readReceipts[message.id] || []} 
                            members={members}
                            currentUserId={currentUserId}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Typing Indicator */}
          {typingUsers.length > 0 && (
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span>
                {typingUsers.length === 1
                  ? `${typingUsers[0].display_name} is typing...`
                  : typingUsers.length === 2
                  ? `${typingUsers[0].display_name} and ${typingUsers[1].display_name} are typing...`
                  : `${typingUsers[0].display_name} and ${typingUsers.length - 1} others are typing...`}
              </span>
            </div>
          )}

          {/* Reply Preview */}
          {replyingTo && (
            <div className="mt-4 p-2 bg-muted/50 border-l-2 border-primary rounded-r-lg flex items-center gap-2">
              <Reply className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium">
                  Replying to {replyingTo.profiles?.display_name || getMemberName(replyingTo.user_id)}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {replyingTo.content?.slice(0, 60) || "Attachment"}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={cancelReply}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

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
              ref={inputRef}
              placeholder={replyingTo ? "Type your reply..." : "Type a message..."}
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                if (e.target.value) handleTyping();
              }}
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