import { useState, useEffect } from "react";
import { Zap } from "lucide-react";
import { getPlan } from "../lib/subscription";

const USAGE_DISPLAY_KEY = "mentorai_usage_display";

export default function UsageCounter({ onUpgrade }) {
  const [usage, setUsage] = useState(null);
  const plan = getPlan();

  useEffect(() => {
    const load = () => {
      try {
        const raw = localStorage.getItem(USAGE_DISPLAY_KEY);
        if (raw) setUsage(JSON.parse(raw));
      } catch {}
    };
    load();
    window.addEventListener("storage", load);
    // Poll every 5s to catch updates from same tab
    const t = setInterval(load, 5000);
    return () => { window.removeEventListener("storage", load); clearInterval(t); };
  }, []);

  if (plan !== "free" || !usage) return null;

  const { used, limit, remaining } = usage;
  const pct = Math.round((used / limit) * 100);
  const isLow = remaining <= 1;

  return (
    <div className={`uc-pill ${isLow ? "uc-low" : ""}`} title={`${remaining} requests remaining today`}>
      <Zap size={11} />
      <span>{used}/{limit} today</span>
      {isLow && (
        <button className="uc-upgrade" onClick={onUpgrade}>Upgrade</button>
      )}
    </div>
  );
}
