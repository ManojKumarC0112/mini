"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { Globe } from "lucide-react";

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
  const [lang, setLangState] = useState("en");

  useEffect(() => {
    // Check localStorage for previous language preference
    const hasUserLang = localStorage.getItem("ks_lang_set") === "1";
    const savedLang = hasUserLang ? localStorage.getItem("ks_lang") || "en" : "en";
    if (!hasUserLang) {
      localStorage.setItem("ks_lang", "en");
    }
    setLangState(savedLang);

    const setLang = (newLang: string) => {
      // Clear existing cookies
      document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=${window.location.hostname}; path=/;`;
      
      // Set new cookies
      document.cookie = `googtrans=/en/${newLang}; path=/`;
      document.cookie = `googtrans=/en/${newLang}; domain=${window.location.hostname}; path=/`;
      
      localStorage.setItem("ks_lang", newLang);
      
      // If the language is being changed to something other than the current translated state, reload
      // However, on first load, we should just ensure cookies are correct.
    };

    // On initial load, ensure the cookie matches the saved preference
    setLang(savedLang);

    const handler = (e: Event) => {
      const target = e.target as HTMLSelectElement | null;
      if (!target) return;
      const val = target.value || "en";
      if (val !== lang) {
        localStorage.setItem("ks_lang_set", "1");
        setLang(val);
        window.location.reload();
      }
    };

    const attach = () => {
      const combo = document.querySelector(".goog-te-combo") as HTMLSelectElement | null;
      if (combo) {
        combo.removeEventListener("change", handler);
        combo.addEventListener("change", handler);
      }
    };

    const intervalId = window.setInterval(attach, 300);
    attach();

    return () => {
      clearInterval(intervalId);
    };
  }, [lang]);

  const handleLangChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value;
    setLangState(newLang);
    
    document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=${window.location.hostname}; path=/;`;
    document.cookie = `googtrans=/en/${newLang}; path=/`;
    document.cookie = `googtrans=/en/${newLang}; domain=${window.location.hostname}; path=/`;
    
    localStorage.setItem("ks_lang", newLang);
    localStorage.setItem("ks_lang_set", "1");
    window.location.reload();
  };

  return (
    <>
      <div className="fixed top-[72px] right-3 md:top-4 md:right-4 z-[12050] bg-white/90 backdrop-blur-md border border-slate-200 rounded-xl px-2.5 md:px-3 py-2 flex items-center gap-2 shadow-sm">
        <Globe size={18} className="text-emerald-600" />
        <label htmlFor="ui-lang" className="sr-only">
          Select Language
        </label>
        <select
          id="ui-lang"
          value={lang}
          onChange={handleLangChange}
          className="bg-transparent text-xs md:text-sm font-bold text-slate-800 outline-none border border-slate-200 rounded-lg px-2 py-1 min-w-[126px]"
        >
          <option value="en">English</option>
          <option value="hi">Hindi</option>
          <option value="mr">Marathi</option>
        </select>
      </div>

      <div id="google_translate_element" className="fixed -left-[9999px] top-0 opacity-0 pointer-events-none" />

      <Script id="google-translate-early-cookie" strategy="afterInteractive">
        {`
          try {
            var lang = localStorage.getItem('ks_lang') || 'en';
            if (lang) {
              document.cookie = 'googtrans=/en/' + lang + '; path=/';
              document.cookie = 'googtrans=/en/' + lang + '; domain=' + location.hostname + '; path=/';
            }
          } catch (e) {}
        `}
      </Script>

      <Script id="google-translate-init" strategy="afterInteractive">
        {`
          window.googleTranslateElementInit = function () {
            if (!window.google || !window.google.translate || !window.google.translate.TranslateElement) return;
            new window.google.translate.TranslateElement({
              pageLanguage: 'en',
              includedLanguages: 'en,hi,mr',
              autoDisplay: false
            }, 'google_translate_element');
          };
        `}
      </Script>
      <Script src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit" strategy="afterInteractive" />
    </>
  );
}
