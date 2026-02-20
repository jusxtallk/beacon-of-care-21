import { useState, useEffect, useRef } from "react";
import { Switch } from "@/components/ui/switch";
import BottomNav from "@/components/BottomNav";
import { Battery, Smartphone, MapPin, Bell, Shield, LogOut, Globe, Camera, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { LANGUAGES, type Language } from "@/lib/i18n";

interface DataPreferences {
  share_battery: boolean;
  share_app_usage: boolean;
  share_location: boolean;
  daily_reminder: boolean;
}

const SettingsPage = () => {
  const { user, role, profile, signOut } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
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

    supabase
      .from("profiles")
      .select("avatar_url, link_code")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.avatar_url) setAvatarUrl(data.avatar_url);
        if (data?.link_code) setLinkCode(data.link_code);
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (!uploadError) {
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = urlData.publicUrl;

      await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("user_id", user.id);

      setAvatarUrl(publicUrl + "?t=" + Date.now());
    }
    setUploading(false);
  };

  const settingsGroups = [
    {
      title: t("data_sharing"),
      description: t("data_sharing_desc"),
      items: [
        { key: "share_battery" as const, icon: Battery, label: t("battery_level"), description: t("battery_desc") },
        { key: "share_app_usage" as const, icon: Smartphone, label: t("app_usage"), description: t("app_usage_desc") },
        { key: "share_location" as const, icon: MapPin, label: t("location"), description: t("location_desc") },
      ],
    },
    {
      title: t("notifications"),
      description: t("notifications_desc"),
      items: [
        { key: "daily_reminder" as const, icon: Bell, label: t("daily_reminder"), description: t("daily_reminder_desc") },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="px-6 pt-12 max-w-md mx-auto">
        <h1 className="text-3xl font-extrabold text-foreground mb-2">{t("settings")}</h1>
        <p className="text-muted-foreground mb-8">{t("control_privacy")}</p>

        {/* Profile section with avatar */}
        <div className="bg-card rounded-xl p-4 border border-border mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="relative w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-border"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <Camera className="w-6 h-6 text-muted-foreground" />
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white text-xs">...</span>
                </div>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={handleAvatarUpload}
            />
            <div>
              <p className="font-bold text-card-foreground text-lg">{profile?.full_name || "User"}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              {!avatarUrl && (
                <p className="text-xs text-destructive font-semibold mt-1">{t("photo_required")}</p>
              )}
            </div>
          </div>
        </div>

        {/* Unique Link Code - only for elders */}
        {role === "elder" && linkCode && (
          <div className="bg-card rounded-xl p-4 border border-border mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-card-foreground">{t("your_code")}</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-3">{t("your_code_desc")}</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-background border-2 border-primary/30 rounded-xl px-4 py-3 text-center">
                <span className="text-2xl font-mono font-extrabold tracking-[0.3em] text-foreground">{linkCode}</span>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(linkCode);
                  setCodeCopied(true);
                  setTimeout(() => setCodeCopied(false), 2000);
                }}
                className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"
              >
                {codeCopied ? (
                  <Check className="w-5 h-5 text-primary" />
                ) : (
                  <Copy className="w-5 h-5 text-primary" />
                )}
              </button>
            </div>
            {codeCopied && <p className="text-xs text-primary font-bold mt-2 text-center">{t("copied")}</p>}
          </div>
        )}

        {/* Language selector */}
        <div className="bg-card rounded-xl p-4 border border-border mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-card-foreground">{t("language")}</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-3">{t("language_desc")}</p>
          <div className="grid grid-cols-2 gap-2">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className={`rounded-xl border-2 p-3 text-left transition-colors ${
                  lang === l.code
                    ? "border-primary bg-primary/10"
                    : "border-border bg-background"
                }`}
              >
                <p className="font-bold text-card-foreground text-sm">{l.nativeLabel}</p>
                <p className="text-xs text-muted-foreground">{l.label}</p>
              </button>
            ))}
          </div>
        </div>

        {role === "elder" && (
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
        )}

        <div className="mt-10 bg-card rounded-xl p-5 border border-border">
          <h3 className="font-bold text-card-foreground mb-1">{t("privacy_title")}</h3>
          <p className="text-sm text-muted-foreground">{t("privacy_desc")}</p>
        </div>

        <button
          onClick={signOut}
          className="mt-6 w-full flex items-center justify-center gap-2 bg-destructive text-destructive-foreground font-bold py-3 rounded-xl"
        >
          <LogOut className="w-5 h-5" />
          {t("sign_out")}
        </button>
      </div>
      <BottomNav />
    </div>
  );
};

export default SettingsPage;
