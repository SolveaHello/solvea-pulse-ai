"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface Props {
  label: string;
  valueHint: string;
  className?: string;
}

export function SettingsApiKeyRow({ label, valueHint, className = "" }: Props) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className="text-xs text-muted-foreground w-28 shrink-0">{label}</span>
      <div className="flex items-center gap-2 flex-1 bg-muted/40 border rounded-md px-3 py-1.5">
        <span className="text-xs font-mono text-foreground/70 flex-1">
          {revealed ? valueHint : valueHint.replace(/[^•\s@.]/g, "•")}
        </span>
        <button
          onClick={() => setRevealed((v) => !v)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}
