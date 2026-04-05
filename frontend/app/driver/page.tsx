"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import LiveLogistics from "@/components/LiveLogistics";
import DriverOnboardingForm from "@/components/DriverOnboardingForm";
import { motion } from "framer-motion";
import { ArrowLeft, Truck } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DriverPage() {
  const router = useRouter();
  const { language, setLanguage, setRole, driverName, driverPhone, setDriverName, setDriverPhone } = useAppStore();

  useEffect(() => {
    // Ensure direct /driver navigation always enters driver experience.
    setRole("Driver");
  }, [setRole]);

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 pt-24 flex flex-col items-center relative overflow-hidden">
      
      {/* Terminal OS Header */}
      <div className="fixed top-0 left-0 right-0 h-16 border-b border-slate-200/50 bg-white/80 backdrop-blur-xl z-[10000] flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
             <button onClick={() => router.push('/')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition">
                <ArrowLeft size={20} />
             </button>
             <div className="h-4 w-px bg-slate-200 mx-2" />
             <div className="flex items-center gap-2">
                <Truck size={18} className="text-emerald-600" />
                <span className="font-manrope font-bold text-slate-800 tracking-widest text-xs uppercase">Logistics Node</span>
             </div>
          </div>
          
          <div className="flex items-center gap-6">
             <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button 
                   onClick={() => setLanguage('hi')}
                   className={`px-3 py-1 rounded-md text-xs font-bold transition ${language === 'hi' ? 'bg-emerald-600 text-white' : 'text-slate-500'}`}
                >HN</button>
                <button 
                   onClick={() => setLanguage('en')}
                   className={`px-3 py-1 rounded-md text-xs font-bold transition ${language === 'en' ? 'bg-emerald-600 text-white' : 'text-slate-500'}`}
                >EN</button>
                <button 
                   onClick={() => setLanguage('mr')}
                   className={`px-3 py-1 rounded-md text-xs font-bold transition ${language === 'mr' ? 'bg-emerald-600 text-white' : 'text-slate-500'}`}
                >MR</button>
             </div>
          </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-5xl"
      >
        {!driverName || !driverPhone ? (
          <DriverOnboardingForm
            onSubmit={(name, phone) => {
              setDriverName(name);
              setDriverPhone(phone);
            }}
          />
        ) : (
          <LiveLogistics />
        )}
      </motion.div>
    </main>
  );
}
