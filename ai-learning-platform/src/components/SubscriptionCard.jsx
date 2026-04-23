import { useState, useEffect } from "react";
import { Crown, Sparkles, Star, Zap, ArrowRight, CheckCircle, Calendar } from "lucide-react";
import { getPlan, getUsage } from "../lib/subscription";
import { getUserPlan } from "../api";

/* ── Plan display config ─────────────────────────────────── */
const PLAN_CONFIG = {
  free: {
    label:   "Free",
    icon:    <Star size={16} />,
    color:   "#94A3B8",
    glow:    "rgba(148,163,184,0.15)",
    border:  "rgba(148,163,184,0.25)",
    dailyLimit: 5,
    desc:    "5 AI requests / day",
  },
  pro: {
    label:   "Pro",
    icon:    <Crown size={16} />,
    color:   "#A78BFA",
    glow:    "rgba(139,92,246,0.2)",
    border:  "rgba(139,92,246,0.4)",
    dailyLimit: 50,
    desc:    "50 AI requests / day",
  },
  premium: {
    label:   "Premium",
    icon:    <Sparkles size={16} />,
    color:   "#22D3EE",
    glow:    "rgba(34,211,238,0.18)",
    border:  "rgba(34,211,238,0.35)",
    dailyLimit: null, // unlimited
    desc:    "Unlimited AI requests",
  },
};

export default function SubscriptionCard({ onNavigate }) {
  const [plan, setPlan]     = useState(getPlan());
  const [usage, setUsage]   = useState(getUsage());
  const [expiry, setExpiry] = useState(null);

  // Sync plan + expiry from server and keep localStorage in sync
  useEffect(() => {
    const sync = () => {
      setPlan(getPlan());
      setUsage(getUsage());
    };
    sync();

    // Fetch server-side plan + expiry if logged in
    const token = localStorage.getItem("token");
    if (token) {
      getUserPlan()
        .then(r => {
          const serverPlan = r.data?.plan || "free";
          const serverExpiry = r.data?.expiry || null;
          setPlan(serverPlan);
          setExpiry(serverExpiry);
          // Sync to localStorage so other components pick it up
          localStorage.setItem("mentorai_subscription", serverPlan);
          window.dispatchEvent(new Event("storage"));
        })
        .catch(() => {});
    }

    // Poll localStorage every 3s for same-tab updates
    const t = setInterval(sync, 3000);
    window.addEventListener("storage", sync);
    return () => { clearInterval(t); window.removeEventListener("storage", sync); };
  }, []);

  const cfg        = PLAN_CONFIG[plan] || PLAN_CONFIG.free;
  const usedToday  = usage?.generates || 0;
  const limit      = cfg.dailyLimit;
  const usagePct   = limit ? Math.min(100, Math.round((usedToday / limit) * 100)) : 0;
  const isUnlimited = limit === null;
  const isFree     = plan === "free";

  const expiryStr = expiry
    ? new Date(expiry).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : null;

  return (
    <div
      className="sub-card"
      style={{
        "--sc-color":  cfg.color,
        "--sc-glow":   cfg.glow,
        "--sc-border": cfg.border,
      }}
    >
      {/* Header row */}
      <div className="sub-card-header">
        <div className="sub-card-plan-info">
          <div className="sub-card-icon" style={{ color: cfg.color, background: `${cfg.color}18`, border: `1px solid ${cfg.color}30` }}>
            {cfg.icon}
          </div>
          <div>
            <div className="sub-card-plan-name" style={{ color: cfg.color }}>
              {cfg.label} Plan
            </div>
            <div className="sub-card-plan-desc">{cfg.desc}</div>
          </div>
        </div>

        {/* Status badge */}
        <div className="sub-card-status clickable" onClick={() => onNavigate("pricing")} title="View Plans">
          <CheckCircle size={12} style={{ color: "#10B981" }} />
          <span style={{ color: "#10B981" }}>Active</span>
        </div>
      </div>

      {/* Expiry */}
      <div className="sub-card-expiry">
        <Calendar size={12} />
        <span>Expiry: {expiryStr || "Never"}</span>
      </div>

      {/* Usage bar */}
      <div className="sub-card-usage">
        <div className="sub-card-usage-label">
          <span>Today's usage</span>
          <span style={{ color: cfg.color }}>
            {isUnlimited ? `${usedToday} used` : `${usedToday} / ${limit}`}
          </span>
        </div>
        <div className="sub-card-bar-track">
          {isUnlimited ? (
            <div className="sub-card-bar-fill sub-card-bar-unlimited" style={{ background: cfg.color }} />
          ) : (
            <div
              className="sub-card-bar-fill"
              style={{
                width: `${usagePct}%`,
                background: usagePct >= 80
                  ? "linear-gradient(90deg, #ef4444, #f97316)"
                  : `linear-gradient(90deg, ${cfg.color}, ${cfg.color}cc)`,
              }}
            />
          )}
        </div>
        {!isUnlimited && (
          <div className="sub-card-usage-sub">
            {limit - usedToday > 0
              ? `${limit - usedToday} requests remaining today`
              : "Daily limit reached — upgrade for more"}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="sub-card-actions">
        <button
          className="sub-card-btn sub-card-btn-ghost"
          onClick={() => { console.log("[SubscriptionCard] View Plans clicked"); onNavigate("pricing"); }}
        >
          View Plans <ArrowRight size={13} />
        </button>
        {isFree && (
          <button
            className="sub-card-btn sub-card-btn-primary"
            onClick={() => { console.log("[SubscriptionCard] Upgrade Plan clicked"); onNavigate("pricing"); }}
          >
            <Zap size={13} /> Upgrade Plan
          </button>
        )}
        {!isFree && (
          <button
            className="sub-card-btn sub-card-btn-manage"
            onClick={() => { console.log("[SubscriptionCard] Manage clicked"); onNavigate("pricing"); }}
            style={{ borderColor: `${cfg.color}35`, color: cfg.color, background: `${cfg.color}10` }}
          >
            Manage Plan
          </button>
        )}
      </div>
    </div>
  );
}
