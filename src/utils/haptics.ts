import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { Capacitor } from "@capacitor/core";

/**
 * Triggers haptic feedback for UI interactions.
 * Uses Capacitor Haptics on native platforms, falls back to Web Vibration API on browsers.
 */
export async function triggerHapticFeedback(
  style: "light" | "medium" | "heavy" = "light"
): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      // Use Capacitor Haptics for native apps
      const impactStyle = {
        light: ImpactStyle.Light,
        medium: ImpactStyle.Medium,
        heavy: ImpactStyle.Heavy,
      }[style];

      await Haptics.impact({ style: impactStyle });
    } else if ("vibrate" in navigator) {
      // Fallback to Web Vibration API for browsers that support it
      const duration = {
        light: 10,
        medium: 20,
        heavy: 30,
      }[style];

      navigator.vibrate(duration);
    }
  } catch (error) {
    // Silently fail if haptics not available
    console.debug("Haptic feedback not available:", error);
  }
}

/**
 * Triggers a selection haptic feedback (lighter than impact)
 */
export async function triggerSelectionFeedback(): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      await Haptics.selectionStart();
      await Haptics.selectionEnd();
    } else if ("vibrate" in navigator) {
      navigator.vibrate(5);
    }
  } catch (error) {
    console.debug("Haptic feedback not available:", error);
  }
}

/**
 * Triggers a notification-style haptic feedback
 */
export async function triggerNotificationFeedback(
  type: "success" | "warning" | "error" = "success"
): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      const notificationTypeMap: Record<string, NotificationType> = {
        success: NotificationType.Success,
        warning: NotificationType.Warning,
        error: NotificationType.Error,
      };

      await Haptics.notification({ type: notificationTypeMap[type] });
    } else if ("vibrate" in navigator) {
      const pattern = {
        success: [10, 50, 10],
        warning: [20, 50, 20],
        error: [30, 50, 30, 50, 30],
      }[type];

      navigator.vibrate(pattern);
    }
  } catch (error) {
    console.debug("Haptic feedback not available:", error);
  }
}
