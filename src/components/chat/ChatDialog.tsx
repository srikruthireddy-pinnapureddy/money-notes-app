import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  X, Send, Loader2, Paperclip, FileText, Reply, 
  CornerDownRight, Check, CheckCheck, Pencil, Trash2, 
  MoreVertical, MessageCircle, StickyNote, Receipt,
  Smile
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { GroupNotes } from "./GroupNotes";
import { ExpenseAttachDialog } from "./ExpenseAttachDialog";

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
  edited_at?: string | null;
  profiles?: {
    display_name: string;
  };
  is_system?: boolean;
};

type Member = {
  user_id: string;
  display_name: string;
};

interface ChatDialogProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  groupCurrency: string;
  currentUserId: string;
  members: Member[];
  balances?: Array<{ user_id: string; balance: number }>;
  onExpenseAdded?: () => void;
}

export function ChatDialog({ 
  isOpen, 
  onClose, 
  groupId,
  groupName,
  groupCurrency,
  currentUserId, 
  members,
  balances,
  onExpenseAdded
}: ChatDialogProps) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [readReceipts, setReadReceipts] = useState<Record<string, ReadReceipt[]>>({});
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editContent, setEditContent] = useState("");
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [expenseSuggestion, setExpenseSuggestion] = useState<{ amount: string; description: string } | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasMarkedReadRef = useRef<Set<string>>(new Set());

  // Check for high dues and show settlement prompt
  const shouldShowSettlementPrompt = balances?.some(b => Math.abs(b.balance) > 500);

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

  // Detect expense patterns in message
  useEffect(() => {
    const expensePattern = /(?:paid|spent|expense)\s*(?:rs\.?|₹|inr)?\s*(\d+(?:\.\d+)?)/i;
    const match = newMessage.match(expensePattern);
    
    if (match) {
      setExpenseSuggestion({
        amount: match[1],
        description: newMessage.replace(match[0], '').trim() || 'Expense'
      });
    } else {
      setExpenseSuggestion(null);
    }
  }, [newMessage]);

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
      
      const messageIds = (data || []).map((m: Message) => m.id);
      if (messageIds.length > 0) {
        fetchReadReceipts(messageIds);
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
      setExpenseSuggestion(null);
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

  const handleEdit = (message: Message) => {
    setEditingMessage(message);
    setEditContent(message.content);
  };

  const cancelEdit = () => {
    setEditingMessage(null);
    setEditContent("");
  };

  const saveEdit = async () => {
    if (!editingMessage || !editContent.trim()) return;
    
    if (editContent.length > MAX_MESSAGE_LENGTH) {
      toast({
        title: "Message too long",
        description: `Maximum message length is ${MAX_MESSAGE_LENGTH} characters`,
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("group_messages")
        .update({ 
          content: editContent.trim(),
          edited_at: new Date().toISOString()
        })
        .eq("id", editingMessage.id);

      if (error) throw error;

      setMessages(prev => prev.map(m => 
        m.id === editingMessage.id 
          ? { ...m, content: editContent.trim(), edited_at: new Date().toISOString() }
          : m
      ));
      
      cancelEdit();
      toast({ title: "Message updated" });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update message",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from("group_messages")
        .delete()
        .eq("id", messageId);

      if (error) throw error;

      setMessages(prev => prev.filter(m => m.id !== messageId));
      toast({ title: "Message deleted" });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete message",
        variant: "destructive",
      });
    }
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
    const readByOthers = receipts.filter(r => r.user_id !== ownUserId);
    const totalOtherMembers = groupMembers.filter(m => m.user_id !== ownUserId).length;
    
    if (readByOthers.length === 0) {
      return <Check className="h-3 w-3 text-muted-foreground" />;
    }
    
    if (readByOthers.length >= totalOtherMembers) {
      return <CheckCheck className="h-3 w-3 text-primary" />;
    }
    
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

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          />
          
          {/* Dialog */}
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] bg-background rounded-t-3xl shadow-2xl border-t overflow-hidden"
          >
            {/* Handle */}
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>
            
            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-3 border-b">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="font-semibold text-base">{groupName}</h2>
                  <p className="text-xs text-muted-foreground">{members.length} members</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="chat" className="flex flex-col h-[calc(85vh-100px)]">
              <TabsList className="mx-4 mt-3 grid w-auto grid-cols-2">
                <TabsTrigger value="chat" className="gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Chat
                </TabsTrigger>
                <TabsTrigger value="notes" className="gap-2">
                  <StickyNote className="h-4 w-4" />
                  Notes
                </TabsTrigger>
              </TabsList>

              <TabsContent value="chat" className="flex-1 flex flex-col mt-0 overflow-hidden">
                {loading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    {/* Settlement Prompt */}
                    {shouldShowSettlementPrompt && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mx-4 mt-3 p-3 bg-accent/10 border border-accent/20 rounded-xl flex items-center gap-3"
                      >
                        <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                          <Receipt className="h-4 w-4 text-accent" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Ready to settle?</p>
                          <p className="text-xs text-muted-foreground">High dues detected in the group</p>
                        </div>
                      </motion.div>
                    )}

                    {/* Messages */}
                    <ScrollArea className="flex-1 px-4 py-3" ref={scrollRef}>
                      {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                            <MessageCircle className="h-8 w-8 text-muted-foreground" />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            No messages yet. Start the conversation!
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {messages.map((message) => {
                            const isOwn = message.user_id === currentUserId;
                            return (
                              <motion.div
                                key={message.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`group flex flex-col ${isOwn ? "items-end" : "items-start"}`}
                              >
                                <div className={`flex items-end gap-1 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
                                  <div
                                    className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                                      isOwn
                                        ? "bg-primary text-primary-foreground rounded-br-md"
                                        : "bg-muted rounded-bl-md"
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
                                    {message.edited_at && (
                                      <span className="text-[10px] opacity-60 italic ml-1">(edited)</span>
                                    )}
                                    <AttachmentRenderer message={message} />
                                  </div>
                                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => handleReply(message)}
                                    >
                                      <Reply className="h-3 w-3" />
                                    </Button>
                                    {isOwn && (
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-6 w-6">
                                            <MoreVertical className="h-3 w-3" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align={isOwn ? "end" : "start"}>
                                          {!message.file_url && (
                                            <DropdownMenuItem onClick={() => handleEdit(message)}>
                                              <Pencil className="h-3 w-3 mr-2" />
                                              Edit
                                            </DropdownMenuItem>
                                          )}
                                          <DropdownMenuItem 
                                            onClick={() => handleDelete(message.id)}
                                            className="text-destructive focus:text-destructive"
                                          >
                                            <Trash2 className="h-3 w-3 mr-2" />
                                            Delete
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    )}
                                  </div>
                                </div>
                                <div className={`flex items-center gap-1 mt-1 ${isOwn ? "justify-end" : "justify-start"}`}>
                                  <span className="text-[10px] text-muted-foreground">
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
                              </motion.div>
                            );
                          })}
                        </div>
                      )}
                    </ScrollArea>

                    {/* Typing Indicator */}
                    {typingUsers.length > 0 && (
                      <div className="px-4 py-2 flex items-center gap-2 text-xs text-muted-foreground">
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

                    {/* Edit Message */}
                    {editingMessage && (
                      <div className="mx-4 mb-2 p-3 bg-muted/50 border-l-2 border-yellow-500 rounded-r-xl">
                        <div className="flex items-center gap-2 mb-2">
                          <Pencil className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                          <span className="text-xs font-medium">Editing message</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={cancelEdit}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex gap-2">
                          <Input
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                saveEdit();
                              }
                            }}
                            className="flex-1"
                            autoFocus
                          />
                          <Button size="sm" onClick={saveEdit} disabled={!editContent.trim()}>
                            Save
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Reply Preview */}
                    {replyingTo && (
                      <div className="mx-4 mb-2 p-3 bg-muted/50 border-l-2 border-primary rounded-r-xl flex items-center gap-2">
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

                    {/* Expense Suggestion */}
                    {expenseSuggestion && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mx-4 mb-2 p-3 bg-success/10 border border-success/20 rounded-xl flex items-center gap-3"
                      >
                        <Receipt className="h-4 w-4 text-success flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-success">
                            Create expense for {groupCurrency} {expenseSuggestion.amount}?
                          </p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-success hover:text-success"
                          onClick={() => setShowExpenseDialog(true)}
                        >
                          Add
                        </Button>
                      </motion.div>
                    )}

                    {/* File Preview */}
                    {selectedFile && (
                      <div className="mx-4 mb-2 p-3 bg-muted rounded-xl flex items-center gap-3">
                        {filePreview ? (
                          <img src={filePreview} alt="Preview" className="h-12 w-12 object-cover rounded-lg" />
                        ) : (
                          <div className="h-12 w-12 bg-background rounded-lg flex items-center justify-center">
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

                    {/* Input Area */}
                    <div className="p-4 border-t bg-background safe-bottom">
                      <div className="flex items-center gap-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*,.pdf,.doc,.docx,.txt"
                          className="hidden"
                          onChange={handleFileSelect}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={sending}
                          className="shrink-0"
                        >
                          <Paperclip className="h-5 w-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowExpenseDialog(true)}
                          disabled={sending}
                          className="shrink-0"
                        >
                          <Receipt className="h-5 w-5" />
                        </Button>
                        <div className="flex-1 relative">
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
                            className="pr-10 rounded-full bg-muted border-0"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                            disabled
                          >
                            <Smile className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                        <Button
                          size="icon"
                          onClick={handleSend}
                          disabled={sending || (!newMessage.trim() && !selectedFile)}
                          className="shrink-0 rounded-full"
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
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="notes" className="flex-1 overflow-hidden mt-0">
                <GroupNotes groupId={groupId} currentUserId={currentUserId} members={members} />
              </TabsContent>
            </Tabs>

            <ExpenseAttachDialog
              open={showExpenseDialog}
              onOpenChange={setShowExpenseDialog}
              groupId={groupId}
              groupCurrency={groupCurrency}
              members={members}
              currentUserId={currentUserId}
              suggestedAmount={expenseSuggestion?.amount}
              suggestedDescription={expenseSuggestion?.description}
              onExpenseAdded={() => {
                setShowExpenseDialog(false);
                setExpenseSuggestion(null);
                setNewMessage("");
                onExpenseAdded?.();
              }}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
