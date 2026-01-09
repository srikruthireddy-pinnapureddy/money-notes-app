import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Send, Loader2, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";

type Comment = {
  id: string;
  expense_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: {
    display_name: string;
    avatar_url: string | null;
  };
};

interface ExpenseCommentsProps {
  expenseId: string;
  groupId: string;
  currentUserId: string;
}

export function ExpenseComments({ expenseId, groupId, currentUserId }: ExpenseCommentsProps) {
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (isExpanded) {
      fetchComments();
      const channel = subscribeToComments();
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [expenseId, isExpanded]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("expense_comments")
        .select("*, profiles(display_name, avatar_url)")
        .eq("expense_id", expenseId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error: any) {
      console.error("Failed to fetch comments:", error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToComments = () => {
    const channel = supabase
      .channel(`expense-comments-${expenseId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "expense_comments",
          filter: `expense_id=eq.${expenseId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            fetchComments(); // Refetch to get profile data
          } else if (payload.eventType === "DELETE") {
            setComments((prev) => prev.filter((c) => c.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return channel;
  };

  const handleSend = async () => {
    if (!newComment.trim()) return;

    setSending(true);
    try {
      const { error } = await supabase.from("expense_comments").insert({
        expense_id: expenseId,
        user_id: currentUserId,
        content: newComment.trim(),
      });

      if (error) throw error;

      // Also log activity
      await supabase.from("activity_log").insert({
        group_id: groupId,
        user_id: currentUserId,
        action_type: "comment_added",
        metadata: { expense_id: expenseId },
      });

      setNewComment("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add comment",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from("expense_comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete comment",
        variant: "destructive",
      });
    }
  };

  const getInitials = (name: string | undefined) => {
    if (!name) return "?";
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="mt-2">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <MessageSquare className="h-3.5 w-3.5" />
        {comments.length > 0 ? `${comments.length} comments` : "Add comment"}
        {isExpanded ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </Button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-3 border-t pt-3">
              {loading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">
                  No comments yet. Be the first to comment!
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {comments.map((comment) => (
                    <motion.div
                      key={comment.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-2 group"
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={comment.profiles?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {getInitials(comment.profiles?.display_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium">
                            {comment.profiles?.display_name || "Unknown"}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(comment.created_at), "MMM d, HH:mm")}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{comment.content}</p>
                      </div>
                      {comment.user_id === currentUserId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDelete(comment.id)}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Comment Input */}
              <div className="flex items-center gap-2 mt-2">
                <Input
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSend()}
                  className="h-8 text-xs"
                  maxLength={500}
                />
                <Button
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={handleSend}
                  disabled={!newComment.trim() || sending}
                >
                  {sending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
