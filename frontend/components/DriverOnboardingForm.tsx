"use client";

import { useState } from "react";
import FrostedCard from "./FrostedCard";
import { Truck, Phone, UserRound } from "lucide-react";

export default function DriverOnboardingForm({
  onSubmit,
}: {
  onSubmit: (name: string, phone: string) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  return (
    <FrostedCard className="w-full max-w-lg mx-auto p-6 md:p-8 bg-white border-slate-200">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
          <Truck size={18} />
        </div>
        <div>
          <h2 className="text-2xl font-manrope font-black text-slate-900">Driver Sign In</h2>
          <p className="text-sm text-slate-500">Enter your details so farmers can trust bookings.</p>
        </div>
      </div>

      <div className="space-y-4">
        <label className="block">
          <span className="text-xs uppercase tracking-wider font-bold text-slate-500 flex items-center gap-2">
            <UserRound size={14} /> Driver Name
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Suresh Patil"
            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 bg-slate-50 text-slate-900 outline-none focus:ring-2 focus:ring-emerald-300"
          />
        </label>

        <label className="block">
          <span className="text-xs uppercase tracking-wider font-bold text-slate-500 flex items-center gap-2">
            <Phone size={14} /> Phone Number
          </span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 9XXXXXXXXX"
            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 bg-slate-50 text-slate-900 outline-none focus:ring-2 focus:ring-emerald-300"
          />
        </label>

        <button
          disabled={!name.trim() || phone.replace(/\D/g, "").length < 10}
          onClick={() => onSubmit(name.trim(), phone.trim())}
          className="w-full mt-2 rounded-xl py-3 bg-emerald-600 text-white font-bold disabled:opacity-50 hover:bg-emerald-700 transition-colors"
        >
          Continue as Driver
        </button>
      </div>
    </FrostedCard>
  );
}
