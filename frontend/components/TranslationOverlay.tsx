"use client";

import { useEffect, useRef } from "react";
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

export default function TranslationOverlay() {
  const { language, setLanguage } = useAppStore();
  const intervalRef = useRef<number | null>(null);

  const applyGoogleLanguage = (lang: string) => {
    const combo = document.querySelector(".goog-te-combo") as HTMLSelectElement | null;
    if (combo) {
      combo.value = lang;
      combo.dispatchEvent(new Event("change"));
      return true;
    }
    return false;
  };

  const applyCookieFallback = (lang: string) => {
    const value = `/en/${lang}`;
    document.cookie = `googtrans=${value}; path=/`;
    document.cookie = `googtrans=${value}; domain=${window.location.hostname}; path=/`;
  };

  useEffect(() => {
    let attempts = 0;
    const run = () => {
      const ok = applyGoogleLanguage(language);
      if (!ok) applyCookieFallback(language);
      attempts += 1;
      if (ok || attempts > 20) {
        if (intervalRef.current) window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    run();
    intervalRef.current = window.setInterval(run, 300);

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [language]);

  const handleLanguageChange = (nextLang: string) => {
    if (nextLang === language) return;
    setLanguage(nextLang);
    const applied = applyGoogleLanguage(nextLang);
    applyCookieFallback(nextLang);

    // Google translate can be inconsistent in SPA mode; force soft refresh
    // so translation applies immediately without manual user refresh.
    if (!applied) {
      window.setTimeout(() => window.location.reload(), 120);
    } else {
      window.setTimeout(() => {
        const combo = document.querySelector(".goog-te-combo") as HTMLSelectElement | null;
        if (combo?.value !== nextLang) window.location.reload();
      }, 220);
    }
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

      {/* Keep mount in DOM (not display:none) so Google can initialize combo reliably */}
      <div id="google_translate_element" className="fixed -left-[9999px] top-0 opacity-0 pointer-events-none" />

      <Script id="google-translate-init" strategy="afterInteractive">
        {`
          window.googleTranslateElementInit = function () {
            if (!window.google || !window.google.translate) return;
            new window.google.translate.TranslateElement({
              pageLanguage: 'en',
              includedLanguages: 'en,hi,mr,te,ta',
              layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
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
        .goog-te-banner-frame.skiptranslate,
        .goog-te-balloon-frame,
        body > .skiptranslate,
        #goog-gt-tt,
        .goog-tooltip {
          display: none !important;
          visibility: hidden !important;
        }
        body { top: 0px !important; }
        iframe.goog-te-menu-frame { z-index: 2147483647 !important; }
      `,
        }}
      />
    </>
  );
}
