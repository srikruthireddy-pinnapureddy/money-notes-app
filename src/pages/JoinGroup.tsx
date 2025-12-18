import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Users, CheckCircle, XCircle } from "lucide-react";
import logo from "@/assets/logo.png";
import { Session } from "@supabase/supabase-js";

const JoinGroup = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState("");
  const [hasAttemptedAutoJoin, setHasAttemptedAutoJoin] = useState(false);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const performJoin = useCallback(async () => {
    if (!code || !session) return;
    
    setJoining(true);
    try {
      const { data, error: rpcError } = await supabase.rpc("join_group_with_invite", {
        invite_code: code,
      });

      if (rpcError) throw rpcError;

      const result = data as { success: boolean; error?: string; group_id?: string; message?: string };

      if (!result.success) {
        throw new Error(result.error || "Failed to join group");
      }

      toast({
        title: "Success!",
        description: result.message || "You've joined the group",
      });

      navigate(`/group/${result.group_id}`);
    } catch (error: any) {
      const errorMessage = error.message || "Failed to join group";
      
      if (errorMessage.includes("already a member")) {
        setError(errorMessage);
      } else {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
        setError(errorMessage);
      }
    } finally {
      setJoining(false);
    }
  }, [code, session, navigate, toast]);

  const handleJoin = () => {
    if (!session) {
      // Store the invite code and redirect to auth
      sessionStorage.setItem("pendingInviteCode", code || "");
      navigate("/auth");
      return;
    }
    performJoin();
  };

  // Auto-join if coming back from auth with pending invite
  useEffect(() => {
    if (session && code && !hasAttemptedAutoJoin && !joining && !error) {
      const pendingCode = sessionStorage.getItem("pendingInviteCode");
      if (pendingCode === code) {
        sessionStorage.removeItem("pendingInviteCode");
        setHasAttemptedAutoJoin(true);
        performJoin();
      }
    }
  }, [session, code, hasAttemptedAutoJoin, joining, error, performJoin]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    const isAlreadyMember = error.includes("already a member");
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          {isAlreadyMember ? (
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          ) : (
            <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          )}
          <h2 className="text-2xl font-bold mb-2">
            {isAlreadyMember ? "Already a Member" : "Unable to Join"}
          </h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button onClick={() => navigate("/dashboard")} className="w-full">
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
            <img src={logo} alt="ExpenX" className="h-12 w-12 rounded-xl object-cover" />
            <h1 className="text-2xl font-bold">ExpenX</h1>
          </div>
          <Users className="h-16 w-16 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">You're Invited!</h2>
          <p className="text-muted-foreground mb-6">
            Sign in to join this group and start splitting expenses
          </p>
          <Button onClick={handleJoin} className="w-full">
            Sign In to Join
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="flex items-center gap-3 mb-6 justify-center">
          <img src={logo} alt="ExpenX" className="h-12 w-12 rounded-xl object-cover" />
          <h1 className="text-2xl font-bold">ExpenX</h1>
        </div>

        <div className="text-center mb-6">
          <Users className="h-16 w-16 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Join Group</h2>
          <p className="text-muted-foreground">
            You've been invited to join a group on ExpenX
          </p>
        </div>

        <Button
          onClick={handleJoin}
          disabled={joining}
          className="w-full"
        >
          {joining && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {joining ? "Joining..." : "Join Group"}
        </Button>
      </Card>
    </div>
  );
};

export default JoinGroup;
