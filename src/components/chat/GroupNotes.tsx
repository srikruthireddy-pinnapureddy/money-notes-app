import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { StickyNote, Plus, Trash2, Save, Loader2, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

type Note = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  display_name?: string;
};

type Member = {
  user_id: string;
  display_name: string;
};

interface GroupNotesProps {
  groupId: string;
  currentUserId: string;
  members: Member[];
}

export function GroupNotes({ groupId, currentUserId, members }: GroupNotesProps) {
  const { toast } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);

  useEffect(() => {
    fetchNotes();
    const cleanup = subscribeToNotes();
    return () => {
      cleanup();
    };
  }, [groupId]);

  const fetchNotes = async () => {
    try {
      // Notes are stored in group_messages with a special prefix
      const { data, error } = await supabase
        .from("group_messages")
        .select("*, profiles(display_name)")
        .eq("group_id", groupId)
        .like("content", "[NOTE]%")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const parsedNotes = (data || []).map(msg => ({
        id: msg.id,
        content: msg.content.replace("[NOTE]", "").trim(),
        created_at: msg.created_at,
        user_id: msg.user_id,
        display_name: msg.profiles?.display_name || getMemberName(msg.user_id),
      }));

      setNotes(parsedNotes);
    } catch (error) {
      console.error("Failed to fetch notes:", error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToNotes = () => {
    const channel = supabase
      .channel(`group-notes-${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "group_messages",
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const msg = payload.new as any;
            if (msg.content?.startsWith("[NOTE]")) {
              const newNote = {
                id: msg.id,
                content: msg.content.replace("[NOTE]", "").trim(),
                created_at: msg.created_at,
                user_id: msg.user_id,
                display_name: getMemberName(msg.user_id),
              };
              setNotes(prev => [newNote, ...prev]);
            }
          } else if (payload.eventType === "DELETE") {
            setNotes(prev => prev.filter(n => n.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const getMemberName = (userId: string) => {
    const member = members.find(m => m.user_id === userId);
    return member?.display_name || "Unknown";
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    setSaving(true);
    try {
      const { error } = await supabase.from("group_messages").insert({
        group_id: groupId,
        user_id: currentUserId,
        content: `[NOTE]${newNote.trim()}`,
      });

      if (error) throw error;

      setNewNote("");
      setIsAddingNote(false);
      toast({ title: "Note added" });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add note",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from("group_messages")
        .delete()
        .eq("id", noteId);

      if (error) throw error;
      toast({ title: "Note deleted" });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete note",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Add Note Section */}
      <div className="p-4 border-b">
        <AnimatePresence mode="wait">
          {isAddingNote ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3"
            >
              <Textarea
                placeholder="Write a shared note..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="min-h-[100px] resize-none"
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsAddingNote(false);
                    setNewNote("");
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddNote}
                  disabled={saving || !newNote.trim()}
                  className="flex-1"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Note
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Button
                variant="outline"
                onClick={() => setIsAddingNote(true)}
                className="w-full gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Shared Note
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Notes List */}
      <ScrollArea className="flex-1 px-4 py-3">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <StickyNote className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              No shared notes yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Add notes to keep your group organized
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group p-4 bg-muted/50 rounded-xl border"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm whitespace-pre-wrap flex-1">{note.content}</p>
                  {note.user_id === currentUserId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                      onClick={() => handleDeleteNote(note.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span>{note.display_name}</span>
                  <span>•</span>
                  <span>{format(new Date(note.created_at), "MMM d, HH:mm")}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
