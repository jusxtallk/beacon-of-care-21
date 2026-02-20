import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowLeft, Check, Clock, Battery, Calendar, User, Plus, Trash2,
  Heart, FileText, Save, Pencil,
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";

interface CheckInRow {
  id: string;
  checked_in_at: string;
  battery_level: number | null;
  is_charging: boolean | null;
  last_app_usage_at: string | null;
}

interface Schedule {
  id: string;
  schedule_times: string[];
  days_of_week: number[];
  grace_period_minutes: number;
  is_active: boolean;
}

interface HealthCondition {
  id: string;
  condition_name: string;
  severity: string | null;
  notes: string | null;
  diagnosed_date: string | null;
}

interface ElderNote {
  id: string;
  content: string;
  created_at: string;
  author_id: string | null;
}

interface ElderProfile {
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  date_of_birth: string | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  nric_last4: string | null;
  preferred_language: string;
  gender: string | null;
}

interface DataPrefs {
  share_battery: boolean;
  share_app_usage: boolean;
  share_location: boolean;
  daily_reminder: boolean;
}

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const ElderDetailPage = () => {
  const { elderId } = useParams<{ elderId: string }>();
  const { user, role } = useAuth();
  const navigate = useNavigate();

  const [elderProfile, setElderProfile] = useState<ElderProfile | null>(null);
  const [checkIns, setCheckIns] = useState<CheckInRow[]>([]);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [conditions, setConditions] = useState<HealthCondition[]>([]);
  const [notes, setNotes] = useState<ElderNote[]>([]);
  const [dataPrefs, setDataPrefs] = useState<DataPrefs | null>(null);

  // Edit states
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [newTimes, setNewTimes] = useState("09:00,18:00");
  const [newGrace, setNewGrace] = useState(60);

  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<Partial<ElderProfile>>({});

  const [newCondition, setNewCondition] = useState("");
  const [newConditionSeverity, setNewConditionSeverity] = useState("moderate");
  const [newConditionNotes, setNewConditionNotes] = useState("");
  const [showAddCondition, setShowAddCondition] = useState(false);

  // Edit condition
  const [editingConditionId, setEditingConditionId] = useState<string | null>(null);
  const [editConditionForm, setEditConditionForm] = useState<{ condition_name: string; severity: string; notes: string }>({ condition_name: "", severity: "moderate", notes: "" });

  const [newNote, setNewNote] = useState("");

  const canEdit = role === "family" || role === "care_staff";

  useEffect(() => {
    if (!elderId || !user) return;
    fetchData();

    // Realtime subscriptions
    const channel = supabase
      .channel(`elder-detail-${elderId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "check_ins", filter: `user_id=eq.${elderId}` }, () => {
        fetchCheckIns();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles", filter: `user_id=eq.${elderId}` }, () => {
        fetchProfile();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "health_conditions", filter: `elder_id=eq.${elderId}` }, () => {
        fetchConditions();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "elder_notes", filter: `elder_id=eq.${elderId}` }, () => {
        fetchNotes();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "data_preferences", filter: `user_id=eq.${elderId}` }, () => {
        fetchDataPrefs();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [elderId, user]);

  const fetchData = async () => {
    if (!elderId) return;
    await Promise.all([fetchProfile(), fetchCheckIns(), fetchSchedule(), fetchConditions(), fetchNotes(), fetchDataPrefs()]);
  };

  const fetchProfile = async () => {
    if (!elderId) return;
    const { data } = await supabase.from("profiles").select("full_name, phone, avatar_url, date_of_birth, address, emergency_contact_name, emergency_contact_phone, nric_last4, preferred_language, gender").eq("user_id", elderId).maybeSingle();
    if (data) {
      setElderProfile(data);
      setProfileForm(data);
    }
  };

  const fetchCheckIns = async () => {
    if (!elderId) return;
    const { data } = await supabase.from("check_ins").select("id, checked_in_at, battery_level, is_charging, last_app_usage_at").eq("user_id", elderId).order("checked_in_at", { ascending: false }).limit(50);
    if (data) setCheckIns(data);
  };

  const fetchSchedule = async () => {
    if (!elderId) return;
    const { data } = await supabase.from("check_in_schedules").select("id, schedule_times, days_of_week, grace_period_minutes, is_active").eq("elder_id", elderId).eq("is_active", true).maybeSingle();
    if (data) {
      setSchedule(data);
      setNewTimes(data.schedule_times.join(","));
      setNewGrace(data.grace_period_minutes);
    }
  };

  const fetchConditions = async () => {
    if (!elderId) return;
    const { data } = await supabase.from("health_conditions").select("*").eq("elder_id", elderId).order("created_at", { ascending: false });
    if (data) setConditions(data);
  };

  const fetchNotes = async () => {
    if (!elderId) return;
    const { data } = await supabase.from("elder_notes").select("*").eq("elder_id", elderId).order("created_at", { ascending: false });
    if (data) setNotes(data);
  };

  const fetchDataPrefs = async () => {
    if (!elderId) return;
    const { data } = await supabase.from("data_preferences").select("share_battery, share_app_usage, share_location, daily_reminder").eq("user_id", elderId).maybeSingle();
    if (data) setDataPrefs(data);
  };

  const saveSchedule = async () => {
    if (!elderId || !user) return;
    const times = newTimes.split(",").map((t) => t.trim()).filter(Boolean);
    if (schedule) {
      await supabase.from("check_in_schedules").update({ schedule_times: times, grace_period_minutes: newGrace }).eq("id", schedule.id);
    } else {
      await supabase.from("check_in_schedules").insert({ elder_id: elderId, created_by: user.id, schedule_times: times, grace_period_minutes: newGrace });
    }
    setEditingSchedule(false);
    fetchSchedule();
  };

  const saveProfile = async () => {
    if (!elderId) return;
    await supabase.from("profiles").update({
      full_name: profileForm.full_name,
      phone: profileForm.phone,
      date_of_birth: profileForm.date_of_birth,
      address: profileForm.address,
      gender: profileForm.gender,
      emergency_contact_name: profileForm.emergency_contact_name,
      emergency_contact_phone: profileForm.emergency_contact_phone,
      nric_last4: profileForm.nric_last4,
    }).eq("user_id", elderId);
    setEditingProfile(false);
    fetchProfile();
  };

  const addCondition = async () => {
    if (!elderId || !newCondition.trim()) return;
    await supabase.from("health_conditions").insert({
      elder_id: elderId,
      condition_name: newCondition.trim(),
      severity: newConditionSeverity,
      notes: newConditionNotes.trim() || null,
    });
    setNewCondition("");
    setNewConditionNotes("");
    setShowAddCondition(false);
    fetchConditions();
  };

  const startEditCondition = (c: HealthCondition) => {
    setEditingConditionId(c.id);
    setEditConditionForm({ condition_name: c.condition_name, severity: c.severity || "moderate", notes: c.notes || "" });
  };

  const saveEditCondition = async () => {
    if (!editingConditionId) return;
    await supabase.from("health_conditions").update({
      condition_name: editConditionForm.condition_name,
      severity: editConditionForm.severity,
      notes: editConditionForm.notes || null,
    }).eq("id", editingConditionId);
    setEditingConditionId(null);
    fetchConditions();
  };

  const deleteCondition = async (id: string) => {
    await supabase.from("health_conditions").delete().eq("id", id);
    fetchConditions();
  };

  const addNote = async () => {
    if (!elderId || !user || !newNote.trim()) return;
    await supabase.from("elder_notes").insert({
      elder_id: elderId,
      author_id: user.id,
      content: newNote.trim(),
    });
    setNewNote("");
    fetchNotes();
  };

  const deleteNote = async (id: string) => {
    await supabase.from("elder_notes").delete().eq("id", id);
    fetchNotes();
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

  const severityColors: Record<string, string> = {
    mild: "bg-success/15 text-success",
    moderate: "bg-warning/15 text-warning",
    severe: "bg-destructive/15 text-destructive",
  };

  const InputField = ({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) => (
    <div>
      <label className="text-sm font-bold text-card-foreground">{label}</label>
      <input
        type={type}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full mt-1 rounded-xl border border-border bg-background px-3 py-2 text-foreground text-sm"
      />
    </div>
  );

  const latestCheckIn = checkIns[0] || null;

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="px-6 pt-12 max-w-md mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-primary font-bold mb-4">
          <ArrowLeft className="w-5 h-5" /> Back
        </button>

        {/* Elder Profile Header */}
        <div className="flex items-center gap-4 mb-6">
          {elderProfile?.avatar_url ? (
            <img src={elderProfile.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-border" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center border-2 border-border">
              <User className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-extrabold text-foreground">{elderProfile?.full_name || "User"}</h1>
            {elderProfile?.phone && <p className="text-sm text-muted-foreground">{elderProfile.phone}</p>}
          </div>
        </div>

        {/* Personal Details */}
        <div className="bg-card rounded-xl p-5 border border-border mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-card-foreground">Personal Details</h2>
            </div>
            {canEdit && (
              <button onClick={() => setEditingProfile(!editingProfile)} className="text-sm text-primary font-bold">
                {editingProfile ? "Cancel" : "Edit"}
              </button>
            )}
          </div>

          {editingProfile ? (
            <div className="space-y-3">
              <InputField label="Full Name" value={profileForm.full_name || ""} onChange={(v) => setProfileForm((p) => ({ ...p, full_name: v }))} />
              <InputField label="Phone" value={profileForm.phone || ""} onChange={(v) => setProfileForm((p) => ({ ...p, phone: v }))} />
              <InputField label="Date of Birth" value={profileForm.date_of_birth || ""} onChange={(v) => setProfileForm((p) => ({ ...p, date_of_birth: v }))} type="date" />
              <div>
                <label className="text-sm font-bold text-card-foreground">Gender</label>
                <select
                  value={profileForm.gender || ""}
                  onChange={(e) => setProfileForm((p) => ({ ...p, gender: e.target.value || null }))}
                  className="w-full mt-1 rounded-xl border border-border bg-background px-3 py-2 text-foreground text-sm"
                >
                  <option value="">Not specified</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <InputField label="Unit / Block No." value={profileForm.address || ""} onChange={(v) => setProfileForm((p) => ({ ...p, address: v }))} placeholder="e.g. Blk 123 #04-56" />
              <InputField label="NRIC (Last 4)" value={profileForm.nric_last4 || ""} onChange={(v) => setProfileForm((p) => ({ ...p, nric_last4: v.slice(0, 4) }))} />
              <InputField label="Emergency Contact Name" value={profileForm.emergency_contact_name || ""} onChange={(v) => setProfileForm((p) => ({ ...p, emergency_contact_name: v }))} />
              <InputField label="Emergency Contact Phone" value={profileForm.emergency_contact_phone || ""} onChange={(v) => setProfileForm((p) => ({ ...p, emergency_contact_phone: v }))} />
              <button onClick={saveProfile} className="w-full bg-primary text-primary-foreground font-bold py-2 rounded-xl flex items-center justify-center gap-2">
                <Save className="w-4 h-4" /> Save
              </button>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              {elderProfile?.date_of_birth && <p><span className="font-bold text-card-foreground">DOB:</span> <span className="text-muted-foreground">{elderProfile.date_of_birth}</span></p>}
              {elderProfile?.gender && <p><span className="font-bold text-card-foreground">Gender:</span> <span className="text-muted-foreground capitalize">{elderProfile.gender}</span></p>}
              {elderProfile?.address && <p><span className="font-bold text-card-foreground">Unit/Block:</span> <span className="text-muted-foreground">{elderProfile.address}</span></p>}
              {elderProfile?.nric_last4 && <p><span className="font-bold text-card-foreground">NRIC:</span> <span className="text-muted-foreground">****{elderProfile.nric_last4}</span></p>}
              {elderProfile?.emergency_contact_name && (
                <p><span className="font-bold text-card-foreground">Emergency:</span> <span className="text-muted-foreground">{elderProfile.emergency_contact_name} {elderProfile.emergency_contact_phone}</span></p>
              )}
              {elderProfile?.preferred_language && <p><span className="font-bold text-card-foreground">Language:</span> <span className="text-muted-foreground capitalize">{elderProfile.preferred_language}</span></p>}
              {!elderProfile?.date_of_birth && !elderProfile?.address && !elderProfile?.emergency_contact_name && (
                <p className="text-muted-foreground">No personal details added yet</p>
              )}
            </div>
          )}
        </div>

        {/* App Data & Battery */}
        <div className="bg-card rounded-xl p-5 border border-border mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Battery className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-card-foreground">Device Info</h2>
          </div>

          {latestCheckIn ? (
            <div className="space-y-2 text-sm">
              {latestCheckIn.battery_level !== null && (
                <div className="flex items-center justify-between">
                  <span className="font-bold text-card-foreground">Battery</span>
                  <span className="text-muted-foreground">
                    {latestCheckIn.battery_level}% {latestCheckIn.is_charging ? "⚡ Charging" : ""}
                  </span>
                </div>
              )}
              {latestCheckIn.last_app_usage_at && (
                <div className="flex items-center justify-between">
                  <span className="font-bold text-card-foreground">Last App Usage</span>
                  <span className="text-muted-foreground">{format(new Date(latestCheckIn.last_app_usage_at), "MMM d, h:mm a")}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="font-bold text-card-foreground">Last Check-in</span>
                <span className="text-muted-foreground">{format(new Date(latestCheckIn.checked_in_at), "MMM d, h:mm a")}</span>
              </div>
              {dataPrefs && (
                <div className="mt-3 pt-3 border-t border-border space-y-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">Sharing Preferences</p>
                  <p className="text-xs text-muted-foreground">Battery: {dataPrefs.share_battery ? "✅ Shared" : "❌ Not shared"}</p>
                  <p className="text-xs text-muted-foreground">App Usage: {dataPrefs.share_app_usage ? "✅ Shared" : "❌ Not shared"}</p>
                  <p className="text-xs text-muted-foreground">Location: {dataPrefs.share_location ? "✅ Shared" : "❌ Not shared"}</p>
                  <p className="text-xs text-muted-foreground">Daily Reminder: {dataPrefs.daily_reminder ? "✅ On" : "❌ Off"}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No device data available yet</p>
          )}
        </div>

        {/* Health Conditions */}
        <div className="bg-card rounded-xl p-5 border border-border mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-card-foreground">Health Conditions</h2>
            </div>
            {canEdit && (
              <button onClick={() => setShowAddCondition(!showAddCondition)} className="text-sm text-primary font-bold">
                {showAddCondition ? "Cancel" : "+ Add"}
              </button>
            )}
          </div>

          {showAddCondition && (
            <div className="space-y-2 mb-4 p-3 bg-background rounded-xl border border-border">
              <input
                value={newCondition}
                onChange={(e) => setNewCondition(e.target.value)}
                placeholder="Condition name (e.g. Diabetes)"
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
              />
              <select
                value={newConditionSeverity}
                onChange={(e) => setNewConditionSeverity(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
              >
                <option value="mild">Mild</option>
                <option value="moderate">Moderate</option>
                <option value="severe">Severe</option>
              </select>
              <input
                value={newConditionNotes}
                onChange={(e) => setNewConditionNotes(e.target.value)}
                placeholder="Notes (optional)"
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
              />
              <button onClick={addCondition} className="w-full bg-primary text-primary-foreground font-bold py-2 rounded-lg text-sm">
                Add Condition
              </button>
            </div>
          )}

          {conditions.length === 0 ? (
            <p className="text-muted-foreground text-sm">No health conditions recorded</p>
          ) : (
            <div className="space-y-2">
              {conditions.map((c) => (
                <div key={c.id} className="p-3 bg-background rounded-xl border border-border">
                  {editingConditionId === c.id ? (
                    <div className="space-y-2">
                      <input
                        value={editConditionForm.condition_name}
                        onChange={(e) => setEditConditionForm((f) => ({ ...f, condition_name: e.target.value }))}
                        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
                      />
                      <select
                        value={editConditionForm.severity}
                        onChange={(e) => setEditConditionForm((f) => ({ ...f, severity: e.target.value }))}
                        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
                      >
                        <option value="mild">Mild</option>
                        <option value="moderate">Moderate</option>
                        <option value="severe">Severe</option>
                      </select>
                      <input
                        value={editConditionForm.notes}
                        onChange={(e) => setEditConditionForm((f) => ({ ...f, notes: e.target.value }))}
                        placeholder="Notes"
                        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
                      />
                      <div className="flex gap-2">
                        <button onClick={saveEditCondition} className="flex-1 bg-primary text-primary-foreground font-bold py-2 rounded-lg text-sm">Save</button>
                        <button onClick={() => setEditingConditionId(null)} className="flex-1 bg-muted text-muted-foreground font-bold py-2 rounded-lg text-sm">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-card-foreground text-sm">{c.condition_name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${severityColors[c.severity || "moderate"] || ""}`}>
                          {c.severity}
                        </span>
                        {c.notes && <p className="text-xs text-muted-foreground mt-1">{c.notes}</p>}
                      </div>
                      {canEdit && (
                        <div className="flex items-center gap-2">
                          <button onClick={() => startEditCondition(c)} className="text-primary">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteCondition(c.id)} className="text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="bg-card rounded-xl p-5 border border-border mb-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-card-foreground">Notes</h2>
          </div>

          {canEdit && (
            <div className="flex gap-2 mb-4">
              <input
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note..."
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                onKeyDown={(e) => e.key === "Enter" && addNote()}
              />
              <button onClick={addNote} className="bg-primary text-primary-foreground px-4 rounded-xl font-bold text-sm">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}

          {notes.length === 0 ? (
            <p className="text-muted-foreground text-sm">No notes yet</p>
          ) : (
            <div className="space-y-2">
              {notes.map((n) => (
                <div key={n.id} className="flex items-start justify-between p-3 bg-background rounded-xl border border-border">
                  <div>
                    <p className="text-sm text-card-foreground">{n.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">{format(new Date(n.created_at), "MMM d, h:mm a")}</p>
                  </div>
                  {n.author_id === user?.id && (
                    <button onClick={() => deleteNote(n.id)} className="text-destructive ml-2">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Schedule */}
        <div className="bg-card rounded-xl p-5 border border-border mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-card-foreground">Schedule</h2>
            </div>
            {canEdit && (
              <button onClick={() => setEditingSchedule(!editingSchedule)} className="text-sm text-primary font-bold">
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
                  className="w-full mt-1 rounded-xl border border-border bg-background px-3 py-2 text-foreground text-sm"
                  placeholder="09:00,18:00"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-card-foreground">Grace period (minutes)</label>
                <input
                  type="number"
                  value={newGrace}
                  onChange={(e) => setNewGrace(Number(e.target.value))}
                  className="w-full mt-1 rounded-xl border border-border bg-background px-3 py-2 text-foreground text-sm"
                />
              </div>
              <button onClick={saveSchedule} className="w-full bg-primary text-primary-foreground font-bold py-2 rounded-xl">
                Save Schedule
              </button>
            </div>
          ) : schedule ? (
            <div className="text-sm space-y-1">
              <p><span className="font-bold text-card-foreground">Times:</span> <span className="text-muted-foreground">{schedule.schedule_times.join(", ")}</span></p>
              <p><span className="font-bold text-card-foreground">Grace period:</span> <span className="text-muted-foreground">{schedule.grace_period_minutes} min</span></p>
              <p><span className="font-bold text-card-foreground">Days:</span> <span className="text-muted-foreground">{schedule.days_of_week.map((d) => dayNames[d]).join(", ")}</span></p>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No schedule set yet</p>
          )}
        </div>

        {/* Recent Check-ins */}
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
                        <p className="text-sm font-bold text-card-foreground">{format(new Date(entry.checked_in_at), "h:mm a")}</p>
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
