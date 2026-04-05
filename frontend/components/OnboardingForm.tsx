"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import CinematicSpotlight, { SpotlightStep } from "./CinematicSpotlight";
import { motion } from "framer-motion";
import FrostedCard from "./FrostedCard";
import { ArrowRight, MapPin, Search, Loader2 } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

type SearchResult = {
  display_name: string;
  lat: string;
  lon: string;
  address?: { city?: string; district?: string; state?: string };
};

export default function OnboardingForm({ onComplete }: { onComplete: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [index, setIndex] = useState(0);
  const [isLocating, setIsLocating] = useState(false);
  const { setLocation, setUserId, setUserName, setUserPhone, language, setDistrict } = useAppStore();
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const steps: SpotlightStep[] = useMemo(() => {
    if (language === "hi") {
      return [
        { target: ".step-name", title: "स्वागत है", content: "कृपया अपना पूरा नाम दर्ज करें।" },
        { target: ".step-phone", title: "पहचान", content: "अब अपना 10 अंकों का मोबाइल नंबर दर्ज करें।" },
        { target: ".step-location", title: "स्थान", content: "अपना पता दर्ज करें या लोकेशन अनुमति दें।" },
        { target: ".step-submit", title: "अंतिम चरण", content: "अब आगे बढ़ने के लिए Initialize Node दबाएं।" },
      ];
    }
    if (language === "mr") {
      return [
        { target: ".step-name", title: "स्वागत", content: "कृपया तुमचे पूर्ण नाव भरा." },
        { target: ".step-phone", title: "ओळख", content: "आता तुमचा 10 अंकी मोबाईल नंबर भरा." },
        { target: ".step-location", title: "स्थान", content: "तुमचा पत्ता भरा किंवा लोकेशन परवानगी द्या." },
        { target: ".step-submit", title: "शेवटचा टप्पा", content: "पुढे जाण्यासाठी Initialize Node दाबा." },
      ];
    }
    return [
      { target: ".step-name", title: "Welcome", content: "Please enter your full name." },
      { target: ".step-phone", title: "Identity", content: "Now enter your 10-digit mobile number." },
      { target: ".step-location", title: "Location", content: "Enter your address or allow GPS location." },
      { target: ".step-submit", title: "Final Step", content: "Press Initialize Node to continue." },
    ];
  }, [language]);

  const speakStep = useCallback(async (text: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang =
        language === "hi" ? "hi-IN" : language === "mr" ? "mr-IN" : language === "te" ? "te-IN" : language === "ta" ? "ta-IN" : "en-IN";
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    }
  }, [language]);

  const triggerSarvamAudio = useCallback(async (text: string) => {
    try {
      await fetch(`http://localhost:8000/api/tts?text=${encodeURIComponent(text)}&language=${language}`, {
        method: "POST",
      });
    } catch (e) {
      console.error("Sarvam TTS Fetch Error:", e);
    }
  }, [language]);

  useEffect(() => {
    const step = steps[index];
    if (step?.content) {
      speakStep(step.content);
      triggerSarvamAudio(step.content);
    }
  }, [index, steps, speakStep, triggerSarvamAudio]);

  const autoDetectLocation = () => {
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation([pos.coords.latitude, pos.coords.longitude]);
        setAddress("Current Location");
        setDistrict("Auto-Detected District");
        setIndex(3);
        setIsLocating(false);
      },
      (err) => {
        console.error(err);
        setIsLocating(false);
        alert("Please enable location permissions in your browser.");
      }
    );
  };

  const handleSearch = async (query: string) => {
    setAddress(query);
    if (index === 2 && query.trim().length >= 3) setIndex(3);
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&countrycodes=in&addressdetails=1`
      );
      const data = (await res.json()) as SearchResult[];
      setSearchResults(data);
    } catch (e) {
      console.error("Search failed", e);
    }
    setIsSearching(false);
  };

  const selectLocation = (item: SearchResult) => {
    setAddress(item.display_name);
    setDistrict(item.address?.city || item.address?.district || item.address?.state || "");
    setLocation([parseFloat(item.lat), parseFloat(item.lon)]);
    setSearchResults([]);
    setIndex(3);
  };

  const handleRegister = async () => {
    setUserId(`user_${phone}`);
    setUserName(name);
    setUserPhone(phone);
    try {
      await fetch(`http://localhost:8000/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, address }),
      });
    } catch (e) {
      console.warn("Backend link established locally.", e);
    }
    onComplete();
  };

  return (
    <>
      <CinematicSpotlight
        steps={steps}
        onComplete={() => {}}
        currentIndex={index}
        allowManualControls={false}
        onStepChange={(i) => {
          setIndex(i);
          if (steps[i]) {
            speakStep(steps[i].content);
            triggerSarvamAudio(steps[i].content);
          }
        }}
      />

      <motion.div
        key="farmer-signup"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[calc(100vw-32px)] md:max-w-md relative z-10 mx-auto"
      >
        <div className="absolute -top-14 -left-10 w-44 h-44 rounded-full bg-emerald-300/25 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-10 w-40 h-40 rounded-full bg-emerald-400/20 blur-3xl pointer-events-none" />

        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 text-[11px] font-bold uppercase tracking-widest mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Onboarding Spotlight
          </div>
          <h2 className="text-2xl md:text-4xl font-manrope font-black text-slate-900 tracking-tight">
            {language === "hi" ? "किसान ऑनबोर्डिंग" : language === "mr" ? "शेतकरी ऑनबोर्डिंग" : "Farmer Onboarding"}
          </h2>
          <p className="text-sm md:text-base text-slate-500 font-inter mt-3">
            {language === "hi"
              ? "अपना स्थानीय इंटेलिजेंस नोड शुरू करें।"
              : language === "mr"
              ? "तुमचा स्थानिक इंटेलिजन्स नोड सुरू करा."
              : "Initialize your local intelligence node."}
          </p>
        </div>

        <FrostedCard className="p-6 md:p-10 flex flex-col gap-6 md:gap-8 relative border-slate-200/60 shadow-xl shadow-slate-200/30">
          <div className="step-name flex flex-col gap-3">
            <label className="text-slate-600 text-sm font-bold uppercase tracking-widest">
              {language === "hi" ? "पूरा नाम" : language === "mr" ? "पूर्ण नाव" : "Full Name"}
            </label>
            <input
              autoFocus
              type="text"
              placeholder={language === "hi" ? "रमेश कुमार..." : language === "mr" ? "रमेश कुमार..." : "Ramesh Kumar..."}
              className="w-full bg-slate-50 text-slate-900 rounded-xl p-4 border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:outline-none transition-all font-inter font-medium"
              value={name}
              onChange={(e) => {
                const val = e.target.value;
                setName(val);
                if (index === 0 && val.trim().length >= 3) setIndex(1);
              }}
            />
          </div>

          <div className="step-phone flex flex-col gap-3">
            <label className="text-slate-600 text-sm font-bold uppercase tracking-widest">
              {language === "hi" ? "मोबाइल नंबर" : language === "mr" ? "मोबाईल नंबर" : "Mobile Number"}
            </label>
            <input
              type="tel"
              placeholder={language === "hi" ? "+91 10 अंकों का नंबर" : language === "mr" ? "+91 10 अंकी नंबर" : "+91 XXXXX XXXXX"}
              className="w-full bg-slate-50 text-slate-900 rounded-xl p-4 border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:outline-none transition-all font-inter font-medium"
              value={phone}
              onChange={(e) => {
                const val = e.target.value;
                setPhone(val);
                if (index === 1 && val.replace(/\D/g, "").length >= 10) setIndex(2);
              }}
            />
          </div>

          <div className="step-location flex flex-col gap-3 relative">
            <label className="text-slate-600 text-sm font-bold uppercase tracking-widest">
              {language === "hi" ? "जिला / तहसील" : language === "mr" ? "जिल्हा / तालुका" : "District / Tehsil"}
            </label>
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder={
                    language === "hi" ? "नाशिक, महाराष्ट्र..." : language === "mr" ? "नाशिक, महाराष्ट्र..." : "Nashik, Maharashtra..."
                  }
                  className="w-full bg-slate-50 text-slate-900 rounded-xl p-4 border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:outline-none transition-all font-inter font-medium"
                  value={address}
                  onChange={(e) => handleSearch(e.target.value)}
                />
                {isSearching && (
                  <div className="absolute right-4 top-4 animate-spin text-emerald-600">
                    <Search size={20} />
                  </div>
                )}
              </div>
              <button
                onClick={autoDetectLocation}
                className={`p-4 rounded-xl border transition-all active:scale-95 ${
                  isLocating
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100"
                }`}
              >
                {isLocating ? <Loader2 size={24} className="animate-spin" /> : <MapPin size={24} />}
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-slate-200 rounded-2xl overflow-hidden z-[100] shadow-2xl max-h-64 overflow-y-auto">
                {searchResults.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => selectLocation(item)}
                    className="w-full text-left p-4 hover:bg-emerald-50 border-b border-slate-100 text-slate-700 text-sm font-inter transition-colors"
                  >
                    {item.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            className="step-submit w-full py-5 mt-4 bg-gradient-to-r from-violet-600 to-emerald-600 text-white font-black font-manrope rounded-2xl hover:brightness-110 hover:shadow-xl hover:shadow-emerald-200 transition-all flex items-center justify-center gap-3 group disabled:opacity-50 active:scale-95"
            onClick={handleRegister}
            disabled={!name || !phone || !address}
          >
            <span className="uppercase tracking-widest text-sm">
              {language === "hi" ? "नोड प्रारंभ करें" : language === "mr" ? "नोड सुरू करा" : "Initialize Node"}
            </span>
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </FrostedCard>
      </motion.div>
    </>
  );
}
