import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Users, Loader2, Settings, Wallet, TrendingUp, TrendingDown, ScanBarcode } from "lucide-react";
import { Session } from "@supabase/supabase-js";
import { CreateGroupDialog } from "@/components/CreateGroupDialog";
import { GroupCard } from "@/components/GroupCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { startOfMonth, endOfMonth } from "date-fns";
import { BarcodeScanner } from "@/components/BarcodeScanner";
type Group = {
  id: string;
  name: string;
  description: string | null;
  currency: string;
  created_at: string;
};
type PersonalSummary = {
  totalIncome: number;
  totalExpense: number;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [personalSummary, setPersonalSummary] = useState<PersonalSummary>({ totalIncome: 0, totalExpense: 0 });
  const [showScanner, setShowScanner] = useState(false);

  const handleBarcodeScan = (result: string) => {
    setShowScanner(false);
    toast({
      title: "Barcode Scanned",
      description: `Code: ${result}`,
    });
    // You can extend this to lookup product info or auto-fill expense
  };
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/");
      } else {
        fetchGroups();
        fetchPersonalSummary();
      }
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, [navigate]);
  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase
        .from("groups")
        .select(`*, group_members!inner(user_id)`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setGroups(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch groups",
        variant: "destructive",
      });
    }
  };

  const fetchPersonalSummary = async () => {
    try {
      const now = new Date();
      const start = startOfMonth(now);
      const end = endOfMonth(now);

      const { data, error } = await supabase
        .from("personal_transactions")
        .select("type, amount")
        .gte("transaction_date", start.toISOString())
        .lte("transaction_date", end.toISOString());

      if (error) throw error;

      const totalIncome = (data || [])
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const totalExpense = (data || [])
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + Number(t.amount), 0);

      setPersonalSummary({ totalIncome, totalExpense });
    } catch (error) {
      // Silent fail for summary
    }
  };
  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>;
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 pb-24">
      <header className="border-b bg-background/95 backdrop-blur-sm sticky top-0 z-10 safe-top">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold">ExpenX</h1>
            <p className="text-sm text-muted-foreground truncate">
              {session?.user?.email || session?.user?.phone}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setShowScanner(true)}>
              <ScanBarcode className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="px-4 py-6">
        {/* Navigation Tabs */}
        <Tabs defaultValue="groups" className="mb-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger
              value="ledger"
              className="flex items-center gap-2"
              onClick={() => navigate("/ledger")}
            >
              <Wallet className="h-4 w-4" />
              My Ledger
            </TabsTrigger>
            <TabsTrigger value="groups" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              My Groups
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Personal Summary Card */}
        <Card className="p-4 mb-6 bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">This Month</span>
            <Button variant="ghost" size="sm" onClick={() => navigate("/ledger")}>
              View Ledger
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="flex items-center gap-1 text-emerald-500">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs">Income</span>
              </div>
              <p className="font-bold">${personalSummary.totalIncome.toFixed(0)}</p>
            </div>
            <div>
              <div className="flex items-center gap-1 text-rose-500">
                <TrendingDown className="h-4 w-4" />
                <span className="text-xs">Expense</span>
              </div>
              <p className="font-bold">${personalSummary.totalExpense.toFixed(0)}</p>
            </div>
            <div>
              <div className="flex items-center gap-1">
                <Wallet className="h-4 w-4" />
                <span className="text-xs">Net</span>
              </div>
              <p className={`font-bold ${personalSummary.totalIncome - personalSummary.totalExpense >= 0 ? 'text-primary' : 'text-destructive'}`}>
                ${(personalSummary.totalIncome - personalSummary.totalExpense).toFixed(0)}
              </p>
            </div>
          </div>
        </Card>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Your Groups</h2>
          <span className="text-sm text-muted-foreground">{groups.length} groups</span>
        </div>

        {groups.length === 0 ? (
          <Card className="p-8 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-base font-semibold mb-2">No groups yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first group to start splitting expenses
            </p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {groups.map((group) => (
              <GroupCard key={group.id} group={group} />
            ))}
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-20 safe-bottom">
        <Button
          size="lg"
          className="h-16 w-16 rounded-full shadow-2xl"
          onClick={() => setCreateDialogOpen(true)}
        >
          <Plus className="h-7 w-7" />
        </Button>
      </div>

      <CreateGroupDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onGroupCreated={fetchGroups}
      />

      {showScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
};

export default Dashboard;