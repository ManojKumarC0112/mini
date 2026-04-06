"use client";

import { useAppStore } from "@/store/useAppStore";
import { motion } from "framer-motion";
import { CloudRain, Sun, Droplets, Loader2, ShoppingCart, MapPin, AlertCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import FrostedCard from "./FrostedCard";
import { speak } from "@/lib/tts";

type AdvisoryData = {
  task_priority?: "High" | "Medium" | "Low";
  condition?: string;
  instruction?: string;
  reasoning?: string;
  voice_script?: string;
  recommended_product?: {
    name?: string;
    price?: string;
  };
};

export default function WeatherTimeline() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
  const { lastLockDate, language } = useAppStore();
  const [advisory, setAdvisory] = useState<AdvisoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const getDayOfCycle = () => {
    if (!lastLockDate) return 1;
    const start = new Date(lastLockDate);
    const now = new Date();
    const diff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.min(Math.max(diff, 1), 120);
  };

  const currentDay = getDayOfCycle();
  const speechLocale =
    language === "hi" ? "hi-IN" : language === "mr" ? "mr-IN" : language === "te" ? "te-IN" : language === "ta" ? "ta-IN" : "en-IN";

  useEffect(() => {
    const fetchAdvisory = async () => {
      try {
        const res = await fetch(`${apiBase}/api/advisory?weather=Heavy Rain Forecast 10mm&crop_stage=${currentDay}`, {
          method: "POST",
        });
        const json = await res.json();
        if (json.status === "success") {
          const advisoryData: AdvisoryData = json.data;
          setAdvisory(advisoryData);

          const voiceText = advisoryData.voice_script || advisoryData.instruction || "Advisory updated";

          speak(voiceText, { lang: speechLocale, rate: 0.95 });

        }
        setIsLoading(false);
      } catch (e) {
        console.error("Advisory Error:", e);
        setIsLoading(false);
      }
    };

    fetchAdvisory();
  }, [apiBase, currentDay, language, speechLocale]);

  useEffect(() => {
    if (!scrollRef.current) return;
    const dayWidth = 100;
    scrollRef.current.scrollLeft = currentDay * dayWidth - scrollRef.current.clientWidth / 2 + dayWidth / 2;
  }, [currentDay]);

  const days = Array.from({ length: 120 }).map((_, i) => i + 1);

  return (
    <div className="w-full flex flex-col gap-8">
      <div className="w-full flex flex-col md:flex-row gap-6">
        <FrostedCard
          className={`flex-1 p-8 border-2 transition-all duration-500 overflow-visible relative ${
            advisory?.task_priority === "High" ? "border-violet-500 bg-violet-50/30" : "border-emerald-500 bg-emerald-50/30"
          }`}
        >
          {isLoading ? (
            <div className="h-48 flex items-center justify-center gap-3 text-slate-500">
              <Loader2 className="animate-spin" /> <span>Groq Llama 3.3 Decision Engine...</span>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="relative">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 3 }}
                  className={`w-32 h-32 rounded-full flex items-center justify-center shadow-2xl ${
                    advisory?.condition?.includes("Rain") ? "bg-blue-100 text-blue-600" : "bg-amber-100 text-amber-600"
                  }`}
                >
                  {advisory?.condition?.includes("Rain") ? <CloudRain size={56} /> : <Sun size={56} />}
                </motion.div>
                <div className="absolute -top-4 -right-4 bg-white px-4 py-1 rounded-full shadow-md border border-slate-200 font-bold text-xs">
                  DAY {currentDay}
                </div>
              </div>

              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                  <span
                    className={`px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest ${
                      advisory?.task_priority === "High" ? "bg-red-500 text-white" : "bg-emerald-500 text-white"
                    }`}
                  >
                    {advisory?.task_priority} PRIORITY
                  </span>
                  <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">{advisory?.condition}</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-manrope font-black text-slate-900 tracking-tighter leading-tight">
                  {advisory?.instruction}.
                </h2>
                <p className="text-slate-600 mt-4 text-lg max-w-xl font-medium leading-relaxed italic border-l-4 border-slate-200 pl-4">
                  &quot;{advisory?.reasoning}&quot;
                </p>
              </div>

              <div className="bg-white/60 p-6 rounded-2xl border border-slate-200 shadow-sm w-full md:w-auto min-w-[280px]">
                <div className="flex items-center gap-3 text-violet-600 font-bold mb-4">
                  <ShoppingCart size={20} />
                  <span className="text-sm uppercase tracking-widest">Recommended Guard</span>
                </div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                    <Droplets size={24} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{advisory?.recommended_product?.name || "Standard NPK"}</p>
                    <p className="text-emerald-600 font-black text-lg">{advisory?.recommended_product?.price || "Rs 450"}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 py-3 bg-violet-600 text-white rounded-xl font-bold text-sm hover:bg-violet-700 transition-all shadow-lg shadow-violet-200">
                    Buy Now
                  </button>
                  <button className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all">
                    <MapPin size={20} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </FrostedCard>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-end">
          <div>
            <h3 className="font-manrope font-bold text-slate-800">Crop Journey.</h3>
            <p className="text-slate-500 text-sm">Visualize your 120-day growth algorithm.</p>
          </div>
          <div className="text-right">
            <span className="text-4xl font-black text-emerald-600">{Math.round((currentDay / 120) * 100)}%</span>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cycle Complete</p>
          </div>
        </div>

        <div className="relative group">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-emerald-500 rounded-full z-10 blur-sm animate-pulse" />
          <div ref={scrollRef} className="flex gap-4 overflow-x-auto pb-6 pt-4 scroll-smooth hide-scrollbar no-scrollbar">
            {days.map((day) => (
              <div
                key={day}
                className={`relative flex-shrink-0 w-24 h-24 rounded-2xl flex flex-col items-center justify-center transition-all ${
                  day === currentDay
                    ? "bg-emerald-600 shadow-xl shadow-emerald-200 scale-110 z-10"
                    : day < currentDay
                    ? "bg-white border border-emerald-100 opacity-60"
                    : "bg-slate-100 opacity-30 grayscale"
                }`}
              >
                <span className={`text-[10px] font-bold uppercase tracking-widest ${day === currentDay ? "text-white/70" : "text-slate-400"}`}>
                  DAY
                </span>
                <span className={`text-2xl font-black ${day === currentDay ? "text-white" : "text-slate-800"}`}>{day}</span>
                {day === currentDay && <div className="absolute -bottom-2 w-2 h-2 bg-emerald-600 rotate-45" />}
                {day === currentDay && advisory?.task_priority === "High" && <AlertCircle size={14} className="text-amber-500 mt-1" />}
              </div>
            ))}
          </div>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-full bg-gradient-to-l from-surface to-transparent pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
