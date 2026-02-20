import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import BottomNav from "@/components/BottomNav";
import { Battery, Smartphone, MapPin, Bell, Shield, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface DataPreferences {
  share_battery: boolean;
  share_app_usage: boolean;
  share_location: boolean;
  daily_reminder: boolean;
}

const SettingsPage = () => {
  const { user, profile, signOut } = useAuth();
  const [prefs, setPrefs] = useState<DataPreferences>({
    share_battery: false,
    share_app_usage: false,
    share_location: false,
    daily_reminder: true,
  });

  useEffect(() => {
    if (!user) return;
    supabase
      .from("data_preferences")
      .select("share_battery, share_app_usage, share_location, daily_reminder")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setPrefs(data);
      });
  }, [user]);

  const toggle = async (key: keyof DataPreferences) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    if (user) {
      await supabase
        .from("data_preferences")
        .update({ [key]: updated[key] })
        .eq("user_id", user.id);
    }
  };

  const settingsGroups = [
    {
      title: "Data Sharing",
      description: "Choose what information to share with your care team",
      items: [
        { key: "share_battery" as const, icon: Battery, label: "Battery Level", description: "Share your phone's battery status" },
        { key: "share_app_usage" as const, icon: Smartphone, label: "App Usage", description: "Share when you last used your phone" },
        { key: "share_location" as const, icon: MapPin, label: "Location", description: "Share your approximate location" },
      ],
    },
    {
      title: "Notifications",
      description: "Manage your reminders",
      items: [
        { key: "daily_reminder" as const, icon: Bell, label: "Daily Reminder", description: "Get a daily reminder to check in" },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="px-6 pt-12 max-w-md mx-auto">
        <h1 className="text-3xl font-extrabold text-foreground mb-2">Settings</h1>
        <p className="text-muted-foreground mb-8">Control your privacy and preferences</p>

        {profile && (
          <div className="bg-card rounded-xl p-4 border border-border mb-6">
            <p className="font-bold text-card-foreground text-lg">{profile.full_name || "User"}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        )}

        <div className="space-y-8">
          {settingsGroups.map((group) => (
            <div key={group.title}>
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">{group.title}</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">{group.description}</p>
              <div className="space-y-3">
                {group.items.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between bg-card rounded-xl p-4 border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <item.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-card-foreground">{item.label}</p>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                    <Switch checked={prefs[item.key]} onCheckedChange={() => toggle(item.key)} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 bg-card rounded-xl p-5 border border-border">
          <h3 className="font-bold text-card-foreground mb-1">Your Privacy Matters</h3>
          <p className="text-sm text-muted-foreground">
            All shared data is only visible to your designated care team. You can change these settings at any time.
          </p>
        </div>

        <button
          onClick={signOut}
          className="mt-6 w-full flex items-center justify-center gap-2 bg-destructive text-destructive-foreground font-bold py-3 rounded-xl"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
      <BottomNav />
    </div>
  );
};

export default SettingsPage;
