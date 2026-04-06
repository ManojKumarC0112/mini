"use client";

import { useAppStore } from "@/store/useAppStore";
import FrostedCard from "@/components/FrostedCard";
import VirtualField from "@/components/VirtualField";
import MicButton from "@/components/MicButton";
import LiveLogistics from "@/components/LiveLogistics";
import { motion, AnimatePresence } from "framer-motion";
import { ScanLine, BarChart3, ArrowLeft, Store } from "lucide-react";
import OnboardingForm from "@/components/OnboardingForm";
import MandiOptimizer from "@/components/MandiOptimizer";
import CinematicSpotlight, { SpotlightStep } from "@/components/CinematicSpotlight";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import CameraScanner from "@/components/CameraScanner";
import WeatherTimeline from "@/components/WeatherTimeline";
import GrowingPhaseDashboard from "@/components/GrowingPhaseDashboard";
import RecommendedCrops from "@/components/RecommendedCrops";
import CropCalendar from "@/components/CropCalendar";
import PersonalizedSchemes from "@/components/PersonalizedSchemes";
import { useRouter } from "next/navigation";
import { speak } from "@/lib/tts";

type ScanResult = {
  npk?: { n?: number; p?: number; k?: number; ph?: number };
  allocation?: {
    safe_crop?: { percent?: number; name?: string; reason?: string };
    healer_crop?: { percent?: number; name?: string; reason?: string };
    jackpot_crop?: { percent?: number; name?: string; reason?: string };
  };
};

export default function FarmerPage() {
  const router = useRouter();
  const {
    role,
    phase,
    setPhase,
    setFieldAllocation,
    setLockedPlan,
    language,
    setSelectedMandi,
    hydrated,
    firstScanComplete,
    setFirstScanComplete,
    userName,
    lockedPlan,
    selectedMandi,
    lastLockDate,
    setLastLockDate,
  } = useAppStore();

  const [isScanning, setIsScanning] = useState(false);
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const [scanSummary, setScanSummary] = useState<ScanResult | null>(null);
  const spokenPhaseRef = useRef("");

  useEffect(() => {
    if (!hydrated) return;
    if (!role) {
      router.push("/");
      return;
    }
    if (role !== "Farmer") {
      router.push(role === "Driver" ? "/driver" : "/");
    }
  }, [role, router, hydrated]);

  const getSpeechLocale = (lang: string) => {
    if (lang === "hi") return "hi-IN";
    if (lang === "mr") return "mr-IN";
    if (lang === "te") return "te-IN";
    if (lang === "ta") return "ta-IN";
    return "en-IN";
  };

  const triggerTTS = useCallback(
    (text: string) => {
      speak(text, { lang: getSpeechLocale(language), rate: 0.95 });
    },
    [language]
  );

  const handleScanComplete = (data: ScanResult) => {
    setIsScanning(false);
    setScanSummary(data);
    if (data && data.allocation) {
      setFieldAllocation({
        wheat: data.allocation.safe_crop?.percent || 60,
        onion: data.allocation.healer_crop?.percent || 10,
        dal: data.allocation.jackpot_crop?.percent || 30,
      });
      setLockedPlan(data.allocation);
      setFirstScanComplete(true);
      if (!lastLockDate) setLastLockDate(new Date().toISOString());
      setPhase("growing");
    }
  };

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    if (!["growing", "selling", "logistics"].includes(phase)) return;

    const key = `${phase}-${language}-${selectedMandi?.mandi_name || ""}`;
    if (spokenPhaseRef.current === key) return;
    spokenPhaseRef.current = key;

    const safe = lockedPlan?.safe_crop?.name || "safe crop";
    const healer = lockedPlan?.healer_crop?.name || "soil-healer crop";
    const jackpot = lockedPlan?.jackpot_crop?.name || "high-return crop";

    let summary = "";
    if (phase === "growing") {
      if (language === "hi") {
        summary = `आपका Growing phase शुरू है। 60% के लिए ${safe}, 10% के लिए ${healer}, और 30% के लिए ${jackpot} चुना गया है। नीचे मौसम और फसल सलाह देखें।`;
      } else if (language === "mr") {
        summary = `तुमचा Growing phase सुरू आहे. 60% साठी ${safe}, 10% साठी ${healer}, आणि 30% साठी ${jackpot} निवडले आहे. खाली हवामान व पिक सल्ला पहा.`;
      } else {
        summary = `You are in the Growing phase. Your 60-10-30 crop plan is active with ${safe}, ${healer}, and ${jackpot}. Review weather and crop advisories below.`;
      }
    } else if (phase === "selling") {
      if (language === "hi") summary = "यह Market phase है। मंडियों की तुलना करें और सबसे अधिक नेट प्रॉफिट वाला विकल्प चुनें।";
      else if (language === "mr") summary = "हा Market phase आहे. मंड्यांची तुलना करा आणि सर्वाधिक नेट प्रॉफिट असलेला पर्याय निवडा.";
      else summary = "This is the Market phase. Compare mandis and pick the option with the highest net profit.";
    } else if (phase === "logistics") {
      if (language === "hi") {
        summary = `यह Logistics phase है। ${selectedMandi?.mandi_name ? `${selectedMandi.mandi_name} के लिए ` : ""}आप ड्राइवर बुक कर सकते हैं और लाइव ट्रिप अपडेट देख सकते हैं।`;
      } else if (language === "mr") {
        summary = `हा Logistics phase आहे. ${selectedMandi?.mandi_name ? `${selectedMandi.mandi_name} साठी ` : ""}तुम्ही ड्रायव्हर बुक करू शकता आणि लाईव्ह ट्रिप अपडेट पाहू शकता.`;
      } else {
        summary = `This is the Logistics phase. ${selectedMandi?.mandi_name ? `For ${selectedMandi.mandi_name}, ` : ""}you can book a driver and track live trip updates here.`;
      }
    }

    if (!summary) return;
    triggerTTS(summary);
  }, [phase, language, lockedPlan, selectedMandi, triggerTTS]);

  const tourSteps: SpotlightStep[] = [
    {
      target: ".scan-widget",
      title: language === "hi" ? "OCR स्कैन" : language === "mr" ? "OCR स्कॅन" : "OCR Scan",
      content:
        language === "hi"
          ? `${userName || "किसान"}, पहले अपना Soil Health Card स्कैन करें।`
          : language === "mr"
          ? `${userName || "शेतकरी"}, प्रथम तुमचा Soil Health Card स्कॅन करा.`
          : `${userName || "Farmer"}, first scan your Soil Health Card.`,
    },
  ];

  useEffect(() => {
    if (phase === "planning" && tourSteps[0]) {
      triggerTTS(tourSteps[0].content);
    }
  }, [phase, tourSteps, triggerTTS]);

  const phaseSpotlightSteps: SpotlightStep[] | null = useMemo(() => {
    if (phase === "growing") {
      return [
        {
          target: ".growing-guide",
          title: "Today’s Guidance",
          content: "Check today’s focus and follow the key action before moving to weather alerts.",
        },
        {
          target: ".growing-weather",
          title: "Weather Intelligence",
          content: "Review the live advisory and adjust irrigation before evening.",
        },
        {
          target: ".growing-calendar",
          title: "Crop Calendar",
          content: "Track the next 15 days to avoid waste and reduce input costs.",
        },
      ];
    }
    if (phase === "selling") {
      return [
        {
          target: ".selling-guide",
          title: "Mandi Strategy",
          content: "Compare mandi prices and pick the route with the highest net profit.",
        },
        {
          target: ".mandi-optimizer",
          title: "Mandi Optimizer",
          content: "Lock the best mandi to unlock logistics and dispatch.",
        },
      ];
    }
    if (phase === "logistics") {
      return [
        {
          target: ".logistics-guide",
          title: "Logistics Checklist",
          content: "Confirm your pickup location, then broadcast to nearby drivers.",
        },
        {
          target: ".logistics-panel",
          title: "Live Dispatch",
          content: "Track counters and confirm the best driver offer.",
        },
      ];
    }
    return null;
  }, [phase]);

  useEffect(() => {
    if (!phaseSpotlightSteps || phaseSpotlightSteps.length === 0) return;
    setSpotlightIndex(0);
    triggerTTS(phaseSpotlightSteps[0].content);
  }, [phaseSpotlightSteps, triggerTTS]);

  const scannerOpen = isScanning;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#F0F7E6_0%,#F7F3EA_40%,#F8FAFC_100%)] p-4 md:p-8 pt-24 flex flex-col items-center relative overflow-hidden">
      {!hydrated ? (
        <div className="fixed inset-0 bg-surface flex flex-col items-center justify-center gap-8 z-[100000]">
          <motion.div
            animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-16 h-16 bg-primary rounded-2xl shadow-2xl shadow-primary/20"
          />
          <div className="text-center">
            <h1 className="text-2xl font-manrope font-black text-slate-900 leading-tight">Krishi Sakhi.</h1>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-2 animate-pulse">Initializing Neural Node...</p>
          </div>
        </div>
      ) : (
        <>
          <div className="fixed top-0 left-0 right-0 h-16 border-b border-slate-200/50 bg-white/80 backdrop-blur-xl z-[10000] flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push("/")} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition">
                <ArrowLeft size={20} />
              </button>
              <div className="h-4 w-px bg-slate-200 mx-2" />
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="font-manrope font-bold text-slate-800 tracking-widest text-xs uppercase">Farmer Node</span>
              </div>
            </div>

            <div className="text-xs uppercase tracking-widest text-slate-400 font-bold">
              Language via Translate
            </div>
          </div>

          <AnimatePresence mode="wait">
            {(phase === "onboarding" || phase === "signup") && <OnboardingForm onComplete={() => setPhase("planning")} />}

            {phase === "planning" && (
              <motion.div key="farmer-planning" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-6xl flex flex-col gap-8">
                {!firstScanComplete && (
                  <CinematicSpotlight
                    steps={tourSteps}
                    currentIndex={0}
                    allowManualControls={true}
                    onComplete={() => {}}
                    onStepChange={() => triggerTTS(tourSteps[0].content)}
                  />
                )}

                <div className="flex flex-col md:flex-row gap-8 items-start">
                  <div className="flex-1 flex flex-col gap-6">
                    <div className="text-left mb-2">
                      <h2 className="text-5xl font-manrope font-bold text-slate-900 tracking-tight">Pre-Sowing Intelligence.</h2>
                      <div className="text-primary mt-2 flex items-center gap-2 font-bold">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" /> Live Analysis Active
                      </div>
                    </div>

                    <div className="mic-widget w-full flex justify-center py-3">
                      <MicButton onClick={() => console.log("Mic requested")} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                      <FrostedCard className="scan-widget flex flex-col justify-center items-center py-8 border-dashed border-2 border-primary/40 text-primary hover:bg-primary/5 transition-colors cursor-pointer group" onClick={() => setIsScanning(true)}>
                        <ScanLine size={42} className="mb-4 group-hover:scale-110 transition-transform" />
                        <span className="font-manrope font-bold text-center">Scan Soil Health Card</span>
                      </FrostedCard>

                      <FrostedCard className="mandi-widget flex flex-col justify-center items-center py-8 border-dashed border-2 border-emerald-400/40 text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer group" onClick={() => setPhase("selling")}>
                        <Store size={42} className="mb-4 group-hover:scale-110 transition-transform" />
                        <span className="font-manrope font-bold text-center">Open Mandi Prices</span>
                      </FrostedCard>
                    </div>

                    {scannerOpen && <CameraScanner onClose={() => setIsScanning(false)} onScanComplete={handleScanComplete} />}

                    {scanSummary?.npk && (
                      <FrostedCard className="p-5 md:p-6 bg-white/80 border-emerald-100">
                        <h3 className="text-lg md:text-xl font-black text-emerald-800">
                          Soil Health Snapshot
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-sm text-slate-700">
                          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                            <p className="text-xs uppercase tracking-widest text-emerald-700">Nitrogen</p>
                            <p className="text-xl font-black">{scanSummary.npk.n ?? "—"}</p>
                          </div>
                          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                            <p className="text-xs uppercase tracking-widest text-emerald-700">Phosphorus</p>
                            <p className="text-xl font-black">{scanSummary.npk.p ?? "—"}</p>
                          </div>
                          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                            <p className="text-xs uppercase tracking-widest text-emerald-700">Potassium</p>
                            <p className="text-xl font-black">{scanSummary.npk.k ?? "—"}</p>
                          </div>
                          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                            <p className="text-xs uppercase tracking-widest text-emerald-700">pH</p>
                            <p className="text-xl font-black">{scanSummary.npk.ph ?? "—"}</p>
                          </div>
                        </div>

                        {scanSummary.allocation && (
                          <div className="mt-4 text-sm text-slate-700 space-y-2">
                            <p className="font-semibold text-emerald-800">Why this land allocation?</p>
                            {scanSummary.allocation.safe_crop?.reason && (
                              <p>
                                <span className="font-bold">{scanSummary.allocation.safe_crop?.name || "Safe crop"}:</span>{" "}
                                {scanSummary.allocation.safe_crop?.reason}
                              </p>
                            )}
                            {scanSummary.allocation.healer_crop?.reason && (
                              <p>
                                <span className="font-bold">{scanSummary.allocation.healer_crop?.name || "Healer crop"}:</span>{" "}
                                {scanSummary.allocation.healer_crop?.reason}
                              </p>
                            )}
                            {scanSummary.allocation.jackpot_crop?.reason && (
                              <p>
                                <span className="font-bold">{scanSummary.allocation.jackpot_crop?.name || "Jackpot crop"}:</span>{" "}
                                {scanSummary.allocation.jackpot_crop?.reason}
                              </p>
                            )}
                          </div>
                        )}
                      </FrostedCard>
                    )}

                    <FrostedCard className="w-full p-6 mt-2 bg-amber-50 border-amber-100">
                      <h3 className="text-amber-800 font-bold mb-3 flex items-center gap-2">
                        <BarChart3 size={18} /> Market Alert
                      </h3>
                      <p className="text-sm font-inter text-amber-900 leading-relaxed">
                        Supply surge detected in nearby mandi. Anti-herding plan helps you avoid overflow and maximize net profit.
                      </p>
                    </FrostedCard>
                  </div>

                  <div className="w-full md:w-5/12">
                    {firstScanComplete ? (
                      <VirtualField />
                    ) : (
                      <FrostedCard className="p-6 bg-white/80 border-emerald-100">
                        <h3 className="text-xl font-black text-emerald-800">Scan Required</h3>
                        <p className="text-sm text-slate-600 mt-2">
                          Run the Soil Health Card scan to unlock your land allocation tiles.
                        </p>
                      </FrostedCard>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {phase === "growing" && (
              <motion.div key="farmer-growing" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-7xl flex flex-col gap-8">
                {phaseSpotlightSteps && (
                  <CinematicSpotlight
                    steps={phaseSpotlightSteps}
                    currentIndex={spotlightIndex}
                    allowManualControls={true}
                    onComplete={() => {}}
                    onStepChange={(i) => {
                      setSpotlightIndex(i);
                      if (phaseSpotlightSteps[i]) triggerTTS(phaseSpotlightSteps[i].content);
                    }}
                  />
                )}
                <FrostedCard className="growing-guide p-5 md:p-6 bg-white/80 border-emerald-100 shadow-sm">
                  <h3 className="text-xl md:text-2xl font-manrope font-black text-emerald-800">
                    Today’s Focus: Soil Health + Water Efficiency
                  </h3>
                  <p className="text-slate-600 mt-2 text-sm md:text-base">
                    Follow the advisory below, review rainfall risk, and keep your irrigation aligned with the 120‑day plan.
                  </p>
                </FrostedCard>
                <GrowingPhaseDashboard />
                <div className="growing-weather">
                  <WeatherTimeline />
                </div>
                <div className="growing-calendar">
                  <CropCalendar />
                </div>
                <RecommendedCrops />
                <PersonalizedSchemes />
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mt-8 p-8 bg-emerald-50 rounded-3xl border border-emerald-100 gap-4 md:gap-0">
                  <div>
                    <h3 className="text-2xl font-bold text-emerald-900">Harvest Cycle Complete?</h3>
                    <p className="text-emerald-700 mt-1">Ready to optimize mandi route and book a driver.</p>
                  </div>
                  <button onClick={() => setPhase("selling")} className="px-10 py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all font-manrope">
                    Generate Mandi Route
                  </button>
                </div>
              </motion.div>
            )}

            {phase === "selling" && (
              <motion.div key="farmer-selling" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full max-w-4xl flex flex-col gap-6">
                {phaseSpotlightSteps && (
                  <CinematicSpotlight
                    steps={phaseSpotlightSteps}
                    currentIndex={spotlightIndex}
                    allowManualControls={true}
                    onComplete={() => {}}
                    onStepChange={(i) => {
                      setSpotlightIndex(i);
                      if (phaseSpotlightSteps[i]) triggerTTS(phaseSpotlightSteps[i].content);
                    }}
                  />
                )}
                <FrostedCard className="selling-guide p-5 md:p-6 bg-white/80 border-amber-100 shadow-sm">
                  <h3 className="text-xl md:text-2xl font-manrope font-black text-amber-700">Mandi Decision Guide</h3>
                  <p className="text-slate-600 mt-2 text-sm md:text-base">
                    Compare distance, fees, and spoilage risk. Choose the mandi with the highest net profit and lowest risk tag.
                  </p>
                </FrostedCard>
                <div className="mandi-optimizer">
                  <MandiOptimizer
                  onConfirm={(mandi) => {
                    setSelectedMandi({
                      mandi_id: mandi.mandi_id,
                      mandi_name: mandi.mandi_name,
                      distance_km: mandi.distance_km,
                      travel_hours: mandi.travel_hours,
                      market_price: mandi.market_price,
                      net_profit: mandi.net_profit,
                    });
                    setPhase("logistics");
                  }}
                />
                </div>
              </motion.div>
            )}
            {phase === "logistics" && (
              <motion.div key="farmer-logistics" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-5xl flex flex-col gap-6">
                {phaseSpotlightSteps && (
                  <CinematicSpotlight
                    steps={phaseSpotlightSteps}
                    currentIndex={spotlightIndex}
                    allowManualControls={true}
                    onComplete={() => {}}
                    onStepChange={(i) => {
                      setSpotlightIndex(i);
                      if (phaseSpotlightSteps[i]) triggerTTS(phaseSpotlightSteps[i].content);
                    }}
                  />
                )}
                <FrostedCard className="logistics-guide p-5 md:p-6 bg-white/80 border-slate-200 shadow-sm">
                  <h3 className="text-xl md:text-2xl font-manrope font-black text-slate-800">Dispatch Checklist</h3>
                  <p className="text-slate-600 mt-2 text-sm md:text-base">
                    Ensure pickup point is correct, then broadcast. Accept the best counter‑offer to start the trip.
                  </p>
                </FrostedCard>
                <div className="logistics-panel">
                  <LiveLogistics />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </main>
  );
}
