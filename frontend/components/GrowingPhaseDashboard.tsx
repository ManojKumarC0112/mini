"use client";

import { useMemo } from "react";
import { useAppStore } from "@/store/useAppStore";
import FrostedCard from "./FrostedCard";
import { Sparkles, TrendingUp, Users } from "lucide-react";

type CropEconomics = {
  key: "safe" | "healer" | "jackpot";
  name: string;
  acres: number;
  percent: number;
  marketPrice: number;
  estimatedCost: number;
  neighborShare: number;
};

const TOTAL_ACRES = 20;

export default function GrowingPhaseDashboard() {
  const { lockedPlan, fieldAllocation } = useAppStore();

  const crops = useMemo<CropEconomics[]>(() => {
    const safeName = lockedPlan?.safe_crop?.name || "Wheat";
    const healerName = lockedPlan?.healer_crop?.name || "Green Gram";
    const jackpotName = lockedPlan?.jackpot_crop?.name || "Chilli";

    const safePercent = lockedPlan?.safe_crop?.percent ?? fieldAllocation.wheat;
    const healerPercent = lockedPlan?.healer_crop?.percent ?? fieldAllocation.onion;
    const jackpotPercent = lockedPlan?.jackpot_crop?.percent ?? fieldAllocation.dal;

    return [
      {
        key: "safe",
        name: safeName,
        percent: safePercent,
        acres: (TOTAL_ACRES * safePercent) / 100,
        marketPrice: 2450,
        estimatedCost: 980,
        neighborShare: 22,
      },
      {
        key: "jackpot",
        name: jackpotName,
        percent: jackpotPercent,
        acres: (TOTAL_ACRES * jackpotPercent) / 100,
        marketPrice: 4200,
        estimatedCost: 1650,
        neighborShare: 11,
      },
      {
        key: "healer",
        name: healerName,
        percent: healerPercent,
        acres: (TOTAL_ACRES * healerPercent) / 100,
        marketPrice: 3100,
        estimatedCost: 900,
        neighborShare: 36,
      },
    ];
  }, [lockedPlan, fieldAllocation]);

  const bestOption = useMemo(() => {
    const scored = crops.map((crop) => {
      const gross = crop.marketPrice * crop.acres;
      const cost = crop.estimatedCost * crop.acres;
      const crowdPenalty = gross * (crop.neighborShare / 100) * 0.12;
      return { ...crop, net: Math.round(gross - cost - crowdPenalty) };
    });
    scored.sort((a, b) => b.net - a.net);
    return scored[0];
  }, [crops]);

  const neighborTable = [
    { crop: "Tomato", farmers: 14, saturation: "High" },
    { crop: "Onion", farmers: 10, saturation: "Medium" },
    { crop: "Maize", farmers: 6, saturation: "Low" },
  ];

  return (
    <div className="w-full grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
      <FrostedCard className="p-4 md:p-6 bg-[#F4F5E8] border-[#DFE2C9]">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4 mb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Growing Phase</p>
            <h2 className="text-3xl md:text-4xl font-black font-manrope text-slate-900 tracking-tight">Land Allocation Intelligence</h2>
            <p className="text-slate-600 mt-1 text-sm md:text-base">Market-aware crop split with neighbor anti-herding signals.</p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs uppercase tracking-widest text-slate-500 font-bold">Total Acreage</p>
            <p className="text-3xl md:text-4xl font-black text-emerald-700">{TOTAL_ACRES.toFixed(1)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[2.2fr_1fr] min-h-[560px] md:h-[420px] rounded-3xl overflow-hidden border border-[#DBDEC6] bg-white/70">
          <div className="relative flex items-center justify-center min-h-[280px] md:min-h-0 bg-[repeating-linear-gradient(45deg,#DCEEDF,#DCEEDF_12px,#CDE2D1_12px,#CDE2D1_24px)]">
            <div className="bg-white/80 backdrop-blur rounded-3xl px-6 md:px-8 py-5 md:py-6 shadow-xl border border-white/70 text-center max-w-[90%]">
              <p className="text-4xl md:text-5xl font-black text-slate-900 leading-tight break-words">{crops[0].name}</p>
              <p className="text-3xl md:text-4xl font-black text-emerald-700 mt-1">{crops[0].acres.toFixed(1)} Acres</p>
              <p className="text-sm font-semibold text-slate-600 mt-1">Safe Zone ({crops[0].percent}%)</p>
            </div>
          </div>

          <div className="grid grid-rows-[1fr_1fr] md:grid-rows-[2fr_1fr]">
            <div className="relative flex items-center justify-center min-h-[170px] bg-[radial-gradient(#E1CFC0_1px,transparent_1px)] [background-size:14px_14px] bg-[#F6F1EC] border-t md:border-t-0 md:border-l border-[#DBDEC6]">
              <div className="bg-white/85 rounded-3xl px-5 md:px-6 py-4 md:py-5 shadow border border-white/80 text-center max-w-[90%]">
                <p className="text-2xl md:text-3xl font-black text-slate-900 leading-tight break-words">{crops[1].name}</p>
                <p className="text-2xl md:text-3xl font-black text-amber-700 mt-1">{crops[1].acres.toFixed(1)} Acres</p>
                <p className="text-xs font-semibold text-slate-600 mt-1">Jackpot Zone ({crops[1].percent}%)</p>
              </div>
            </div>
            <div className="relative flex items-center justify-center min-h-[150px] bg-[linear-gradient(0deg,rgba(201,216,236,0.55)_1px,transparent_1px),linear-gradient(90deg,rgba(201,216,236,0.55)_1px,transparent_1px)] [background-size:16px_16px] bg-[#EEF4FB] md:border-l border-t border-[#DBDEC6]">
              <div className="bg-white/85 rounded-3xl px-5 md:px-6 py-4 shadow border border-white/80 text-center max-w-[90%]">
                <p className="text-xl md:text-2xl font-black text-slate-900 leading-tight break-words">{crops[2].name}</p>
                <p className="text-xl md:text-2xl font-black text-blue-700 mt-1">{crops[2].acres.toFixed(1)} Acres</p>
                <p className="text-xs font-semibold text-slate-600 mt-1">Healer Zone ({crops[2].percent}%)</p>
              </div>
            </div>
          </div>
        </div>
      </FrostedCard>

      <div className="space-y-5">
        <FrostedCard className="p-6 bg-white border-slate-200">
          <div className="flex items-center gap-2 text-emerald-700 mb-3">
            <Sparkles size={18} />
            <p className="text-xs uppercase tracking-widest font-bold">Best Option</p>
          </div>
          <h3 className="text-2xl font-black text-slate-900">{bestOption.name}</h3>
          <p className="text-sm text-slate-600 mt-1">Estimated net outcome after cost + crowding impact.</p>
          <p className="text-4xl font-black text-emerald-700 mt-3">Rs {bestOption.net.toLocaleString()}</p>
          <div className="mt-4 text-sm text-slate-700 space-y-1">
            <p>Market price: Rs {bestOption.marketPrice}/acre</p>
            <p>Estimated cost: Rs {bestOption.estimatedCost}/acre</p>
            <p>Neighbor crowding: {bestOption.neighborShare}%</p>
          </div>
        </FrostedCard>

        <FrostedCard className="p-6 bg-white border-slate-200">
          <div className="flex items-center gap-2 text-violet-700 mb-3">
            <Users size={18} />
            <p className="text-xs uppercase tracking-widest font-bold">Neighbor Crop Radar</p>
          </div>
          <div className="space-y-2">
            {neighborTable.map((row) => (
              <div key={row.crop} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-b-0">
                <span className="font-semibold text-slate-800">{row.crop}</span>
                <span className="text-xs text-slate-500">{row.farmers} farmers</span>
                <span
                  className={`text-xs font-bold px-2 py-1 rounded-full ${
                    row.saturation === "High"
                      ? "bg-red-100 text-red-700"
                      : row.saturation === "Medium"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {row.saturation}
                </span>
              </div>
            ))}
          </div>
        </FrostedCard>

        <FrostedCard className="p-6 bg-white border-slate-200">
          <div className="flex items-center gap-2 text-emerald-700 mb-2">
            <TrendingUp size={18} />
            <p className="text-xs uppercase tracking-widest font-bold">Market Snapshot</p>
          </div>
          <div className="text-sm text-slate-700 space-y-2">
            {crops.map((crop) => (
              <div key={crop.key} className="flex justify-between">
                <span>{crop.name}</span>
                <span className="font-bold">Rs {crop.marketPrice}/acre</span>
              </div>
            ))}
          </div>
        </FrostedCard>
      </div>
    </div>
  );
}
