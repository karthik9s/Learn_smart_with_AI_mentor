import { useState, useRef, useEffect } from "react";
import { Briefcase, ChevronDown, ChevronUp, RefreshCw, Plus, Send, RotateCcw,
  CheckCircle, AlertCircle, ClipboardList, Mic, Zap } from "lucide-react";
import { fetchInterview, fetchMockInterview } from "../api";
import Loader from "../components/Loader";

const DOMAINS = [
  "Data Structures & Algorithms", "Web Development", "Machine Learning",
  "System Design", "Python", "JavaScript", "React", "SQL & Databases",
  "DevOps", "Computer Science Fundamentals",
];
const DIFFICULTIES = ["easy", "medium", "hard"];
const MOCK_LEVELS  = ["junior", "mid-level", "senior"];
const COUNT_OPTIONS = [5, 10, 15];
const DIFF_COLOR = { easy: "#10B981", medium: "#F59E0B", hard: "#ef4444" };
const TYPE_COLOR = { conceptual: "#A78BFA", practical: "#22D3EE", behavioral: "#F59E0B", technical: "#22D3EE", coding: "#10B981" };

/* ── Question Card ─────────────────────────────────────── */
function QuestionCard({ q, index }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="ip-q-card">
      <button className="ip-q-header" onClick={() => setOpen(o => !o)}>
        <div className="ip-q-meta">
          <span className="ip-q-num">Q{index + 1}</span>
          {q.type && <span className="ip-badge" style={{ color: TYPE_COLOR[q.type] || "#A78BFA", borderColor: `${TYPE_COLOR[q.type] || "#A78BFA"}30` }}>{q.type}</span>}
          {q.difficulty && <span className="ip-badge" style={{ color: DIFF_COLOR[q.difficulty] || "#A78BFA", borderColor: `${DIFF_COLOR[q.difficulty] || "#A78BFA"}30` }}>{q.difficulty}</span>}
        </div>
        <p className="ip-q-text">{q.question}</p>
        {open ? <ChevronUp size={14} style={{ flexShrink: 0, color: "#4B5563" }} /> : <ChevronDown size={14} style={{ flexShrink: 0, color: "#4B5563" }} />}
      </button>
      {open && (
        <div className="ip-q-answer">
          <div className="ip-answer-label">Answer</div>
          <p className="ip-answer-text">{q.answer}</p>
          {q.key_points?.length > 0 && (
            <div className="ip-key-points">
              <div className="ip-answer-label">Key Points</div>
              <ul>{q.key_points.map((p, i) => <li key={i}>{p}</li>)}</ul>
            </div>
          )}
          {q.follow_up && (
            <div className="ip-followup">💬 <strong>Follow-up:</strong> {q.follow_up}</div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Practice Mode ─────────────────────────────────────── */
function PracticeMode({ topic, count, difficulty }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab]         = useState("questions");
  const [appending, setAppending] = useState(false);

  const generate = async (append = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const r = await fetchInterview(topic, "mixed", count, difficulty);
      if (append && data) {
        setData(prev => ({ ...prev, questions: [...(prev.questions || []), ...(r.data.questions || [])] }));
      } else { setData(r.data); }
    } catch {}
    finally { setLoading(false); setAppending(false); }
  };

  return (
    <div className="ip-practice-wrap">
      <div className="ip-practice-actions">
        <button className="ip-generate-btn" onClick={() => generate(false)} disabled={loading}>
          <Zap size={15} /> {loading ? "Generating..." : data ? "Regenerate" : "Generate Questions"}
        </button>
        {data && (
          <button className="ip-add-btn" onClick={() => { setAppending(true); generate(true); }} disabled={loading}>
            <Plus size={14} /> Add More
          </button>
        )}
      </div>

      {loading && <Loader text={appending ? "Adding more questions..." : "Generating questions..."} />}

      {!loading && data && (
        <>
          <div className="ip-result-header">
            <h3 className="ip-result-title">{data.title}</h3>
            {data.quick_summary && <p className="ip-result-sub">{data.quick_summary}</p>}
          </div>
          <div className="ip-tabs">
            {[
              { key: "questions", label: `❓ Questions (${data.questions?.length || 0})` },
              { key: "cheatsheet", label: "📋 Cheat Sheet" },
              { key: "tips", label: "💡 Tips" },
            ].map(t => (
              <button key={t.key} className={`ip-tab ${tab === t.key ? "active" : ""}`} onClick={() => setTab(t.key)}>
                {t.label}
              </button>
            ))}
          </div>
          {tab === "questions" && (
            <div className="ip-questions-list">
              {data.questions?.map((q, i) => <QuestionCard key={i} q={q} index={i} />)}
            </div>
          )}
          {tab === "cheatsheet" && (
            <div className="ip-cheatsheet">
              {data.cheat_sheet?.map((item, i) => (
                <div key={i} className="ip-cheat-item">
                  <span className="ip-cheat-num">{String(i + 1).padStart(2, "0")}</span>
                  <p>{item}</p>
                </div>
              ))}
              {data.common_mistakes?.length > 0 && (
                <div className="ip-mistakes">
                  <div className="ip-mistakes-label">⚠️ Common Mistakes</div>
                  {data.common_mistakes.map((m, i) => (
                    <div key={i} className="ip-cheat-item ip-mistake"><span>!</span><p>{m}</p></div>
                  ))}
                </div>
              )}
            </div>
          )}
          {tab === "tips" && (
            <div className="ip-tips-list">
              {data.tips?.map((tip, i) => (
                <div key={i} className="ip-tip-card">
                  <span className="ip-tip-num">{i + 1}</span><p>{tip}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── Score Bar ─────────────────────────────────────────── */
function ScoreBar({ label, value }) {
  const color = value >= 7 ? "#10B981" : value >= 5 ? "#F59E0B" : "#ef4444";
  return (
    <div className="ip-score-bar">
      <span className="ip-score-bar-label">{label}</span>
      <div className="ip-score-bar-track">
        <div className="ip-score-bar-fill" style={{ width: `${value * 10}%`, background: color }} />
      </div>
      <span className="ip-score-bar-val" style={{ color }}>{value}/10</span>
    </div>
  );
}

/* ── Feedback Card ─────────────────────────────────────── */
function FeedbackCard({ item }) {
  const [open, setOpen] = useState(false);
  const score = item.data?.score;
  const color = score >= 7 ? "#10B981" : score >= 5 ? "#F59E0B" : "#ef4444";
  return (
    <div className="ip-feedback-card">
      <div className="ip-fc-header" onClick={() => setOpen(o => !o)}>
        {item.data?.question_type && (
          <span className="ip-fc-type" style={{ color: TYPE_COLOR[item.data.question_type] || "#A78BFA" }}>
            {item.data.question_type}
          </span>
        )}
        <p className="ip-fc-question">{item.question}</p>
        {score != null && <span className="ip-fc-score" style={{ color }}>{score}/10</span>}
      </div>
      {open && item.data?.feedback && (
        <div className="ip-fc-body">
          <p className="ip-fc-feedback">{item.data.feedback}</p>
          {item.data.score_breakdown && (
            <div className="ip-fc-breakdown">
              <ScoreBar label="Accuracy" value={item.data.score_breakdown.accuracy} />
              <ScoreBar label="Depth"    value={item.data.score_breakdown.depth} />
              <ScoreBar label="Clarity"  value={item.data.score_breakdown.clarity} />
            </div>
          )}
          {item.data.ideal_answer_hint && (
            <div className="ip-fc-hint">💡 <strong>Ideal approach:</strong> {item.data.ideal_answer_hint}</div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Summary Card ──────────────────────────────────────── */
function SummaryCard({ data }) {
  const score = data.overall_score;
  const color = score >= 7 ? "#10B981" : score >= 5 ? "#F59E0B" : "#ef4444";
  const msg   = score >= 8 ? "Excellent! You're interview-ready." : score >= 6 ? "Good job! A bit more practice and you'll nail it." : "Keep going — you're on the right track.";
  return (
    <div className="ip-summary">
      <div className="ip-summary-score-row">
        <div className="ip-summary-circle" style={{ borderColor: color, color }}>
          <span className="ip-summary-num">{score}</span>
          <span className="ip-summary-denom">/10</span>
        </div>
        <div>
          <h3 className="ip-summary-title">Interview Complete!</h3>
          <p className="ip-summary-msg">{msg}</p>
        </div>
      </div>
      {data.strengths?.length > 0 && (
        <div className="ip-summary-section">
          <div className="ip-summary-section-label"><CheckCircle size={13} /> Strengths</div>
          <ul>{data.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </div>
      )}
      {data.improvements?.length > 0 && (
        <div className="ip-summary-section">
          <div className="ip-summary-section-label"><AlertCircle size={13} /> Areas to Improve</div>
          <ul>{data.improvements.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

/* ── Mock Mode ─────────────────────────────────────────── */
function MockMode({ topic, mockLevel }) {
  const [loading, setLoading]     = useState(false);
  const [answer, setAnswer]       = useState("");
  const [questionNum, setQuestionNum] = useState(1);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [history, setHistory]     = useState([]);
  const [feedbackLog, setFeedbackLog] = useState([]);
  const [summary, setSummary]     = useState(null);
  const [phase, setPhase]         = useState("idle");
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [currentQuestion, summary, loading]);

  const start = async () => {
    if (loading) return;
    setLoading(true); setPhase("answering");
    setFeedbackLog([]); setSummary(null); setHistory([]); setQuestionNum(1);
    try {
      const r = await fetchMockInterview(topic, mockLevel, [], null, 1);
      setCurrentQuestion(r.data);
      setHistory([{ role: "assistant", content: JSON.stringify(r.data) }]);
    } catch { alert("Failed to start. Try again."); setPhase("idle"); }
    finally { setLoading(false); }
  };

  const submitAnswer = async () => {
    if (!answer.trim() || loading) return;
    const ans = answer.trim(); setAnswer(""); setPhase("feedback"); setLoading(true);
    const newHistory = [...history, { role: "user", content: ans }];
    try {
      const r = await fetchMockInterview(topic, mockLevel, newHistory, ans, questionNum);
      const d = r.data;
      setFeedbackLog(prev => [...prev, { question: currentQuestion?.question, answer: ans, data: d }]);
      if (d.is_final || d.type === "summary") { setSummary(d); setPhase("done"); }
      else {
        setHistory([...newHistory, { role: "assistant", content: JSON.stringify(d) }]);
        setCurrentQuestion({ ...d, question: d.next_question });
        setQuestionNum(n => n + 1); setPhase("answering");
      }
    } catch { alert("Something went wrong."); setPhase("answering"); }
    finally { setLoading(false); }
  };

  const reset = () => {
    setAnswer(""); setQuestionNum(1); setCurrentQuestion(null);
    setHistory([]); setFeedbackLog([]); setSummary(null); setPhase("idle");
  };

  if (phase === "idle") return (
    <div className="ip-mock-ready">
      <div className="ip-mock-ready-icon"><Mic size={28} /></div>
      <h3>Ready to start your mock interview?</h3>
      <p>Topic: <strong style={{ color: "#A78BFA" }}>{topic}</strong> · Level: <strong style={{ color: "#F59E0B" }}>{mockLevel}</strong></p>
      <div className="ip-mock-info-pills">
        <span>📋 8 questions</span>
        <span>⏱ ~20 minutes</span>
        <span>🎯 Scored feedback</span>
      </div>
      <button className="ip-generate-btn" style={{ width: "100%", justifyContent: "center" }} onClick={start}>
        <Mic size={16} /> Start Mock Interview
      </button>
    </div>
  );

  return (
    <div className="ip-mock-session">
      <div className="ip-mock-session-header">
        <div className="ip-mock-session-info">
          <Briefcase size={15} />
          <span><strong>{topic}</strong> · {mockLevel}</span>
          {!summary && <span className="ip-mock-counter">Q{questionNum}/8</span>}
        </div>
        <button className="ip-reset-btn" onClick={reset}><RotateCcw size={13} /> New Interview</button>
      </div>

      {!summary && (
        <div className="ip-mock-progress">
          <div className="ip-mock-progress-fill" style={{ width: `${((questionNum - 1) / 8) * 100}%` }} />
        </div>
      )}

      {currentQuestion && !summary && (
        <div className="ip-mock-question">
          <div className="ip-mock-q-meta">
            <span className="ip-mock-q-num">Question {questionNum}</span>
            {currentQuestion.question_type && (
              <span style={{ fontSize: "0.72rem", color: TYPE_COLOR[currentQuestion.question_type] || "#A78BFA", fontWeight: 600, textTransform: "capitalize" }}>
                {currentQuestion.question_type}
              </span>
            )}
          </div>
          <p className="ip-mock-q-text">{currentQuestion.question || currentQuestion.next_question}</p>
        </div>
      )}

      {loading && (
        <div className="ip-mock-loading">
          <div className="spinner" />
          <p>{phase === "feedback" ? "Evaluating your answer..." : "Preparing next question..."}</p>
        </div>
      )}

      {feedbackLog.length > 0 && (
        <div className="ip-feedback-log">
          <div className="ip-feedback-log-label">📋 Review ({feedbackLog.length} answered)</div>
          {feedbackLog.map((item, i) => <FeedbackCard key={i} item={item} />)}
        </div>
      )}

      {summary && <SummaryCard data={summary} />}

      {!summary && !loading && phase === "answering" && (
        <div className="ip-mock-answer-area">
          <textarea className="ip-mock-answer-input"
            placeholder="Type your answer here... Be as detailed as you can."
            value={answer} onChange={e => setAnswer(e.target.value)}
            rows={5} autoFocus />
          <div className="ip-mock-answer-footer">
            <span className="ip-mock-answer-hint">Be thorough — quality matters</span>
            <button className="ip-generate-btn" onClick={submitAnswer} disabled={!answer.trim()}>
              <Send size={14} /> Submit Answer
            </button>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Main Page — Premium Config Panel
   ══════════════════════════════════════════════════════════ */
export default function InterviewPrepPage() {
  const [mode, setMode]             = useState("practice");
  const [topic, setTopic]           = useState(DOMAINS[0]);
  const [customTopic, setCustomTopic] = useState("");
  const [mockLevel, setMockLevel]   = useState("junior");
  const [count, setCount]           = useState(5);
  const [difficulty, setDifficulty] = useState("mixed");

  const effectiveTopic = customTopic.trim() || topic;

  return (
    <div className="ip-page">

      {/* ── Page Title ─────────────────────────────────── */}
      <div className="ip-page-header">
        <div className="ip-page-icon"><Briefcase size={22} /></div>
        <div>
          <h2 className="ip-page-title">Interview Prep</h2>
          <p className="ip-page-sub">Practice questions or simulate a real AI-powered interview</p>
        </div>
      </div>

      {/* ── Config Card ────────────────────────────────── */}
      <div className="ip-config-card">

        {/* Mode toggle */}
        <div className="ip-config-section">
          <div className="ip-section-label">Mode</div>
          <div className="ip-mode-toggle">
            <button className={`ip-mode-card ${mode === "practice" ? "active" : ""}`}
              onClick={() => setMode("practice")}>
              <div className="ip-mode-card-icon" style={{ background: mode === "practice" ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.04)", color: mode === "practice" ? "#A78BFA" : "#4B5563" }}>
                <ClipboardList size={18} />
              </div>
              <div>
                <div className="ip-mode-card-title">Practice Questions</div>
                <div className="ip-mode-card-sub">Browse Q&A with answers</div>
              </div>
              {mode === "practice" && <span className="ip-mode-check">✓</span>}
            </button>
            <button className={`ip-mode-card ${mode === "mock" ? "active" : ""}`}
              onClick={() => setMode("mock")}>
              <div className="ip-mode-card-icon" style={{ background: mode === "mock" ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.04)", color: mode === "mock" ? "#F59E0B" : "#4B5563" }}>
                <Mic size={18} />
              </div>
              <div>
                <div className="ip-mode-card-title">Mock Interview</div>
                <div className="ip-mode-card-sub">Live Q&A with AI scoring</div>
              </div>
              {mode === "mock" && <span className="ip-mode-check">✓</span>}
            </button>
          </div>
        </div>

        <div className="ip-config-divider" />

        {/* Topic chips */}
        <div className="ip-config-section">
          <div className="ip-section-label">Topic</div>
          <div className="ip-topic-chips">
            {DOMAINS.map(d => (
              <button key={d} type="button"
                className={`ip-topic-chip ${topic === d && !customTopic ? "active" : ""}`}
                onClick={() => { setTopic(d); setCustomTopic(""); }}>
                {d}
              </button>
            ))}
          </div>
          <div className="ip-or-row"><span>or enter custom topic</span></div>
          <input className="ip-custom-input"
            placeholder="e.g. Node.js, Docker, AWS, Kubernetes..."
            value={customTopic} onChange={e => setCustomTopic(e.target.value)} />
        </div>

        <div className="ip-config-divider" />

        {/* Options row */}
        <div className="ip-options-row">
          {mode === "practice" && (
            <>
              <div className="ip-config-section ip-config-inline">
                <div className="ip-section-label">Questions</div>
                <div className="ip-chip-group">
                  {COUNT_OPTIONS.map(n => (
                    <button key={n} className={`ip-option-chip ${count === n ? "active" : ""}`}
                      onClick={() => setCount(n)}>{n}</button>
                  ))}
                </div>
              </div>
              <div className="ip-config-section ip-config-inline">
                <div className="ip-section-label">Difficulty</div>
                <div className="ip-chip-group">
                  {["mixed", ...DIFFICULTIES].map(d => (
                    <button key={d} className={`ip-option-chip ${difficulty === d ? "active" : ""}`}
                      onClick={() => setDifficulty(d)}
                      style={difficulty === d && d !== "mixed" ? { borderColor: DIFF_COLOR[d], color: DIFF_COLOR[d], background: `${DIFF_COLOR[d]}12` } : {}}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
          {mode === "mock" && (
            <div className="ip-config-section ip-config-inline">
              <div className="ip-section-label">Experience Level</div>
              <div className="ip-chip-group">
                {MOCK_LEVELS.map(l => (
                  <button key={l} className={`ip-option-chip ${mockLevel === l ? "active" : ""}`}
                    onClick={() => setMockLevel(l)}>{l}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Active topic indicator */}
        {effectiveTopic && (
          <div className="ip-active-topic">
            <span className="ip-active-topic-label">Selected:</span>
            <span className="ip-active-topic-value">{effectiveTopic}</span>
          </div>
        )}
      </div>

      {/* ── Content ────────────────────────────────────── */}
      <div className="ip-content-area">
        {mode === "practice"
          ? <PracticeMode topic={effectiveTopic} count={count} difficulty={difficulty} />
          : <MockMode topic={effectiveTopic} mockLevel={mockLevel} />}
      </div>
    </div>
  );
}
