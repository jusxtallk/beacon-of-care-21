import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Camera } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

interface FaceCheckInProps {
  onCheckIn: () => void;
  lastCheckIn: Date | null;
}

const MAX_ATTEMPTS = 3;

const FaceCheckIn = ({ onCheckIn, lastCheckIn }: FaceCheckInProps) => {
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [showManual, setShowManual] = useState(false);
  const [justCheckedIn, setJustCheckedIn] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [faceDetectorSupported, setFaceDetectorSupported] = useState(false);
  const scanIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    // Check if FaceDetector API is available
    if ("FaceDetector" in window) {
      setFaceDetectorSupported(true);
    }
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (failedAttempts >= MAX_ATTEMPTS) {
      setShowManual(true);
      stopCamera();
      setStatusMessage("");
    }
  }, [failedAttempts]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 480 }, height: { ideal: 640 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
      setStatusMessage(t("place_face_in_oval"));

      // Start periodic face detection
      if (faceDetectorSupported) {
        startFaceDetection();
      } else {
        // If no FaceDetector, use a timer-based approach (capture after 3 seconds)
        startTimerBasedDetection();
      }
    } catch (err) {
      console.error("Camera access denied:", err);
      setShowManual(true);
    }
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const startFaceDetection = () => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);

    scanIntervalRef.current = window.setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return;

      setScanning(true);
      setStatusMessage(t("scanning"));

      try {
        const detector = new (window as any).FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
        const faces = await detector.detect(videoRef.current);

        if (faces.length > 0) {
          // Face detected - check if it's roughly in the oval area
          const face = faces[0].boundingBox;
          const videoWidth = videoRef.current.videoWidth;
          const videoHeight = videoRef.current.videoHeight;

          // Check if face is roughly centered (within middle 60% of frame)
          const centerX = face.x + face.width / 2;
          const centerY = face.y + face.height / 2;
          const inOvalX = centerX > videoWidth * 0.2 && centerX < videoWidth * 0.8;
          const inOvalY = centerY > videoHeight * 0.15 && centerY < videoHeight * 0.75;

          if (inOvalX && inOvalY) {
            handleSuccessfulDetection();
            return;
          }
        }

        // Face not detected or not in oval
        setStatusMessage(t("face_not_detected"));
        setFailedAttempts((prev) => prev + 1);
      } catch (err) {
        console.error("Face detection error:", err);
        setFailedAttempts((prev) => prev + 1);
      }

      setScanning(false);
    }, 3000);
  };

  const startTimerBasedDetection = () => {
    // For browsers without FaceDetector, capture frame and do basic brightness/motion check
    let attemptCount = 0;

    scanIntervalRef.current = window.setInterval(() => {
      if (!videoRef.current || videoRef.current.readyState < 2) return;

      setScanning(true);
      setStatusMessage(t("scanning"));

      // Basic check: is there something in the frame? (non-black pixels in center)
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = 160;
      canvas.height = 200;
      ctx.drawImage(videoRef.current, 0, 0, 160, 200);

      // Sample center pixels for basic "something is there" detection
      const centerData = ctx.getImageData(40, 50, 80, 100);
      let nonBlackPixels = 0;
      let skinTonePixels = 0;

      for (let i = 0; i < centerData.data.length; i += 4) {
        const r = centerData.data[i];
        const g = centerData.data[i + 1];
        const b = centerData.data[i + 2];

        if (r > 30 || g > 30 || b > 30) nonBlackPixels++;

        // Very rough skin tone detection
        if (r > 60 && g > 40 && b > 20 && r > g && r > b) {
          skinTonePixels++;
        }
      }

      const totalPixels = centerData.data.length / 4;
      const hasContent = nonBlackPixels / totalPixels > 0.5;
      const hasSkinTone = skinTonePixels / totalPixels > 0.1;

      attemptCount++;

      if (hasContent && hasSkinTone) {
        handleSuccessfulDetection();
      } else {
        setStatusMessage(t("face_not_detected"));
        setFailedAttempts((prev) => prev + 1);
      }

      setScanning(false);
    }, 3000);
  };

  const handleSuccessfulDetection = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setStatusMessage(t("face_detected"));
    setJustCheckedIn(true);
    onCheckIn();
    stopCamera();
    setTimeout(() => setJustCheckedIn(false), 3000);
  }, [onCheckIn, t]);

  const handleManualCheckIn = () => {
    setJustCheckedIn(true);
    onCheckIn();
    setTimeout(() => {
      setJustCheckedIn(false);
      setShowManual(false);
      setFailedAttempts(0);
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
              className="w-52 h-52 rounded-full bg-success flex flex-col items-center justify-center shadow-lg focus:outline-none focus:ring-4 focus:ring-ring"
              whileTap={{ scale: 0.92 }}
              whileHover={{ scale: 1.04 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              {/* Pulse rings */}
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
                  style={{
                    boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)",
                  }}
                />
              </div>
              {/* Scanning indicator */}
              {scanning && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm font-bold">
                  {t("scanning")}
                </div>
              )}
            </div>
            <p className="text-foreground font-bold mt-4 text-center">{statusMessage}</p>
            {failedAttempts > 0 && failedAttempts < MAX_ATTEMPTS && (
              <p className="text-muted-foreground text-sm mt-1">
                {MAX_ATTEMPTS - failedAttempts} {t("attempts_remaining")}
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
