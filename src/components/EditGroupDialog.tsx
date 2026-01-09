import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, X, Crown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { groupSchema, MAX_LENGTHS } from "@/utils/validation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type Member = {
  user_id: string;
  role: string;
  display_name: string | null;
  avatar_url: string | null;
};

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

const CURRENCIES = [
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "INR", name: "Indian Rupee" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "CAD", name: "Canadian Dollar" },
];

type Group = {
  id: string;
  name: string;
  description: string | null;
  currency: string;
};

interface EditGroupDialogProps {
  group: Group | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGroupUpdated: () => void;
}

export function EditGroupDialog({
  group,
  open,
  onOpenChange,
  onGroupUpdated,
}: EditGroupDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (group && open) {
      setName(group.name);
      setDescription(group.description || "");
      setCurrency(group.currency || "USD");
      fetchMembers();
    }
  }, [group, open]);

  const fetchMembers = async () => {
    if (!group) return;
    setLoadingMembers(true);
    try {
      const { data, error } = await supabase
        .from("group_members")
        .select("user_id, role, profiles(display_name, avatar_url)")
        .eq("group_id", group.id);

      if (error) throw error;

      const membersList: Member[] = (data || []).map((m: any) => ({
        user_id: m.user_id,
        role: m.role,
        display_name: m.profiles?.display_name,
        avatar_url: m.profiles?.avatar_url,
      }));
      setMembers(membersList);
    } catch (error) {
      console.error("Error fetching members:", error);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!group) return;
    setRemovingMemberId(memberId);
    try {
      const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("group_id", group.id)
        .eq("user_id", memberId);

      if (error) throw error;

      toast({
        title: "Member removed",
        description: "The member has been removed from the group.",
      });
      setMembers(members.filter((m) => m.user_id !== memberId));
      onGroupUpdated();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove member.",
        variant: "destructive",
      });
    } finally {
      setRemovingMemberId(null);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.charAt(0).toUpperCase();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!group) return;
    
    const validation = groupSchema.safeParse({
      name: name.trim(),
      description: description.trim() || null,
      currency: currency || null,
    });
    
    if (!validation.success) {
      toast({
        title: "Invalid input",
        description: validation.error.errors[0]?.message || "Please check your inputs",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);

    try {
      const { error } = await supabase
        .from("groups")
        .update({
          name: name.trim(),
          description: description.trim() || null,
          currency,
        })
        .eq("id", group.id);

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Group updated successfully",
      });

      onOpenChange(false);
      onGroupUpdated();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update group. You may not have permission.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>Edit Group</DrawerTitle>
          <DrawerDescription>
            Update your group's name, description, or currency
          </DrawerDescription>
        </DrawerHeader>

        <form onSubmit={handleSubmit} className="space-y-4 px-4 pb-6">
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-name" className="text-base">Group Name</Label>
              <span className={`text-xs ${name.length > MAX_LENGTHS.groupName ? 'text-destructive' : 'text-muted-foreground'}`}>
                {name.length}/{MAX_LENGTHS.groupName}
              </span>
            </div>
            <Input
              id="edit-name"
              placeholder="Weekend Trip, House Expenses, etc."
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, MAX_LENGTHS.groupName))}
              required
              className="h-12 text-base mt-1"
              maxLength={MAX_LENGTHS.groupName}
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-description" className="text-base">Description (optional)</Label>
              <span className={`text-xs ${description.length > MAX_LENGTHS.groupDescription ? 'text-destructive' : 'text-muted-foreground'}`}>
                {description.length}/{MAX_LENGTHS.groupDescription}
              </span>
            </div>
            <Textarea
              id="edit-description"
              placeholder="Add details about this group"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, MAX_LENGTHS.groupDescription))}
              rows={3}
              className="text-base mt-1"
              maxLength={MAX_LENGTHS.groupDescription}
            />
          </div>

          <div>
            <Label htmlFor="edit-currency" className="text-base">Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="h-12 text-base mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((curr) => (
                  <SelectItem key={curr.code} value={curr.code} className="text-base">
                    {curr.code} - {curr.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Members Section */}
          <div>
            <Label className="text-base">Members ({members.length})</Label>
            <ScrollArea className="h-[180px] mt-2 rounded-lg border border-border">
              {loadingMembers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {members.map((member, idx) => (
                    <div
                      key={member.user_id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold",
                            avatarColors[idx % avatarColors.length]
                          )}
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
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {member.display_name || "Unknown"}
                            {member.user_id === currentUserId && (
                              <span className="text-muted-foreground ml-1">(you)</span>
                            )}
                          </span>
                          {member.role === "admin" && (
                            <span className="text-xs text-amber-500 flex items-center gap-1">
                              <Crown className="h-3 w-3" /> Admin
                            </span>
                          )}
                        </div>
                      </div>
                      {member.role !== "admin" && member.user_id !== currentUserId && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveMember(member.user_id)}
                          disabled={removingMemberId === member.user_id}
                        >
                          {removingMemberId === member.user_id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-12 text-base"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 h-12 text-base">
              {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
