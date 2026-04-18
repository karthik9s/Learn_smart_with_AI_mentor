import { useState } from "react";
import { Home, BookOpen, Dumbbell, Briefcase, MessageCircle, BarChart2, Clock, GraduationCap, CalendarDays, ChevronLeft, ChevronRight, LogOut, Zap, CheckCircle, X } from "lucide-react";
import { getPlan } from "../lib/subscription";
import PricingPage from "../pages/PricingPage";

const NAV = [
  { id: "home",         label: "Home",           icon: Home },
  { id: "learn",        label: "Learn",          icon: BookOpen,      color: "#a78bfa" },
  { id: "learningplan", label: "Learning Plan",  icon: CalendarDays,  color: "#a78bfa" },
  { id: "practice",     label: "Practice",       icon: Dumbbell,      color: "#f59e0b" },
  { id: "interviewprep",label: "Interview Prep", icon: Briefcase,     color: "#f59e0b" },
  { id: "study",        label: "Smart Study",    icon: GraduationCap, color: "#a78bfa" },
  { id: "ask",          label: "Ask AI",         icon: MessageCircle, color: "#64748b" },
  { id: "history",      label: "History",        icon: Clock },
  { id: "progress",     label: "Progress",       icon: BarChart2 },
];

export default function Sidebar({ page, mode, setPage, setMode, collapsed, setCollapsed, xp, userLevel, levelName, xpProgress, user, onLogout }) {
  const [plan, setPlanState] = useState(getPlan());
  const [showPricing, setShowPricing] = useState(false);

  const handleNav = (item) => {
    if (["home", "progress", "ask", "history", "study", "learningplan", "interviewprep", "mockinterview", "pricing"].includes(item.id)) {
      setPage(item.id);
    } else {
      setMode(item.id);
      setPage("learn");
    }
  };

  const isActive = (item) => {
    if (["home", "progress", "ask", "history", "study", "learningplan", "interviewprep", "mockinterview", "pricing"].includes(item.id)) return page === item.id;
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

      {/* Upgrade button */}
      {!collapsed && plan === "free" && (
        <button className="sb-upgrade-btn" onClick={() => setShowPricing(true)}>
          <Zap size={14} /> Upgrade to Pro
        </button>
      )}
      {!collapsed && (plan === "pro" || plan === "premium") && (
        <div className="sb-pro-active">
          <CheckCircle size={13} /> {plan === "premium" ? "Premium" : "Pro"} Activated
        </div>
      )}

      <button className="sidebar-collapse-btn" onClick={() => setCollapsed(c => !c)}>
        {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /><span>Collapse</span></>}
      </button>

      {/* Pricing Modal */}
      {showPricing && (
        <div className="sb-modal-overlay" onClick={() => setShowPricing(false)}>
          <div className="sb-modal-content" onClick={e => e.stopPropagation()}>
            <button className="sb-modal-close" onClick={() => setShowPricing(false)}>
              <X size={18} />
            </button>
            <PricingPage onUpgrade={() => {
              setPlanState(getPlan());
              setShowPricing(false);
            }} />
          </div>
        </div>
      )}
    </aside>
  );
}
