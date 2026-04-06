"use client";

import { useMemo } from "react";
import { useAppStore } from "@/store/useAppStore";
import FrostedCard from "./FrostedCard";
import { ArrowUpRight, Leaf, Target } from "lucide-react";

type CropRecommendation = {
  name: string;
  marketPrice: number;
  estimatedCost: number;
  risk: "Low" | "Medium" | "High";
  why: string;
};

export default function RecommendedCrops() {
  const { lockedPlan } = useAppStore();

  const crops = useMemo<CropRecommendation[]>(() => {
    const safe = lockedPlan?.safe_crop?.name || "Wheat";
    const healer = lockedPlan?.healer_crop?.name || "Green Gram";
    const jackpot = lockedPlan?.jackpot_crop?.name || "Chilli";

    return [
      {
        name: safe,
        marketPrice: 2450,
        estimatedCost: 980,
        risk: "Low",
        why: "Stable demand in nearby mandis and lower volatility.",
      },
      {
        name: healer,
        marketPrice: 3100,
        estimatedCost: 900,
        risk: "Medium",
        why: "Improves soil nitrogen and supports next cycle yield.",
      },
      {
        name: jackpot,
        marketPrice: 4200,
        estimatedCost: 1650,
        risk: "High",
        why: "High upside when local supply remains below demand.",
      },
    ];
  }, [lockedPlan]);

  return (
    <div className="w-full mt-8">
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="text-2xl font-black font-manrope text-slate-900">Recommended Crops</h3>
        <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
          AI Ranked
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {crops.map((crop) => {
          const projectedNet = crop.marketPrice - crop.estimatedCost;
          return (
            <FrostedCard key={crop.name} className="p-6 bg-white border-slate-200">
              <div className="flex items-center justify-between">
                <h4 className="text-2xl font-black text-slate-900">{crop.name}</h4>
                <span
                  className={`text-[11px] font-bold px-2 py-1 rounded-full ${
                    crop.risk === "Low"
                      ? "bg-emerald-100 text-emerald-700"
                      : crop.risk === "Medium"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {crop.risk} Risk
                </span>
              </div>

              <div className="mt-4 space-y-1 text-sm">
                <p className="flex items-center justify-between">
                  <span className="text-slate-500">Market Price</span>
                  <span className="font-bold text-slate-800">Rs {crop.marketPrice}/acre</span>
                </p>
                <p className="flex items-center justify-between">
                  <span className="text-slate-500">Estimated Cost</span>
                  <span className="font-bold text-slate-800">Rs {crop.estimatedCost}/acre</span>
                </p>
                <p className="flex items-center justify-between">
                  <span className="text-slate-500">Projected Net</span>
                  <span className="font-black text-emerald-700">Rs {projectedNet}/acre</span>
                </p>
              </div>

              <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-600">
                <div className="flex items-center gap-2 text-slate-700 font-semibold mb-1">
                  {crop.risk === "High" ? <Target size={14} /> : <Leaf size={14} />}
                  Why this crop
                </div>
                <p>{crop.why}</p>
              </div>

              <button className="mt-4 w-full py-3 rounded-xl bg-slate-900 text-white font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2">
                View Detailed Plan <ArrowUpRight size={16} />
              </button>
            </FrostedCard>
          );
        })}
      </div>
    </div>
  );
}
