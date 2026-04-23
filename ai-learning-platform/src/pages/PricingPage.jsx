import { Check, Zap, Crown, Sparkles, Star, X, TrendingDown } from "lucide-react";
import { getPlan, setPlan } from "../lib/subscription";
import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { createOrder, verifyPayment, getUserPlan } from "../api";

/* ── Plan definitions ────────────────────────────────────── */
const PLANS = [
  {
    id:       "free",
    name:     "Free",
    price:    "₹0",
    period:   "/month",
    desc:     "Perfect for getting started",
    icon:     <Star size={18} />,
    badge:    null,
    accent:   "#94A3B8",
    ring:     "rgba(148,163,184,0.35)",
    glow:     "rgba(148,163,184,0.12)",
    features: [
      "20 requests / day",
      "Basic AI learning",
      "Limited quizzes",
      "History (last 10 sessions)",
    ],
    ctaLabel: "Start Free",
  },
  {
    id:       "pro",
    name:     "Pro",
    price:    "₹199",
    period:   "/month",
    desc:     "For serious learners",
    icon:     <Crown size={18} />,
    badge:    { label: "Recommended", style: "bg-violet-500/20 text-violet-300 border border-violet-500/40" },
    accent:   "#A78BFA",
    ring:     "rgba(139,92,246,0.55)",
    glow:     "rgba(139,92,246,0.22)",
    features: [
      "200 requests / day",
      "Full learning modules",
      "Quiz + Interview prep",
      "Priority AI response",
      "Full learning history",
      "Priority support",
    ],
    ctaLabel: "Upgrade to Pro",
  },
  {
    id:       "premium",
    name:     "Premium",
    price:    "₹499",
    period:   "/month",
    desc:     "Maximum learning power",
    icon:     <Sparkles size={18} />,
    badge:    { label: "Most Popular", style: "bg-gradient-to-r from-pink-500/20 to-cyan-500/20 text-cyan-300 border border-cyan-500/40" },
    accent:   "#22D3EE",
    ring:     "rgba(34,211,238,0.45)",
    glow:     "rgba(34,211,238,0.18)",
    features: [
      "Unlimited requests",
      "All features unlocked",
      "Faster AI responses",
      "Advanced analytics",
      "Weak area insights",
      "Dedicated support",
    ],
    ctaLabel: "Go Premium",
  },
];

const PLAN_ORDER = { free: 0, pro: 1, premium: 2 };

/* ── Success Modal ───────────────────────────────────────── */
function SuccessModal({ plan, onClose }) {
  const p = PLANS.find(x => x.id === plan);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm mx-4 rounded-2xl border border-white/10 bg-gray-900 p-8 text-center shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <X size={18} />
        </button>
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-xl font-bold text-white mb-2">Upgrade Successful!</h2>
        <p className="text-slate-400 text-sm mb-6">
          You are now a{" "}
          <strong style={{ color: p?.accent }}>{p?.name}</strong> user.
          Enjoy your new limits!
        </p>
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl font-semibold text-white text-sm transition-all hover:brightness-110 active:scale-95"
          style={{ background: `linear-gradient(135deg, ${p?.accent}, #6D28D9)` }}
        >
          Start Learning
        </button>
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
        isCurrent
          ? "scale-[1.03] shadow-2xl"
          : "hover:-translate-y-1.5 hover:shadow-xl cursor-pointer",
      ].join(" ")}
      style={{
        borderColor: isCurrent ? plan.ring : "rgba(255,255,255,0.08)",
        boxShadow:   isCurrent ? `0 0 32px ${plan.glow}, 0 0 0 1px ${plan.ring}` : undefined,
      }}
    >
      {/* Badge */}
      {plan.badge && (
        <span className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${plan.badge.style}`}>
          {plan.badge.label}
        </span>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${plan.accent}18`, color: plan.accent, border: `1px solid ${plan.accent}30` }}
        >
          {plan.icon}
        </div>
        <div>
          <div className="font-bold text-white text-base leading-tight" style={{ color: plan.accent }}>
            {plan.name}
          </div>
          <div className="text-xs text-slate-500">{plan.desc}</div>
        </div>
        {isCurrent && (
          <span
            className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full border"
            style={{ color: plan.accent, borderColor: `${plan.accent}40`, background: `${plan.accent}12` }}
          >
            Active
          </span>
        )}
      </div>

      {/* Price */}
      <div className="mb-1 flex items-baseline gap-1">
        <span className="text-4xl font-extrabold tracking-tight" style={{ color: plan.accent }}>
          {plan.price}
        </span>
        <span className="text-slate-500 text-sm">{plan.period}</span>
      </div>
      <p className="text-xs text-slate-600 mb-5">Billed monthly</p>

      {/* Divider */}
      <div className="h-px mb-5" style={{ background: `${plan.accent}20` }} />

      {/* Features */}
      <ul className="flex flex-col gap-2.5 flex-1 mb-6">
        {plan.features.map((f, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-slate-300">
            <span
              className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0"
              style={{ background: `${plan.accent}18`, color: plan.accent }}
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
          style={{ color: plan.accent, borderColor: `${plan.accent}35`, background: `${plan.accent}10` }}
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
              ? { borderColor: `${plan.accent}30` }
              : {
                  background: `linear-gradient(135deg, ${plan.accent}, ${plan.id === "premium" ? "#0891B2" : "#6D28D9"})`,
                  boxShadow:  `0 4px 18px ${plan.glow}`,
                }
          }
        >
          {isLoading ? (
            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : isDowngrade ? (
            <><TrendingDown size={13} className="inline mr-1.5 -mt-0.5" />Downgrade</>
          ) : (
            <><Zap size={13} className="inline mr-1.5 -mt-0.5" />{plan.ctaLabel}</>
          )}
        </button>
      )}
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────── */
export default function PricingPage({ onUpgrade }) {
  const [current, setCurrent] = useState(getPlan());
  const [loading, setLoading] = useState(null);
  const [successPlan, setSuccessPlan] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    getUserPlan()
      .then(r => {
        const serverPlan = r.data?.plan || "free";
        setPlan(serverPlan);
        setCurrent(serverPlan);
      })
      .catch(() => {});
  }, []);

  const loadRazorpayScript = () =>
    new Promise(resolve => {
      if (window.Razorpay) return resolve(true);
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload  = () => resolve(true);
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
        key:         import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount:      data.amount,
        currency:    data.currency,
        name:        "MentorAI",
        description: `${plan.name} Plan — 1 Month`,
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
            setCurrent(planId);
            setSuccessPlan(planId);
            onUpgrade?.();
          } catch (err) {
            toast.error(`❌ ${err.response?.data?.error || "Payment verification failed"}`);
          }
        },
        prefill: { name: "", email: "" },
        theme:   { color: plan.accent },
        modal:   { ondismiss: () => setLoading(null) },
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
    <div className="w-full max-w-5xl mx-auto px-4 py-8">

      {/* Section header */}
      <div className="text-center mb-10">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-xs font-medium mb-4">
          <Sparkles size={11} /> Pricing
        </span>
        <h2 className="text-3xl font-extrabold text-white tracking-tight mb-2">
          Choose Your Plan
        </h2>
        <p className="text-slate-400 text-sm max-w-md mx-auto">
          Start free, upgrade when you're ready. Secure payments via Razorpay.
          No hidden fees.
        </p>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
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

      {/* Trust line */}
      <p className="text-center text-xs text-slate-600 mt-8">
        🔒 Payments secured by Razorpay · UPI, Cards, Net Banking supported · Cancel anytime
      </p>

      {successPlan && (
        <SuccessModal
          plan={successPlan}
          onClose={() => { setSuccessPlan(null); onUpgrade?.(); }}
        />
      )}
    </div>
  );
}
