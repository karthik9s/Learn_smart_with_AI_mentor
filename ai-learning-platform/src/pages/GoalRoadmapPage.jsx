import { useState, useRef, useCallback } from "react";
import { Navigation, ChevronDown, ChevronUp, CheckCircle, Circle, Download } from "lucide-react";
import { fetchGoalRoadmap } from "../api";
import ShareRoadmap from "../components/ShareRoadmap";

const LEVELS  = ["beginner", "intermediate", "advanced"];
const WEEKS   = [4, 6, 8, 12];
const LINK_COLOR = { course: "#a78bfa", book: "#38bdf8", tool: "#10b981", dataset: "#f59e0b" };
const LINK_ICON  = { course: "🎓", book: "📖", tool: "🛠️", dataset: "📊" };

const ROADMAP_KEY = "mentorai_goal_roadmaps";

function saveRoadmap(data) {
  const saved = JSON.parse(localStorage.getItem(ROADMAP_KEY) || "[]");
  const filtered = saved.filter(r => r.goal !== data.goal);
  localStorage.setItem(ROADMAP_KEY, JSON.stringify([{ ...data, savedAt: Date.now() }, ...filtered].slice(0, 10)));
}

function getSavedRoadmaps() {
  return JSON.parse(localStorage.getItem(ROADMAP_KEY) || "[]");
}

function exportRoadmap(data) {
  const lines = [`# ${data.title}`, `Goal: ${data.goal} | Level: ${data.level} | ${data.total_weeks} weeks`, ""];
  data.weeks?.forEach(w => {
    lines.push(`## Week ${w.week}: ${w.title}`, `Goal: ${w.goal}`, "");
    w.tasks?.forEach(t => lines.push(`  ${t.day}: ${t.task}`, `     → ${t.details}`));
    lines.push("", "Resources:");
    w.resources?.forEach(r => lines.push(`  ${LINK_ICON[r.link_type] || "📌"} ${r.title}`));
    lines.push("", `Project: ${w.project?.title}`, w.project?.description || "", "---", "");
  });
  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${data.goal.replace(/\s+/g, "_")}_roadmap.txt`; a.click();
  URL.revokeObjectURL(url);
}

// PHASE_CONFIG kept for potential future use — currently phases are rendered inline

function WeekCard({ week, index }) {
  const [open, setOpen]         = useState(index === 0);
  const [checkedPractice, setCheckedPractice] = useState({});
  const [appDone, setAppDone]   = useState(false);

  const doneCount = Object.values(checkedPractice).filter(Boolean).length + (appDone ? 1 : 0);
  const total = (week.practice?.length || 0) + 1;

  return (
    <div className={`week-card ${open ? "open" : ""}`}>
      <button className="week-card-header" onClick={() => setOpen(o => !o)}>
        <div className="week-num">W{week.week}</div>
        <div className="week-info">
          <div className="week-theme">{week.title}</div>
          <div className="week-topics">{week.weekly_goal}</div>
        </div>
        <div className="week-done-count" style={{ color: doneCount === total ? "#10b981" : "#475569" }}>
          {doneCount}/{total}
        </div>
        <div className="week-progress-mini">
          <div className="week-progress-fill" style={{ width: `${(doneCount / total) * 100}%` }} />
        </div>
        {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>

      {open && (
        <div className="week-card-body">

          {/* Phase 1: Topics */}
          {week.topics?.length > 0 && (
            <div className="phase-section" style={{ borderColor: "#a78bfa30", background: "#1a104010" }}>
              <div className="phase-label" style={{ color: "#a78bfa" }}>📘 Topics to Learn</div>
              <div className="phase-topics-list">
                {week.topics.map((t, i) => (
                  <span key={i} className="phase-topic-tag">{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* Phase 2: Concepts */}
          {week.concepts?.length > 0 && (
            <div className="phase-section" style={{ borderColor: "#38bdf830", background: "#0c1a2e10" }}>
              <div className="phase-label" style={{ color: "#38bdf8" }}>🧠 Concepts to Understand</div>
              <div className="concepts-list">
                {week.concepts.map((c, i) => (
                  <div key={i} className="concept-phase-item">
                    <div className="concept-phase-name">{c.name}</div>
                    <div className="concept-phase-exp">{c.explanation}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Phase 3: Practice */}
          {week.practice?.length > 0 && (
            <div className="phase-section" style={{ borderColor: "#10b98130", background: "#052e1610" }}>
              <div className="phase-label" style={{ color: "#10b981" }}>💪 Practice Tasks</div>
              <div className="practice-phase-list">
                {week.practice.map((p, i) => (
                  <div key={i} className={`practice-phase-item ${checkedPractice[i] ? "done" : ""}`}>
                    <button className="task-check-btn" onClick={() => setCheckedPractice(prev => ({ ...prev, [i]: !prev[i] }))}>
                      {checkedPractice[i]
                        ? <CheckCircle size={15} style={{ color: "#10b981" }} />
                        : <Circle size={15} style={{ color: "#334155" }} />}
                    </button>
                    <div>
                      <div className="practice-task-name">{p.task}</div>
                      <div className="practice-task-detail">{p.what_to_do}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Phase 4: Application */}
          {week.application?.task && (
            <div className="phase-section" style={{ borderColor: "#f59e0b30", background: "#1a150010" }}>
              <div className="phase-label" style={{ color: "#f59e0b" }}>🚀 Application Task</div>
              <div className={`application-task ${appDone ? "done" : ""}`}>
                <button className="task-check-btn" onClick={() => setAppDone(v => !v)}>
                  {appDone
                    ? <CheckCircle size={15} style={{ color: "#f59e0b" }} />
                    : <Circle size={15} style={{ color: "#334155" }} />}
                </button>
                <div>
                  <div className="app-task-name">{week.application.task}</div>
                  <div className="app-task-desc">{week.application.description}</div>
                  {week.application.expected_output && (
                    <div className="app-task-output">✅ Expected: {week.application.expected_output}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Resources */}
          {week.resources?.length > 0 && (
            <div className="week-section">
              <div className="week-section-label">📚 Resources</div>
              <div className="resources-list">
                {week.resources.map((r, i) => (
                  <div key={i} className="resource-item">
                    <span className="resource-type-badge" style={{ color: LINK_COLOR[r.type] || "#64748b", background: `${LINK_COLOR[r.type] || "#64748b"}15` }}>
                      {LINK_ICON[r.type] || "📌"} {r.type}
                    </span>
                    <span className="resource-title">{r.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

export default function GoalRoadmapPage() {
  const [goal, setGoal]       = useState("");
  const [level, setLevel]     = useState("beginner");
  const [weeks, setWeeks]     = useState(6);
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved]     = useState(getSavedRoadmaps());
  const debounceRef           = useRef(null);

  const generate = useCallback(async (e) => {
    e?.preventDefault();
    if (!goal.trim() || loading) return;

    // 300ms debounce
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setData(null);
      try {
        const r = await fetchGoalRoadmap(goal.trim(), level, weeks);
        setData(r.data);
        saveRoadmap(r.data);
        setSaved(getSavedRoadmaps());
      } catch {
        alert("Failed to generate roadmap. Please try again.");
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [goal, level, weeks, loading]);

  return (
    <div className="goal-roadmap-page">
      {/* Input */}
      <div className="gr-input-section">
        <div className="gr-input-header">
          <Navigation size={20} className="gr-icon" />
          <div>
            <h2>AI Roadmap Planner</h2>
            <p>Enter your learning goal and get a detailed week-by-week plan with daily tasks and projects</p>
          </div>
        </div>

        <form className="gr-form" onSubmit={generate}>
          <input
            className="gr-goal-input"
            placeholder='e.g. "Become a Machine Learning Engineer", "Learn Full Stack Web Development"'
            value={goal}
            onChange={e => setGoal(e.target.value)}
          />
          <div className="gr-controls">
            <div className="gr-control-group">
              <label>Level</label>
              <div className="gr-btns">
                {LEVELS.map(l => (
                  <button key={l} type="button" className={`ctrl-btn ${level === l ? "active" : ""}`} onClick={() => setLevel(l)}>{l}</button>
                ))}
              </div>
            </div>
            <div className="gr-control-group">
              <label>Duration</label>
              <div className="gr-btns">
                {WEEKS.map(w => (
                  <button key={w} type="button" className={`ctrl-btn ${weeks === w ? "active" : ""}`} onClick={() => setWeeks(w)}>{w}w</button>
                ))}
              </div>
            </div>
            <button type="submit" className="generate-btn gr-submit" disabled={loading || !goal.trim()}>
              <Navigation size={15} /> {loading ? "Generating..." : "Generate Roadmap"}
            </button>
          </div>
        </form>
      </div>

      {/* Saved */}
      {!data && saved.length > 0 && (
        <div className="gr-saved">
          <div className="gr-saved-label">📂 Saved Roadmaps</div>
          <div className="topic-chips">
            {saved.map((r, i) => (
              <button key={i} className="topic-chip recent" onClick={() => setData(r)}>{r.goal}</button>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="loader-wrap" style={{ padding: "3rem" }}>
          <div className="spinner" />
          <p>Building your personalized roadmap with detailed daily tasks...</p>
        </div>
      )}

      {/* Result */}
      {data && !loading && (
        <div className="gr-result">
          <div className="gr-result-header">
            <div>
              <h3>{data.title}</h3>
              <div className="gr-meta">
                <span>🎯 {data.goal}</span>
                <span>·</span>
                <span>📊 {data.level}</span>
                <span>·</span>
                <span>📅 {data.total_weeks} weeks</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
              <button className="content-action-btn" onClick={() => exportRoadmap(data)}>
                <Download size={14} /> Export
              </button>
              <ShareRoadmap data={data} />
            </div>
          </div>

          <div className="gr-weeks">
            {data.weeks?.map((w, i) => <WeekCard key={i} week={w} index={i} />)}
          </div>
        </div>
      )}
    </div>
  );
}
