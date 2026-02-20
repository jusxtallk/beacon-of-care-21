import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import BottomNav from "@/components/BottomNav";
import { ArrowLeft, AlertTriangle, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

interface AlertRow {
  id: string;
  elder_id: string;
  alert_type: string;
  message: string | null;
  is_read: boolean;
  created_at: string;
  elder_name?: string;
}

const AlertsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<AlertRow[]>([]);

  useEffect(() => {
    if (!user) return;
    fetchAlerts();
  }, [user]);

  const fetchAlerts = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("alerts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (!data) return;

    // Fetch elder names
    const elderIds = [...new Set(data.map((a) => a.elder_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", elderIds);

    const enriched = data.map((a) => ({
      ...a,
      elder_name: profiles?.find((p) => p.user_id === a.elder_id)?.full_name || "Unknown",
    }));

    setAlerts(enriched);
  };

  const markAsRead = async (alertId: string) => {
    await supabase.from("alerts").update({ is_read: true }).eq("id", alertId);
    setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, is_read: true } : a)));
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="px-6 pt-12 max-w-md mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-primary font-bold mb-4">
          <ArrowLeft className="w-5 h-5" /> Back
        </button>

        <h1 className="text-3xl font-extrabold text-foreground mb-6">Alerts</h1>

        {alerts.length === 0 ? (
          <div className="text-center py-20">
            <Check className="w-16 h-16 text-success mx-auto mb-4" />
            <p className="text-xl text-muted-foreground font-semibold">All clear!</p>
            <p className="text-muted-foreground mt-1">No alerts right now</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`flex items-start gap-3 rounded-xl p-4 border ${
                  alert.is_read ? "bg-card border-border" : "bg-destructive/5 border-destructive/20"
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-destructive/15 flex items-center justify-center mt-1">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-card-foreground">{alert.elder_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {alert.message || "Missed scheduled check-in"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(alert.created_at), "MMM d, h:mm a")}
                  </p>
                </div>
                {!alert.is_read && (
                  <button
                    onClick={() => markAsRead(alert.id)}
                    className="text-xs text-primary font-bold px-3 py-1 rounded-full border border-primary"
                  >
                    Dismiss
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default AlertsPage;
