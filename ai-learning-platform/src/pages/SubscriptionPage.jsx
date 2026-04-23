import { useState, useEffect } from "react";
import { Check, Crown, Sparkles, Star, Zap, Calendar, Shield, ArrowRight, RefreshCw, AlertCircle } from "lucide-react";
import { getPlan, setPlan, getUsage } from "../lib/subscription";
import { getUserPlan, createOrder, verifyPayment } from "../api";
import { toast } from "react-hot-toast";

/* ── Plan data ───────────────────────────────────────────── */
const PLANS = [
  {
    id: "free", name: "Free", price: "₹0", period: "/month",
    icon: <Star size={16} />, color: "#94A3B8", glow: "rgba(148,163,184,0.12)",
    features: ["20 AI requests / day", "Basic AI learning", "Limited quizzes", "Last 10 sessions"],
    limits: { requests: 20 },
  },
  {
    id: "pro", name: "Pro", price: "₹199", period: "/month",
    icon: <Crown size={16} />, color: "#A78BFA", glow: "rgba(139,92,246,0.2)",
    badge: "Recommended",
    features: ["50 AI requests / day", "Full learning modules", "Quiz + Interview prep", "Priority AI response", "Full history", "Priority support"],
    limits: { requests: 50 },
  },
  {
    id: "premium", name: "Premium", price: "₹499", period: "/month",
    icon: <Sparkles size={16} />, color: "#22D3EE", glow: "rgba(34,211,238,0.18)",
    badge: "Most Popular",
    features: ["Unlimited AI requests", "All Pro features", "Faster AI responses", "Advanced analytics", "Weak area insights", "Dedicated support"],
    limits: { requests: null },
  },
];

const PLAN_ORDER = { free: 0, pro: 1, premium: 2 };

/* ── Current Plan Banner ─────────────────────────────────── */
function CurrentPlanBanner({ plan, expiry, usage, onManage }) {
  const meta   = PLANS.find(p => p.id === plan) || PLANS[0];
  const used   = usage?.generates || 0;
  const limit  = meta.limits.requests;
  const pct    = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const isUnlimited = limit === null;

  const expiryStr = expiry
    ? new Date(expiry).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : null;

  const barColor = pct >= 80 ? "#ef4444" : pct >= 60 ? "#f59e0b" : meta.color;

  return (
    <div className="sp-current-banner" style={{ borderColor: `${meta.color}35`, boxShadow: `0 0 28px ${meta.glow}` }}>
      <div className="sp-current-top">
        <div className="sp-current-left">
          <div className="sp-current-icon" style={{ color: meta.color, background: `${meta.color}18`, border: `1px solid ${meta.color}30` }}>
            {meta.icon}
          </div>
          <div>
            <div className="sp-current-label">Current Plan</div>
            <div className="sp-current-name" style={{ color: meta.color }}>{meta.name}</div>
          </div>
        </div>
        <div className="sp-current-right">
          <div className="sp-current-status">
            <span className="sp-status-dot" style={{ background: plan === "free" ? "#64748b" : "#10B981" }} />
            <span style={{ color: plan === "free" ? "#64748b" : "#10B981" }}>
              {plan === "free" ? "Free tier" : "Active"}
            </span>
          </div>
          <div className="sp-current-price" style={{ color: meta.color }}>
            {meta.price}<span className="sp-current-period">{meta.period}</span>
          </div>
        </div>
      </div>

      {/* Billing info */}
      <div className="sp-billing-row">
        {expiryStr ? (
          <div className="sp-billing-item">
            <Calendar size={13} />
            <span>Renews on <strong>{expiryStr}</strong></span>
          </div>
        ) : plan !== "free" ? (
          <div className="sp-billing-item">
            <Calendar size={13} />
            <span>No expiry set</span>
          </div>
        ) : (
          <div className="sp-billing-item">
            <Shield size={13} />
            <span>Free forever · No credit card required</span>
          </div>
        )}
      </div>

      {/* Usage bar */}
      <div className="sp-usage-section">
        <div className="sp-usage-label">
          <span>Today's AI requests</span>
          <span style={{ color: meta.color, fontWeight: 700 }}>
            {isUnlimited ? `${used} used (unlimited)` : `${used} / ${limit}`}
          </span>
        </div>
        <div className="sp-usage-track">
          {isUnlimited ? (
            <div className="sp-usage-fill sp-usage-unlimited" style={{ background: meta.color }} />
          ) : (
            <div className="sp-usage-fill" style={{ width: `${pct}%`, background: barColor }} />
          )}
        </div>
        {!isUnlimited && limit - used <= 2 && limit - used > 0 && (
          <div className="sp-usage-warn">
            <AlertCircle size={12} /> Only {limit - used} request{limit - used === 1 ? "" : "s"} remaining today
          </div>
        )}
        {!isUnlimited && used >= limit && (
          <div className="sp-usage-warn sp-usage-exhausted">
            <AlertCircle size={12} /> Daily limit reached — upgrade for more
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Plan Comparison Card ────────────────────────────────── */
function PlanCard({ plan, currentPlan, loading, onUpgrade }) {
  const isCurrent  = currentPlan === plan.id;
  const isUpgrade  = PLAN_ORDER[plan.id] > PLAN_ORDER[currentPlan];
  const isDowngrade = PLAN_ORDER[plan.id] < PLAN_ORDER[currentPlan];
  const isLoading  = loading === plan.id;

  return (
    <div
      className={`sp-plan-card ${isCurrent ? "sp-plan-current" : ""}`}
      style={{
        borderColor: isCurrent ? plan.color : "rgba(255,255,255,0.08)",
        boxShadow:   isCurrent ? `0 0 24px ${plan.glow}` : undefined,
      }}
    >
      {plan.badge && !isCurrent && (
        <div className="sp-plan-badge" style={{ background: `${plan.color}20`, color: plan.color, border: `1px solid ${plan.color}35` }}>
          {plan.badge}
        </div>
      )}
      {isCurrent && (
        <div className="sp-plan-badge sp-plan-badge-current">
          <Check size={11} /> Current Plan
        </div>
      )}

      <div className="sp-plan-header">
        <div className="sp-plan-icon" style={{ color: plan.color, background: `${plan.color}18`, border: `1px solid ${plan.color}30` }}>
          {plan.icon}
        </div>
        <div>
          <div className="sp-plan-name" style={{ color: plan.color }}>{plan.name}</div>
          <div className="sp-plan-price">
            <span style={{ color: plan.color, fontSize: "1.5rem", fontWeight: 800 }}>{plan.price}</span>
            <span className="sp-plan-period">{plan.period}</span>
          </div>
        </div>
      </div>

      <ul className="sp-plan-features">
        {plan.features.map((f, i) => (
          <li key={i}>
            <span className="sp-feature-check" style={{ color: plan.color, background: `${plan.color}15` }}>
              <Check size={10} strokeWidth={3} />
            </span>
            {f}
          </li>
        ))}
      </ul>

      <div className="sp-plan-cta">
        {isCurrent ? (
          <div className="sp-cta-current" style={{ color: plan.color, borderColor: `${plan.color}30`, background: `${plan.color}08` }}>
            <Check size={14} /> Your Current Plan
          </div>
        ) : isUpgrade ? (
          <button
            className="sp-cta-upgrade"
            style={{ background: `linear-gradient(135deg, ${plan.color}, ${plan.id === "premium" ? "#0891B2" : "#6D28D9"})` }}
            onClick={() => onUpgrade(plan.id)}
            disabled={!!loading}
          >
            {isLoading
              ? <span className="sp-spinner" />
              : <><Zap size={13} /> Upgrade to {plan.name}</>}
          </button>
        ) : (
          <button className="sp-cta-downgrade" onClick={() => toast("Contact support to downgrade.")}>
            Downgrade
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────── */
export default function SubscriptionPage() {
  const [plan, setPlanState]   = useState(getPlan());
  const [expiry, setExpiry]    = useState(null);
  const [usage, setUsage]      = useState(getUsage());
  const [loading, setLoading]  = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPlan = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const r = await getUserPlan();
      const serverPlan = r.data?.plan || "free";
      setExpiry(r.data?.expiry || null);
      setPlanState(serverPlan);
      setPlan(serverPlan);
      localStorage.setItem("mentorai_subscription", serverPlan);
      window.dispatchEvent(new Event("storage"));
    } catch {}
  };

  useEffect(() => {
    fetchPlan();
    setUsage(getUsage());
    const t = setInterval(() => setUsage(getUsage()), 5000);
    return () => clearInterval(t);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPlan();
    setUsage(getUsage());
    setRefreshing(false);
    toast.success("Plan refreshed");
  };

  const loadRazorpay = () =>
    new Promise(resolve => {
      if (window.Razorpay) return resolve(true);
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    });

  const handleUpgrade = async (planId) => {
    const token = localStorage.getItem("token");
    if (!token) { toast.error("Please log in to upgrade."); return; }
    setLoading(planId);
    try {
      const loaded = await loadRazorpay();
      if (!loaded) { toast.error("Payment gateway failed to load."); setLoading(null); return; }
      const { data } = await createOrder(planId);
      const meta = PLANS.find(p => p.id === planId);
      const options = {
        key:         import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount:      data.amount,
        currency:    data.currency,
        name:        "MentorAI",
        description: `${meta.name} Plan — 1 Month`,
        order_id:    data.order_id,
        handler: async (response) => {
          try {
            await verifyPayment({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              plan:                planId,
            });
            setPlan(planId);
            setPlanState(planId);
            localStorage.setItem("mentorai_subscription", planId);
            window.dispatchEvent(new Event("storage"));
            await fetchPlan();
            toast.success(`🎉 Upgraded to ${meta.name}!`);
          } catch (err) {
            toast.error(err.response?.data?.error || "Payment verification failed");
          }
        },
        prefill: { name: "", email: "" },
        theme:   { color: meta.color },
        modal:   { ondismiss: () => setLoading(null) },
      };
      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", r => { toast.error(`Payment failed: ${r.error.description}`); setLoading(null); });
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.error || "Something went wrong");
      setLoading(null);
    }
  };

  return (
    <div className="sp-page">
      {/* Header */}
      <div className="sp-header">
        <div>
          <h2 className="sp-title">Subscription & Billing</h2>
          <p className="sp-subtitle">Manage your plan, view usage, and upgrade anytime.</p>
        </div>
        <button className="sp-refresh-btn" onClick={handleRefresh} disabled={refreshing} title="Refresh plan">
          <RefreshCw size={14} className={refreshing ? "sp-spin" : ""} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Current plan banner */}
      <CurrentPlanBanner plan={plan} expiry={expiry} usage={usage} />

      {/* Plan comparison */}
      <div className="sp-section-title">
        <Crown size={16} style={{ color: "#A78BFA" }} />
        <span>Available Plans</span>
      </div>

      <div className="sp-plans-grid">
        {PLANS.map(p => (
          <PlanCard
            key={p.id}
            plan={p}
            currentPlan={plan}
            loading={loading}
            onUpgrade={handleUpgrade}
          />
        ))}
      </div>

      {/* Billing note */}
      <div className="sp-billing-note">
        <Shield size={13} />
        <span>Payments secured by Razorpay · UPI, Cards, Net Banking · Cancel anytime · 7-day refund policy</span>
      </div>
    </div>
  );
}
