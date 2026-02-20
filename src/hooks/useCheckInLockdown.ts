import { useEffect, useCallback, useRef } from "react";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { Capacitor } from "@capacitor/core";

/**
 * When active, this hook:
 * 1. Requests fullscreen mode to make it harder to leave
 * 2. Vibrates the phone using native haptics (or web fallback)
 * 3. Prevents page navigation with beforeunload
 * 4. Re-requests fullscreen if user exits it
 */
export const useCheckInLockdown = (active: boolean) => {
  const vibrationIntervalRef = useRef<number | null>(null);
  const isNative = Capacitor.isNativePlatform();

  const requestFullscreen = useCallback(() => {
    if (isNative) return; // Native apps are already fullscreen
    const el = document.documentElement;
    if (document.fullscreenElement) return;
    try {
      if (el.requestFullscreen) {
        el.requestFullscreen({ navigationUI: "hide" }).catch(() => {});
      } else if ((el as any).webkitRequestFullscreen) {
        (el as any).webkitRequestFullscreen();
      }
    } catch {}
  }, [isNative]);

  const exitFullscreen = useCallback(() => {
    if (isNative) return;
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    } catch {}
  }, [isNative]);

  const vibrateOnce = useCallback(async () => {
    if (isNative) {
      try {
        await Haptics.vibrate({ duration: 500 });
        await new Promise((r) => setTimeout(r, 300));
        await Haptics.vibrate({ duration: 500 });
        await new Promise((r) => setTimeout(r, 200));
        await Haptics.vibrate({ duration: 800 });
      } catch {}
    } else if ("vibrate" in navigator) {
      navigator.vibrate([500, 300, 500, 200, 800]);
    }
  }, [isNative]);

  const startVibration = useCallback(() => {
    vibrateOnce();
    // Repeat every 8 seconds
    vibrationIntervalRef.current = window.setInterval(() => {
      vibrateOnce();
    }, 8000);
  }, [vibrateOnce]);

  const stopVibration = useCallback(() => {
    if (vibrationIntervalRef.current) {
      clearInterval(vibrationIntervalRef.current);
      vibrationIntervalRef.current = null;
    }
    if (!isNative && "vibrate" in navigator) {
      navigator.vibrate(0);
    }
  }, [isNative]);

  useEffect(() => {
    if (!active) {
      stopVibration();
      exitFullscreen();
      return;
    }

    // Start lockdown
    requestFullscreen();
    startVibration();

    // Re-request fullscreen if user exits (web only)
    const handleFullscreenChange = () => {
      if (active && !document.fullscreenElement && !isNative) {
        setTimeout(() => {
          if (active) requestFullscreen();
        }, 500);
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      stopVibration();
      exitFullscreen();
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [active, requestFullscreen, exitFullscreen, startVibration, stopVibration, isNative]);
};

/** Call on successful check-in for a short success haptic */
export const vibrateSuccess = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      await Haptics.notification({ type: NotificationType.Success });
    } catch {}
  } else if ("vibrate" in navigator) {
    navigator.vibrate([100, 50, 100]);
  }
};
