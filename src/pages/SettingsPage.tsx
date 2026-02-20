import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import BottomNav from "@/components/BottomNav";
import { Battery, Smartphone, MapPin, Bell, Shield } from "lucide-react";

interface DataPreferences {
  shareBattery: boolean;
  shareAppUsage: boolean;
  shareLocation: boolean;
  dailyReminder: boolean;
}

const PREFS_KEY = "checkin-preferences";

const getPrefs = (): DataPreferences => {
  const data = localStorage.getItem(PREFS_KEY);
  return data
    ? JSON.parse(data)
    : { shareBattery: true, shareAppUsage: false, shareLocation: false, dailyReminder: true };
};

const SettingsPage = () => {
  const [prefs, setPrefs] = useState<DataPreferences>(getPrefs);

  useEffect(() => {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  }, [prefs]);

  const toggle = (key: keyof DataPreferences) => {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  };

  const settingsGroups = [
    {
      title: "Data Sharing",
      description: "Choose what information to share with your care team",
      items: [
        {
          key: "shareBattery" as const,
          icon: Battery,
          label: "Battery Level",
          description: "Share your phone's battery status",
        },
        {
          key: "shareAppUsage" as const,
          icon: Smartphone,
          label: "App Usage",
          description: "Share when you last used your phone",
        },
        {
          key: "shareLocation" as const,
          icon: MapPin,
          label: "Location",
          description: "Share your approximate location",
        },
      ],
    },
    {
      title: "Notifications",
      description: "Manage your reminders",
      items: [
        {
          key: "dailyReminder" as const,
          icon: Bell,
          label: "Daily Reminder",
          description: "Get a daily reminder to check in",
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="px-6 pt-12 max-w-md mx-auto">
        <h1 className="text-3xl font-extrabold text-foreground mb-2">Settings</h1>
        <p className="text-muted-foreground mb-8">
          Control your privacy and preferences
        </p>

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
                    <Switch
                      checked={prefs[item.key]}
                      onCheckedChange={() => toggle(item.key)}
                    />
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
      </div>
      <BottomNav />
    </div>
  );
};

export default SettingsPage;
