"use client";

import { motion } from "framer-motion";
import { CloudRain, Bug, Sun, Loader2 } from "lucide-react";
import FrostedCard from "./FrostedCard";
import { useEffect, useState } from "react";

type CalendarEntry = {
  day: number;
  weather: string;
  action: string;
  icon: React.ReactNode;
  costSaved: number;
  alert: boolean;
};

export default function CropCalendar() {
  const [calendarData, setCalendarData] = useState<CalendarEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalSaved, setTotalSaved] = useState(0);

  useEffect(() => {
    const fetchAdvisory = async () => {
      try {
        const baseCalendar: CalendarEntry[] = Array.from({ length: 15 }).map((_, i) => ({
          day: i + 1,
          weather: "Sunny",
          action: "Normal Growth",
          icon: <Sun size={24} className="text-yellow-400" />,
          costSaved: 0,
          alert: false,
        }));

        const res = await fetch("http://localhost:8000/api/advisory", { method: "POST" });
        const json = await res.json();

        if (json.status === "success" && json.data) {
          const irrigationAdvice = json.data.irrigation_advice || json.data.instruction || "Follow normal irrigation.";
          const productName =
            json.data.pesticide_suggestion?.name ||
            json.data.recommended_product?.name ||
            "Neem Oil";

          baseCalendar[3] = {
            ...baseCalendar[3],
            weather: "Rainy",
            action: irrigationAdvice,
            icon: <CloudRain size={24} className="text-blue-400" />,
            costSaved: 450,
            alert: true,
          };

          baseCalendar[6] = {
            ...baseCalendar[6],
            weather: "Humid",
            action: `Apply ${productName}`,
            icon: <Bug size={24} className="text-red-400" />,
            costSaved: 0,
            alert: true,
          };
        } else {
          baseCalendar[3] = {
            ...baseCalendar[3],
            weather: "Rainy",
            action: "Skip irrigation (advisory API failed)",
            icon: <CloudRain size={24} className="text-blue-400" />,
            costSaved: 450,
            alert: true,
          };
        }

        setCalendarData(baseCalendar);
        setTotalSaved(baseCalendar.reduce((acc, curr) => acc + curr.costSaved, 0));
      } catch (e) {
        console.error("Failed to connect to backend", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAdvisory();
  }, []);

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex justify-between items-end mb-4">
        <div>
          <h2 className="text-4xl font-manrope font-bold text-white tracking-tight">Weather Guard.</h2>
          <p className="text-on-surface-variant font-inter mt-1">15-day intelligent advisory.</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-outline-variant">Projected Savings</p>
          <p className="text-3xl font-bold text-tertiary-container border-b-2 border-tertiary/20">
            Rs {totalSaved}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="w-full flex flex-col items-center justify-center p-20 gap-4 text-primary">
          <Loader2 size={48} className="animate-spin" />
          <p className="font-bold">Generating insights...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {calendarData.map((entry, idx) => (
            <motion.div
              key={entry.day}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <FrostedCard
                className={`p-4 h-48 flex flex-col justify-between ${
                  entry.alert
                    ? "border-tertiary-container/40 bg-tertiary-container/5 shadow-[0_0_20px_rgba(204,151,255,0.1)]"
                    : "ghost-border"
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-bold text-lg text-outline-variant">Day {entry.day}</span>
                  {entry.icon}
                </div>
                <div>
                  <p
                    className={`font-bold font-manrope text-sm leading-tight ${
                      entry.alert ? "text-tertiary-container" : "text-on-surface"
                    }`}
                  >
                    {entry.action}
                  </p>
                  {entry.costSaved > 0 && (
                    <p className="text-xs text-tertiary mt-2">Rs {entry.costSaved} saved on fuel.</p>
                  )}
                </div>
              </FrostedCard>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
