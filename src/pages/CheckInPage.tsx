import { useState, useEffect } from "react";
import CheckInButton from "@/components/CheckInButton";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const CheckInPage = () => {
  const { user } = useAuth();
  const [lastCheckIn, setLastCheckIn] = useState<Date | null>(null);
  const [prefs, setPrefs] = useState<{ share_battery: boolean; share_app_usage: boolean } | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchLast = async () => {
      const { data } = await supabase
        .from("check_ins")
        .select("checked_in_at")
        .eq("user_id", user.id)
        .order("checked_in_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setLastCheckIn(new Date(data.checked_in_at));
    };

    const fetchPrefs = async () => {
      const { data } = await supabase
        .from("data_preferences")
        .select("share_battery, share_app_usage")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setPrefs(data);
    };

    fetchLast();
    fetchPrefs();
  }, [user]);

  const handleCheckIn = async () => {
    if (!user) return;

    const insertData: any = { user_id: user.id };

    // Collect battery info if user consented
    if (prefs?.share_battery && "getBattery" in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        insertData.battery_level = Math.round(battery.level * 100);
        insertData.is_charging = battery.charging;
      } catch {}
    }

    const { error } = await supabase.from("check_ins").insert(insertData);
    if (!error) {
      setLastCheckIn(new Date());
    }
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
