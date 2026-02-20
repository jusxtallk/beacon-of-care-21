import { motion, AnimatePresence } from "framer-motion";
import { Heart, Check } from "lucide-react";
import { useState } from "react";

interface CheckInButtonProps {
  onCheckIn: () => void;
  lastCheckIn: Date | null;
}

const CheckInButton = ({ onCheckIn, lastCheckIn }: CheckInButtonProps) => {
  const [justCheckedIn, setJustCheckedIn] = useState(false);

  const handlePress = () => {
    setJustCheckedIn(true);
    onCheckIn();
    setTimeout(() => setJustCheckedIn(false), 2500);
  };

  const getTimeSince = () => {
    if (!lastCheckIn) return "No check-ins yet";
    const now = new Date();
    const diff = now.getTime() - lastCheckIn.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "Just now";
  };

  return (
    <div className="flex flex-col items-center gap-8">
      <motion.button
        onClick={handlePress}
        disabled={justCheckedIn}
        className="relative w-52 h-52 rounded-full bg-primary flex items-center justify-center shadow-lg focus:outline-none focus:ring-4 focus:ring-ring"
        whileTap={{ scale: 0.92 }}
        whileHover={{ scale: 1.04 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        {/* Pulse rings */}
        <motion.div
          className="absolute inset-0 rounded-full bg-primary/20"
          animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0, 0.4] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute inset-0 rounded-full bg-primary/10"
          animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        />

        <AnimatePresence mode="wait">
          {justCheckedIn ? (
            <motion.div
              key="check"
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0 }}
              className="flex flex-col items-center"
            >
              <Check className="w-20 h-20 text-primary-foreground" strokeWidth={3} />
              <span className="text-primary-foreground text-lg font-bold mt-1">Done!</span>
            </motion.div>
          ) : (
            <motion.div
              key="heart"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="flex flex-col items-center"
            >
              <Heart className="w-20 h-20 text-primary-foreground" strokeWidth={2} fill="currentColor" />
              <span className="text-primary-foreground text-xl font-extrabold mt-2">I'm OK</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      <p className="text-muted-foreground text-lg font-semibold">
        Last check-in: {getTimeSince()}
      </p>
    </div>
  );
};

export default CheckInButton;
