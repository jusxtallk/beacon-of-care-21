import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Language, t as translate } from "@/lib/i18n";

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: Parameters<typeof translate>[0]) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "en",
  setLang: () => {},
  t: (key) => translate(key, "en"),
});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [lang, setLangState] = useState<Language>("en");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("preferred_language")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.preferred_language) {
          setLangState(data.preferred_language as Language);
        }
      });
  }, [user]);

  const setLang = async (newLang: Language) => {
    setLangState(newLang);
    if (user) {
      await supabase
        .from("profiles")
        .update({ preferred_language: newLang })
        .eq("user_id", user.id);
    }
  };

  const tFn = (key: Parameters<typeof translate>[0]) => translate(key, lang);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: tFn }}>
      {children}
    </LanguageContext.Provider>
  );
};
