"use client";

import { useEffect } from "react";
import Script from "next/script";
import { Globe } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

const SUPPORTED = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "mr", label: "Marathi" },
  { code: "te", label: "Telugu" },
  { code: "ta", label: "Tamil" },
];

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: {
      translate?: {
        TranslateElement?: new (options: object, id: string) => unknown;
      };
    };
  }
}

export default function TranslationOverlay() {
  const { language, setLanguage } = useAppStore();

  const applyGoogleLanguage = (lang: string) => {
    const combo = document.querySelector(".goog-te-combo") as HTMLSelectElement | null;
    if (!combo) return false;
    combo.value = lang;
    combo.dispatchEvent(new Event("change"));
    return true;
  };

  const applyCookie = (lang: string) => {
    const value = `/en/${lang}`;
    document.cookie = `googtrans=${value}; path=/`;
    document.cookie = `googtrans=${value}; domain=${window.location.hostname}; path=/`;
  };

  useEffect(() => {
    // Keep Google and app language aligned after reload.
    const t = setTimeout(() => {
      applyCookie(language);
      applyGoogleLanguage(language);
    }, 400);
    return () => clearTimeout(t);
  }, [language]);

  const handleLanguageChange = (nextLang: string) => {
    if (nextLang === language) return;
    setLanguage(nextLang);
    applyCookie(nextLang);
    applyGoogleLanguage(nextLang);
    // Full reload gives Google Translate clean DOM ownership.
    window.setTimeout(() => window.location.reload(), 120);
  };

  return (
    <>
      <div className="fixed top-[72px] right-3 md:top-4 md:right-4 z-[12050] bg-white/90 backdrop-blur-md border border-slate-200 rounded-xl px-2.5 md:px-3 py-2 flex items-center gap-2 shadow-sm">
        <Globe size={18} className="text-primary" />
        <label htmlFor="ui-lang" className="sr-only">
          Select Language
        </label>
        <select
          id="ui-lang"
          value={language}
          onChange={(e) => handleLanguageChange(e.target.value)}
          className="bg-transparent text-xs md:text-sm font-bold text-slate-800 outline-none border border-slate-200 rounded-lg px-2 py-1 min-w-[126px]"
        >
          {SUPPORTED.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>

      <div id="google_translate_element" className="fixed -left-[9999px] top-0 opacity-0 pointer-events-none" />

      <Script id="google-translate-init" strategy="afterInteractive">
        {`
          window.googleTranslateElementInit = function () {
            if (!window.google || !window.google.translate || !window.google.translate.TranslateElement) return;
            new window.google.translate.TranslateElement({
              pageLanguage: 'en',
              includedLanguages: 'en,hi,mr,te,ta',
              autoDisplay: false
            }, 'google_translate_element');
          };
        `}
      </Script>
      <Script src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit" strategy="afterInteractive" />

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .goog-te-banner-frame,
            .goog-te-balloon-frame,
            #goog-gt-tt,
            .goog-tooltip {
              display: none !important;
              visibility: hidden !important;
            }
            body { top: 0 !important; }
          `,
        }}
      />
    </>
  );
}
