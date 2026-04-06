"use client";

import { motion } from "framer-motion";
import { Mic, MicOff } from "lucide-react";
import { useState } from "react";

export default function MicButton({ onClick }: { onClick?: () => void }) {
  const [isListening, setIsListening] = useState(false);

  const handleClick = () => {
    setIsListening(!isListening);
    if (onClick) onClick();
  };

  return (
    <div className="relative flex items-center justify-center">
      {isListening && (
        <motion.div
          animate={{ scale: [1, 1.05, 1], opacity: [0.8, 0.2, 0.8] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="absolute inset-0 bg-tertiary/20 rounded-full"
          style={{ padding: "30%" }}
        />
      )}
      <motion.button
        onClick={handleClick}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-colors 
        ${
          isListening
            ? "bg-gradient-to-br from-tertiary-container to-tertiary-dim text-surface"
            : "bg-gradient-to-br from-primary to-primary-dim text-on-surface"
        } shadow-[0_20px_40px_rgba(71,0,124,0.2)] ghost-border`}
      >
        {isListening ? <Mic size={32} /> : <MicOff size={32} />}
      </motion.button>
    </div>
  );
}
