import { useState, useEffect } from "react";
import { Check, Crown, Sparkles, Star, Zap, AlertCircle, RefreshCw } from "lucide-react";
import { getPlan, setPlan, getUsage } from "../lib/subscription";
import { getUserPlan, createOrder, verifyPayment } from "../api";
import { toast } from "react-hot-toast";

/* ── Plan data ───────────────────────────────────────────── */
const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "₹0",
    period: "/month",
    icon: <Star size={18} />,
    color: "#94A3B8",
    glow: "rgba(148,163,184,0.12)",
    desc: "Perfect for getting started",
    features: [
      "20 AI requests / day",
      "Basic AI learning",
      "Limited quizzes",
      "Last 10 sessions",
      "Community support",
    ],
    limits: { requests: 20 },
  },
  {
    id: "pro",
    name: "Pro",
    price: "₹199",
    period: "/month",
    icon: <Crown size={18} />,
    color: "#A78BFA",
    glow: "rgba(139,92,246,0.2)",
    desc: "For serious learners",
    badge: "Recommended",
    features: [
      "50 AI requests / day",
      "Full learning modules",
      "Quiz + Interview prep",
      "Priority AI response",
      "Full history",
      "Priority support",
    ],
    limits: { requests: 50 },
  },
  {
    id: "premium",
    name: "Premium",
    price: "₹499",
    period: "/month",
    icon: <Sparkles size={18} />,
    color: "#22D3EE",
    glow: "rgba(34,211,238,0.18)",
    desc: "Maximum learning power",
    badge: "Most Popular",
    features: [
      "Unlimited AI requests",
      "All Pro features",
      "Faster AI responses",
      "Advanced analytics",
      "Weak area insights",
      "Dedicated support",
    ],
    limits: { requests: null },
  },
];

const PLAN_ORDER = { free: 0, pro: 1, premium: 2 };

/* ── Current Tier Info Card ──────────────────────────────── */
function CurrentTierCard({ plan, usage }) {
  const meta = PLANS.find(p => p.id === plan) || PLANS[0];
  const used = usage?.generates || 0;
  const limit = meta.limits.requests;
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const isUnlimited = limit === null;
  const barColor = pct >= 80 ? "#ef4444" : pct >= 60 ? "#f59e0b" : meta.color;

  return (
    <div
      className="relative rounded-2xl border p-6 bg-gray-900/80 backdrop-blur-sm"
      style={{
        borderColor: `${meta.color}35`,
        boxShadow: `0 0 32px ${meta.glow}, 0 0 0 1px ${meta.color}30`,
      }}
    >
      <div className="flex items-start gap-4 mb-6">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${meta.color}18`, color: meta.color, border: `1px solid ${meta.color}30` }}
        >
          {meta.icon}
        </div>
        <div className="flex-1">
          <div className="text-sm text-slate-400 mb-1">Your Current Plan</div>
          <div className="text-2xl font-bold" style={{ color: meta.color }}>
            {meta.name}
          </div>
          <div className="text-sm text-slate-400 mt-1">{meta.desc}</div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-extrabold" style={{ color: meta.color }}>
            {meta.price}
          </div>
          <div className="text-xs text-slate-500">{meta.period}</div>
        </div>
      </div>

      {/* Usage bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-300">Today's AI Requests</span>
          <span className="text-sm font-semibold" style={{ color: meta.color }}>
            {isUnlimited ? `${used} used (unlimited)` : `${used} / ${limit}`}
          </span>
        </div>
        <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
          {isUnlimited ? (
            <div className="h-full w-full" style={{ background: meta.color, opacity: 0.6 }} />
          ) : (
            <div className="h-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
          )}
        </div>
        {!isUnlimited && limit - used <= 2 && limit - used > 0 && (
          <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-400">
            <AlertCircle size={12} />
            Only {limit - used} request{limit - used === 1 ? "" : "s"} remaining today
          </div>
        )}
        {!isUnlimited && used >= limit && (
          <div className="flex items-center gap-1.5 mt-2 text-xs text-red-400">
            <AlertCircle size={12} />
            Daily limit reached — upgrade for more
          </div>
        )}
      </div>

      {/* Benefits */}
      <div className="pt-4 border-t border-white/10">
        <div className="text-xs text-slate-400 mb-2">Your benefits:</div>
        <ul className="space-y-1.5">
          {meta.features.slice(0, 3).map((f, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
              <Check size={14} style={{ color: meta.color, flexShrink: 0 }} />
              {f}
            </li>
          ))}
          {meta.features.length > 3 && (
            <li className="text-xs text-slate-500 italic ml-6">+{meta.features.length - 3} more features</li>
          )}
        </ul>
      </div>
    </div>
  );
}

/* ── Plan Card ───────────────────────────────────────────── */
function PlanCard({ plan, isCurrent, isUpgrade, isDowngrade, isLoading, anyLoading, onAction }) {
  return (
    <div
      className={[
        "relative flex flex-col rounded-2xl border p-6 transition-all duration-300",
        "bg-gray-900/80 backdrop-blur-sm",
        isCurrent ? "scale-[1.02] shadow-2xl" : "hover:-translate-y-1 hover:shadow-xl",
      ].join(" ")}
      style={{
        borderColor: isCurrent ? plan.color : "rgba(255,255,255,0.08)",
        boxShadow: isCurrent ? `0 0 32px ${plan.glow}, 0 0 0 1px ${plan.color}30` : undefined,
      }}
    >
      {/* Badge */}
      {plan.badge && !isCurrent && (
        <span
          className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
          style={{ background: `${plan.color}20`, color: plan.color, border: `1px solid ${plan.color}35` }}
        >
          {plan.badge}
        </span>
      )}
      {isCurrent && (
        <span
          className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1"
          style={{ background: `${plan.color}20`, color: plan.color, border: `1px solid ${plan.color}35` }}
        >
          <Check size={12} /> Current Plan
        </span>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${plan.color}18`, color: plan.color, border: `1px solid ${plan.color}30` }}
        >
          {plan.icon}
        </div>
        <div>
          <div className="font-bold text-white text-lg" style={{ color: plan.color }}>
            {plan.name}
          </div>
          <div className="text-xs text-slate-500">{plan.desc}</div>
        </div>
      </div>

      {/* Price */}
      <div className="mb-1 flex items-baseline gap-1">
        <span className="text-4xl font-extrabold tracking-tight" style={{ color: plan.color }}>
          {plan.price}
        </span>
        <span className="text-slate-500 text-sm">{plan.period}</span>
      </div>
      <p className="text-xs text-slate-600 mb-5">Billed monthly</p>

      {/* Divider */}
      <div className="h-px mb-5" style={{ background: `${plan.color}20` }} />

      {/* Features */}
      <ul className="flex flex-col gap-2.5 flex-1 mb-6">
        {plan.features.map((f, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-slate-300">
            <span
              className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0"
              style={{ background: `${plan.color}18`, color: plan.color }}
            >
              <Check size={10} strokeWidth={3} />
            </span>
            {f}
          </li>
        ))}
      </ul>

      {/* CTA */}
      {isCurrent ? (
        <div
          className="w-full py-2.5 rounded-xl text-sm font-semibold text-center border"
          style={{ color: plan.color, borderColor: `${plan.color}35`, background: `${plan.color}10` }}
        >
          <Check size={14} className="inline mr-1.5 -mt-0.5" />
          Current Plan
        </div>
      ) : (
        <button
          onClick={() => onAction(plan.id)}
          disabled={isLoading || anyLoading}
          className={[
            "w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
            "active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
            isDowngrade
              ? "border text-slate-400 hover:text-slate-200 hover:border-white/20 bg-transparent"
              : "text-white hover:brightness-110 shadow-lg",
          ].join(" ")}
          style={
            isDowngrade
              ? { borderColor: `${plan.color}30` }
              : {
                  background: `linear-gradient(135deg, ${plan.color}, ${plan.id === "premium" ? "#0891B2" : "#6D28D9"})`,
                  boxShadow: `0 4px 18px ${plan.glow}`,
                }
          }
        >
          {isLoading ? (
            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : isDowngrade ? (
            <>Downgrade</>
          ) : (
            <><Zap size={13} className="inline mr-1.5 -mt-0.5" />Upgrade to {plan.name}</>
          )}
        </button>
      )}
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────── */
export default function PricingFeaturePage() {
  const [current, setCurrent] = useState(getPlan());
  const [usage, setUsage] = useState(getUsage());
  const [loading, setLoading] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPlan = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const r = await getUserPlan();
      const serverPlan = r.data?.plan || "free";
      setCurrent(serverPlan);
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

  const loadRazorpayScript = () =>
    new Promise(resolve => {
      if (window.Razorpay) return resolve(true);
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    });

  const handleAction = async (planId) => {
    if (planId === current) return;

    if (PLAN_ORDER[planId] < PLAN_ORDER[current]) {
      toast("Downgrades aren't available here. Contact support.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please log in to upgrade your plan.");
      return;
    }

    setLoading(planId);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error("Failed to load payment gateway. Check your connection.");
        setLoading(null);
        return;
      }

      const { data } = await createOrder(planId);
      const plan = PLANS.find(p => p.id === planId);

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: data.amount,
        currency: data.currency,
        name: "MentorAI",
        description: `${plan.name} Plan — 1 Month`,
        order_id: data.order_id,
        handler: async (response) => {
          try {
            await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan: planId,
            });
            setCurrent(planId);
            setPlan(planId);
            localStorage.setItem("mentorai_subscription", planId);
            window.dispatchEvent(new Event("storage"));
            await fetchPlan();
            toast.success(`🎉 Upgraded to ${plan.name}!`);
          } catch (err) {
            toast.error(`❌ ${err.response?.data?.error || "Payment verification failed"}`);
          }
        },
        prefill: { name: "", email: "" },
        theme: { color: plan.color },
        modal: { ondismiss: () => setLoading(null) },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", resp => {
        toast.error(`Payment failed: ${resp.error.description}`);
        setLoading(null);
      });
      rzp.open();
    } catch (err) {
      toast.error(`❌ ${err.response?.data?.error || err.message || "Something went wrong"}`);
      setLoading(null);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-extrabold text-white mb-2">Pricing Plans</h2>
          <p className="text-slate-400">Choose the perfect plan for your learning journey</p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-slate-300 hover:text-white hover:border-white/20 transition-all"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Current tier info */}
      <div className="mb-8">
        <CurrentTierCard plan={current} usage={usage} />
      </div>

      {/* Plans grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {PLANS.map(plan => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isCurrent={current === plan.id}
            isUpgrade={PLAN_ORDER[plan.id] > PLAN_ORDER[current]}
            isDowngrade={PLAN_ORDER[plan.id] < PLAN_ORDER[current]}
            isLoading={loading === plan.id}
            anyLoading={!!loading}
            onAction={handleAction}
          />
        ))}
      </div>

      {/* Footer info */}
      <div className="text-center pt-8 border-t border-white/10">
        <p className="text-sm text-slate-500">
          🔒 Payments secured by Razorpay · UPI, Cards, Net Banking supported · Cancel anytime · No hidden fees
        </p>
      </div>
    </div>
  );
}
