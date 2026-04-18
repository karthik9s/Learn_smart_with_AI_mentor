const KEY = "mentorai_subscription";
const USAGE_KEY = "mentorai_usage";

export const PLANS = {
  free: {
    name: "Free",
    price: "$0",
    limits: { generates: 5, smartStudy: 3, mockInterview: 2, goalRoadmap: 1 },
    features: ["5 topic generations/day", "3 Smart Study sessions/day", "2 Mock Interviews/day", "1 Goal Roadmap/day", "Basic AI tutor", "History (last 10)"],
  },
  pro: {
    name: "Pro",
    price: "$9/mo",
    limits: { generates: Infinity, smartStudy: Infinity, mockInterview: Infinity, goalRoadmap: Infinity },
    features: ["Unlimited generations", "Unlimited Smart Study", "Unlimited Mock Interviews", "Unlimited Goal Roadmaps", "Advanced AI tutor", "Full history", "Priority support", "Export & share"],
  },
};

export function getPlan() {
  return localStorage.getItem(KEY) || "free";
}

export function setPlan(plan) {
  localStorage.setItem(KEY, plan);
}

function getTodayKey() {
  return new Date().toDateString();
}

export function getUsage() {
  try {
    const raw = JSON.parse(localStorage.getItem(USAGE_KEY) || "{}");
    if (raw.date !== getTodayKey()) {
      // Reset daily usage
      const fresh = { date: getTodayKey(), generates: 0, smartStudy: 0, mockInterview: 0, goalRoadmap: 0 };
      localStorage.setItem(USAGE_KEY, JSON.stringify(fresh));
      return fresh;
    }
    return raw;
  } catch { return { date: getTodayKey(), generates: 0, smartStudy: 0, mockInterview: 0, goalRoadmap: 0 }; }
}

export function incrementUsage(type) {
  const usage = getUsage();
  usage[type] = (usage[type] || 0) + 1;
  localStorage.setItem(USAGE_KEY, JSON.stringify(usage));
  return usage[type];
}

export function canUse(type) {
  const plan = getPlan();
  if (plan === "pro" || plan === "premium") return true;
  const usage = getUsage();
  const limit = PLANS.free.limits[type];
  return (usage[type] || 0) < limit;
}

export function getRemainingUsage(type) {
  const plan = getPlan();
  if (plan === "pro" || plan === "premium") return Infinity;
  const usage = getUsage();
  const limit = PLANS.free.limits[type];
  return Math.max(0, limit - (usage[type] || 0));
}
