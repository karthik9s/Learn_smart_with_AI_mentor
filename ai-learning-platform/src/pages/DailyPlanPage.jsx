import { useState, useRef } from "react";
import { CalendarDays, CheckCircle, Circle, Clock, Download,
  ChevronLeft, ChevronRight, Trophy, Zap, Target, Map } from "lucide-react";
import { fetchDailyPlan, fetchRoadmapOverview } from "../api";
import CompletionScreen from "../components/CompletionScreen";

const LEVELS = ["beginner", "intermediate", "advanced"];

const PHASE_CFG = {
  concept:  { color: "#A78BFA", bg: "rgba(167,139,250,0.08)",  icon: "🧠", label: "Concept"  },
  learn:    { color: "#22D3EE", bg: "rgba(34,211,238,0.07)",   icon: "📘", label: "Learn"    },
  practice: { color: "#10B981", bg: "rgba(16,185,129,0.07)",   icon: "💪", label: "Practice" },
  apply:    { color: "#F59E0B", bg: "rgba(245,158,11,0.07)",   icon: "🚀", label: "Apply"    },
  revise:   { color: "#8B5CF6", bg: "rgba(139,92,246,0.08)",   icon: "🔁", label: "Revise"   },
};

const PLAN_KEY = "mentorai_daily_plans";
const DONE_KEY = "mentorai_done_days";

function savePlan(data) {
  const saved = JSON.parse(localStorage.getItem(PLAN_KEY) || "[]");
  localStorage.setItem(PLAN_KEY, JSON.stringify(
    [{ ...data, savedAt: Date.now() }, ...saved.filter(p => p.goal !== data.goal)].slice(0, 5)
  ));
}
function getSavedPlans() { return JSON.parse(localStorage.getItem(PLAN_KEY) || "[]"); }
function loadDoneDays(goal) {
  try { return JSON.parse(localStorage.getItem(`${DONE_KEY}_${goal}`) || "{}"); } catch { return {}; }
}
function saveDoneDays(goal, done) {
  localStorage.setItem(`${DONE_KEY}_${goal}`, JSON.stringify(done));
}
function exportPlan(data) {
  const lines = [`# ${data.title}`, `Goal: ${data.goal} | Level: ${data.level}`, ""];
  data.days?.forEach(d => {
    lines.push(`## Day ${d.day}: ${d.title} (${d.time})`);
    Object.entries(PHASE_CFG).forEach(([k, v]) => lines.push(`${v.icon} ${v.label}: ${d[k]}`));
    lines.push("");
  });
  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${data.goal.replace(/\s+/g, "_")}_30day.txt`; a.click();
  URL.revokeObjectURL(url);
}

/* ── Roadmap Overview ─────────────────────────────────── */
function RoadmapOverview({ phases }) {
  if (!phases?.length) return null;
  const colors = ["#A78BFA", "#22D3EE", "#10B981", "#F59E0B"];
  return (
    <div className="dp-overview">
      <div className="dp-overview-header">
        <Map size={16} style={{ color: "#A78BFA" }} />
        <span>Your Learning Path</span>
      </div>
      <div className="dp-phases-row">
        {phases.map((p, i) => (
          <div key={i} className="dp-phase-chip" style={{ borderColor: `${colors[i % 4]}30` }}>
            <div className="dp-phase-num" style={{ background: colors[i % 4] }}>{p.phase}</div>
            <div className="dp-phase-info">
              <div className="dp-phase-title" style={{ color: colors[i % 4] }}>{p.title}</div>
              <div className="dp-phase-duration">{p.duration}</div>
              <div className="dp-phase-topics">{p.topics?.slice(0, 3).join(" · ")}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Today Focus Card ─────────────────────────────────── */
function TodayFocusCard({ day, totalDays, completedCount, onComplete, onPrev, onNext, hasPrev, hasNext }) {
  const [celebrating, setCelebrating] = useState(false);
  const pct = Math.round((completedCount / totalDays) * 100);

  const handleComplete = () => {
    setCelebrating(true);
    setTimeout(() => { setCelebrating(false); onComplete(); }, 900);
  };

  return (
    <div className={`dp-today-card ${celebrating ? "dp-celebrating" : ""}`}>
      {/* Card header */}
      <div className="dp-today-header">
        <div className="dp-today-meta">
          <span className="dp-today-badge">⭐ Today</span>
          <span className="dp-today-daynum">Day {day.day} of {totalDays}</span>
          <span className="dp-today-time"><Clock size={12} /> {day.time}</span>
        </div>
        <div className="dp-today-nav">
          <button className="dp-nav-btn" onClick={onPrev} disabled={!hasPrev}><ChevronLeft size={15} /></button>
          <button className="dp-nav-btn" onClick={onNext} disabled={!hasNext}><ChevronRight size={15} /></button>
        </div>
      </div>

      <h3 className="dp-today-title">{day.title}</h3>

      {/* Overall progress */}
      <div className="dp-today-progress">
        <div className="dp-today-progress-bar">
          <div className="dp-today-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="dp-today-pct">{pct}% of plan complete</span>
      </div>

      {/* 5 phase cards */}
      <div className="dp-phases-grid">
        {Object.entries(PHASE_CFG).map(([key, cfg]) => (
          <div key={key} className="dp-phase-block" style={{ borderColor: `${cfg.color}25`, background: cfg.bg }}>
            <div className="dp-phase-block-header" style={{ color: cfg.color }}>
              <span className="dp-phase-block-icon">{cfg.icon}</span>
              <span className="dp-phase-block-label">{cfg.label}</span>
            </div>
            <p className="dp-phase-block-text">{day[key]}</p>
          </div>
        ))}
      </div>

      {/* Complete button */}
      <button className={`dp-complete-btn ${celebrating ? "dp-complete-done" : ""}`} onClick={handleComplete}>
        {celebrating
          ? <><Trophy size={17} /> Completed! Moving to next day...</>
          : <><CheckCircle size={17} /> Mark Day as Complete</>}
      </button>
    </div>
  );
}

/* ── Day Row (All Days view) ──────────────────────────── */
function DayRow({ day, done, isToday, onSelect }) {
  return (
    <button className={`dp-day-row ${done ? "dp-day-done" : ""} ${isToday ? "dp-day-today" : ""}`}
      onClick={() => onSelect(day.day)}>
      <div className="dp-day-check">
        {done
          ? <CheckCircle size={15} style={{ color: "#10B981" }} />
          : <Circle size={15} style={{ color: isToday ? "#F59E0B" : "#252d45" }} />}
      </div>
      <div className="dp-day-num" style={{ color: isToday ? "#F59E0B" : done ? "#10B981" : "#4B5563" }}>
        {isToday ? "⭐" : `D${day.day}`}
      </div>
      <div className="dp-day-title">{day.title}</div>
      <div className="dp-day-time"><Clock size={11} /> {day.time}</div>
      {isToday && <span className="dp-day-today-pill">Today</span>}
    </button>
  );
}

/* ══════════════════════════════════════════════════════
   Main Page
   ══════════════════════════════════════════════════════ */
export default function DailyPlanPage() {
  const [goal, setGoal] = useState(() => {
    try { const s = JSON.parse(localStorage.getItem(PLAN_KEY) || "[]"); return s[0]?.goal || ""; } catch { return ""; }
  });
  const [level, setLevel] = useState(() => {
    try { const s = JSON.parse(localStorage.getItem(PLAN_KEY) || "[]"); return s[0]?.level || "beginner"; } catch { return "beginner"; }
  });
  const [doneDays, setDoneDays] = useState(() => {
    try { const s = JSON.parse(localStorage.getItem(PLAN_KEY) || "[]"); return s[0] ? loadDoneDays(s[0].goal) : {}; } catch { return {}; }
  });
  const [data, setData] = useState(() => {
    try { const s = JSON.parse(localStorage.getItem(PLAN_KEY) || "[]"); return s[0] || null; } catch { return null; }
  });
  const [overview, setOverview]   = useState(null);
  const [currentDay, setCurrentDay] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem(PLAN_KEY) || "[]");
      if (s[0]) { const done = loadDoneDays(s[0].goal); const next = s[0].days?.find(d => !done[d.day]); return next?.day || 1; }
    } catch {} return 1;
  });
  const [saved, setSaved]       = useState(getSavedPlans());
  const [loading, setLoading]   = useState(false);
  const [progress, setProgress] = useState("");
  const [view, setView]         = useState("today");
  const [showCompletion, setShowCompletion] = useState(false);
  const debounceRef = useRef(null);

  const totalDays      = data?.days?.length || 0;
  const completedCount = totalDays > 0 ? Object.values(doneDays).filter(Boolean).length : 0;
  const pct            = totalDays > 0 ? Math.round((completedCount / totalDays) * 100) : 0;
  const currentDayData = data?.days?.find(d => d.day === currentDay);

  const markComplete = () => {
    const updated = { ...doneDays, [currentDay]: true };
    setDoneDays(updated);
    if (data?.goal) saveDoneDays(data.goal, updated);
    if (data?.days?.every(d => updated[d.day])) { setTimeout(() => setShowCompletion(true), 600); return; }
    const next = data?.days?.find(d => d.day > currentDay && !updated[d.day]);
    if (next) setCurrentDay(next.day);
  };

  const generate = async (e) => {
    e?.preventDefault();
    if (!goal.trim() || loading) return;

    // 300ms debounce
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true); setData(null); setOverview(null); setDoneDays({}); setCurrentDay(1);
      setProgress("Building roadmap overview...");
      try {
        const ovRes = await fetchRoadmapOverview(goal.trim(), level);
        setOverview(ovRes.data);
        setProgress("Generating days 1–10...");
        setTimeout(() => setProgress("Generating days 11–20..."), 3000);
        setTimeout(() => setProgress("Generating days 21–30..."), 6000);
        const planRes = await fetchDailyPlan(goal.trim(), level);
        setData(planRes.data);
        savePlan(planRes.data);
        setSaved(getSavedPlans());
        setCurrentDay(1);
      } catch { alert("Failed to generate. Please try again."); }
      finally { setLoading(false); setProgress(""); }
    }, 300);
  };

  const loadSaved = (p) => {
    setData(p); setGoal(p.goal); setLevel(p.level || "beginner");
    const done = loadDoneDays(p.goal);
    setDoneDays(done);
    const next = p.days?.find(d => !done[d.day]);
    setCurrentDay(next?.day || 1);
  };

  return (
    <div className="dp-page">
      {showCompletion && data && (
        <CompletionScreen goal={data.goal} level={data.level}
          onStartNext={() => { setShowCompletion(false); setData(null); setOverview(null); setDoneDays({}); setGoal(""); }}
          onDismiss={() => setShowCompletion(false)} />
      )}

      {/* ── Input Card ─────────────────────────────────── */}
      <div className="dp-input-card">
        <div className="dp-input-header">
          <div className="dp-input-icon"><CalendarDays size={20} /></div>
          <div>
            <h2 className="dp-input-title">Learning Plan</h2>
            <p className="dp-input-sub">Get a 30-day roadmap with daily tasks tailored to your goal</p>
          </div>
        </div>

        <form className="dp-form" onSubmit={generate}>
          <input className="dp-goal-input"
            placeholder='e.g. "Learn Python", "Master React", "Understand Machine Learning"'
            value={goal} onChange={e => setGoal(e.target.value)} />

          <div className="dp-form-row">
            <div className="dp-level-group">
              <span className="dp-level-label">Level</span>
              <div className="dp-level-btns">
                {LEVELS.map(l => (
                  <button key={l} type="button"
                    className={`dp-level-btn ${level === l ? "active" : ""}`}
                    onClick={() => setLevel(l)}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" className="dp-generate-btn" disabled={loading || !goal.trim()}>
              <Zap size={15} />
              {loading ? (progress || "Generating...") : "Generate My Plan"}
            </button>
          </div>
        </form>

        {/* Saved plans */}
        {!data && saved.length > 0 && (
          <div className="dp-saved">
            <span className="dp-saved-label">Recent plans</span>
            <div className="dp-saved-chips">
              {saved.map((p, i) => (
                <button key={i} className="dp-saved-chip" onClick={() => loadSaved(p)}>
                  {p.goal}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Loading ─────────────────────────────────────── */}
      {loading && (
        <div className="dp-loading">
          <div className="dp-loading-spinner" />
          <div className="dp-loading-text">
            <p className="dp-loading-main">{progress || "Building your plan..."}</p>
            <p className="dp-loading-sub">This takes about 10–15 seconds</p>
          </div>
        </div>
      )}

      {/* ── Roadmap Overview ────────────────────────────── */}
      {overview && !loading && <RoadmapOverview phases={overview.phases} />}

      {/* ── Plan Result ─────────────────────────────────── */}
      {data && !loading && (
        <div className="dp-result">

          {/* Plan header */}
          <div className="dp-result-header">
            <div className="dp-result-info">
              <h3 className="dp-result-title">{data.title}</h3>
              <div className="dp-result-meta">
                <span><Target size={12} /> {data.goal}</span>
                <span className="dp-meta-dot">·</span>
                <span style={{ color: "#A78BFA" }}>{data.level}</span>
                <span className="dp-meta-dot">·</span>
                <span style={{ color: "#10B981", fontWeight: 700 }}>{completedCount}/{totalDays} days ({pct}%)</span>
              </div>
            </div>
            <div className="dp-result-actions">
              <button className={`dp-view-btn ${view === "today" ? "active" : ""}`} onClick={() => setView("today")}>
                ⭐ Today
              </button>
              <button className={`dp-view-btn ${view === "all" ? "active" : ""}`} onClick={() => setView("all")}>
                📋 All Days
              </button>
              <button className="dp-export-btn" onClick={() => exportPlan(data)} title="Export">
                <Download size={14} />
              </button>
            </div>
          </div>

          {/* Overall progress bar */}
          <div className="dp-overall-progress">
            <div className="dp-overall-bar">
              <div className="dp-overall-fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="dp-overall-label">{completedCount} of {totalDays} days completed</span>
          </div>

          {/* Today view */}
          {view === "today" && currentDayData && (
            <TodayFocusCard
              day={currentDayData}
              totalDays={totalDays}
              completedCount={completedCount}
              onComplete={markComplete}
              onPrev={() => setCurrentDay(d => Math.max(1, d - 1))}
              onNext={() => setCurrentDay(d => Math.min(totalDays, d + 1))}
              hasPrev={currentDay > 1}
              hasNext={currentDay < totalDays}
            />
          )}

          {/* All days view */}
          {view === "all" && (
            <div className="dp-all-days">
              {data.days?.map(day => (
                <DayRow key={day.day} day={day}
                  done={!!doneDays[day.day]}
                  isToday={day.day === currentDay}
                  onSelect={n => { setCurrentDay(n); setView("today"); }} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
