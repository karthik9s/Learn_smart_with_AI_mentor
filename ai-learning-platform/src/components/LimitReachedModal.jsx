import { useState } from "react";
import { X, Zap, Lock } from "lucide-react";
import PricingPage from "../pages/PricingPage";
import { getPlan } from "../lib/subscription";

export default function LimitReachedModal({ info, onClose, onUpgraded }) {
  const [showPricing, setShowPricing] = useState(false);

  if (!info) return null;

  const { used, limit, plan } = info;

  if (showPricing) {
    return (
      <div className="lrm-overlay" onClick={() => setShowPricing(false)}>
        <div className="lrm-pricing-wrap" onClick={e => e.stopPropagation()}>
          <button className="lrm-close" onClick={() => setShowPricing(false)}><X size={18} /></button>
          <PricingPage onUpgrade={() => {
            setShowPricing(false);
            onUpgraded?.();
            onClose?.();
          }} />
        </div>
      </div>
    );
  }

  return (
    <div className="lrm-overlay" onClick={onClose}>
      <div className="lrm-card" onClick={e => e.stopPropagation()}>
        <button className="lrm-close" onClick={onClose}><X size={16} /></button>

        <div className="lrm-icon"><Lock size={28} /></div>
        <h3 className="lrm-title">Daily Limit Reached 🚫</h3>
        <p className="lrm-desc">
          You've used <strong>{used}/{limit}</strong> requests today on the <strong>{plan}</strong> plan.
          Upgrade to continue learning without limits.
        </p>

        <div className="lrm-usage-bar">
          <div className="lrm-usage-fill" style={{ width: "100%" }} />
        </div>
        <p className="lrm-usage-label">{used}/{limit} requests used today</p>

        <div className="lrm-actions">
          <button className="lrm-upgrade-btn" onClick={() => setShowPricing(true)}>
            <Zap size={15} /> Upgrade to Pro
          </button>
          <button className="lrm-dismiss" onClick={onClose}>
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
