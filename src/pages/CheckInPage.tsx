import { useState, useEffect } from "react";
import CheckInButton from "@/components/CheckInButton";
import BottomNav from "@/components/BottomNav";

const STORAGE_KEY = "checkin-history";

export interface CheckInEntry {
  id: string;
  timestamp: string;
}

export const getCheckIns = (): CheckInEntry[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

const CheckInPage = () => {
  const [lastCheckIn, setLastCheckIn] = useState<Date | null>(null);

  useEffect(() => {
    const entries = getCheckIns();
    if (entries.length > 0) {
      setLastCheckIn(new Date(entries[0].timestamp));
    }
  }, []);

  const handleCheckIn = () => {
    const entry: CheckInEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
    const existing = getCheckIns();
    const updated = [entry, ...existing].slice(0, 100);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setLastCheckIn(new Date(entry.timestamp));
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning ☀️";
    if (hour < 18) return "Good Afternoon 🌤";
    return "Good Evening 🌙";
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-28">
        <h1 className="text-3xl font-extrabold text-foreground mb-2 text-center">
          {getGreeting()}
        </h1>
        <p className="text-lg text-muted-foreground mb-12 text-center">
          Tap the button to let everyone know you're doing well
        </p>
        <CheckInButton onCheckIn={handleCheckIn} lastCheckIn={lastCheckIn} />
      </div>
      <BottomNav />
    </div>
  );
};

export default CheckInPage;
