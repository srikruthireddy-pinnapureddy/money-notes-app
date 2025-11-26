import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Plus, 
  Receipt, 
  Users, 
  Loader2,
  TrendingUp,
  DollarSign
} from "lucide-react";
import { AddExpenseDrawer } from "@/components/AddExpenseDrawer";
import { GroupInviteDialog } from "@/components/GroupInviteDialog";
import { SettlementsSection } from "@/components/SettlementsSection";

type Group = {
  id: string;
  name: string;
  description: string | null;
  currency: string;
  created_at: string;
};

type Member = {
  id: string;
  user_id: string;
  role: string;
  profiles: {
    display_name: string;
    phone_number: string;
  };
};

type Expense = {
  id: string;
  description: string;
  amount: number;
  currency: string;
  expense_date: string;
  category: string | null;
  paid_by: string;
  profiles: {
    display_name: string;
  };
  expense_splits: Array<{
    user_id: string;
    amount: number;
  }>;
};

type Balance = {
  user_id: string;
  display_name: string;
  balance: number;
};

const GroupDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchGroupData();
    }
  }, [id]);

  const fetchGroupData = async () => {
    try {
      setLoading(true);
      
      // Fetch group details
      const { data: groupData, error: groupError } = await supabase
        .from("groups")
        .select("*")
        .eq("id", id)
        .single();

      if (groupError) throw groupError;
      setGroup(groupData);

      // Fetch members
      const { data: membersData, error: membersError } = await supabase
        .from("group_members")
        .select(`
          *,
          profiles(display_name, phone_number)
        `)
        .eq("group_id", id);

      if (membersError) throw membersError;
      setMembers(membersData || []);

      // Fetch expenses
      const { data: expensesData, error: expensesError } = await supabase
        .from("expenses")
        .select(`
          *,
          profiles(display_name),
          expense_splits(user_id, amount)
        `)
        .eq("group_id", id)
        .order("expense_date", { ascending: false });

      if (expensesError) throw expensesError;
      setExpenses(expensesData || []);

      // Calculate balances
      calculateBalances(membersData || [], expensesData || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch group data",
        variant: "destructive",
      });
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const calculateBalances = (membersList: Member[], expensesList: Expense[]) => {
    const balanceMap = new Map<string, { display_name: string; balance: number }>();

    // Initialize balances for all members
    membersList.forEach((member) => {
      balanceMap.set(member.user_id, {
        display_name: member.profiles.display_name,
        balance: 0,
      });
    });

    // Calculate balances from expenses
    expensesList.forEach((expense) => {
      // The person who paid gets credited
      const payer = balanceMap.get(expense.paid_by);
      if (payer) {
        payer.balance += Number(expense.amount);
      }

      // Everyone in the split gets debited
      expense.expense_splits.forEach((split) => {
        const member = balanceMap.get(split.user_id);
        if (member) {
          member.balance -= Number(split.amount);
        }
      });
    });

    // Convert to array
    const balanceArray = Array.from(balanceMap.entries()).map(([user_id, data]) => ({
      user_id,
      display_name: data.display_name,
      balance: data.balance,
    }));

    setBalances(balanceArray);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!group) {
    return null;
  }

  const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 pb-24">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur-sm sticky top-0 z-10 safe-top">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold truncate">{group.name}</h1>
              {group.description && (
                <p className="text-sm text-muted-foreground truncate">
                  {group.description}
                </p>
              )}
            </div>
            <Badge variant="outline">{group.currency}</Badge>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 grid-cols-2">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Total Spent</p>
            </div>
            <p className="text-2xl font-bold">
              {group.currency} {totalExpenses.toFixed(2)}
            </p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Receipt className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Expenses</p>
            </div>
            <p className="text-2xl font-bold">{expenses.length}</p>
          </Card>
        </div>

        {/* Balance Summary */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Balances
            </h2>
          </div>
          
          {balances.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No balances yet
            </p>
          ) : (
            <div className="space-y-3">
              {balances.map((balance) => (
                <div key={balance.user_id} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{balance.display_name}</span>
                  <span 
                    className={`text-sm font-bold ${
                      balance.balance > 0 
                        ? "text-green-600" 
                        : balance.balance < 0 
                        ? "text-red-600" 
                        : "text-muted-foreground"
                    }`}
                  >
                    {balance.balance > 0 ? "+" : ""}
                    {group.currency} {Math.abs(balance.balance).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Settlements Section */}
        <SettlementsSection
          groupId={id!}
          groupCurrency={group.currency}
          balances={balances}
          onSettled={fetchGroupData}
        />

        {/* Members */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Users className="h-5 w-5" />
              Members ({members.length})
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setInviteOpen(true)}>
              + Invite
            </Button>
          </div>
          
          <div className="space-y-3">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {member.profiles.display_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {member.profiles.phone_number}
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {member.role}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Expenses List */}
        <div>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Recent Expenses
          </h2>
          
          {expenses.length === 0 ? (
            <Card className="p-8 text-center">
              <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-base font-semibold mb-2">No expenses yet</h3>
              <p className="text-sm text-muted-foreground">
                Add your first expense to get started
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {expenses.map((expense) => (
                <Card key={expense.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {expense.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Paid by {expense.profiles.display_name}
                      </p>
                      {expense.category && (
                        <Badge variant="outline" className="text-xs mt-2">
                          {expense.category}
                        </Badge>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-base">
                        {expense.currency} {Number(expense.amount).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(expense.expense_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <Separator className="my-3" />
                  
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground mb-2">
                      Split between {expense.expense_splits.length} members
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-20 safe-bottom">
        <Button 
          size="lg" 
          className="h-16 w-16 rounded-full shadow-2xl"
          onClick={() => setAddExpenseOpen(true)}
        >
          <Plus className="h-7 w-7" />
        </Button>
      </div>

      <AddExpenseDrawer
        open={addExpenseOpen}
        onOpenChange={setAddExpenseOpen}
        groupId={id!}
        groupCurrency={group.currency}
        members={members}
        onExpenseAdded={fetchGroupData}
      />

      <GroupInviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        groupId={id!}
        groupName={group.name}
      />
    </div>
  );
};

export default GroupDetail;
