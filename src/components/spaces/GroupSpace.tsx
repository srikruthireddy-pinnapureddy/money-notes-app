import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Plus, Users, TrendingUp, TrendingDown } from "lucide-react";
import { CreateGroupDialog } from "@/components/CreateGroupDialog";
import { cn } from "@/lib/utils";

type Group = {
  id: string;
  name: string;
  description: string | null;
  currency: string;
  created_at: string;
};

type GroupData = {
  memberCount: number;
  members: { id: string; display_name: string | null; avatar_url: string | null }[];
  totalSpent: number;
  userBalance: number;
};

// Avatar colors for member circles
const avatarColors = [
  "bg-rose-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-cyan-500",
  "bg-pink-500",
  "bg-indigo-500",
];

interface GroupSpaceProps {
  groups: Group[];
  onGroupCreated: () => void;
}

export function GroupSpace({ groups, onGroupCreated }: GroupSpaceProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [groupsData, setGroupsData] = useState<Record<string, GroupData>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    const fetchGroupsData = async () => {
      if (!currentUserId) return;

      const dataMap: Record<string, GroupData> = {};

      for (const group of groups) {
        try {
          // Fetch members
          const { data: members } = await supabase
            .from("group_members")
            .select("user_id, profiles(id, display_name, avatar_url)")
            .eq("group_id", group.id);

          // Fetch expenses
          const { data: expenses } = await supabase
            .from("expenses")
            .select("amount, paid_by, expense_splits(user_id, amount)")
            .eq("group_id", group.id);

          // Fetch settlements
          const { data: settlements } = await supabase
            .from("settlements")
            .select("amount, from_user, to_user")
            .eq("group_id", group.id);

          const memberProfiles = members?.map((m: any) => ({
            id: m.user_id,
            display_name: m.profiles?.display_name,
            avatar_url: m.profiles?.avatar_url,
          })) || [];

          // Calculate total spent
          const totalSpent = expenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;

          // Calculate user balance
          let balance = 0;
          expenses?.forEach((expense: any) => {
            if (expense.paid_by === currentUserId) {
              balance += Number(expense.amount);
            }
            expense.expense_splits?.forEach((split: any) => {
              if (split.user_id === currentUserId) {
                balance -= Number(split.amount);
              }
            });
          });

          // Adjust for settlements
          settlements?.forEach((settlement: any) => {
            if (settlement.from_user === currentUserId) {
              balance += Number(settlement.amount);
            }
            if (settlement.to_user === currentUserId) {
              balance -= Number(settlement.amount);
            }
          });

          dataMap[group.id] = {
            memberCount: memberProfiles.length,
            members: memberProfiles,
            totalSpent,
            userBalance: balance,
          };
        } catch (error) {
          console.error("Error fetching group data:", error);
          dataMap[group.id] = {
            memberCount: 0,
            members: [],
            totalSpent: 0,
            userBalance: 0,
          };
        }
      }

      setGroupsData(dataMap);
    };

    if (groups.length > 0 && currentUserId) {
      fetchGroupsData();
    }
  }, [groups, currentUserId]);

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.charAt(0).toUpperCase();
  };

  const formatCurrency = (amount: number, currency: string) => {
    const symbols: Record<string, string> = {
      USD: "$",
      EUR: "€",
      GBP: "£",
      INR: "₹",
    };
    return `${symbols[currency] || currency}${Math.abs(amount).toFixed(2)}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Group Space</h2>
        <Button 
          onClick={() => setCreateDialogOpen(true)} 
          className="gap-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white shadow-lg shadow-rose-500/25"
        >
          <Plus className="h-4 w-4" />
          New Expense Space
        </Button>
      </div>

      {/* Groups Grid */}
      {groups.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
            <Users className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No groups yet</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs">
            Create your first group to start splitting expenses with friends
          </p>
          <Button 
            onClick={() => setCreateDialogOpen(true)} 
            className="gap-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-500"
          >
            <Plus className="h-4 w-4" />
            Create Group
          </Button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group, index) => {
            const data = groupsData[group.id] || { memberCount: 0, members: [], totalSpent: 0, userBalance: 0 };
            const displayMembers = data.members.slice(0, 4);
            const extraMembers = data.memberCount - 4;

            return (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -4, boxShadow: "0 20px 40px -12px rgba(0,0,0,0.15)" }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/group/${group.id}`)}
                className="bg-card rounded-2xl p-5 cursor-pointer border border-border/50 shadow-sm transition-all hover:border-border"
              >
                {/* Header Row */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base truncate text-foreground">{group.name}</h3>
                    <div className="flex items-center gap-1.5 mt-1 text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      <span className="text-xs">{data.memberCount} members</span>
                    </div>
                  </div>
                  {data.userBalance !== 0 && (
                    <div className={cn(
                      "p-1.5 rounded-lg",
                      data.userBalance > 0 ? "text-emerald-500" : "text-rose-500"
                    )}>
                      {data.userBalance > 0 ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                    </div>
                  )}
                </div>

                {/* Member Avatars */}
                <div className="flex items-center gap-1 mb-4">
                  {displayMembers.map((member, idx) => (
                    <div
                      key={member.id}
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold ring-2 ring-card",
                        avatarColors[idx % avatarColors.length]
                      )}
                      style={{ marginLeft: idx > 0 ? "-6px" : "0" }}
                    >
                      {member.avatar_url ? (
                        <img 
                          src={member.avatar_url} 
                          alt={member.display_name || "Member"} 
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        getInitials(member.display_name)
                      )}
                    </div>
                  ))}
                  {extraMembers > 0 && (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold bg-muted text-muted-foreground ring-2 ring-card"
                      style={{ marginLeft: "-6px" }}
                    >
                      +{extraMembers}
                    </div>
                  )}
                </div>

                {/* Total Spent */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Total spent</span>
                  <span className="text-sm font-bold text-foreground">
                    {formatCurrency(data.totalSpent, group.currency)}
                  </span>
                </div>

                {/* Balance Status */}
                <div className={cn(
                  "text-sm font-medium",
                  data.userBalance > 0 
                    ? "text-emerald-500" 
                    : data.userBalance < 0 
                      ? "text-rose-500" 
                      : "text-muted-foreground"
                )}>
                  {data.userBalance > 0 ? (
                    `You are owed ${formatCurrency(data.userBalance, group.currency)}`
                  ) : data.userBalance < 0 ? (
                    `You owe ${formatCurrency(data.userBalance, group.currency)}`
                  ) : (
                    "All settled up"
                  )}
                </div>
              </motion.div>
            );
          })}

          {/* Add New Group Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: groups.length * 0.05 }}
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setCreateDialogOpen(true)}
            className="rounded-2xl p-5 cursor-pointer border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center justify-center min-h-[200px]"
          >
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
              <Plus className="h-7 w-7 text-muted-foreground" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Add New Group</span>
          </motion.div>
        </div>
      )}

      <CreateGroupDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onGroupCreated={() => {
          onGroupCreated();
          setCreateDialogOpen(false);
        }}
      />
    </div>
  );
}
