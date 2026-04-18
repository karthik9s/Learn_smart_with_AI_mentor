import { Check, Zap, Crown, Sparkles, Star } from "lucide-react";
import { getPlan, setPlan } from "../lib/subscription";
import { useState } from "react";
import { toast } from "react-hot-toast";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "/month",
    desc: "Perfect for getting started",
    icon: <Star size={20} />,
    color: "#94A3B8",
    gradient: "linear-gradient(135deg, rgba(148,163,184,0.08), rgba(30,38,64,0.6))",
    border: "rgba(148,163,184,0.2)",
    glow: "rgba(148,163,184,0.1)",
    features: [
      "5 topic generations / day",
      "3 Smart Study sessions / day",
      "2 Mock Interviews / day",
      "1 Goal Roadmap / day",
      "Basic AI tutor",
      "History (last 10 sessions)",
    ],
    cta: "Current Plan",
    ctaUpgrade: "Start Free",
  },
  {
    id: "pro",
    name: "Pro",
    price: "$9",
    period: "/month",
    desc: "For serious learners",
    icon: <Crown size={20} />,
    color: "#A78BFA",
    gradient: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(109,40,217,0.08))",
    border: "rgba(139,92,246,0.5)",
    glow: "rgba(139,92,246,0.25)",
    popular: true,
    features: [
      "Unlimited topic generations",
      "Unlimited Smart Study sessions",
      "Unlimited Mock Interviews",
      "Unlimited Goal Roadmaps",
      "Advanced AI tutor",
      "Full learning history",
      "Priority support",
    ],
    cta: "Current Plan",
    ctaUpgrade: "Upgrade to Pro",
  },
  {
    id: "premium",
    name: "Premium",
    price: "$19",
    period: "/month",
    desc: "Maximum learning power",
    icon: <Sparkles size={20} />,
    color: "#22D3EE",
    gradient: "linear-gradient(135deg, rgba(34,211,238,0.1), rgba(6,182,212,0.05))",
    border: "rgba(34,211,238,0.35)",
    glow: "rgba(34,211,238,0.18)",
    features: [
      "Everything in Pro",
      "Personalized learning path",
      "Weak area analysis & insights",
      "Faster AI responses",
      "Early access to new features",
      "Use your own API key",
      "Dedicated support",
    ],
    cta: "Current Plan",
    ctaUpgrade: "Go Premium",
  },
];

const PLAN_ORDER = { free: 0, pro: 1, premium: 2 };

export default function PricingPage({ onUpgrade }) {
  const [current, setCurrent] = useState(getPlan());
  const [loading, setLoading] = useState(null);

  const handleSelect = async (planId) => {
    if (planId === current) return;
    setLoading(planId);
    await new Promise(r => setTimeout(r, 800)); // simulate async
    setPlan(planId);
    setCurrent(planId);
    setLoading(null);
    if (PLAN_ORDER[planId] > PLAN_ORDER[current]) {
      toast.success(`🎉 Upgraded to ${planId.charAt(0).toUpperCase() + planId.slice(1)}! Enjoy unlimited access.`);
      onUpgrade?.();
    } else {
      toast(`Switched to ${planId} plan.`);
    }
  };

  return (
    <div className="pp-page">
      {/* Header */}
      <div className="pp-header">
        <div className="pp-header-badge"><Sparkles size={13} /> Pricing</div>
        <h2 className="pp-title">Choose Your Plan</h2>
        <p className="pp-sub">Start free, upgrade when you're ready. No hidden fees.</p>
      </div>

      {/* Cards */}
      <div className="pp-grid">
        {PLANS.map(plan => {
          const isCurrent  = current === plan.id;
          const isUpgrade  = PLAN_ORDER[plan.id] > PLAN_ORDER[current];
          const isDowngrade = PLAN_ORDER[plan.id] < PLAN_ORDER[current];
          const isLoading  = loading === plan.id;

          return (
            <div
              key={plan.id}
              className={`pp-card ${plan.popular ? "pp-card-popular" : ""} ${isCurrent ? "pp-card-current" : ""}`}
              style={{
                background: plan.gradient,
                borderColor: isCurrent || plan.popular ? plan.border : "rgba(30,38,64,0.8)",
                "--glow": plan.glow,
                "--accent": plan.color,
              }}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div className="pp-popular-badge" style={{ background: `linear-gradient(135deg, ${plan.color}, #6D28D9)` }}>
                  Most Popular
                </div>
              )}

              {/* Plan icon + name */}
              <div className="pp-plan-top">
                <div className="pp-plan-icon" style={{ color: plan.color, background: `${plan.color}18`, border: `1px solid ${plan.color}30` }}>
                  {plan.icon}
                </div>
                <div>
                  <div className="pp-plan-name" style={{ color: plan.color }}>{plan.name}</div>
                  <div className="pp-plan-desc">{plan.desc}</div>
                </div>
              </div>

              {/* Price */}
              <div className="pp-price-row">
                <span className="pp-price" style={{ color: plan.color }}>{plan.price}</span>
                <span className="pp-period">{plan.period}</span>
              </div>

              {/* Divider */}
              <div className="pp-divider" style={{ background: `${plan.color}20` }} />

              {/* Features */}
              <ul className="pp-features">
                {plan.features.map((f, i) => (
                  <li key={i} className="pp-feature-row">
                    <span className="pp-check" style={{ color: plan.color, background: `${plan.color}15` }}>
                      <Check size={11} />
                    </span>
                    <span className="pp-feature-text">{f}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <div className="pp-cta-wrap">
                {isCurrent ? (
                  <div className="pp-current-badge" style={{ color: plan.color, borderColor: `${plan.color}35`, background: `${plan.color}10` }}>
                    <Check size={14} /> Current Plan
                  </div>
                ) : (
                  <button
                    className={`pp-cta-btn ${isDowngrade ? "pp-cta-ghost" : ""}`}
                    style={!isDowngrade ? {
                      background: `linear-gradient(135deg, ${plan.color}, ${plan.id === "premium" ? "#0891B2" : "#6D28D9"})`,
                      boxShadow: `0 4px 18px ${plan.glow}`,
                    } : {
                      borderColor: `${plan.color}30`,
                      color: plan.color,
                    }}
                    onClick={() => handleSelect(plan.id)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="pp-spinner" />
                    ) : isUpgrade ? (
                      <><Zap size={14} /> {plan.ctaUpgrade}</>
                    ) : (
                      plan.ctaUpgrade
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <p className="pp-note">
        💡 Demo mode — upgrades are simulated locally. In production this connects to Stripe.
      </p>
    </div>
  );
}
