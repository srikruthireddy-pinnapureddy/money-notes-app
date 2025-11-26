import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Loader2, Users, CheckCircle, XCircle } from "lucide-react";
import { Session } from "@supabase/supabase-js";

const JoinGroup = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [groupInfo, setGroupInfo] = useState<any>(null);
  const [error, setError] = useState("");
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    // Check auth
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session && code) {
        loadGroupInfo();
      } else if (!session) {
        setLoading(false);
      }
    });
  }, [code]);

  const loadGroupInfo = async () => {
    try {
      // Get invite details
      const { data: invite, error: inviteError } = await supabase
        .from("group_invites")
        .select(`
          *,
          groups (
            id,
            name,
            description,
            currency
          )
        `)
        .eq("code", code)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (inviteError) throw new Error("Invalid or expired invite code");

      // Check if already a member
      const { data: membership } = await supabase
        .from("group_members")
        .select("id")
        .eq("group_id", invite.groups.id)
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (membership) {
        setJoined(true);
      }

      setGroupInfo(invite);
    } catch (error: any) {
      setError(error.message || "Failed to load group information");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!session) {
      navigate("/auth");
      return;
    }

    setJoining(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Add user to group
      const { error: memberError } = await supabase
        .from("group_members")
        .insert({
          group_id: groupInfo.groups.id,
          user_id: user.id,
          role: "member",
        });

      if (memberError) throw memberError;

      // Update invite uses
      const { error: updateError } = await supabase
        .from("group_invites")
        .update({
          uses_count: groupInfo.uses_count + 1,
        })
        .eq("id", groupInfo.id);

      if (updateError) throw updateError;

      toast({
        title: "Success!",
        description: `You've joined ${groupInfo.groups.name}`,
      });

      // Redirect to group
      navigate(`/group/${groupInfo.groups.id}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to join group",
        variant: "destructive",
      });
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Invalid Invite</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button onClick={() => navigate("/")} className="w-full">
            Go to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="flex items-center gap-3 mb-6 justify-center">
            <div className="p-3 bg-primary rounded-xl">
              <BookOpen className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold">The Cash Book</h1>
          </div>
          <Users className="h-16 w-16 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">You're Invited!</h2>
          {groupInfo && (
            <div className="mb-6">
              <p className="text-lg font-semibold mb-1">{groupInfo.groups.name}</p>
              {groupInfo.groups.description && (
                <p className="text-muted-foreground">{groupInfo.groups.description}</p>
              )}
            </div>
          )}
          <p className="text-muted-foreground mb-6">
            Sign in to join this group and start splitting expenses
          </p>
          <Button onClick={() => navigate("/auth")} className="w-full">
            Sign In to Join
          </Button>
        </Card>
      </div>
    );
  }

  if (joined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Already a Member</h2>
          <p className="text-muted-foreground mb-6">
            You're already a member of {groupInfo.groups.name}
          </p>
          <Button onClick={() => navigate(`/group/${groupInfo.groups.id}`)} className="w-full">
            Go to Group
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="flex items-center gap-3 mb-6 justify-center">
          <div className="p-3 bg-primary rounded-xl">
            <BookOpen className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">The Cash Book</h1>
        </div>

        <div className="text-center mb-6">
          <Users className="h-16 w-16 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Join Group</h2>
        </div>

        {groupInfo && (
          <div className="space-y-4 mb-6">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Group Name</p>
              <p className="text-lg font-semibold">{groupInfo.groups.name}</p>
            </div>

            {groupInfo.groups.description && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Description</p>
                <p>{groupInfo.groups.description}</p>
              </div>
            )}

            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Currency</p>
              <p className="font-semibold">{groupInfo.groups.currency}</p>
            </div>
          </div>
        )}

        <Button
          onClick={handleJoin}
          disabled={joining}
          className="w-full"
        >
          {joining && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Join Group
        </Button>
      </Card>
    </div>
  );
};

export default JoinGroup;