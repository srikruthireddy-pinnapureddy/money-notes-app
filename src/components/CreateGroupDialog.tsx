import { useState } from "react";
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
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GroupInviteDialog } from "./GroupInviteDialog";

const CURRENCIES = [
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "INR", name: "Indian Rupee" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "CAD", name: "Canadian Dollar" },
];

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGroupCreated: () => void;
}

export function CreateGroupDialog({
  open,
  onOpenChange,
  onGroupCreated,
}: CreateGroupDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [createdGroupId, setCreatedGroupId] = useState<string | null>(null);
  const [createdGroupName, setCreatedGroupName] = useState("");
  const [showInvite, setShowInvite] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      // Create group
      const { data: group, error: groupError } = await supabase
        .from("groups")
        .insert({
          name,
          description: description || null,
          currency,
          created_by: user.id,
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Add creator as admin member
      const { error: memberError } = await supabase
        .from("group_members")
        .insert({
          group_id: group.id,
          user_id: user.id,
          role: "admin",
        });

      if (memberError) throw memberError;

      toast({
        title: "Success!",
        description: "Group created successfully",
      });

      // Show invite dialog
      setCreatedGroupId(group.id);
      setCreatedGroupName(group.name);
      setShowInvite(true);
      
      setName("");
      setDescription("");
      setCurrency("USD");
      onOpenChange(false);
      onGroupCreated();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create group",
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
          <DrawerTitle>Create New Group</DrawerTitle>
          <DrawerDescription>
            Split expenses with friends, roommates, or for a trip
          </DrawerDescription>
        </DrawerHeader>

        <form onSubmit={handleSubmit} className="space-y-4 px-4 pb-6">
          <div>
            <Label htmlFor="name" className="text-base">Group Name</Label>
            <Input
              id="name"
              placeholder="Weekend Trip, House Expenses, etc."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="h-12 text-base mt-1"
            />
          </div>

          <div>
            <Label htmlFor="description" className="text-base">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="Add details about this group"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="text-base mt-1"
            />
          </div>

          <div>
            <Label htmlFor="currency" className="text-base">Currency</Label>
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
              Create Group
            </Button>
          </div>
        </form>
      </DrawerContent>

      {createdGroupId && (
        <GroupInviteDialog
          groupId={createdGroupId}
          groupName={createdGroupName}
          open={showInvite}
          onOpenChange={setShowInvite}
        />
      )}
    </Drawer>
  );
}