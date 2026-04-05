"use client";

import { useAppStore } from "@/store/useAppStore";
import FrostedCard from "@/components/FrostedCard";
import { motion } from "framer-motion";
import { Tractor, Truck, BarChart3, Sprout } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RoleSelection() {
  const router = useRouter();
  const { setRole, setPhase, language, setLanguage, hydrated } = useAppStore();

  if (!hydrated) return null;

  const handleRoleSelect = (role: 'Farmer' | 'Driver' | 'Admin') => {
    setRole(role);
    if (role === 'Farmer') {
      setPhase("onboarding");
      router.push('/farmer');
    } else if (role === 'Driver') {
      router.push('/driver');
    }
  };

  return (
    <main className="min-h-screen bg-[#FDFDFD] p-6 md:p-12 flex flex-col items-center justify-center relative overflow-hidden">
      
      {/* Absolute Decorative Elements */}
      <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-violet-100/40 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-emerald-100/40 rounded-full blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-6xl z-10"
      >
        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Sprout className="text-emerald-600" size={32} />
              <span className="font-manrope font-bold text-emerald-900 tracking-widest text-sm uppercase">Annadata-OS</span>
            </div>
            <h1 className="text-6xl md:text-8xl font-manrope font-bold text-slate-900 tracking-tighter leading-[0.9]">
              Digital<br /><span className="text-violet-600 italic">Village.</span>
            </h1>
            <p className="text-slate-500 text-lg md:text-xl mt-8 max-w-md font-inter border-l-4 border-violet-500/20 pl-6">
               Next-generation agricultural intelligence terminal. Select node to establish link.
            </p>
          </div>

          <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200">
             <button 
                onClick={() => setLanguage('hi')}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${language === 'hi' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
             >HINDI</button>
             <button 
                onClick={() => setLanguage('en')}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${language === 'en' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
             >ENGLISH</button>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row gap-8 w-full items-stretch">
          <FrostedCard 
            onClick={() => handleRoleSelect("Farmer")}
            className="group relative cursor-pointer md:w-3/5 min-h-[32rem] flex flex-col justify-end p-12 transition-all hover:scale-[1.01] hover:shadow-2xl hover:shadow-violet-200/50 border-violet-100"
          >
             <div className="absolute top-12 right-12 w-24 h-24 bg-violet-50 rounded-3xl flex items-center justify-center group-hover:rotate-12 transition-transform duration-500">
                <Tractor size={48} className="text-violet-600" />
             </div>
             <h2 className="text-5xl md:text-7xl font-bold font-manrope text-slate-900 tracking-tight">Farmer.</h2>
             <p className="text-slate-500 text-lg md:text-xl mt-4 max-w-sm font-inter">Manage crop cycles, optimize profits, and coordinate live logistics.</p>
             <div className="mt-8 flex items-center gap-3 text-violet-600 font-bold uppercase tracking-widest text-sm">
                Enter Terminal <div className="w-12 h-0.5 bg-violet-600/30 group-hover:w-20 transition-all" />
             </div>
          </FrostedCard>

          <div className="flex flex-col gap-8 md:w-2/5">
            <FrostedCard 
              onClick={() => handleRoleSelect("Driver")}
              className="group cursor-pointer flex flex-col justify-center p-10 hover:scale-[1.02] hover:shadow-xl transition-all border-emerald-100 hover:bg-emerald-50/30"
            >
               <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                    <Truck size={32} />
                  </div>
                  <div>
                    <h2 className="text-3xl md:text-4xl font-bold font-manrope text-slate-900">Driver.</h2>
                    <p className="text-slate-500 text-sm mt-1">Join the delivery network</p>
                  </div>
               </div>
            </FrostedCard>

            <FrostedCard 
              onClick={() => handleRoleSelect("Admin")}
              className="group cursor-pointer flex flex-col justify-center p-10 opacity-60 hover:opacity-100 transition-all border-slate-200 grayscale hover:grayscale-0"
            >
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                    <BarChart3 size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold font-manrope text-slate-400">Admin.</h2>
                    <p className="text-slate-300 text-xs mt-1">Market analytics node</p>
                  </div>
                </div>
            </FrostedCard>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
