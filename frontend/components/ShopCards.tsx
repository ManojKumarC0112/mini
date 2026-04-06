"use client";

import { motion } from "framer-motion";
import { ShoppingCart, MapPin, CheckCircle2, ShieldCheck, Zap } from "lucide-react";
import FrostedCard from "./FrostedCard";

interface Product {
    id: number;
    name: string;
    type: 'Organic' | 'Standard' | 'Premium';
    price: string;
    description: string;
    icon: any;
    color: string;
}

const PRODUCTS: Product[] = [
    { 
        id: 1, 
        name: "Neem Kranti", 
        type: "Organic", 
        price: "₹180", 
        description: "Pure neem extract. Zero chemical residue. Export quality.", 
        icon: <ShieldCheck size={32} />,
        color: "bg-emerald-50 text-emerald-600 border-emerald-100"
    },
    { 
        id: 2, 
        name: "Deltamethrin 2.5", 
        type: "Standard", 
        price: "₹350", 
        description: "Broad spectrum control. Fast knockdown effect.", 
        icon: <CheckCircle2 size={32} />,
        color: "bg-blue-50 text-blue-600 border-blue-100"
    },
    { 
        id: 3, 
        name: "NanoGuard Ultra", 
        type: "Premium", 
        price: "₹850", 
        description: "Molecular adhesion tech. Works for 21 days even in rain.", 
        icon: <Zap size={32} />,
        color: "bg-violet-50 text-violet-600 border-violet-100"
    }
];

export default function ShopCards() {
    return (
        <div className="w-full flex flex-col gap-6 mt-12">
            <div className="flex justify-between items-center px-2">
                <h3 className="text-2xl font-manrope font-black text-slate-800 tracking-tight">Pest Defense.</h3>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full border border-slate-200">3 Verified Options</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {PRODUCTS.map((product, idx) => (
                    <motion.div
                        key={product.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.1 }}
                    >
                        <FrostedCard className="p-0 h-full flex flex-col group overflow-hidden hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500">
                             <div className={`p-8 flex items-center justify-center ${product.color} relative overflow-hidden`}>
                                <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-white/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
                                {product.icon}
                                <div className="absolute top-4 right-4 bg-white/80 backdrop-blur px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-200">
                                    {product.type}
                                </div>
                             </div>

                             <div className="p-6 flex-1 flex flex-col">
                                <h4 className="text-xl font-manrope font-black text-slate-900 mb-1">{product.name}</h4>
                                <p className="text-sm text-slate-500 font-inter leading-relaxed flex-1">
                                    {product.description}
                                </p>
                                
                                <div className="mt-6 flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Price</p>
                                        <p className="text-2xl font-manrope font-black text-slate-900">{product.price}</p>
                                    </div>
                                    <div className="bg-emerald-50 px-2 py-1 rounded text-[10px] font-bold text-emerald-600">
                                        Best Deal
                                    </div>
                                </div>

                                <div className="mt-6 flex gap-3">
                                    <button className="flex-1 py-4 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg active:scale-95 group-hover:bg-primary">
                                         Buy Now
                                    </button>
                                    <button className="p-4 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all active:scale-95">
                                         <MapPin size={20} />
                                    </button>
                                </div>
                             </div>
                        </FrostedCard>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
