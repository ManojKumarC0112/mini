"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, X } from "lucide-react";

export type SpotlightStep = {
  target?: string; // CSS selector
  content: string;
  title?: string;
  placement?: "top" | "bottom" | "left" | "right" | "center";
};

type Props = {
  steps: SpotlightStep[];
  onComplete: () => void;
  onStepChange?: (index: number) => void;
  currentIndex?: number;
  allowManualControls?: boolean;
  autoDismissMs?: number;
};

export default function CinematicSpotlight({
  steps,
  onComplete,
  onStepChange,
  currentIndex,
  allowManualControls = true,
  autoDismissMs,
}: Props) {
  const [internalIndex, setInternalIndex] = useState(0);
  const [coords, setCoords] = useState<{ x: number; y: number; w: number; h: number; r: number }>({
    x: 0,
    y: 0,
    w: 0,
    h: 0,
    r: 0,
  });
  const [isVisible, setIsVisible] = useState(true);
  const [tooltipSide, setTooltipSide] = useState<"top" | "bottom">("bottom");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const index =
    typeof currentIndex === "number" && currentIndex >= 0 && currentIndex < steps.length
      ? currentIndex
      : internalIndex;
  const currentStep = steps[index];
  const mobileTooltipTop = Math.max(
    12,
    Math.min(
      tooltipSide === "bottom" ? coords.y + coords.h + 12 : coords.y - 190,
      (typeof window !== "undefined" ? window.innerHeight : 800) - 220
    )
  );

  const updateCoords = useCallback(() => {
    if (!currentStep?.target) {
      // Full screen mode
      setCoords({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        w: 0,
        h: 0,
        r: 0,
      });
      return;
    }

    const el = document.querySelector(currentStep.target);
    if (el) {
      const rect = el.getBoundingClientRect();
      setCoords({
        x: rect.left - 8,
        y: rect.top - 8,
        w: rect.width + 16,
        h: rect.height + 16,
        r: 16,
      });

      // Smart positioning: If space below is less than 250px, flip to top
      const spaceBelow = window.innerHeight - rect.bottom;
      setTooltipSide(spaceBelow < 250 ? "top" : "bottom");
    }
  }, [currentStep]);

  useEffect(() => {
    const rafId = requestAnimationFrame(updateCoords);
    window.addEventListener("resize", updateCoords);
    window.addEventListener("scroll", updateCoords);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", updateCoords);
      window.removeEventListener("scroll", updateCoords);
    };
  }, [updateCoords]);

  useEffect(() => {
    if (onStepChange) onStepChange(index);
  }, [index, onStepChange]);

  useEffect(() => {
    if (!autoDismissMs) return;
    const id = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 300);
    }, autoDismissMs);
    return () => clearTimeout(id);
  }, [index, autoDismissMs, onComplete]);

  const nextStep = () => {
    if (index < steps.length - 1) {
      setInternalIndex(index + 1);
    } else {
      setIsVisible(false);
      setTimeout(onComplete, 500);
    }
  };

  const skipTour = () => {
    setIsVisible(false);
    setTimeout(onComplete, 500);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-[99999] pointer-events-none overflow-hidden">
          {/* SVG Mask Overlay */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              <mask id="cinematic-mask">
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                <motion.rect
                  animate={{
                    x: coords.x,
                    y: coords.y,
                    width: coords.w,
                    height: coords.h,
                    rx: coords.r,
                  }}
                  transition={{ type: "spring", stiffness: 100, damping: 20 }}
                  fill="black"
                />
              </mask>
            </defs>
            <motion.rect
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="rgba(0, 0, 0, 0.85)"
              mask="url(#cinematic-mask)"
              className="pointer-events-none"
            />
          </svg>

          {/* Interaction Layer (Hole is clickable) */}
          <motion.div
             animate={{
                x: coords.x,
                y: coords.y,
                width: coords.w,
                height: coords.h,
             }}
             transition={{ type: "spring", stiffness: 100, damping: 20 }}
             className="absolute pointer-events-none border-2 border-white/20 rounded-[18px] box-content shadow-[0_0_0_9999px_rgba(0,0,0,0)]"
          />

          {/* Tooltip Overlay */}
          <div className="absolute inset-0 pointer-events-none">
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ delay: 0.2 }}
              style={{
                position: "absolute",
                ...(isMobile
                  ? {
                      left: "12px",
                      right: "12px",
                      top: currentStep?.target ? `${mobileTooltipTop}px` : "auto",
                      bottom: currentStep?.target ? "auto" : "20px",
                      transform: "none",
                    }
                  : {
                      left: currentStep?.target ? coords.x + coords.w / 2 : "50%",
                      top: currentStep?.target
                        ? tooltipSide === "bottom"
                          ? coords.y + coords.h + 20
                          : coords.y - 20
                        : "50%",
                      transform: currentStep?.target
                        ? tooltipSide === "bottom"
                          ? "translateX(-50%)"
                          : "translate(-50%, -100%)"
                        : "translate(-50%, -50%)",
                    }),
              }}
              className={`pointer-events-auto ${isMobile ? "w-auto" : "w-full max-w-[calc(100vw-32px)] md:max-w-sm px-4 md:px-0"}`}
            >
              <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-6 md:p-8 shadow-2xl text-white relative overflow-hidden group">
                {/* Glow Effect */}
                <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/30 rounded-full blur-[80px] pointer-events-none" />
                
                <div className="relative z-10 flex flex-col gap-4">
                  {currentStep.title && (
                    <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
                      {currentStep.title}
                    </h4>
                  )}
                  
                  <p className="text-lg md:text-xl font-manrope font-semibold leading-relaxed max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                    {currentStep.content}
                  </p>

                  {allowManualControls && (
                    <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/10">
                      <button 
                        onClick={skipTour}
                        className="text-white/40 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest flex items-center gap-2"
                      >
                        <X size={14} /> Skip
                      </button>
                      
                      <button
                        onClick={nextStep}
                        className="bg-white text-slate-900 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-primary hover:text-white transition-all active:scale-95 group"
                      >
                        {index === steps.length - 1 ? "Get Started" : "Continue"}
                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                <div className="absolute bottom-0 left-0 h-1 bg-white/10 w-full">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${((index + 1) / steps.length) * 100}%` }}
                    className="h-full bg-primary"
                  />
                </div>
              </div>

              {/* Step indicator */}
              {allowManualControls && (
                <div className="mt-4 flex justify-center gap-2">
                  {steps.map((_, i) => (
                    <div 
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-500 ${i === index ? 'w-8 bg-white' : 'w-1.5 bg-white/20'}`}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
