import { useState, useRef, useEffect } from "react";
import { Search, ArrowRight, BookOpen, Map, Dumbbell, Briefcase, Clock, Star,
  CheckCircle, Eye, Lightbulb, RefreshCw, HelpCircle, Zap, ChevronDown, ChevronUp,
  Flame, Trophy, Target, TrendingUp, CalendarDays, PlayCircle } from "lucide-react";
import { fetchSearchAnswer } from "../api";
import { useAuth } from "../context/AuthContext";
import { loadSession } from "../lib/session";
import WhatNext from "../components/WhatNext";
import AISuggestions from "../components/AISuggestions";
import PersonalizedBanner from "../components/PersonalizedBanner";
import Recommendations from "../components/Recommendations";
import SubscriptionCard from "../components/SubscriptionCard";

const PLAN_KEY = "mentorai_daily_plans";
const DONE_KEY = "mentorai_done_days";

/* ── Continue Learning Card — PROMINENT ────────────────── */
function getMotivation(pct) {
  if (pct === 0)  return { text: "Let's get started on your journey!", emoji: "🚀" };
  if (pct < 25)   return { text: "Great start! Keep the momentum going.", emoji: "⚡" };
  if (pct < 50)   return { text: "You're building a solid foundation!", emoji: "📈" };
  if (pct === 50) return { text: "Halfway there — you're crushing it!", emoji: "🔥" };
  if (pct < 75)   return { text: "More than halfway! The finish line is in sight.", emoji: "🎯" };
  if (pct < 100)  return { text: "Almost done — don't stop now!", emoji: "🏁" };
  return { text: "Course complete! Ready for the next challenge?", emoji: "🏆" };
}

function ContinueLearning({ onNavigate, onResume }) {
  const [plan, setPlan] = useState(null);
  const [doneDays, setDoneDays] = useState({});
  const [currentDay, setCurrentDay] = useState(1);
  const [session, setSession] = useState(null);

  useEffect(() => {
    // Load last session (topic/module/step)
    const s = loadSession();
    if (s) setSession(s);

    // Load daily plan progress
    try {
      const saved = JSON.parse(localStorage.getItem(PLAN_KEY) || "[]");
      if (!saved.length) return;
      const p = saved[0];
      setPlan(p);
      const done = JSON.parse(localStorage.getItem(`${DONE_KEY}_${p.goal}`) || "{}");
      setDoneDays(done);
      const next = p.days?.find(d => !done[d.day]);
      setCurrentDay(next?.day || p.days?.length || 1);
    } catch {}
  }, []);

  // Nothing to show if no session and no plan
  if (!session && !plan) return null;

  const totalDays     = plan?.days?.length || 30;
  const completedDays = plan ? Object.values(doneDays).filter(Boolean).length : 0;
  const pct           = plan ? Math.round((completedDays / totalDays) * 100) : 0;
  const todayData     = plan?.days?.find(d => d.day === currentDay);
  const motivation    = getMotivation(pct);

  const MODULE_LABELS = {
    learn: "Learn", practice: "Practice", interview: "Interview Prep",
    roadmap: "Roadmap", quiz: "Quiz",
  };
  const lastModule = session ? (MODULE_LABELS[session.mode] || "Learn") : null;
  const lastStep   = session?.step || null;
  const lastTopic  = session?.topic || null;
  const timeAgo    = session?.savedAt
    ? (() => {
        const diff = Date.now() - session.savedAt;
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins || 1}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
      })()
    : null;

  return (
    <div className="hp-cl-card">
      <div className="hp-cl-glow" />

      <div className="hp-cl-top">
        <div className="hp-cl-top-left">
          <div className="hp-cl-badge"><CalendarDays size={13} /> Continue Learning</div>
          <div className="hp-cl-motivation">{motivation.emoji} {motivation.text}</div>
        </div>
        {plan && (
          <div className="hp-cl-day-pill">
            Day {currentDay}<span className="hp-cl-day-total">/{totalDays}</span>
          </div>
        )}
      </div>

      {/* Last session info */}
      {session && lastTopic && (
        <div className="hp-cl-session-row">
          <div className="hp-cl-session-info">
            <span className="hp-cl-session-label">Last session</span>
            <span className="hp-cl-session-topic">{lastTopic}</span>
            <div className="hp-cl-session-meta">
              {lastModule && <span className="hp-cl-session-module">{lastModule}</span>}
              {lastStep   && <><span className="hp-cl-dot">·</span><span className="hp-cl-session-step">{lastStep}</span></>}
              {timeAgo    && <><span className="hp-cl-dot">·</span><span className="hp-cl-session-time">{timeAgo}</span></>}
            </div>
          </div>
          <button className="hp-cl-resume-btn hp-cl-resume-sm" onClick={() => onResume(session)}>
            <PlayCircle size={15} /> Resume
          </button>
        </div>
      )}

      {/* Daily plan section */}
      {plan && (
        <>
          <h3 className="hp-cl-course">{plan.goal}</h3>
          {todayData && (
            <div className="hp-cl-task">
              <span className="hp-cl-task-icon">📌</span>
              <span className="hp-cl-task-text">{todayData.title}</span>
            </div>
          )}
          <div className="hp-cl-progress-section">
            <div className="hp-cl-progress-bar">
              <div className="hp-cl-progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="hp-cl-progress-meta">
              <span className="hp-cl-progress-days">{completedDays} of {totalDays} days completed</span>
              <span className="hp-cl-progress-pct">{pct}%</span>
            </div>
          </div>
          <div className="hp-cl-actions">
            <button className="hp-cl-resume-btn" onClick={() => onNavigate("learningplan")}>
              <PlayCircle size={17} /> Open Learning Plan
            </button>
            <span className="hp-cl-level-tag">{plan.level}</span>
          </div>
        </>
      )}
    </div>
  );
}

const POPULAR_TOPICS = [
  "Recursion", "Neural Networks", "SQL Joins", "React Hooks",
  "Dynamic Programming", "System Design", "DBSCAN", "Transformers",
  "Binary Search", "Graph Algorithms", "Docker", "REST APIs",
];

const EXPLORE_MODES = [
  { id: "learn",     label: "Full Breakdown",  icon: BookOpen,  color: "#A78BFA", desc: "Deep step-by-step explanation" },
  { id: "practice",  label: "Practice",        icon: Dumbbell,  color: "#10B981", desc: "Questions + AI feedback" },
  { id: "interview", label: "Interview Prep",  icon: Briefcase, color: "#F59E0B", desc: "Q&A + key points" },
  { id: "roadmap",   label: "Learning Path",   icon: Map,       color: "#22D3EE", desc: "Structured roadmap" },
];

/* ── Stat Card ─────────────────────────────────────────── */
function StatCard({ icon, value, label, color, sub }) {
  return (
    <div className="hp-stat-card">
      <div className="hp-stat-icon" style={{ color, background: `${color}18` }}>{icon}</div>
      <div className="hp-stat-body">
        <div className="hp-stat-value" style={{ color }}>{value}</div>
        <div className="hp-stat-label">{label}</div>
        {sub && <div className="hp-stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

/* ── Rich Answer helpers (unchanged logic) ─────────────── */
function QuickPractice({ questions }) {
  const [answers, setAnswers] = useState({});
  const [revealed, setRevealed] = useState({});
  if (!questions?.length) return null;
  return (
    <div className="ra-section">
      <div className="ra-section-header"><Zap size={14} /><span>Quick Practice</span></div>
      <div className="ra-practice-list">
        {questions.map((q, i) => (
          <div key={i} className="ra-practice-item">
            <p className="ra-practice-q">Q{i + 1}. {q.question}</p>
            <div className="ra-practice-row">
              <input className="ra-practice-input" placeholder="Your answer..."
                value={answers[i] || ""} onChange={e => setAnswers(p => ({ ...p, [i]: e.target.value }))}
                disabled={revealed[i]} />
              {!revealed[i] && <button className="ra-reveal-btn" onClick={() => setRevealed(p => ({ ...p, [i]: true }))}>Check</button>}
            </div>
            {revealed[i] && <div className="ra-practice-answer"><CheckCircle size={13} /> {q.answer}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function InteractiveActions({ actions }) {
  const [active, setActive] = useState(null);
  const [content, setContent] = useState(null);
  if (!actions) return null;
  const BTNS = [
    { key: "simpler_explanation",    label: "Explain Simpler",  icon: <Lightbulb size={13} /> },
    { key: "another_example",        label: "Another Example",  icon: <RefreshCw size={13} /> },
    { key: "real_world_application", label: "Real-world Use",   icon: <Zap size={13} /> },
  ];
  const trigger = (key) => {
    if (active === key) { setActive(null); setContent(null); return; }
    setActive(key); setContent(actions[key]);
  };
  return (
    <div className="ra-section">
      <div className="ra-section-header"><HelpCircle size={14} /><span>Interactive Actions</span></div>
      <div className="ra-action-btns">
        {BTNS.map(({ key, label, icon }) => (
          <button key={key} className={`ra-action-btn ${active === key ? "active" : ""}`} onClick={() => trigger(key)}>
            {icon} {label}
          </button>
        ))}
      </div>
      {content && <div className="ra-action-result"><p>{content}</p></div>}
    </div>
  );
}

function RichAnswerCard({ data, onExploreMode, onFollowUp, loading }) {
  const [showVisual, setShowVisual] = useState(true);
  return (
    <div className="rich-answer-card">
      <div className="rich-answer-title">{data.topic}</div>
      {data.definition && (
        <div className="ra-section ra-definition-section">
          <div className="ra-section-header"><BookOpen size={14} /><span>Definition</span></div>
          <p className="rich-definition">{data.definition}</p>
        </div>
      )}
      {data.explanation && (
        <div className="ra-section">
          <div className="ra-section-header"><Lightbulb size={14} /><span>Explanation</span></div>
          <p className="rich-text">{data.explanation}</p>
        </div>
      )}
      {data.real_world_example && (
        <div className="ra-section">
          <div className="ra-section-header"><span>🌍</span><span>Real World Example</span></div>
          <div className="rich-example">{data.real_world_example}</div>
        </div>
      )}
      {data.visual_explanation && (
        <div className="ra-section ra-visual-section">
          <button className="ra-section-header ra-toggle" onClick={() => setShowVisual(v => !v)}>
            <Eye size={14} /><span>Visualize It</span>
            {showVisual ? <ChevronUp size={13} style={{ marginLeft: "auto" }} /> : <ChevronDown size={13} style={{ marginLeft: "auto" }} />}
          </button>
          {showVisual && <div className="ra-visual-box"><p>{data.visual_explanation}</p></div>}
        </div>
      )}
      {data.key_points?.length > 0 && (
        <div className="ra-section">
          <div className="ra-section-header"><span>🔑</span><span>Key Points</span></div>
          <ul className="rich-key-points">
            {data.key_points.map((p, i) => <li key={i}><CheckCircle size={13} className="rich-check" />{p}</li>)}
          </ul>
        </div>
      )}
      {data.quick_breakdown?.length > 0 && (
        <div className="ra-section">
          <div className="ra-section-header"><span>⚙️</span><span>How It Works</span></div>
          <ol className="rich-breakdown">{data.quick_breakdown.map((s, i) => <li key={i}>{s}</li>)}</ol>
        </div>
      )}
      <InteractiveActions actions={data.interactive_actions} />
      <QuickPractice questions={data.quick_practice} />
      <div className="ra-section">
        <div className="ra-section-header"><span>🚀</span><span>Want to go deeper?</span></div>
        <div className="rich-explore-modes">
          {EXPLORE_MODES.map(({ id, label, icon: Icon, color, desc }) => (
            <button key={id} className="rich-mode-btn" onClick={() => onExploreMode(id)} disabled={loading}>
              <Icon size={15} style={{ color }} />
              <div><div className="rich-mode-label">{label}</div><div className="rich-mode-desc">{desc}</div></div>
              <ArrowRight size={13} className="rich-mode-arrow" />
            </button>
          ))}
        </div>
      </div>
      {data.explore_more?.length > 0 && (
        <div className="ra-section">
          <div className="ra-section-header"><span>🔍</span><span>Explore More</span></div>
          <div className="rich-followup-chips">
            {data.explore_more.map((q, i) => <button key={i} className="suggestion-chip" onClick={() => onFollowUp(q)} disabled={loading}>{q}</button>)}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Today's Focus ─────────────────────────────────────── */
const FOCUS_TASKS = [
  { key: "learnTopic",       icon: "📚", label: "Learn a topic",           xp: 50, action: "learn",    color: "#A78BFA" },
  { key: "completePractice", icon: "💪", label: "Complete a practice task", xp: 30, action: "playground", color: "#10B981" },
  { key: "takeQuiz",         icon: "🧠", label: "Take a quiz",              xp: 20, action: "quiz",     color: "#22D3EE" },
];

function TodaysFocus({ dailyGoals, dailyGoalCount, setPage, onGenerate, recentTopics, setMode }) {
  const total     = FOCUS_TASKS.length;
  const completed = dailyGoalCount;
  const pct       = Math.round((completed / total) * 100);
  const allDone   = completed === total;

  const statusMsg = allDone
    ? "All done for today! Come back tomorrow."
    : completed === 0
    ? "Start your day — complete all 3 tasks to earn XP!"
    : `${completed}/${total} done — keep going!`;

  const handleAction = (task) => {
    if (task.key === "learnTopic") {
      if (recentTopics.length > 0) {
        onGenerate(recentTopics[0]);
      } else {
        setPage("home");
      }
    } else if (task.key === "completePractice") {
      setMode("practice");
      if (recentTopics.length > 0) onGenerate(recentTopics[0]);
      else setPage("home");
    } else if (task.key === "takeQuiz") {
      setPage("quiz");
    }
  };

  return (
    <div className="tf-card">
      {/* Header */}
      <div className="tf-header">
        <div className="tf-header-left">
          <div className="tf-title-row">
            <span className="tf-icon">⚡</span>
            <h3 className="tf-title">Today's Focus</h3>
          </div>
          <p className="tf-status">{statusMsg}</p>
        </div>
        <div className="tf-counter">
          <span className="tf-counter-val" style={{ color: allDone ? "#10B981" : "#A78BFA" }}>
            {completed}/{total}
          </span>
          <span className="tf-counter-label">tasks</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="tf-bar">
        <div className="tf-bar-fill" style={{ width: `${pct}%`, background: allDone ? "#10B981" : "linear-gradient(90deg,#7C3AED,#8B5CF6,#A78BFA)" }} />
      </div>

      {/* Task list */}
      <div className="tf-tasks">
        {FOCUS_TASKS.map(task => {
          const done = !!dailyGoals?.[task.key];
          return (
            <div key={task.key} className={`tf-task ${done ? "tf-task-done" : ""}`}>
              <div className="tf-task-check" style={{ borderColor: done ? task.color : "#252d45", background: done ? `${task.color}18` : "transparent" }}>
                {done && <CheckCircle size={14} style={{ color: task.color }} />}
              </div>
              <span className="tf-task-icon">{task.icon}</span>
              <span className="tf-task-label">{task.label}</span>
              <span className="tf-task-xp" style={{ color: done ? task.color : "#4B5563" }}>
                +{task.xp} XP
              </span>
              {!done && (
                <button className="tf-task-btn" onClick={() => handleAction(task)}
                  style={{ borderColor: `${task.color}35`, color: task.color, background: `${task.color}10` }}>
                  Start →
                </button>
              )}
              {done && <span className="tf-task-done-badge">Done</span>}
            </div>
          );
        })}
      </div>

      {allDone && (
        <div className="tf-complete-msg">
          🎉 All tasks complete! You earned <strong style={{ color: "#A78BFA" }}>+100 XP</strong> today.
        </div>
      )}
    </div>
  );
}
export default function Home({
  topic, setTopic, recentTopics, mode, setMode, onGenerate, setPage,
  xp = 0, userLevel = 1, levelName = "Beginner", xpProgress = 0, streak = 1,
  dailyGoals = {}, dailyGoalCount = 0, unlockedAchievements = [], completedCount = 0,
  onResume, weakAreas = [], quizHistory = [], nextLevelXP = [], levelNames = [],
}) {
  const { user } = useAuth();
  const [query, setQuery]       = useState(topic || "");
  const [answer, setAnswer]     = useState(null);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSearch = async (q) => {
    const text = (q || query).trim();
    if (!text || searching) return;
    setQuery(text);
    setAnswer(null);
    setSearching(true);
    try {
      const r = await fetchSearchAnswer(text);
      setAnswer(r.data);
      setTopic(r.data.topic || text);
    } catch {
      setAnswer({ topic: text, definition: "Something went wrong. Please try again.", key_points: [], explore_more: [] });
    } finally {
      setSearching(false);
    }
  };

  const handleExploreMode = (selectedMode) => {
    setMode(selectedMode);
    onGenerate(answer?.topic || query);
    setPage("learn");
  };

  const userName = user?.user_metadata?.name?.split(" ")[0] || user?.email?.split("@")[0] || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // Progress-aware greeting suffix
  const greetingSuffix = (() => {
    if (streak >= 7)              return `${streak}-day streak! You're unstoppable.`;
    if (xpProgress >= 85)         return `Almost Level ${userLevel + 1} — so close!`;
    if (recentTopics.length === 0) return "Ready to start your learning journey?";
    if (dailyGoalCount === 3)      return "All daily goals done! Amazing work.";
    if (dailyGoalCount > 0)        return `${dailyGoalCount}/3 daily goals done. Keep going!`;
    return "Ready to learn something new today?";
  })();

  return (
    <div className="hp-page">

      {/* 1 ── Greeting ─────────────────────────────────── */}
      <div className="hp-welcome">
        <div className="hp-welcome-text">
          <h1 className="hp-greeting">{greeting}, <span className="hp-name">{userName}</span></h1>
          <p className="hp-greeting-sub">{greetingSuffix}</p>
        </div>
        <button className="hp-progress-link" onClick={() => setPage("progress")}>
          <TrendingUp size={14} /> View Progress
        </button>
      </div>

      {/* 2 ── Hero Search ──────────────────────────────── */}
      <div className={`hp-hero ${answer ? "hp-hero-compact" : ""}`}>
        {!answer && (
          <div className="hp-hero-text">
            <div className="hp-hero-badge">✨ AI-Powered Learning</div>
            <h2 className="hp-hero-title">
              Learn Anything with Mentor<span className="logo-ai">AI</span>
            </h2>
            <p className="hp-hero-sub">
              Type any topic and get a complete learning module — explanations, examples, practice, and quizzes.
            </p>
          </div>
        )}
        <form className="hp-search-bar" onSubmit={e => { e.preventDefault(); handleSearch(); }}>
          <Search size={20} className="hp-search-icon" />
          <input
            ref={inputRef}
            className="hp-search-input"
            placeholder="e.g. DBSCAN, recursion, how does ML work..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <button type="submit" className="hp-search-btn" disabled={searching || !query.trim()}>
            {searching
              ? <span className="tutor-spinner" style={{ borderTopColor: "#fff", width: "16px", height: "16px" }} />
              : <ArrowRight size={17} />}
          </button>
        </form>
      </div>

      {/* ── Loading ─────────────────────────────────────── */}
      {searching && (
        <div className="hp-searching">
          <div className="spinner" />
          <p>Thinking...</p>
        </div>
      )}

      {/* ── Rich Answer ─────────────────────────────────── */}
      {answer && !searching && (
        <RichAnswerCard data={answer} onExploreMode={handleExploreMode} onFollowUp={handleSearch} loading={searching} />
      )}

      {/* 4 ── Stats Row ──────────────────────────────────── */}
      {!answer && !searching && (
        <div className="hp-stats-row">
          <StatCard icon={<Flame size={18} />} value={streak} label="Day Streak" color="#F59E0B" />
          <StatCard icon={<Zap size={18} />} value={xp} label="Total XP" color="#A78BFA" />
          <div className="hp-stat-card hp-stat-level">
            <div className="hp-stat-icon" style={{ color: "#8B5CF6", background: "rgba(139,92,246,0.15)" }}>
              <Star size={18} />
            </div>
            <div className="hp-stat-body" style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
                <span className="hp-stat-value" style={{ color: "#A78BFA" }}>Lv.{userLevel}</span>
                <span className="hp-stat-label">{levelName}</span>
              </div>
              <div className="hp-xp-track">
                <div className="hp-xp-fill" style={{ width: `${xpProgress}%` }} />
              </div>
              <div className="hp-xp-pct">{xpProgress}% to next level</div>
            </div>
          </div>
          <StatCard icon={<Target size={18} />} value={`${dailyGoalCount}/3`} label="Daily Goals" color="#22D3EE" />
          <StatCard icon={<Trophy size={18} />} value={unlockedAchievements.length} label="Badges" color="#10B981" />
        </div>
      )}

      {/* 5 ── Dashboard Grid ─────────────────────────────── */}
      {!answer && !searching && (
        <>
          {/* Today's Focus */}
          <TodaysFocus
            dailyGoals={dailyGoals}
            dailyGoalCount={dailyGoalCount}
            setPage={setPage}
            setMode={setMode}
            onGenerate={onGenerate}
            recentTopics={recentTopics}
          />

          {/* Subscription Card — below progress section */}
          <SubscriptionCard onNavigate={setPage} />

          <div className="hp-grid">
            {/* Continue Learning (recent topics) */}
            {recentTopics.length > 0 && (
              <div className="hp-card hp-continue-card">
                <div className="hp-card-header">
                  <div className="hp-card-icon" style={{ background: "rgba(139,92,246,0.15)", color: "#A78BFA" }}>
                    <BookOpen size={16} />
                  </div>
                  <span className="hp-card-title">Continue Learning</span>
                </div>
                <div className="hp-continue-topic">
                  <div>
                    <div className="hp-continue-name">{recentTopics[0]}</div>
                    <div className="hp-continue-sub">Pick up where you left off</div>
                  </div>
                  <button className="hp-continue-btn" onClick={() => onGenerate(recentTopics[0])}>
                    Continue <ArrowRight size={14} />
                  </button>
                </div>
                {recentTopics.length > 1 && (
                  <div className="hp-recent-chips">
                    {recentTopics.slice(1, 5).map((t, i) => (
                      <button key={i} className="topic-chip recent" onClick={() => handleSearch(t)} disabled={searching}>{t}</button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Popular Topics */}
            <div className="hp-card hp-topics-card">
              <div className="hp-card-header">
                <div className="hp-card-icon" style={{ background: "rgba(34,211,238,0.12)", color: "#22D3EE" }}>
                  <Star size={16} />
                </div>
                <span className="hp-card-title">Popular Topics</span>
              </div>
              <div className="hp-topics-grid">
                {POPULAR_TOPICS.map((t, i) => (
                  <button key={i} className="hp-topic-pill" onClick={() => handleSearch(t)} disabled={searching}>{t}</button>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="hp-card hp-actions-card">
              <div className="hp-card-header">
                <div className="hp-card-icon" style={{ background: "rgba(245,158,11,0.12)", color: "#F59E0B" }}>
                  <Zap size={16} />
                </div>
                <span className="hp-card-title">Quick Actions</span>
              </div>
              <div className="hp-quick-actions">
                {[
                  { label: "Learning Plan", icon: "📅", page: "learningplan", color: "#A78BFA" },
                  { label: "Interview Prep", icon: "💼", page: "interviewprep", color: "#F59E0B" },
                  { label: "Smart Study",   icon: "🎓", page: "study",         color: "#22D3EE" },
                  { label: "Ask AI",        icon: "🤖", page: "ask",           color: "#10B981" },
                ].map(({ label, icon, page, color }) => (
                  <button key={page} className="hp-quick-btn" onClick={() => setPage(page)} style={{ "--qc": color }}>
                    <span className="hp-quick-icon">{icon}</span>
                    <span>{label}</span>
                    <ArrowRight size={13} className="hp-quick-arrow" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Subscription Card — always visible, outside search/answer conditional */}
      <SubscriptionCard onNavigate={setPage} />
    </div>
  );
}
