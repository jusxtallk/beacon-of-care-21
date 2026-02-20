import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import BottomNav from "@/components/BottomNav";
import { AlertTriangle, Check, Clock, Users, Bell, ChevronRight, Plus, X, Search } from "lucide-react";
import { format, differenceInHours, differenceInMinutes } from "date-fns";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface ElderStatus {
  elder_id: string;
  full_name: string;
  last_check_in: string | null;
  battery_level: number | null;
  is_charging: boolean | null;
  status: "ok" | "warning" | "alert";
}

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [elders, setElders] = useState<ElderStatus[]>([]);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [loading, setLoading] = useState(true);

  // Add elder dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [linkCodeInput, setLinkCodeInput] = useState("");
  const [lookupResult, setLookupResult] = useState<{ user_id: string; full_name: string } | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [addingElder, setAddingElder] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchElders();
    fetchAlertCount();

    // Realtime subscription for new check-ins
    const channel = supabase
      .channel("dashboard-checkins")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "check_ins" }, () => {
        fetchElders();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "alerts" }, () => {
        fetchAlertCount();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchElders = async () => {
    if (!user) return;

    const { data: rels } = await supabase
      .from("care_relationships")
      .select("elder_id")
      .eq("caregiver_id", user.id);

    if (!rels || rels.length === 0) {
      setElders([]);
      setLoading(false);
      return;
    }

    const elderIds = rels.map((r) => r.elder_id);

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", elderIds);

    const elderStatuses: ElderStatus[] = [];

    for (const elderId of elderIds) {
      const { data: lastCheckIn } = await supabase
        .from("check_ins")
        .select("checked_in_at, battery_level, is_charging")
        .eq("user_id", elderId)
        .order("checked_in_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const profile = profiles?.find((p) => p.user_id === elderId);
      const now = new Date();
      let status: "ok" | "warning" | "alert" = "alert";

      if (lastCheckIn) {
        const hoursSince = differenceInHours(now, new Date(lastCheckIn.checked_in_at));
        if (hoursSince < 12) status = "ok";
        else if (hoursSince < 24) status = "warning";
      }

      elderStatuses.push({
        elder_id: elderId,
        full_name: profile?.full_name || "Unknown",
        last_check_in: lastCheckIn?.checked_in_at || null,
        battery_level: lastCheckIn?.battery_level ?? null,
        is_charging: lastCheckIn?.is_charging ?? null,
        status,
      });
    }

    elderStatuses.sort((a, b) => {
      const order = { alert: 0, warning: 1, ok: 2 };
      return order[a.status] - order[b.status];
    });

    setElders(elderStatuses);
    setLoading(false);
  };

  const fetchAlertCount = async () => {
    if (!user) return;
    const { count } = await supabase
      .from("alerts")
      .select("id", { count: "exact", head: true })
      .eq("is_read", false);
    setUnreadAlerts(count || 0);
  };

  const lookupElder = async () => {
    const code = linkCodeInput.trim().toUpperCase();
    if (code.length !== 6) return;
    setLookupLoading(true);
    setLookupResult(null);

    const { data, error } = await supabase.rpc("lookup_elder_by_code", { _code: code });

    if (error || !data || data.length === 0) {
      toast.error("No elder found with this code");
      setLookupResult(null);
    } else {
      setLookupResult(data[0]);
    }
    setLookupLoading(false);
  };

  const addElder = async () => {
    if (!user || !lookupResult) return;
    setAddingElder(true);

    // Check if relationship already exists
    const { data: existing } = await supabase
      .from("care_relationships")
      .select("id")
      .eq("caregiver_id", user.id)
      .eq("elder_id", lookupResult.user_id)
      .maybeSingle();

    if (existing) {
      toast.error("This elder is already linked to your account");
      setAddingElder(false);
      return;
    }

    const { error } = await supabase.from("care_relationships").insert({
      caregiver_id: user.id,
      elder_id: lookupResult.user_id,
    });

    if (error) {
      toast.error("Failed to add elder. Make sure you have permission.");
    } else {
      toast.success(`${lookupResult.full_name} has been added!`);
      setShowAddDialog(false);
      setLinkCodeInput("");
      setLookupResult(null);
      fetchElders();
    }
    setAddingElder(false);
  };

  const getTimeSince = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    const now = new Date();
    const d = new Date(dateStr);
    const hours = differenceInHours(now, d);
    const minutes = differenceInMinutes(now, d);
    if (hours > 48) return format(d, "MMM d, h:mm a");
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "Just now";
  };

  const statusConfig = {
    ok: { bg: "bg-success/15", text: "text-success", icon: Check, label: "OK" },
    warning: { bg: "bg-warning/15", text: "text-warning", icon: Clock, label: "Overdue" },
    alert: { bg: "bg-destructive/15", text: "text-destructive", icon: AlertTriangle, label: "Missed" },
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="px-6 pt-12 max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Monitoring {elders.length} user{elders.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddDialog(true)}
              className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
            >
              <Plus className="w-6 h-6" />
            </button>
            <button
              onClick={() => navigate("/alerts")}
              className="relative w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center"
            >
              <Bell className="w-6 h-6 text-foreground" />
              {unreadAlerts > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold flex items-center justify-center">
                  {unreadAlerts}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Add Elder Dialog */}
        {showAddDialog && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
            <div className="bg-card rounded-2xl p-6 w-full max-w-sm border border-border">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-extrabold text-card-foreground">Add Elder</h2>
                <button onClick={() => { setShowAddDialog(false); setLinkCodeInput(""); setLookupResult(null); }}>
                  <X className="w-6 h-6 text-muted-foreground" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Enter the 6-character code from the elder's settings page
              </p>
              <div className="flex gap-2 mb-4">
                <input
                  value={linkCodeInput}
                  onChange={(e) => {
                    setLinkCodeInput(e.target.value.toUpperCase().slice(0, 6));
                    setLookupResult(null);
                  }}
                  placeholder="ABC123"
                  maxLength={6}
                  className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-center text-xl font-mono font-bold tracking-[0.3em] text-foreground uppercase"
                />
                <button
                  onClick={lookupElder}
                  disabled={linkCodeInput.length !== 6 || lookupLoading}
                  className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50"
                >
                  <Search className="w-5 h-5" />
                </button>
              </div>

              {lookupLoading && (
                <p className="text-sm text-muted-foreground text-center">Looking up...</p>
              )}

              {lookupResult && (
                <div className="bg-success/10 border border-success/30 rounded-xl p-4 mb-4">
                  <p className="text-sm text-muted-foreground">Found elder:</p>
                  <p className="text-lg font-bold text-card-foreground">{lookupResult.full_name}</p>
                </div>
              )}

              {lookupResult && (
                <button
                  onClick={addElder}
                  disabled={addingElder}
                  className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl disabled:opacity-50"
                >
                  {addingElder ? "Adding..." : `Add ${lookupResult.full_name}`}
                </button>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : elders.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-xl text-muted-foreground font-semibold">No users assigned</p>
            <p className="text-muted-foreground mt-1">Tap + to add an elder using their code</p>
          </div>
        ) : (
          <div className="space-y-3">
            {elders.map((elder) => {
              const config = statusConfig[elder.status];
              const StatusIcon = config.icon;
              return (
                <button
                  key={elder.elder_id}
                  onClick={() => navigate(`/elder/${elder.elder_id}`)}
                  className="w-full flex items-center gap-4 bg-card rounded-xl p-4 border border-border text-left"
                >
                  <div className={`w-12 h-12 rounded-full ${config.bg} flex items-center justify-center`}>
                    <StatusIcon className={`w-6 h-6 ${config.text}`} strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-card-foreground truncate">{elder.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      Last check-in: {getTimeSince(elder.last_check_in)}
                    </p>
                    {elder.battery_level !== null && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        🔋 {elder.battery_level}% {elder.is_charging ? "⚡" : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${config.text} px-2 py-1 rounded-full ${config.bg}`}>
                      {config.label}
                    </span>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default DashboardPage;
