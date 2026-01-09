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
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { groupSchema, MAX_LENGTHS } from "@/utils/validation";

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

  useEffect(() => {
    if (group) {
      setName(group.name);
      setDescription(group.description || "");
      setCurrency(group.currency || "USD");
    }
  }, [group]);

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
