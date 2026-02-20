import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Camera } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

interface FaceCheckInProps {
  onCheckIn: () => void;
  lastCheckIn: Date | null;
}

const MAX_ATTEMPTS = 2;

const FaceCheckIn = ({ onCheckIn, lastCheckIn }: FaceCheckInProps) => {
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const failedAttemptsRef = useRef(0);
  const hasDetectedRef = useRef(false);

  const [cameraActive, setCameraActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [justCheckedIn, setJustCheckedIn] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_ATTEMPTS);

  useEffect(() => {
    return () => {
      stopCamera();
    };
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

  const handleSuccessfulDetection = useCallback(() => {
    if (hasDetectedRef.current) return;
    hasDetectedRef.current = true;

    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setStatusMessage(t("face_detected"));
    setScanning(false);
    setJustCheckedIn(true);
    onCheckIn();

    // Stop camera after a brief delay so user sees the success message
    setTimeout(() => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      setCameraActive(false);
    }, 500);

    setTimeout(() => setJustCheckedIn(false), 3000);
  }, [onCheckIn, t]);

  const handleFailedAttempt = useCallback(() => {
    if (hasDetectedRef.current) return;
    failedAttemptsRef.current += 1;
    const remaining = MAX_ATTEMPTS - failedAttemptsRef.current;
    setAttemptsLeft(remaining);
    setStatusMessage(t("face_not_detected"));
    setScanning(false);

    if (remaining <= 0) {
      setShowManual(true);
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      setCameraActive(false);
      setStatusMessage("");
    }
  }, [t]);

  const startDetection = useCallback(() => {
    const hasFaceDetector = "FaceDetector" in window;

    scanIntervalRef.current = window.setInterval(async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || hasDetectedRef.current) return;

      setScanning(true);
      setStatusMessage(t("scanning"));

      if (hasFaceDetector) {
        try {
          const detector = new (window as any).FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
          const faces = await detector.detect(video);

          if (faces.length > 0) {
            const face = faces[0].boundingBox;
            const vw = video.videoWidth;
            const vh = video.videoHeight;
            const cx = face.x + face.width / 2;
            const cy = face.y + face.height / 2;
            const inX = cx > vw * 0.2 && cx < vw * 0.8;
            const inY = cy > vh * 0.15 && cy < vh * 0.75;

            if (inX && inY) {
              handleSuccessfulDetection();
              return;
            }
          }
          handleFailedAttempt();
        } catch {
          handleFailedAttempt();
        }
      } else {
        // Fallback: basic pixel analysis
        const canvas = canvasRef.current;
        if (!canvas) { setScanning(false); return; }
        const ctx = canvas.getContext("2d");
        if (!ctx) { setScanning(false); return; }

        canvas.width = 160;
        canvas.height = 200;
        ctx.drawImage(video, 0, 0, 160, 200);

        const centerData = ctx.getImageData(40, 50, 80, 100);
        let nonBlackPixels = 0;
        let skinTonePixels = 0;
        const totalPixels = centerData.data.length / 4;

        for (let i = 0; i < centerData.data.length; i += 4) {
          const r = centerData.data[i];
          const g = centerData.data[i + 1];
          const b = centerData.data[i + 2];
          if (r > 30 || g > 30 || b > 30) nonBlackPixels++;
          if (r > 60 && g > 40 && b > 20 && r > g && r > b) skinTonePixels++;
        }

        const hasContent = nonBlackPixels / totalPixels > 0.4;
        const hasSkinTone = skinTonePixels / totalPixels > 0.05;

        if (hasContent && hasSkinTone) {
          handleSuccessfulDetection();
        } else {
          handleFailedAttempt();
        }
      }
    }, 4000);
  }, [t, handleSuccessfulDetection, handleFailedAttempt]);

  const startCamera = async () => {
    hasDetectedRef.current = false;
    failedAttemptsRef.current = 0;
    setAttemptsLeft(MAX_ATTEMPTS);
    setShowManual(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 480 }, height: { ideal: 640 } },
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) return;

      video.srcObject = stream;

      // Wait for video metadata to load before playing
      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => resolve();
      });
      await video.play();

      setCameraActive(true);
      setStatusMessage(t("place_face_in_oval"));

      // Start detection after a brief delay to let user position their face
      setTimeout(() => startDetection(), 2000);
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
      failedAttemptsRef.current = 0;
      setAttemptsLeft(MAX_ATTEMPTS);
    }, 3000);
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
            className="flex flex-col items-center gap-6"
          >
            <p className="text-muted-foreground text-center text-lg font-semibold">
              {t("face_not_detected")}
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
              {/* Oval overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className="w-48 h-60 rounded-[50%] border-4 border-success"
                  style={{ boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)" }}
                />
              </div>
              {scanning && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm font-bold">
                  {t("scanning")}
                </div>
              )}
            </div>
            <p className="text-foreground font-bold mt-4 text-center">{statusMessage}</p>
            {attemptsLeft > 0 && attemptsLeft < MAX_ATTEMPTS && (
              <p className="text-muted-foreground text-sm mt-1">
                {attemptsLeft} {t("attempts_remaining")}
              </p>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </motion.div>
        ) : (
          <motion.div
            key="start"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="flex flex-col items-center gap-6"
          >
            {/* Keep video ref mounted but hidden so it's available when camera starts */}
            <video ref={videoRef} className="hidden" playsInline muted />
            <canvas ref={canvasRef} className="hidden" />

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
