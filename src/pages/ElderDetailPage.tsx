import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Check, Clock, Battery, Calendar } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";

interface CheckInRow {
  id: string;
  checked_in_at: string;
  battery_level: number | null;
  is_charging: boolean | null;
}

interface Schedule {
  id: string;
  schedule_times: string[];
  days_of_week: number[];
  grace_period_minutes: number;
  is_active: boolean;
}

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const ElderDetailPage = () => {
  const { elderId } = useParams<{ elderId: string }>();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [elderName, setElderName] = useState("");
  const [checkIns, setCheckIns] = useState<CheckInRow[]>([]);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [newTimes, setNewTimes] = useState("09:00,18:00");
  const [newGrace, setNewGrace] = useState(60);

  useEffect(() => {
    if (!elderId || !user) return;
    fetchData();
  }, [elderId, user]);

  const fetchData = async () => {
    if (!elderId) return;

    const [profileRes, checkInRes, scheduleRes] = await Promise.all([
      supabase.from("profiles").select("full_name").eq("user_id", elderId).maybeSingle(),
      supabase
        .from("check_ins")
        .select("id, checked_in_at, battery_level, is_charging")
        .eq("user_id", elderId)
        .order("checked_in_at", { ascending: false })
        .limit(50),
      supabase
        .from("check_in_schedules")
        .select("id, schedule_times, days_of_week, grace_period_minutes, is_active")
        .eq("elder_id", elderId)
        .eq("is_active", true)
        .maybeSingle(),
    ]);

    if (profileRes.data) setElderName(profileRes.data.full_name);
    if (checkInRes.data) setCheckIns(checkInRes.data);
    if (scheduleRes.data) {
      setSchedule(scheduleRes.data);
      setNewTimes(scheduleRes.data.schedule_times.join(","));
      setNewGrace(scheduleRes.data.grace_period_minutes);
    }
  };

  const saveSchedule = async () => {
    if (!elderId || !user) return;
    const times = newTimes.split(",").map((t) => t.trim());

    if (schedule) {
      await supabase
        .from("check_in_schedules")
        .update({ schedule_times: times, grace_period_minutes: newGrace })
        .eq("id", schedule.id);
    } else {
      await supabase.from("check_in_schedules").insert({
        elder_id: elderId,
        created_by: user.id,
        schedule_times: times,
        grace_period_minutes: newGrace,
      });
    }
    setEditingSchedule(false);
    fetchData();
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d)) return "Today";
    if (isYesterday(d)) return "Yesterday";
    return format(d, "EEE, MMM d");
  };

  const groupedByDay = checkIns.reduce<Record<string, CheckInRow[]>>((acc, entry) => {
    const key = formatDate(entry.checked_in_at);
    if (!acc[key]) acc[key] = [];
    acc[key].push(entry);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="px-6 pt-12 max-w-md mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-primary font-bold mb-4">
          <ArrowLeft className="w-5 h-5" /> Back
        </button>

        <h1 className="text-3xl font-extrabold text-foreground mb-1">{elderName || "User"}</h1>
        <p className="text-muted-foreground mb-6">Check-in details & schedule</p>

        {/* Schedule Section */}
        <div className="bg-card rounded-xl p-5 border border-border mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-card-foreground">Schedule</h2>
            </div>
            {(role === "family" || role === "care_staff") && (
              <button
                onClick={() => setEditingSchedule(!editingSchedule)}
                className="text-sm text-primary font-bold"
              >
                {editingSchedule ? "Cancel" : "Edit"}
              </button>
            )}
          </div>

          {editingSchedule ? (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-bold text-card-foreground">Check-in times (comma-separated)</label>
                <input
                  value={newTimes}
                  onChange={(e) => setNewTimes(e.target.value)}
                  className="w-full mt-1 rounded-xl border border-border bg-background px-3 py-2 text-foreground"
                  placeholder="09:00,18:00"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-card-foreground">Grace period (minutes)</label>
                <input
                  type="number"
                  value={newGrace}
                  onChange={(e) => setNewGrace(Number(e.target.value))}
                  className="w-full mt-1 rounded-xl border border-border bg-background px-3 py-2 text-foreground"
                />
              </div>
              <button
                onClick={saveSchedule}
                className="w-full bg-primary text-primary-foreground font-bold py-2 rounded-xl"
              >
                Save Schedule
              </button>
            </div>
          ) : schedule ? (
            <div>
              <p className="text-card-foreground">
                <span className="font-bold">Times:</span> {schedule.schedule_times.join(", ")}
              </p>
              <p className="text-card-foreground">
                <span className="font-bold">Grace period:</span> {schedule.grace_period_minutes} min
              </p>
              <p className="text-card-foreground">
                <span className="font-bold">Days:</span> {schedule.days_of_week.map((d) => dayNames[d]).join(", ")}
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground">No schedule set yet</p>
          )}
        </div>

        {/* Check-in History */}
        <h2 className="text-lg font-bold text-foreground mb-3">Recent Check-ins</h2>
        {checkIns.length === 0 ? (
          <div className="text-center py-10">
            <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-semibold">No check-ins yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedByDay).map(([day, dayEntries]) => (
              <div key={day}>
                <h3 className="text-sm font-bold text-muted-foreground mb-2">{day}</h3>
                <div className="space-y-2">
                  {dayEntries.map((entry) => (
                    <div key={entry.id} className="flex items-center gap-3 bg-card rounded-xl p-3 border border-border">
                      <div className="w-8 h-8 rounded-full bg-success/15 flex items-center justify-center">
                        <Check className="w-4 h-4 text-success" strokeWidth={3} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-card-foreground">
                          {format(new Date(entry.checked_in_at), "h:mm a")}
                        </p>
                      </div>
                      {entry.battery_level !== null && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Battery className="w-4 h-4" />
                          {entry.battery_level}% {entry.is_charging ? "⚡" : ""}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ElderDetailPage;
