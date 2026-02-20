import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Camera, RefreshCw } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";

interface FaceCheckInProps {
  onCheckIn: () => void;
  lastCheckIn: Date | null;
}

interface FaceDetectResult {
  face_detected: boolean;
  face_in_oval: boolean;
  is_dark: boolean;
  is_bright: boolean;
  guidance: string;
  confidence: number;
}

const MAX_FAILURES = 2;

const FaceCheckIn = ({ onCheckIn, lastCheckIn }: FaceCheckInProps) => {
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const badFrameCountRef = useRef(0);
  const hasDetectedRef = useRef(false);

  const [cameraActive, setCameraActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [justCheckedIn, setJustCheckedIn] = useState(false);
  const [guidance, setGuidance] = useState("");
  const [ovalColor, setOvalColor] = useState<"border-muted-foreground" | "border-success" | "border-destructive">("border-muted-foreground");
  const [failureCount, setFailureCount] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    return () => { stopCamera(); };
  }, []);

  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return null;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Capture at reasonable resolution for AI analysis
    canvas.width = 320;
    canvas.height = 400;
    ctx.drawImage(video, 0, 0, 320, 400);

    return canvas.toDataURL("image/jpeg", 0.7);
  }, []);

  const analyzeFrame = useCallback(async () => {
    if (hasDetectedRef.current || analyzing) return;

    const frameData = captureFrame();
    if (!frameData) return;

    // Quick local check for dark/bright frames
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let darkPixels = 0;
        let brightPixels = 0;
        const total = imgData.data.length / 4;
        for (let i = 0; i < imgData.data.length; i += 4) {
          const avg = (imgData.data[i] + imgData.data[i + 1] + imgData.data[i + 2]) / 3;
          if (avg < 25) darkPixels++;
          if (avg > 230) brightPixels++;
        }
        if (darkPixels / total > 0.8) {
          badFrameCountRef.current++;
          setGuidance("Too dark — find better lighting");
          setOvalColor("border-destructive");
          if (badFrameCountRef.current >= MAX_FAILURES) {
            switchToManual();
          }
          return;
        }
        if (brightPixels / total > 0.8) {
          badFrameCountRef.current++;
          setGuidance("Too bright — reduce lighting");
          setOvalColor("border-destructive");
          if (badFrameCountRef.current >= MAX_FAILURES) {
            switchToManual();
          }
          return;
        }
      }
    }

    setAnalyzing(true);
    setScanning(true);

    try {
      const { data, error } = await supabase.functions.invoke("face-detect", {
        body: { image: frameData },
      });

      if (error || !data) {
        console.error("Face detect error:", error);
        setFailureCount((prev) => {
          const next = prev + 1;
          if (next >= MAX_FAILURES) switchToManual();
          return next;
        });
        setGuidance("Detection failed — try again");
        setOvalColor("border-destructive");
        return;
      }

      const result = data as FaceDetectResult;

      setGuidance(result.guidance || "");

      if (result.face_detected && result.face_in_oval && result.confidence >= 60) {
        // Success!
        hasDetectedRef.current = true;
        setOvalColor("border-success");
        setGuidance("Face verified ✓");
        setScanning(false);
        setJustCheckedIn(true);
        onCheckIn();

        setTimeout(() => {
          stopCamera();
        }, 500);
        setTimeout(() => setJustCheckedIn(false), 3000);
        return;
      }

      if (result.face_detected && !result.face_in_oval) {
        // Face found but not centered
        setOvalColor("border-destructive");
      } else if (result.face_detected) {
        // Face found, somewhat in oval but low confidence
        setOvalColor("border-destructive");
      } else {
        // No face
        setOvalColor("border-destructive");
        setFailureCount((prev) => {
          const next = prev + 1;
          if (next >= MAX_FAILURES) switchToManual();
          return next;
        });
      }
    } catch (err) {
      console.error("Analysis error:", err);
      setFailureCount((prev) => {
        const next = prev + 1;
        if (next >= MAX_FAILURES) switchToManual();
        return next;
      });
      setGuidance("Detection error — try again");
      setOvalColor("border-destructive");
    } finally {
      setAnalyzing(false);
      setScanning(false);
    }
  }, [analyzing, captureFrame, onCheckIn, stopCamera]);

  const switchToManual = useCallback(() => {
    setShowManual(true);
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    stopCamera();
    setGuidance("");
  }, [stopCamera]);

  const startCamera = async () => {
    hasDetectedRef.current = false;
    badFrameCountRef.current = 0;
    setFailureCount(0);
    setShowManual(false);
    setOvalColor("border-muted-foreground");
    setGuidance("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 800 } },
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) return;

      video.srcObject = stream;
      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => resolve();
      });
      await video.play();

      setCameraActive(true);
      setGuidance(t("place_face_in_oval"));

      // Start AI detection every 4 seconds
      setTimeout(() => {
        scanIntervalRef.current = window.setInterval(() => {
          analyzeFrame();
        }, 4000);
      }, 2000);
    } catch (err) {
      console.error("Camera access denied:", err);
      setShowManual(true);
    }
  };

  const handleManualCheckIn = () => {
    setJustCheckedIn(true);
    onCheckIn();
    setTimeout(() => {
      setJustCheckedIn(false);
      setShowManual(false);
      setFailureCount(0);
      badFrameCountRef.current = 0;
    }, 3000);
  };

  const retryCamera = () => {
    setShowManual(false);
    setFailureCount(0);
    badFrameCountRef.current = 0;
    startCamera();
  };

  const getTimeSince = () => {
    if (!lastCheckIn) return t("no_checkins_yet");
    const now = new Date();
    const diff = now.getTime() - lastCheckIn.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}${t("hours_ago")}`;
    if (minutes > 0) return `${minutes}${t("minutes_ago")}`;
    return t("just_now");
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-sm mx-auto">
      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden" />

      <AnimatePresence mode="wait">
        {justCheckedIn ? (
          <motion.div
            key="success"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="w-52 h-52 rounded-full bg-success flex flex-col items-center justify-center"
          >
            <Check className="w-20 h-20 text-success-foreground" strokeWidth={3} />
            <span className="text-success-foreground text-lg font-bold mt-1">{t("done")}</span>
          </motion.div>
        ) : showManual ? (
          <motion.div
            key="manual"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4"
          >
            <p className="text-muted-foreground text-center text-lg font-semibold">
              Camera check-in unavailable
            </p>
            <motion.button
              onClick={handleManualCheckIn}
              className="relative w-52 h-52 rounded-full bg-success flex flex-col items-center justify-center shadow-lg focus:outline-none focus:ring-4 focus:ring-ring"
              whileTap={{ scale: 0.92 }}
              whileHover={{ scale: 1.04 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <motion.div
                className="absolute inset-0 rounded-full bg-success/20"
                animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0, 0.4] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              />
              <Check className="w-20 h-20 text-success-foreground" strokeWidth={2} />
              <span className="text-success-foreground text-xl font-extrabold mt-2">
                {t("manual_checkin")}
              </span>
            </motion.button>
            <button
              onClick={retryCamera}
              className="flex items-center gap-2 text-primary font-bold mt-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try camera again
            </button>
          </motion.div>
        ) : cameraActive ? (
          <motion.div
            key="camera"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative flex flex-col items-center"
          >
            <div className="relative w-64 h-80 rounded-3xl overflow-hidden bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: "scaleX(-1)" }}
              />
              {/* Oval overlay with dynamic color */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className={`w-48 h-60 rounded-[50%] border-4 ${ovalColor} transition-colors duration-300`}
                  style={{ boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)" }}
                />
              </div>
              {scanning && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm font-bold animate-pulse">
                  Analyzing...
                </div>
              )}
            </div>

            {/* Guidance text */}
            <div className="mt-4 text-center min-h-[3rem]">
              <p className={`font-bold text-lg ${
                ovalColor === "border-success" ? "text-success" :
                ovalColor === "border-destructive" ? "text-destructive" :
                "text-foreground"
              }`}>
                {guidance}
              </p>
              {failureCount > 0 && failureCount < MAX_FAILURES && (
                <p className="text-muted-foreground text-sm mt-1">
                  {MAX_FAILURES - failureCount} attempt{MAX_FAILURES - failureCount !== 1 ? "s" : ""} remaining
                </p>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="start"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="flex flex-col items-center gap-6"
          >
            {/* Hidden video for when camera isn't active yet */}
            <video ref={videoRef} className="hidden" playsInline muted />

            <motion.button
              onClick={startCamera}
              className="relative w-52 h-52 rounded-full bg-success flex flex-col items-center justify-center shadow-lg focus:outline-none focus:ring-4 focus:ring-ring"
              whileTap={{ scale: 0.92 }}
              whileHover={{ scale: 1.04 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <motion.div
                className="absolute inset-0 rounded-full bg-success/20"
                animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0, 0.4] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                className="absolute inset-0 rounded-full bg-success/10"
                animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              />
              <Camera className="w-16 h-16 text-success-foreground" strokeWidth={2} />
              <span className="text-success-foreground text-xl font-extrabold mt-2">
                {t("checkin")}
              </span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-muted-foreground text-lg font-semibold">
        {t("last_checkin")}: {getTimeSince()}
      </p>
    </div>
  );
};

export default FaceCheckIn;
