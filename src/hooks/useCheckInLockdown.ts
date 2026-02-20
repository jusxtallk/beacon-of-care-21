import { useEffect, useCallback, useRef } from "react";

/**
 * When active, this hook:
 * 1. Requests fullscreen mode to make it harder to leave
 * 2. Vibrates the phone in a pattern to get attention
 * 3. Prevents page navigation with beforeunload
 * 4. Re-requests fullscreen if user exits it
 */
export const useCheckInLockdown = (active: boolean) => {
  const fullscreenRetryRef = useRef<number | null>(null);
  const vibrationIntervalRef = useRef<number | null>(null);

  const requestFullscreen = useCallback(() => {
    const el = document.documentElement;
    if (document.fullscreenElement) return;
    try {
      if (el.requestFullscreen) {
        el.requestFullscreen({ navigationUI: "hide" }).catch(() => {});
      } else if ((el as any).webkitRequestFullscreen) {
        (el as any).webkitRequestFullscreen();
      }
    } catch {}
  }, []);

  const exitFullscreen = useCallback(() => {
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
    } catch {}
  }, []);

  const startVibration = useCallback(() => {
    if (!("vibrate" in navigator)) return;
    // Initial strong vibration pattern
    navigator.vibrate([300, 200, 300, 200, 500]);

    // Repeat vibration every 8 seconds to remind the user
    vibrationIntervalRef.current = window.setInterval(() => {
      navigator.vibrate([200, 150, 200]);
    }, 8000);
  }, []);

  const stopVibration = useCallback(() => {
    if (vibrationIntervalRef.current) {
      clearInterval(vibrationIntervalRef.current);
      vibrationIntervalRef.current = null;
    }
    if ("vibrate" in navigator) {
      navigator.vibrate(0); // cancel any ongoing vibration
    }
  }, []);

  useEffect(() => {
    if (!active) {
      stopVibration();
      exitFullscreen();
      if (fullscreenRetryRef.current) {
        clearInterval(fullscreenRetryRef.current);
        fullscreenRetryRef.current = null;
      }
      return;
    }

    // Start lockdown
    requestFullscreen();
    startVibration();

    // Re-request fullscreen if user exits it
    const handleFullscreenChange = () => {
      if (active && !document.fullscreenElement) {
        // Small delay then re-request
        setTimeout(() => {
          if (active) requestFullscreen();
        }, 500);
      }
    };

    // Prevent navigation away
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      stopVibration();
      exitFullscreen();
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (fullscreenRetryRef.current) {
        clearInterval(fullscreenRetryRef.current);
      }
    };
  }, [active, requestFullscreen, exitFullscreen, startVibration, stopVibration]);
};
