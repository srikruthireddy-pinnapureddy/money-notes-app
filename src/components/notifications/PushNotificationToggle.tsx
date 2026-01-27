import { useState, useEffect } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  isPushSupported,
  isPushSubscribed,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
} from "@/utils/pushNotifications";

export function PushNotificationToggle() {
  const { toast } = useToast();
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    const isSupported = isPushSupported();
    setSupported(isSupported);

    if (isSupported) {
      const isSubscribed = await isPushSubscribed();
      setSubscribed(isSubscribed);
    }
    setLoading(false);
  };

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (subscribed) {
        const success = await unsubscribeFromPushNotifications();
        if (success) {
          setSubscribed(false);
          toast({
            title: "Push Notifications Disabled",
            description: "You will no longer receive push notifications",
          });
        }
      } else {
        const success = await subscribeToPushNotifications();
        if (success) {
          setSubscribed(true);
          toast({
            title: "Push Notifications Enabled",
            description: "You'll receive alerts for expenses and settlements",
          });
        } else {
          toast({
            title: "Could not enable notifications",
            description: "Please check your browser permissions",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update notification settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!supported) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
        <BellOff className="h-5 w-5 text-muted-foreground" />
        <div className="flex-1">
          <p className="text-sm font-medium">Push Notifications</p>
          <p className="text-xs text-muted-foreground">
            Not supported in this browser
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 p-4 rounded-lg bg-muted/50">
      <div className="flex items-center gap-3">
        {subscribed ? (
          <Bell className="h-5 w-5 text-primary" />
        ) : (
          <BellOff className="h-5 w-5 text-muted-foreground" />
        )}
        <div>
          <Label htmlFor="push-toggle" className="text-sm font-medium cursor-pointer">
            Push Notifications
          </Label>
          <p className="text-xs text-muted-foreground">
            Get alerts for expenses and settlements
          </p>
        </div>
      </div>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Switch
          id="push-toggle"
          checked={subscribed}
          onCheckedChange={handleToggle}
        />
      )}
    </div>
  );
}
