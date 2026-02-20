import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";
import { Check, Clock } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";

interface CheckInRow {
  id: string;
  checked_in_at: string;
  battery_level: number | null;
  is_charging: boolean | null;
}

const HistoryPage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [entries, setEntries] = useState<CheckInRow[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("check_ins")
      .select("id, checked_in_at, battery_level, is_charging")
      .eq("user_id", user.id)
      .order("checked_in_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (data) setEntries(data);
      });
  }, [user]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d)) return t("today");
    if (isYesterday(d)) return t("yesterday");
    return format(d, "EEE, MMM d");
  };

  const groupedByDay = entries.reduce<Record<string, CheckInRow[]>>((acc, entry) => {
    const key = formatDate(entry.checked_in_at);
    if (!acc[key]) acc[key] = [];
    acc[key].push(entry);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="px-6 pt-12 max-w-md mx-auto">
        <h1 className="text-3xl font-extrabold text-foreground mb-6">{t("checkin_history")}</h1>

        {entries.length === 0 ? (
          <div className="text-center py-20">
            <Clock className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-xl text-muted-foreground font-semibold">{t("no_checkins")}</p>
            <p className="text-muted-foreground mt-1">{t("tap_to_start")}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByDay).map(([day, dayEntries]) => (
              <div key={day}>
                <h2 className="text-lg font-bold text-foreground mb-3">{day}</h2>
                <div className="space-y-2">
                  {dayEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center gap-4 bg-card rounded-xl p-4 border border-border"
                    >
                      <div className="w-10 h-10 rounded-full bg-success/15 flex items-center justify-center">
                        <Check className="w-5 h-5 text-success" strokeWidth={3} />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-card-foreground">{t("checked_in")}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(entry.checked_in_at), "h:mm a")}
                        </p>
                      </div>
                      {entry.battery_level !== null && (
                        <span className="text-sm text-muted-foreground">
                          🔋 {entry.battery_level}%
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default HistoryPage;
