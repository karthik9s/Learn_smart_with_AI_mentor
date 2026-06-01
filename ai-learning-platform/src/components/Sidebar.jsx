import { useState, useEffect } from "react";
import { Home, BookOpen, Dumbbell, Briefcase, MessageCircle, BarChart2, Clock, GraduationCap, CalendarDays, ChevronLeft, ChevronRight, LogOut, Activity, Navigation, Mic, Crown } from "lucide-react";
import { getPlan } from "../lib/subscription";

const NAV = [
  { id: "home",          label: "Home",           icon: Home },
  { id: "learn",         label: "Learn",          icon: BookOpen,      color: "#a78bfa" },
  { id: "learningplan",  label: "Learning Plan",  icon: CalendarDays,  color: "#a78bfa" },
  { id: "goalroadmap",   label: "Goal Roadmap",   icon: Navigation,    color: "#22d3ee" },
  { id: "practice",      label: "Practice",       icon: Dumbbell,      color: "#f59e0b" },
  { id: "interviewprep", label: "Interview Prep", icon: Briefcase,     color: "#f59e0b" },
  { id: "mockinterview", label: "Mock Interview", icon: Mic,           color: "#f97316" },
  { id: "study",         label: "Smart Study",    icon: GraduationCap, color: "#a78bfa" },
  { id: "ask",           label: "Ask AI",         icon: MessageCircle, color: "#64748b" },
  { id: "history",       label: "History",        icon: Clock },
  { id: "progress",      label: "Progress",       icon: BarChart2 },
  { id: "stats",         label: "System Stats",   icon: Activity,      color: "#22d3ee" },
];

export default function Sidebar({ page, mode, setPage, setMode, collapsed, setCollapsed, xp, userLevel, levelName, xpProgress, user, onLogout }) {
  const [plan, setPlanState] = useState(getPlan());

  // Re-sync plan from localStorage whenever the sidebar renders
  // (catches upgrades that happen in the pricing modal or elsewhere)
  useEffect(() => {
    const sync = () => setPlanState(getPlan());
    sync();
    window.addEventListener("storage", sync);
    // Also poll every 2s to catch same-tab updates
    const t = setInterval(sync, 2000);
    return () => { window.removeEventListener("storage", sync); clearInterval(t); };
  }, []);

  const handleNav = (item) => {
    if (["home", "progress", "ask", "history", "study", "learningplan", "interviewprep", "mockinterview", "subscription", "stats", "goalroadmap"].includes(item.id)) {
      setPage(item.id);
    } else {
      setMode(item.id);
      setPage("learn");
    }
  };

  const isActive = (item) => {
    if (["home", "progress", "ask", "history", "study", "learningplan", "interviewprep", "mockinterview", "subscription", "stats", "goalroadmap"].includes(item.id)) return page === item.id;
    return page === "learn" && mode === item.id;
  };

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="sidebar-logo">
        <span className="sidebar-logo-icon">🎓</span>
        {!collapsed && <span className="sidebar-logo-text">Mentor<span className="logo-ai">AI</span></span>}
      </div>

      <nav className="sidebar-nav">
        {NAV.map(({ id, label, icon: Icon, color }) => {
          const active = isActive({ id });
          return (
            <button
              key={id}
              className={`sidebar-item ${active ? "active" : ""}`}
              onClick={() => handleNav({ id, color })}
              title={collapsed ? label : ""}
              style={active && color ? { color, background: `${color}12`, borderColor: `${color}30` } : {}}
            >
              <Icon size={18} style={active && color ? { color } : {}} />
              {!collapsed && <span>{label}</span>}
              {active && <span className="sidebar-active-bar" style={color ? { background: color } : {}} />}
            </button>
          );
        })}
      </nav>

      {/* XP bar */}
      {!collapsed && (
        <div className="sidebar-xp">
          <div className="sidebar-xp-top">
            <span className="sidebar-xp-level">Lv.{userLevel} {levelName}</span>
            <span className="sidebar-xp-num">{xp} XP</span>
          </div>
          <div className="sidebar-xp-track">
            <div className="sidebar-xp-fill" style={{ width: `${xpProgress}%` }} />
          </div>
        </div>
      )}

      {/* User info */}
      {!collapsed && user && (
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">{user.user_metadata?.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user.user_metadata?.name || "User"}</div>
            <div className="sidebar-user-email">{user.email}</div>
          </div>
          <button className="sidebar-logout" onClick={onLogout} title="Logout"><LogOut size={14} /></button>
        </div>
      )}

      {/* Pricing cards section */}
      {!collapsed && (
        <div className="sb-pricing-section">
          <div className="sb-pricing-label">Plans</div>
          <div className="sb-pricing-cards">
            <button 
              className={`sb-plan-card ${plan === "free" ? "active" : ""}`}
              onClick={() => setPage("pricing")}
              title="Free Plan"
            >
              <div className="sb-plan-name">Free</div>
              <div className="sb-plan-price">₹0</div>
            </button>
            <button 
              className={`sb-plan-card ${plan === "pro" ? "active" : ""}`}
              onClick={() => setPage("pricing")}
              title="Pro Plan"
            >
              <div className="sb-plan-name">Pro</div>
              <div className="sb-plan-price">₹199</div>
            </button>
            <button 
              className={`sb-plan-card ${plan === "premium" ? "active" : ""}`}
              onClick={() => setPage("pricing")}
              title="Premium Plan"
            >
              <div className="sb-plan-name">Premium</div>
              <div className="sb-plan-price">₹499</div>
            </button>
          </div>
        </div>
      )}

      {/* Pricing button — always visible */}
      {!collapsed && (
        <button className="sb-pricing-btn" onClick={() => setPage("pricing")} title="View pricing">
          <Crown size={14} /> View All Plans
        </button>
      )}

      {/* Upgrade button — navigates directly to subscription page */}
      {!collapsed && plan === "free" && (
        <button className="sb-upgrade-btn" onClick={() => setPage("subscription")}>
          <Zap size={14} /> Upgrade to Pro
        </button>
      )}
      {/* Plan badge — always clickable, navigates to subscription */}
      {!collapsed && (plan === "pro" || plan === "premium") && (
        <button
          className="sb-pro-active"
          onClick={() => setPage("subscription")}
          title="View subscription"
        >
          <CheckCircle size={13} />
          <span>{plan === "premium" ? "Premium" : "Pro"} Plan · Active</span>
          <ArrowRight size={11} style={{ marginLeft: "auto", opacity: 0.6 }} />
        </button>
      )}

      <button className="sidebar-collapse-btn" onClick={() => setCollapsed(c => !c)}>
        {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /><span>Collapse</span></>}
      </button>
    </aside>
  );
}
