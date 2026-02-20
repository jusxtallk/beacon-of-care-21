import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { LANGUAGES, type Language } from "@/lib/i18n";
import { Camera, ChevronRight, Check, Heart } from "lucide-react";

type Step = "language" | "photo" | "preferences" | "done";

const SetupWizard = () => {
  const { user, markSetupComplete } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("language");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [prefs, setPrefs] = useState({
    share_battery: false,
    share_app_usage: false,
    daily_reminder: true,
  });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);

    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (!error) {
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      await supabase.from("profiles").update({ avatar_url: urlData.publicUrl }).eq("user_id", user.id);
      setAvatarUrl(urlData.publicUrl + "?t=" + Date.now());
    }
    setUploading(false);
  };

  const savePrefsAndFinish = async () => {
    if (!user) return;
    await supabase
      .from("data_preferences")
      .update({
        share_battery: prefs.share_battery,
        share_app_usage: prefs.share_app_usage,
        daily_reminder: prefs.daily_reminder,
      })
      .eq("user_id", user.id);

    setStep("done");
    setTimeout(() => markSetupComplete(), 1500);
  };

  const stepLabels: Record<string, { en: string; zh: string; ms: string; ta: string }> = {
    language: { en: "Choose Language", zh: "选择语言", ms: "Pilih Bahasa", ta: "மொழியைத் தேர்ந்தெடுக்கவும்" },
    photo: { en: "Your Photo", zh: "您的照片", ms: "Foto Anda", ta: "உங்கள் புகைப்படம்" },
    preferences: { en: "Privacy Settings", zh: "隐私设置", ms: "Tetapan Privasi", ta: "தனியுரிமை அமைப்புகள்" },
  };

  const nextLabel: Record<string, string> = {
    en: "Next",
    zh: "下一步",
    ms: "Seterusnya",
    ta: "அடுத்து",
  };

  const getStepTitle = (s: string) => {
    const labels = stepLabels[s];
    return labels ? labels[lang] || labels.en : "";
  };

  const stepIndex = ["language", "photo", "preferences"].indexOf(step);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center mb-3">
            <Heart className="w-8 h-8 text-primary-foreground" fill="currentColor" />
          </div>
          <h1 className="text-2xl font-extrabold text-foreground">SafeCheck</h1>
        </div>

        {/* Progress dots */}
        {step !== "done" && (
          <div className="flex justify-center gap-3 mb-8">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full transition-colors ${
                  i <= stepIndex ? "bg-primary" : "bg-border"
                }`}
              />
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          {step === "language" && (
            <motion.div key="lang" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
              <h2 className="text-2xl font-extrabold text-foreground text-center mb-2">
                {getStepTitle("language")}
              </h2>
              <p className="text-muted-foreground text-center mb-6 text-lg">
                Select your preferred language
              </p>

              <div className="space-y-3 mb-8">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => setLang(l.code)}
                    className={`w-full rounded-2xl border-3 p-5 text-left transition-all ${
                      lang === l.code
                        ? "border-primary bg-primary/10 shadow-md"
                        : "border-border bg-card"
                    }`}
                  >
                    <p className="font-extrabold text-card-foreground text-xl">{l.nativeLabel}</p>
                    <p className="text-muted-foreground text-base">{l.label}</p>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setStep("photo")}
                className="w-full bg-primary text-primary-foreground font-extrabold text-xl py-5 rounded-2xl flex items-center justify-center gap-2"
              >
                {nextLabel[lang] || nextLabel.en}
                <ChevronRight className="w-6 h-6" />
              </button>
            </motion.div>
          )}

          {step === "photo" && (
            <motion.div key="photo" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
              <h2 className="text-2xl font-extrabold text-foreground text-center mb-2">
                {getStepTitle("photo")}
              </h2>
              <p className="text-muted-foreground text-center mb-8 text-lg">
                {t("photo_required")}
              </p>

              <div className="flex justify-center mb-8">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-40 h-40 rounded-full border-4 border-dashed border-primary bg-primary/5 flex items-center justify-center overflow-hidden"
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center">
                      <Camera className="w-12 h-12 text-primary" />
                      <span className="text-primary font-bold mt-2 text-sm">{t("upload_photo")}</span>
                    </div>
                  )}
                  {uploading && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full">
                      <span className="text-white font-bold">...</span>
                    </div>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </div>

              <button
                onClick={() => setStep("preferences")}
                disabled={!avatarUrl}
                className="w-full bg-primary text-primary-foreground font-extrabold text-xl py-5 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {nextLabel[lang] || nextLabel.en}
                <ChevronRight className="w-6 h-6" />
              </button>
            </motion.div>
          )}

          {step === "preferences" && (
            <motion.div key="prefs" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
              <h2 className="text-2xl font-extrabold text-foreground text-center mb-2">
                {getStepTitle("preferences")}
              </h2>
              <p className="text-muted-foreground text-center mb-6 text-lg">
                {t("data_sharing_desc")}
              </p>

              <div className="space-y-4 mb-8">
                {[
                  { key: "share_battery", label: t("battery_level"), desc: t("battery_desc"), emoji: "🔋" },
                  { key: "share_app_usage", label: t("app_usage"), desc: t("app_usage_desc"), emoji: "📱" },
                  { key: "daily_reminder", label: t("daily_reminder"), desc: t("daily_reminder_desc"), emoji: "🔔" },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setPrefs((p) => ({ ...p, [item.key]: !p[item.key as keyof typeof p] }))}
                    className={`w-full rounded-2xl border-2 p-5 text-left transition-all flex items-center gap-4 ${
                      prefs[item.key as keyof typeof prefs]
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card"
                    }`}
                  >
                    <span className="text-3xl">{item.emoji}</span>
                    <div className="flex-1">
                      <p className="font-bold text-card-foreground text-lg">{item.label}</p>
                      <p className="text-muted-foreground text-sm">{item.desc}</p>
                    </div>
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                      prefs[item.key as keyof typeof prefs] ? "bg-primary border-primary" : "border-border"
                    }`}>
                      {prefs[item.key as keyof typeof prefs] && (
                        <Check className="w-5 h-5 text-primary-foreground" strokeWidth={3} />
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={savePrefsAndFinish}
                className="w-full bg-success text-success-foreground font-extrabold text-xl py-5 rounded-2xl flex items-center justify-center gap-2"
              >
                {t("done")} ✓
              </button>
            </motion.div>
          )}

          {step === "done" && (
            <motion.div
              key="done"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex flex-col items-center py-12"
            >
              <div className="w-28 h-28 rounded-full bg-success flex items-center justify-center mb-6">
                <Check className="w-16 h-16 text-success-foreground" strokeWidth={3} />
              </div>
              <h2 className="text-2xl font-extrabold text-foreground">{t("done")}</h2>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SetupWizard;
