import { ReactNode } from "react";

interface FrostedCardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  onClick?: () => void;
}

export default function FrostedCard({ children, className = "", title, subtitle, onClick }: FrostedCardProps) {
  return (
    <div 
      onClick={onClick}
      className={`frost-glass ghost-border p-6 shadow-xl ${onClick ? 'cursor-pointer hover:bg-surface-variant/80 transition-colors' : ''} ${className}`}
    >
      {(title || subtitle) && (
        <div className="mb-4">
          {title && <h3 className="text-xl font-manrope font-bold text-on-surface mb-1">{title}</h3>}
          {subtitle && <p className="text-sm font-inter text-on-surface-variant">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}
