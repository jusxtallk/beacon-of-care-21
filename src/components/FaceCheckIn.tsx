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
  const detectionFailureRef = useRef(0);
  const hasDetectedRef = useRef(false);

  const [cameraActive, setCameraActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [justCheckedIn, setJustCheckedIn] = useState(false);
  const [guidance, setGuidance] = useState("");
  const [ovalColor, setOvalColor] = useState<"border-muted-foreground" | "border-success" | "border-destructive">("border-muted-foreground");
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
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  const switchToManual = useCallback(() => {
    setShowManual(true);
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    stopCamera();
    setGuidance("");
  }, [stopCamera]);

  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return null;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    canvas.width = 320;
    canvas.height = 400;
    ctx.drawImage(video, 0, 0, 320, 400);

    return canvas.toDataURL("image/jpeg", 0.7);
  }, []);

  const analyzeFrame = useCallback(async () => {
    if (hasDetectedRef.current || analyzing) return;

    const frameData = captureFrame();
    if (!frameData) return;

    // Local lighting check
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
          if (badFrameCountRef.current >= MAX_FAILURES) switchToManual();
          return;
        }
        if (brightPixels / total > 0.8) {
          badFrameCountRef.current++;
          setGuidance("Too bright — reduce lighting");
          setOvalColor("border-destructive");
          if (badFrameCountRef.current >= MAX_FAILURES) switchToManual();
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
        detectionFailureRef.current++;
        if (detectionFailureRef.current >= MAX_FAILURES) switchToManual();
        setGuidance("Detection failed — try again");
        setOvalColor("border-destructive");
        return;
      }

      const result = data as FaceDetectResult;

      // AI-reported lighting issues count toward lighting failures
      if (result.is_dark) {
        badFrameCountRef.current++;
        setGuidance("Too dark — find better lighting");
        setOvalColor("border-destructive");
        if (badFrameCountRef.current >= MAX_FAILURES) switchToManual();
        return;
      }
      if (result.is_bright) {
        badFrameCountRef.current++;
        setGuidance("Too bright — reduce lighting");
        setOvalColor("border-destructive");
        if (badFrameCountRef.current >= MAX_FAILURES) switchToManual();
        return;
      }

      setGuidance(result.guidance || "");

      if (result.face_detected && result.face_in_oval && result.confidence >= 60) {
        hasDetectedRef.current = true;
        setOvalColor("border-success");
        setGuidance("Face verified ✓");
        setScanning(false);
        setJustCheckedIn(true);
        onCheckIn();
        setTimeout(() => stopCamera(), 500);
        setTimeout(() => setJustCheckedIn(false), 3000);
        return;
      }

      // Face not in oval or no face
      setOvalColor("border-destructive");
      if (!result.face_detected) {
        detectionFailureRef.current++;
        if (detectionFailureRef.current >= MAX_FAILURES) switchToManual();
      }
    } catch (err) {
      console.error("Analysis error:", err);
      detectionFailureRef.current++;
      if (detectionFailureRef.current >= MAX_FAILURES) switchToManual();
      setGuidance("Detection error — try again");
      setOvalColor("border-destructive");
    } finally {
      setAnalyzing(false);
      setScanning(false);
    }
  }, [analyzing, captureFrame, onCheckIn, stopCamera, switchToManual]);

  const startCamera = async () => {
    hasDetectedRef.current = false;
    badFrameCountRef.current = 0;
    detectionFailureRef.current = 0;
    setShowManual(false);
    setOvalColor("border-muted-foreground");
    setGuidance("");

    // Set camera active FIRST so the <video> element renders
    setCameraActive(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 800 } },
      });
      streamRef.current = stream;

      // Wait a tick for React to render the video element
      await new Promise((r) => requestAnimationFrame(r));

      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((t) => t.stop());
        setShowManual(true);
        setCameraActive(false);
        return;
      }

      video.srcObject = stream;

      await new Promise<void>((resolve, reject) => {
        if (video.readyState >= 2) return resolve();
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error("Video error"));
      });

      await new Promise<void>((resolve) => {
        if (video.readyState >= 4) return resolve();
        video.oncanplay = () => resolve();
      });

      await video.play();
      setGuidance(t("place_face_in_oval"));

      // Start AI detection every 4s after 2s warmup
      setTimeout(() => {
        scanIntervalRef.current = window.setInterval(() => {
          analyzeFrame();
        }, 4000);
      }, 2000);
    } catch (err: any) {
      console.error("Camera access error:", err);
      setCameraActive(false);
      setShowManual(true);
      if (err.name === "NotAllowedError") {
        setGuidance("Camera permission denied — please allow camera access");
      } else if (err.name === "NotFoundError") {
        setGuidance("No camera found on this device");
      } else if (err.name === "NotReadableError") {
        setGuidance("Camera is in use by another app");
      } else {
        setGuidance("Could not start camera");
      }
    }
  };

  const handleManualCheckIn = () => {
    setJustCheckedIn(true);
    onCheckIn();
    setTimeout(() => {
      setJustCheckedIn(false);
      setShowManual(false);
      badFrameCountRef.current = 0;
      detectionFailureRef.current = 0;
    }, 3000);
  };

  const retryCamera = () => {
    setShowManual(false);
    badFrameCountRef.current = 0;
    detectionFailureRef.current = 0;
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

  const remainingAttempts = MAX_FAILURES - Math.max(badFrameCountRef.current, detectionFailureRef.current);

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-sm mx-auto">
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
            {guidance && (
              <p className="text-destructive text-center text-sm font-semibold mb-2">{guidance}</p>
            )}
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
              {/* Single React-managed video — no DOM reparenting */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: "scaleX(-1)" }}
              />
              {/* Oval overlay */}
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

            <div className="mt-4 text-center min-h-[3rem]">
              <p className={`font-bold text-lg ${
                ovalColor === "border-success" ? "text-success" :
                ovalColor === "border-destructive" ? "text-destructive" :
                "text-foreground"
              }`}>
                {guidance}
              </p>
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
