import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Users, Loader2, LogOut } from "lucide-react";
import { Session } from "@supabase/supabase-js";
import { CreateGroupDialog } from "@/components/CreateGroupDialog";
import { GroupCard } from "@/components/GroupCard";
type Group = {
  id: string;
  name: string;
  description: string | null;
  currency: string;
  created_at: string;
};
const Dashboard = () => {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  useEffect(() => {
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (!session) {
        navigate("/");
      }
    });
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      setSession(session);
      if (!session) {
        navigate("/");
      } else {
        fetchGroups();
      }
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, [navigate]);
  const fetchGroups = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("groups").select(`
          *,
          group_members!inner(user_id)
        `).order("created_at", {
        ascending: false
      });
      if (error) throw error;
      setGroups(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch groups",
        variant: "destructive"
      });
    }
  };
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };
  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>;
  }
  return <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 pb-24">
      <header className="border-b bg-background/95 backdrop-blur-sm sticky top-0 z-10 safe-top">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold">ExpenX</h1>
            <p className="text-sm text-muted-foreground truncate">
              {session?.user?.email || session?.user?.phone}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="px-4 py-6">
        <div className="flex gap-3 mb-5">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
            <span className="text-lg font-semibold">{groups.length}</span>
            <span className="text-xs text-muted-foreground">Groups</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
            <span className="text-lg font-semibold">{groups.length}</span>
            <span className="text-xs text-muted-foreground">Active</span>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Your Groups</h2>
        </div>

        {groups.length === 0 ? <Card className="p-8 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-base font-semibold mb-2">No groups yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first group to start splitting expenses
            </p>
          </Card> : <div className="grid gap-4">
            {groups.map(group => <GroupCard key={group.id} group={group} />)}
          </div>}
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-20 safe-bottom">
        <Button size="lg" className="h-16 w-16 rounded-full shadow-2xl" onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-7 w-7" />
        </Button>
      </div>

      <CreateGroupDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} onGroupCreated={fetchGroups} />
    </div>;
};
export default Dashboard;