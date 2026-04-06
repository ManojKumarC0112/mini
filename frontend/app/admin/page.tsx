"use client";

import { useMemo, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/useAppStore";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  Database,
  FileText,
  MapPin,
  ShieldCheck,
  Truck,
  Users,
  Waves,
} from "lucide-react";
import FrostedCard from "@/components/FrostedCard";
import "leaflet/dist/leaflet.css";

const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false });
const CircleMarker = dynamic(() => import("react-leaflet").then((mod) => mod.CircleMarker), { ssr: false });

const villageCenter: [number, number] = [19.9975, 73.7898];

type CropType = "Wheat" | "Onion" | "Dal";

type HeatPoint = { lat: number; lng: number; intensity: number; crop: CropType; taluka: string; pincode: string };

type MandiRow = {
  mandi: string;
  dataGovPrice: number;
  reportedPrice: number;
  variance: number;
};

type OcrLog = {
  farmer: string;
  location: string;
  confidence: number;
  status: "Clear" | "Review";
};

type DriverVerification = {
  name: string;
  truck: string;
  license: string;
  status: "Pending" | "Approved";
};

const cropColors: Record<CropType, string> = {
  Wheat: "#f59e0b",
  Onion: "#ef4444",
  Dal: "#22c55e",
};

const heatPoints: HeatPoint[] = [
  { lat: 20.006, lng: 73.786, intensity: 0.95, crop: "Onion", taluka: "Nashik", pincode: "422003" },
  { lat: 20.012, lng: 73.776, intensity: 0.75, crop: "Wheat", taluka: "Nashik", pincode: "422004" },
  { lat: 19.992, lng: 73.799, intensity: 0.6, crop: "Dal", taluka: "Nashik", pincode: "422007" },
  { lat: 19.988, lng: 73.792, intensity: 0.4, crop: "Wheat", taluka: "Sinnar", pincode: "422103" },
  { lat: 20.002, lng: 73.805, intensity: 0.7, crop: "Onion", taluka: "Nashik", pincode: "422005" },
  { lat: 19.996, lng: 73.777, intensity: 0.5, crop: "Dal", taluka: "Niphad", pincode: "422303" },
  { lat: 20.010, lng: 73.794, intensity: 0.85, crop: "Onion", taluka: "Nashik", pincode: "422006" },
  { lat: 20.004, lng: 73.770, intensity: 0.35, crop: "Wheat", taluka: "Niphad", pincode: "422308" },
  { lat: 19.990, lng: 73.783, intensity: 0.55, crop: "Dal", taluka: "Sinnar", pincode: "422101" },
  { lat: 20.008, lng: 73.801, intensity: 0.8, crop: "Wheat", taluka: "Nashik", pincode: "422002" },
];

const supplyForecast = [
  { label: "30 Days", value: 1240, unit: "MT" },
  { label: "60 Days", value: 3110, unit: "MT" },
  { label: "90 Days", value: 4920, unit: "MT" },
];

const mandiRows: MandiRow[] = [
  { mandi: "Lasalgaon", dataGovPrice: 2350, reportedPrice: 2290, variance: -60 },
  { mandi: "Pimpalgaon", dataGovPrice: 2210, reportedPrice: 2265, variance: 55 },
  { mandi: "Nashik APMC", dataGovPrice: 2120, reportedPrice: 2075, variance: -45 },
  { mandi: "Malegaon", dataGovPrice: 1980, reportedPrice: 2040, variance: 60 },
  { mandi: "Vashi", dataGovPrice: 2600, reportedPrice: 2520, variance: -80 },
];

const ocrLogs: OcrLog[] = [
  { farmer: "Ramesh G.", location: "Nashik", confidence: 92, status: "Clear" },
  { farmer: "Sunita P.", location: "Niphad", confidence: 61, status: "Review" },
  { farmer: "Imran K.", location: "Sinnar", confidence: 78, status: "Review" },
  { farmer: "Aditi J.", location: "Nashik", confidence: 95, status: "Clear" },
];

const driverQueue: DriverVerification[] = [
  { name: "Prakash T.", truck: "MH 15 AB 4412", license: "Uploaded", status: "Pending" },
  { name: "Rohit S.", truck: "MH 14 KJ 1123", license: "Uploaded", status: "Pending" },
  { name: "Meena D.", truck: "MH 15 ZP 9801", license: "Uploaded", status: "Approved" },
];

export default function AdminPage() {
  const router = useRouter();
  const { role, hydrated } = useAppStore();
  const [selectedPincode, setSelectedPincode] = useState("422003");

  useEffect(() => {
    if (!hydrated) return;
    if (role !== "Admin") {
      router.push("/");
    }
  }, [role, hydrated, router]);

  const onionClusters = useMemo(
    () => heatPoints.filter((point) => point.crop === "Onion" && point.intensity >= 0.75),
    []
  );

  const topStats = useMemo(
    () => [
      { label: "Total Hectares Protected", value: "42,600", icon: ShieldCheck },
      { label: "Active Logistics Bids", value: "128", icon: Truck },
      { label: "National Profit Increase %", value: "+7.4%", icon: BarChart3 },
    ],
    []
  );

  return (
    <main className="min-h-screen bg-[#F8FAFC] flex">
      <aside className="hidden lg:flex w-64 border-r border-slate-200 bg-white/90 backdrop-blur-xl flex-col p-6 gap-6">
        <div className="text-xs uppercase tracking-widest text-slate-400 font-bold">Krishi Sakhi</div>
        <nav className="flex flex-col gap-3 text-sm font-semibold text-slate-600">
          <button className="flex items-center gap-3 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700">
            <Waves size={16} /> Market Insights
          </button>
          <button className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100">
            <Truck size={16} /> Logistics Pulse
          </button>
          <button className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100">
            <Users size={16} /> User Management
          </button>
          <button className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100">
            <Activity size={16} /> AI Health
          </button>
        </nav>
        <div className="mt-auto text-[11px] text-slate-500 leading-relaxed">
          The Admin page is the Stabilizer. It prevents the Tragedy of the Commons by monitoring aggregate planting
          intent and protecting district-wide prices.
        </div>
      </aside>

      <section className="flex-1 min-w-0">
        <div className="fixed top-0 left-0 right-0 lg:left-64 h-16 border-b border-slate-200/60 bg-white/90 backdrop-blur-xl z-[10000] flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/")} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition">
              <MapPin size={18} />
            </button>
            <div className="text-xs uppercase tracking-widest text-slate-400 font-bold">Regional Market Monitor</div>
          </div>
          <div className="text-xs font-bold text-slate-600">Admin Control</div>
        </div>

        <div className="pt-24 pb-12 px-4 md:px-8 max-w-7xl mx-auto flex flex-col gap-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3">
            <h1 className="text-4xl md:text-5xl font-manrope font-black text-slate-900">Regional Market Monitor.</h1>
            <p className="text-slate-500 max-w-3xl">
              Anti-herding dashboard with crop density heatmap, supply prediction, and targeted nudges to stabilize
              mandi prices.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topStats.map((stat) => (
              <FrostedCard key={stat.label} className="p-5 border-slate-200 bg-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-slate-400 font-bold">{stat.label}</p>
                    <p className="text-2xl font-black text-slate-900 mt-2 font-manrope">{stat.value}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <stat.icon size={20} />
                  </div>
                </div>
              </FrostedCard>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <FrostedCard className="lg:col-span-2 p-6 border-slate-200 bg-white">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-manrope font-bold text-slate-900">Village Heatmap</h2>
                  <p className="text-sm text-slate-500">Live crop density by taluka and pincode.</p>
                </div>
                <div className="text-xs uppercase tracking-widest text-slate-400 font-bold">Real-time</div>
              </div>
              {onionClusters.length > 3 && (
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  <AlertTriangle size={16} /> Red Alert: Onion cluster detected in Nashik Taluka
                </div>
              )}
              <div className="h-80 w-full rounded-2xl overflow-hidden border border-slate-200">
                <MapContainer center={villageCenter} zoom={13} style={{ height: "100%", width: "100%" }} zoomControl={false}>
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                  {heatPoints.map((point, idx) => (
                    <CircleMarker
                      key={`${point.pincode}-${idx}`}
                      center={[point.lat, point.lng]}
                      radius={10 + point.intensity * 24}
                      pathOptions={{
                        color: cropColors[point.crop],
                        fillColor: cropColors[point.crop],
                        fillOpacity: 0.35 + point.intensity * 0.35,
                      }}
                    />
                  ))}
                </MapContainer>
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cropColors.Wheat }} /> Wheat
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cropColors.Onion }} /> Onion
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cropColors.Dal }} /> Dal
                </div>
                <span className="text-[10px] uppercase tracking-widest text-slate-400">Circle size = density</span>
              </div>
            </FrostedCard>

            <FrostedCard className="p-6 border-slate-200 bg-white">
              <h2 className="text-xl font-manrope font-bold text-slate-900">Supply Prediction</h2>
              <p className="text-sm text-slate-500 mt-1">Estimated harvest volume from locked plans.</p>
              <div className="mt-6 space-y-4">
                {supplyForecast.map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-slate-400 font-bold">{item.label}</p>
                      <p className="text-2xl font-black text-slate-900 font-manrope mt-1">{item.value}</p>
                    </div>
                    <span className="text-sm font-bold text-emerald-600">{item.unit}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 border-t border-slate-100 pt-4">
                <p className="text-xs text-slate-500 mb-2">Global Nudge</p>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedPincode}
                    onChange={(e) => setSelectedPincode(e.target.value)}
                    className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-2"
                  >
                    {Array.from(new Set(heatPoints.map((point) => point.pincode))).map((pin) => (
                      <option key={pin} value={pin}>
                        {pin}
                      </option>
                    ))}
                  </select>
                  <button className="px-4 py-2 text-xs font-bold uppercase tracking-widest bg-emerald-600 text-white rounded-lg">
                    Send Nudge
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  Targets farmers without locked plans in the selected pincode.
                </p>
              </div>
            </FrostedCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <FrostedCard className="p-6 border-slate-200 bg-white">
              <h2 className="text-xl font-manrope font-bold text-slate-900">Logistics Pulse</h2>
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Active Trips</span>
                  <span className="text-xl font-bold text-slate-900">34</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Pending Pings</span>
                  <span className="text-xl font-bold text-amber-600">7</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Dry Runs</span>
                  <span className="text-xl font-bold text-red-600">5</span>
                </div>
              </div>
              <div className="mt-6 text-xs text-slate-500">
                Back-haul opportunity: fertilizers to Niphad (2 trucks idle).
              </div>
            </FrostedCard>

            <FrostedCard className="lg:col-span-2 p-6 border-slate-200 bg-white">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-manrope font-bold text-slate-900">Mandi Health</h2>
                <div className="text-xs uppercase tracking-widest text-slate-400 font-bold">Data.gov.in vs Reported</div>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase tracking-widest text-slate-400">
                    <tr>
                      <th className="text-left py-2">Mandi</th>
                      <th className="text-right py-2">Data.gov.in</th>
                      <th className="text-right py-2">Reported</th>
                      <th className="text-right py-2">Variance</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-700">
                    {mandiRows.map((row) => (
                      <tr key={row.mandi} className="border-t border-slate-100">
                        <td className="py-2 font-semibold">{row.mandi}</td>
                        <td className="py-2 text-right">Rs {row.dataGovPrice}</td>
                        <td className="py-2 text-right">Rs {row.reportedPrice}</td>
                        <td className={`py-2 text-right font-bold ${row.variance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                          {row.variance >= 0 ? "+" : ""}{row.variance}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </FrostedCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <FrostedCard className="p-6 border-slate-200 bg-white">
              <h2 className="text-xl font-manrope font-bold text-slate-900">Verified OCR Logs</h2>
              <div className="mt-4 space-y-3">
                {ocrLogs.map((log) => (
                  <div key={log.farmer} className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{log.farmer}</p>
                      <p className="text-xs text-slate-500">{log.location}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-600">{log.confidence}%</p>
                      <span className={`text-[11px] font-bold ${log.status === "Review" ? "text-amber-600" : "text-emerald-600"}`}>
                        {log.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </FrostedCard>

            <FrostedCard className="p-6 border-slate-200 bg-white">
              <h2 className="text-xl font-manrope font-bold text-slate-900">Driver Verification</h2>
              <div className="mt-4 space-y-3">
                {driverQueue.map((driver) => (
                  <div key={driver.name} className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{driver.name}</p>
                      <p className="text-xs text-slate-500">{driver.truck}</p>
                    </div>
                    <span className={`text-[11px] font-bold ${driver.status === "Pending" ? "text-amber-600" : "text-emerald-600"}`}>
                      {driver.status}
                    </span>
                  </div>
                ))}
              </div>
              <button className="mt-4 w-full py-2 text-xs font-bold uppercase tracking-widest bg-slate-900 text-white rounded-lg">
                Review Queue
              </button>
            </FrostedCard>

            <FrostedCard className="p-6 border-slate-200 bg-white">
              <h2 className="text-xl font-manrope font-bold text-slate-900">AI Health</h2>
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Clock size={14} /> Groq Advisory
                  </div>
                  <span className="text-sm font-bold text-emerald-600">420 ms</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Clock size={14} /> Sarvam TTS
                  </div>
                  <span className="text-sm font-bold text-emerald-600">580 ms</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Database size={14} /> DB Sync
                  </div>
                  <span className="text-sm font-bold text-emerald-600">1.2 s</span>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                <CheckCircle2 size={14} className="text-emerald-600" /> Systems nominal
              </div>
            </FrostedCard>
          </div>

          <FrostedCard className="p-6 border-slate-200 bg-white">
            <div className="flex items-center gap-3">
              <FileText size={18} className="text-emerald-600" />
              <div>
                <h3 className="text-lg font-bold text-slate-900">Why Admin Exists</h3>
                <p className="text-sm text-slate-500">
                  The Admin page stabilizes the ecosystem by preventing herd behavior. It uses aggregate data to
                  avoid district-wide overplanting and price crashes.
                </p>
              </div>
            </div>
          </FrostedCard>
        </div>
      </section>
    </main>
  );
}
