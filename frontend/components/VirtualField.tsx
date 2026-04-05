"use client";

import { motion } from "framer-motion";
import { useAppStore } from "@/store/useAppStore";
import { Lock } from "lucide-react";

export default function VirtualField() {
  const { isFieldLocked, lockField, lockedPlan } = useAppStore();

  if (!lockedPlan) {
    return (
      <div className="relative w-full max-w-sm mx-auto aspect-[2/3] rounded-3xl overflow-hidden bg-surface-container border-2 border-outline-variant/30 flex flex-col items-center justify-center ghost-border p-6 gap-4 shadow-2xl">
         <div className="w-24 h-24 rounded-full border-4 border-dashed border-primary/20 animate-spin flex items-center justify-center" style={{ animationDuration: '10s' }}>
            <div className="w-16 h-16 rounded-full bg-primary/5 animate-pulse" />
         </div>
         <div className="text-center">
            <h3 className="text-xl font-manrope font-bold text-outline-variant">Terminal Ready.</h3>
            <p className="text-sm text-outline-variant/60 font-inter mt-1">Waiting for Soil Health Scan...</p>
         </div>
         <div className="absolute inset-0 opacity-10 pointer-events-none" 
              style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(204,151,255,0.15) 1px, transparent 0)', backgroundSize: '24px 24px' }} 
         />
      </div>
    );
  }

  const crops = [
    { name: lockedPlan.safe_crop?.name || "Crop A", percent: lockedPlan.safe_crop?.percent || 60, color: "from-[#d4af37] to-[#aa8c2c]", textColor: "text-surface" },
    { name: lockedPlan.healer_crop?.name || "Crop B", percent: lockedPlan.healer_crop?.percent || 10, color: "from-primary to-primary-dim", textColor: "text-on-surface" },
    { name: lockedPlan.jackpot_crop?.name || "Crop C", percent: lockedPlan.jackpot_crop?.percent || 30, color: "from-tertiary-container to-tertiary-dim", textColor: "text-surface" },
  ];

  return (
    <div className="relative w-full max-w-sm mx-auto aspect-[2/3] rounded-3xl overflow-hidden bg-surface-container border-2 border-outline-variant/30 flex flex-col ghost-border p-2 gap-2 shadow-2xl">
      {crops.map((crop, idx) => (
        <motion.div 
          key={idx}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: `${crop.percent}%`, opacity: 1 }}
          transition={{ duration: 1, delay: idx * 0.2, ease: [0.16, 1, 0.3, 1] }}
          className={`w-full bg-gradient-to-br ${crop.color} rounded-2xl flex items-center justify-center relative overflow-hidden group`}
        >
          <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <span className={`font-manrope font-bold ${crop.textColor} ${crop.percent < 15 ? 'text-sm' : 'text-xl'} shadow-sm z-10`}>
            {crop.name} ({crop.percent}%)
          </span>
        </motion.div>
      ))}

      {/* Lock Overlay */}
      {isFieldLocked && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-surface/40 backdrop-blur-sm z-10 flex flex-col items-center justify-center"
        >
          <Lock size={64} className="text-tertiary-container mb-4" />
          <h2 className="text-3xl font-manrope font-bold text-white tracking-wider">LOCKED</h2>
          <p className="text-tertiary-container font-inter mt-2">Optimal Market Strategy Applied</p>
        </motion.div>
      )}

       {!isFieldLocked && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-4/5">
            <button 
                onClick={() => {
                   lockField();
                   useAppStore.getState().setPhase("growing");
                }}
                className="w-full py-4 bg-primary text-on-primary font-bold rounded-full shadow-[0_10px_20px_rgba(204,151,255,0.3)] hover:scale-105 transition-transform"
            >
                Lock Optimization
            </button>
        </div>
       )}
    </div>
  );
}
