import { useEffect, useState } from "react";
import { getCheckIns, type CheckInEntry } from "./CheckInPage";
import BottomNav from "@/components/BottomNav";
import { Check, Clock } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";

const HistoryPage = () => {
  const [entries, setEntries] = useState<CheckInEntry[]>([]);

  useEffect(() => {
    setEntries(getCheckIns());
  }, []);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d)) return "Today";
    if (isYesterday(d)) return "Yesterday";
    return format(d, "EEE, MMM d");
  };

  const groupedByDay = entries.reduce<Record<string, CheckInEntry[]>>((acc, entry) => {
    const key = formatDate(entry.timestamp);
    if (!acc[key]) acc[key] = [];
    acc[key].push(entry);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="px-6 pt-12 max-w-md mx-auto">
        <h1 className="text-3xl font-extrabold text-foreground mb-6">
          Check-in History
        </h1>

        {entries.length === 0 ? (
          <div className="text-center py-20">
            <Clock className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-xl text-muted-foreground font-semibold">No check-ins yet</p>
            <p className="text-muted-foreground mt-1">Tap "I'm OK" to start</p>
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
                      <div>
                        <p className="font-bold text-card-foreground">Checked in</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(entry.timestamp), "h:mm a")}
                        </p>
                      </div>
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
