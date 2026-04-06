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
  const { setRole, driverName, driverPhone, setDriverName, setDriverPhone } = useAppStore();

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
          
          <div className="text-xs uppercase tracking-widest text-slate-400 font-bold">
             Language via Translate
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
