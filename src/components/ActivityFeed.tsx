import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Activity, 
  DollarSign, 
  UserPlus, 
  MessageSquare, 
  CreditCard,
  TrendingUp,
  Loader2
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

type ActivityItem = {
  id: string;
  group_id: string;
  user_id: string;
  action_type: string;
  metadata: Record<string, any> | null;
  created_at: string;
  profiles?: {
    display_name: string;
    avatar_url: string | null;
  } | null;
};

interface ActivityFeedProps {
  groupId: string;
}

const actionConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  expense_added: { icon: DollarSign, color: "text-emerald-500", label: "added an expense" },
  expense_updated: { icon: TrendingUp, color: "text-blue-500", label: "updated an expense" },
  member_joined: { icon: UserPlus, color: "text-purple-500", label: "joined the group" },
  settlement_made: { icon: CreditCard, color: "text-amber-500", label: "made a settlement" },
  comment_added: { icon: MessageSquare, color: "text-pink-500", label: "commented" },
};

export function ActivityFeed({ groupId }: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
    const channel = subscribeToActivities();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId]);

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from("activity_log")
        .select("*, profiles(display_name, avatar_url)")
        .eq("group_id", groupId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setActivities((data || []) as ActivityItem[]);
    } catch (error) {
      console.error("Failed to fetch activities:", error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToActivities = () => {
    const channel = supabase
      .channel(`activity-${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activity_log",
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          fetchActivities();
        }
      )
      .subscribe();

    return channel;
  };

  const getInitials = (name: string | undefined) => {
    if (!name) return "?";
    return name.charAt(0).toUpperCase();
  };

  const getActionDetails = (item: ActivityItem) => {
    const config = actionConfig[item.action_type] || {
      icon: Activity,
      color: "text-muted-foreground",
      label: item.action_type,
    };

    const metadata = item.metadata || {};
    let details = "";
    if (item.action_type === "expense_added" && metadata.description) {
      details = `"${metadata.description}"`;
    } else if (item.action_type === "settlement_made" && metadata.amount) {
      details = `${metadata.currency || "$"}${metadata.amount}`;
    }

    return { ...config, details };
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-6">
          <Activity className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No activity yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-64">
          <div className="px-4 pb-4 space-y-1">
            {activities.map((item, index) => {
              const { icon: Icon, color, label, details } = getActionDetails(item);

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="flex items-start gap-3 py-2 relative"
                >
                  {/* Timeline line */}
                  {index < activities.length - 1 && (
                    <div className="absolute left-4 top-10 bottom-0 w-px bg-border" />
                  )}

                  <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-muted ${color}`}>
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={item.profiles?.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px]">
                          {getInitials(item.profiles?.display_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium truncate">
                        {item.profiles?.display_name || "Unknown"}
                      </span>
                      <span className="text-xs text-muted-foreground">{label}</span>
                    </div>
                    {details && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {details}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
