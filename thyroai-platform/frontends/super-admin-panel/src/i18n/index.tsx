import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { translations } from "./locales";

export type Lang = "en" | "az" | "ru" | "tr";

export const LANGS: { code: Lang; label: string; name: string }[] = [
  { code: "en", label: "EN", name: "English" },
  { code: "az", label: "AZ", name: "Azərbaycan" },
  { code: "ru", label: "RU", name: "Русский" },
  { code: "tr", label: "TR", name: "Türkçe" },
];

const STORAGE_KEY = "thyroai_lang";
const CODES: Lang[] = ["en", "az", "ru", "tr"];

function getInitialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (saved && CODES.includes(saved)) return saved;
    const nav = navigator.language?.slice(0, 2).toLowerCase();
    if (nav && CODES.includes(nav as Lang)) return nav as Lang;
  } catch { /* ignore */ }
  return "en";
}

export type TranslateFn = (key: string, vars?: Record<string, string | number>) => string;

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: TranslateFn;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getInitialLang);

  const setLang = useCallback((next: Lang) => {
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
    setLangState(next);
    try { document.documentElement.lang = next; } catch { /* ignore */ }
  }, []);

  const t = useCallback<TranslateFn>((key, vars) => {
    const dict = translations[lang] ?? translations.en;
    let str = dict[key] ?? translations.en[key] ?? key;
    if (vars) {
      for (const k of Object.keys(vars)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(vars[k]));
      }
    }
    return str;
  }, [lang]);

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within a LanguageProvider");
  return ctx;
}

/** Convenience hook returning just the translate function. */
export function useT(): TranslateFn {
  return useI18n().t;
}
