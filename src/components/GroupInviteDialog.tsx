import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check, Share2 } from "lucide-react";

interface GroupInviteDialogProps {
  groupId: string;
  groupName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GroupInviteDialog({
  groupId,
  groupName,
  open,
  onOpenChange,
}: GroupInviteDialogProps) {
  const { toast } = useToast();
  const [inviteCode, setInviteCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && groupId) {
      generateInviteCode();
    }
  }, [open, groupId]);

  const generateInviteCode = async () => {
    setLoading(true);
    try {
      // Generate random 8-character code
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      const { error } = await supabase
        .from("group_invites")
        .insert({
          group_id: groupId,
          code: code,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        });

      if (error) throw error;
      setInviteCode(code);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate invite code",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const inviteUrl = `${window.location.origin}/join/${inviteCode}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Invite link copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      });
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${groupName}`,
          text: `Join my group "${groupName}" on The Cash Book to split expenses!`,
          url: inviteUrl,
        });
      } catch (error) {
        // User cancelled share
      }
    } else {
      handleCopy();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Members to {groupName}</DialogTitle>
          <DialogDescription>
            Share this QR code or link with others to add them to your group
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* QR Code */}
            <div className="flex justify-center p-6 bg-muted/50 rounded-lg">
              <QRCodeSVG
                value={inviteUrl}
                size={200}
                level="H"
                includeMargin
              />
            </div>

            {/* Invite Code */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Invite Code</p>
              <div className="flex gap-2">
                <Input
                  value={inviteCode}
                  readOnly
                  className="text-center text-lg font-mono tracking-wider"
                />
              </div>
            </div>

            {/* Invite Link */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Invite Link</p>
              <div className="flex gap-2">
                <Input
                  value={inviteUrl}
                  readOnly
                  className="text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Close
              </Button>
              <Button onClick={handleShare} className="flex-1">
                <Share2 className="mr-2 h-4 w-4" />
                Share Link
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              This invite link expires in 7 days
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}