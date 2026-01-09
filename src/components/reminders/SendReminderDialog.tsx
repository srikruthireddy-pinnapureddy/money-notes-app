import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Bell } from "lucide-react";
import { createNotification } from "@/utils/notifications";

interface SendReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupCurrency: string;
  toUserId: string;
  toUserName: string;
  amount: number;
  onSent: () => void;
}

export function SendReminderDialog({
  open,
  onOpenChange,
  groupId,
  groupCurrency,
  toUserId,
  toUserName,
  amount,
  onSent,
}: SendReminderDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSendReminder = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create payment reminder record
      const { error: reminderError } = await supabase
        .from("payment_reminders")
        .insert({
          from_user: user.id,
          to_user: toUserId,
          group_id: groupId,
          amount,
          message: message.trim() || null,
        });

      if (reminderError) throw reminderError;

      // Create notification for the recipient
      await createNotification({
        userId: toUserId,
        type: "expense_added",
        title: "Payment Reminder",
        message: `You owe ${groupCurrency} ${amount.toFixed(2)}${message.trim() ? `: "${message.trim()}"` : ""}`,
        groupId,
      });

      toast({
        title: "Reminder sent!",
        description: `${toUserName} has been notified about the payment`,
      });

      setMessage("");
      onOpenChange(false);
      onSent();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send reminder",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Send Payment Reminder
          </DialogTitle>
          <DialogDescription>
            Remind {toUserName} about the pending payment
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="bg-muted rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">Amount Due</p>
            <p className="text-2xl font-bold">
              {groupCurrency} {amount.toFixed(2)}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Custom Message (optional)</Label>
            <Textarea
              id="message"
              placeholder="e.g., Hey! Just a friendly reminder about the dinner last week..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSendReminder} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Reminder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
