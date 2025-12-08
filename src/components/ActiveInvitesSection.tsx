import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Link2, Copy, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";

type Invite = {
  id: string;
  code: string;
  created_at: string;
  expires_at: string | null;
  max_uses: number | null;
  uses_count: number | null;
};

interface ActiveInvitesSectionProps {
  groupId: string;
  isAdmin: boolean;
}

export function ActiveInvitesSection({ groupId, isAdmin }: ActiveInvitesSectionProps) {
  const { toast } = useToast();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAdmin) {
      fetchInvites();
    } else {
      setLoading(false);
    }
  }, [groupId, isAdmin]);

  const fetchInvites = async () => {
    try {
      const { data, error } = await supabase
        .from("group_invites")
        .select("*")
        .eq("group_id", groupId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Filter to only show active (non-expired, not maxed out) invites
      const now = new Date();
      const activeInvites = (data || []).filter(invite => {
        const notExpired = !invite.expires_at || new Date(invite.expires_at) > now;
        const notMaxedOut = invite.max_uses === null || (invite.uses_count || 0) < invite.max_uses;
        return notExpired && notMaxedOut;
      });
      
      setInvites(activeInvites);
    } catch (error: any) {
      console.error("Failed to fetch invites:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (code: string) => {
    const inviteUrl = `${window.location.origin}/join/${code}`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast({
        title: "Copied!",
        description: "Invite link copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (inviteId: string) => {
    try {
      const { error } = await supabase
        .from("group_invites")
        .delete()
        .eq("id", inviteId);

      if (error) throw error;
      
      setInvites(invites.filter(inv => inv.id !== inviteId));
      toast({
        title: "Deleted",
        description: "Invite code has been revoked",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete invite",
        variant: "destructive",
      });
    }
  };

  // Only render for admins
  if (!isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Active Invite Codes
        </h2>
        <Badge variant="secondary">{invites.length}</Badge>
      </div>

      {invites.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No active invite codes
        </p>
      ) : (
        <div className="space-y-3">
          {invites.map((invite) => (
            <div 
              key={invite.id} 
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-mono font-medium truncate">
                  {invite.code}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">
                    Uses: {invite.uses_count || 0}
                    {invite.max_uses && `/${invite.max_uses}`}
                  </span>
                  {invite.expires_at && (
                    <span className="text-xs text-muted-foreground">
                      • Expires {format(new Date(invite.expires_at), "MMM d")}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleCopy(invite.code)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(invite.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
