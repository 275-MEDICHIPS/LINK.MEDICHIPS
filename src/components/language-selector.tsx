"use client";

import { useState, useRef, useEffect } from "react";
import { Globe, Check } from "lucide-react";
import { useLocale } from "next-intl";

const LANGUAGES = [
  { code: "en", name: "English", native: "English" },
  { code: "ko", name: "Korean", native: "한국어" },
  { code: "ja", name: "Japanese", native: "日本語" },
  { code: "zh", name: "Chinese", native: "中文" },
  { code: "es", name: "Spanish", native: "Español" },
  { code: "fr", name: "French", native: "Français" },
  { code: "de", name: "German", native: "Deutsch" },
  { code: "pt", name: "Portuguese", native: "Português" },
  { code: "ru", name: "Russian", native: "Русский" },
  { code: "ar", name: "Arabic", native: "العربية" },
  { code: "hi", name: "Hindi", native: "हिन्दी" },
  { code: "bn", name: "Bengali", native: "বাংলা" },
  { code: "id", name: "Indonesian", native: "Bahasa Indonesia" },
  { code: "vi", name: "Vietnamese", native: "Tiếng Việt" },
  { code: "th", name: "Thai", native: "ไทย" },
  { code: "tr", name: "Turkish", native: "Türkçe" },
  { code: "sw", name: "Swahili", native: "Kiswahili" },
  { code: "km", name: "Khmer", native: "ខ្មែរ" },
  { code: "am", name: "Amharic", native: "አማርኛ" },
  { code: "my", name: "Burmese", native: "မြန်မာ" },
] as const;

export function LanguageSelector({ variant = "default" }: { variant?: "default" | "compact" }) {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = LANGUAGES.find((l) => l.code === locale) || LANGUAGES[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectLanguage(code: string) {
    document.cookie = `locale=${code};path=/;max-age=${365 * 24 * 60 * 60};samesite=lax`;
    setOpen(false);
    window.location.reload();
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 transition-colors"
        aria-label="Change language"
      >
        <Globe className="h-4 w-4" />
        <span className={variant === "compact" ? "hidden" : "hidden sm:inline"}>
          {current.code.toUpperCase()}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 max-h-80 w-56 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="p-1">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => selectLanguage(lang.code)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  lang.code === locale
                    ? "bg-brand-50 text-brand-600"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span>
                  <span className="font-medium">{lang.native}</span>
                  {lang.native !== lang.name && (
                    <span className="ml-1.5 text-gray-400">{lang.name}</span>
                  )}
                </span>
                {lang.code === locale && <Check className="h-4 w-4 text-brand-500" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
