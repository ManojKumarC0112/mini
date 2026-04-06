"use client";

import { motion } from "framer-motion";
import FrostedCard from "./FrostedCard";
import { ArrowRight, MapPin, TrendingUp, AlertTriangle, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/store/useAppStore";

type MandiRow = {
  mandi_id: number;
  mandi_name: string;
  distance_km: number;
  travel_hours: number;
  market_price: number;
  fuel_cost: number;
  driver_fee: number;
  mandi_charges: number;
  decay_loss: number;
  net_profit: number;
  risk_tag: string;
  risk_reason: string;
  is_optimal: boolean;
};

export default function MandiOptimizer({ onConfirm }: { onConfirm: (mandi: MandiRow) => void }) {
  const { location, lockedPlan, district } = useAppStore();
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
  const [selectedMandi, setSelectedMandi] = useState<number | null>(null);
  const [rows, setRows] = useState<MandiRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    const fetchMandis = async () => {
      setIsLoading(true);
      setErrorMsg("");
      try {
        const res = await fetch(`${apiBase}/api/mandi-profit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            crop_quantity: 20,
            fuel_price: 95,
            truck_avg: 4.5,
            driver_fee: 1500,
            weather: "Rainy",
            crop_type: lockedPlan?.safe_crop?.name || lockedPlan?.jackpot_crop?.name || lockedPlan?.healer_crop?.name || "Onion",
            state: "Maharashtra",
            district: district || "Nashik",
            farmer_lat: location?.[0] ?? 20.0059,
            farmer_lng: location?.[1] ?? 73.7898,
          }),
        });
        const json = await res.json();
        if (json.status === "success") {
          setRows(json.results || []);
        } else {
          setErrorMsg(json.message || "Failed to compute mandi comparison.");
        }
      } catch {
        setErrorMsg("Could not fetch mandi engine results.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMandis();
  }, [apiBase, location]);

  const annotated = useMemo(() => {
    return rows.map((row, idx) => {
      const meta =
        idx === 0
          ? { title: "Best Profit", subtitle: "Highest in-pocket return", tone: "green" }
          : row.risk_tag.includes("High")
          ? { title: "High Risk", subtitle: "Spoilage-sensitive route", tone: "red" }
          : { title: "Local Option", subtitle: "Closer and steadier route", tone: "slate" };
      return { ...row, meta };
    });
  }, [rows]);

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="text-left mb-2">
        <h2 className="text-3xl md:text-4xl font-manrope font-bold text-slate-900 tracking-tight">Mandi Comparison Engine</h2>
        <p className="text-slate-600 mt-1">Ranked by net profit after fuel, driver, mandi fees, and spoilage leak.</p>
      </div>

      {isLoading && (
        <FrostedCard className="p-8 flex items-center gap-3 text-slate-600">
          <Loader2 className="animate-spin" /> Calculating best mandi economics...
        </FrostedCard>
      )}

      {!isLoading && errorMsg && <FrostedCard className="p-6 text-rose-700 border-rose-200 bg-rose-50">{errorMsg}</FrostedCard>}

      {!isLoading && !errorMsg && (
        <div className="grid grid-cols-1 gap-4">
          {annotated.map((mandi, idx) => (
            <motion.div
              key={mandi.mandi_id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              onClick={() => setSelectedMandi(mandi.mandi_id)}
            >
              <FrostedCard
                className={`p-5 border transition-all cursor-pointer ${
                  selectedMandi === mandi.mandi_id ? "border-emerald-500 bg-emerald-50/40 scale-[1.01]" : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div
                      className={`inline-flex px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                        mandi.meta.tone === "green"
                          ? "bg-emerald-100 text-emerald-700"
                          : mandi.meta.tone === "red"
                          ? "bg-rose-100 text-rose-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {mandi.meta.title}
                    </div>
                    <h3 className="mt-2 text-2xl font-black text-slate-900">{mandi.mandi_name}</h3>
                    <p className="text-xs text-slate-500 mt-1">{mandi.meta.subtitle}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-widest text-slate-500">Net Profit</p>
                    <p className="text-3xl font-black text-emerald-700">Rs {Math.round(mandi.net_profit).toLocaleString()}</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <p className="bg-slate-50 rounded-lg p-2">
                    <span className="text-slate-500">Price</span>
                    <br />
                    <span className="font-bold text-slate-900">Rs {mandi.market_price}/q</span>
                  </p>
                  <p className="bg-slate-50 rounded-lg p-2">
                    <span className="text-slate-500">Transport</span>
                    <br />
                    <span className="font-bold text-slate-900">-Rs {Math.round(mandi.fuel_cost + mandi.driver_fee).toLocaleString()}</span>
                  </p>
                  <p className="bg-slate-50 rounded-lg p-2">
                    <span className="text-slate-500">Distance</span>
                    <br />
                    <span className="font-bold text-slate-900">
                      <MapPin size={13} className="inline mr-1" />
                      {mandi.distance_km} km
                    </span>
                  </p>
                  <p className="bg-slate-50 rounded-lg p-2">
                    <span className="text-slate-500">Spoilage Loss</span>
                    <br />
                    <span className="font-bold text-slate-900">-Rs {Math.round(mandi.decay_loss).toLocaleString()}</span>
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <p
                    className={`text-sm flex items-center gap-2 ${
                      mandi.risk_tag.includes("High") ? "text-rose-700" : "text-slate-600"
                    }`}
                  >
                    <AlertTriangle size={15} />
                    {mandi.risk_tag}: {mandi.risk_reason}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedMandi(mandi.mandi_id);
                      onConfirm(mandi);
                    }}
                    className="shrink-0 px-4 py-2 bg-slate-900 text-white rounded-lg font-bold text-sm hover:bg-emerald-700 transition-colors flex items-center gap-2"
                  >
                    Book Truck <ArrowRight size={16} />
                  </button>
                </div>
              </FrostedCard>
            </motion.div>
          ))}
        </div>
      )}

      {selectedMandi !== null && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => {
            const selected = rows.find((row) => row.mandi_id === selectedMandi);
            if (selected) onConfirm(selected);
          }}
          className="w-full py-4 bg-emerald-600 text-white font-bold font-manrope rounded-xl hover:bg-emerald-700 transition flex items-center justify-center gap-2"
        >
          <TrendingUp size={18} />
          Lock Selected Mandi & Find Driver
        </motion.button>
      )}
    </div>
  );
}
