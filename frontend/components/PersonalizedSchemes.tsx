"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import FrostedCard from "./FrostedCard";
import { BadgeCheck, Leaf, Sparkles } from "lucide-react";

type Scheme = {
  name: string;
  benefit: string;
  why: string;
  next_step: string;
};

export default function PersonalizedSchemes() {
  const { district, lockedPlan } = useAppStore();
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchemes = async () => {
      setLoading(true);
      try {
        const crop_type =
          lockedPlan?.safe_crop?.name || lockedPlan?.jackpot_crop?.name || lockedPlan?.healer_crop?.name || "Onion";
        const res = await fetch(`${apiBase}/api/schemes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            district: district || "Nashik",
            crop_type,
          }),
        });
        const json = await res.json();
        if (json.status === "success") {
          setSchemes(json.schemes || []);
        }
      } catch {
        setSchemes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSchemes();
  }, [apiBase, district, lockedPlan]);

  return (
    <div className="w-full mt-8">
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="text-2xl font-black font-manrope text-emerald-900 flex items-center gap-2">
          <Sparkles size={20} /> Personalized Schemes
        </h3>
        <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
          Farmer Only
        </span>
      </div>

      {loading ? (
        <FrostedCard className="p-6 bg-white border-slate-200">
          Loading scheme recommendations...
        </FrostedCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {schemes.map((scheme) => (
            <FrostedCard key={scheme.name} className="p-6 bg-white border-emerald-100">
              <div className="flex items-center justify-between">
                <h4 className="text-xl font-black text-slate-900">{scheme.name}</h4>
                <BadgeCheck size={18} className="text-emerald-600" />
              </div>
              <p className="text-sm text-slate-600 mt-2">{scheme.benefit}</p>

              <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-sm text-emerald-700">
                <div className="flex items-center gap-2 font-semibold mb-1">
                  <Leaf size={14} /> Why you got this
                </div>
                <p>{scheme.why}</p>
              </div>

              <div className="mt-4 text-sm text-slate-700">
                <span className="font-semibold">Next step:</span> {scheme.next_step}
              </div>
            </FrostedCard>
          ))}
        </div>
      )}
    </div>
  );
}
