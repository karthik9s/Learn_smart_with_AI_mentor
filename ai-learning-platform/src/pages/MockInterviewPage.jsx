import { useState, useRef, useEffect } from "react";
import { Briefcase, Send, RotateCcw, AlertCircle, CheckCircle } from "lucide-react";
import { fetchMockInterview } from "../api";

const DOMAINS = [
  "Data Structures & Algorithms", "Web Development", "Machine Learning",
  "System Design", "Python", "JavaScript", "React", "SQL & Databases",
  "DevOps", "Computer Science Fundamentals",
];
const DIFFICULTIES = ["junior", "mid-level", "senior"];
const TYPE_COLOR = { technical: "#38bdf8", behavioral: "#a78bfa", coding: "#10b981" };

function ScoreBar({ label, value }) {
  return (
    <div className="score-bar-item">
      <span>{label}</span>
      <div className="score-bar-track">
        <div className="score-bar-fill" style={{ width: `${value * 10}%`, background: value >= 7 ? "#10b981" : value >= 5 ? "#f59e0b" : "#ef4444" }} />
      </div>
      <span className="score-bar-val">{value}/10</span>
    </div>
  );
}

function FeedbackCard({ item }) {
  const [open, setOpen] = useState(false);
  const score = item.data?.score;
  const color = score >= 7 ? "#10b981" : score >= 5 ? "#f59e0b" : "#ef4444";

  return (
    <div className="interview-feedback-card">
      <div className="ifc-header" onClick={() => setOpen(o => !o)}>
        <div className="ifc-q-type" style={{ color: TYPE_COLOR[item.data?.question_type] || "#64748b" }}>
          {item.data?.question_type}
        </div>
        <p className="ifc-question">{item.question}</p>
        {score !== null && score !== undefined && (
          <div className="ifc-score" style={{ color }}>{score}/10</div>
        )}
      </div>
      {open && item.data?.feedback && (
        <div className="ifc-body">
          <p className="ifc-feedback">{item.data.feedback}</p>
          {item.data.score_breakdown && (
            <div className="ifc-breakdown">
              <ScoreBar label="Accuracy" value={item.data.score_breakdown.accuracy} />
              <ScoreBar label="Depth"    value={item.data.score_breakdown.depth} />
              <ScoreBar label="Clarity"  value={item.data.score_breakdown.clarity} />
            </div>
          )}
          {item.data.ideal_answer_hint && (
            <div className="ifc-hint">💡 <strong>Ideal approach:</strong> {item.data.ideal_answer_hint}</div>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ data }) {
  const score = data.overall_score;
  const color = score >= 7 ? "#10b981" : score >= 5 ? "#f59e0b" : "#ef4444";
  return (
    <div className="interview-summary">
      <div className="summary-score-row">
        <div className="summary-score-circle" style={{ borderColor: color, color }}>
          <span className="summary-score-num">{score}</span>
          <span className="summary-score-label">/10</span>
        </div>
        <div>
          <h3>Interview Complete!</h3>
          <p style={{ color: "#64748b", fontSize: "0.88rem" }}>
            {score >= 8 ? "Excellent performance! You're ready." : score >= 6 ? "Good job! A bit more practice and you'll nail it." : "Keep practicing — you're on the right track."}
          </p>
        </div>
      </div>
      {data.strengths?.length > 0 && (
        <div className="summary-section">
          <div className="summary-section-label"><CheckCircle size={14} /> Strengths</div>
          <ul>{data.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </div>
      )}
      {data.improvements?.length > 0 && (
        <div className="summary-section">
          <div className="summary-section-label"><AlertCircle size={14} /> Areas to Improve</div>
          <ul>{data.improvements.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

export default function MockInterviewPage() {
  const [domain, setDomain]         = useState("Data Structures & Algorithms");
  const [customDomain, setCustomDomain] = useState("");
  const [domainError, setDomainError]   = useState("");
  const [difficulty, setDifficulty] = useState("junior");
  const [started, setStarted]       = useState(false);
  const [loading, setLoading]       = useState(false);
  const [answer, setAnswer]         = useState("");
  const [questionNum, setQuestionNum] = useState(1);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [history, setHistory]       = useState([]); // API history
  const [feedbackLog, setFeedbackLog] = useState([]); // for review
  const [summary, setSummary]       = useState(null);
  const [phase, setPhase]           = useState("question"); // question | answering | feedback | done
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentQuestion, summary, loading]);

  const start = async () => {
    if (loading) return;
    // Resolve effective domain: custom input takes priority
    const effectiveDomain = customDomain.trim() || domain;
    if (!effectiveDomain) {
      setDomainError("Please select a topic or enter a custom one.");
      return;
    }
    setDomainError("");
    setStarted(true);
    setLoading(true);
    try {
      const r = await fetchMockInterview(effectiveDomain, difficulty, [], null, 1);
      const d = r.data;
      setCurrentQuestion(d);
      setHistory([{ role: "assistant", content: JSON.stringify(d) }]);
      setPhase("answering");
      // Update domain to effective value for display
      setDomain(effectiveDomain);
    } catch { alert("Failed to start. Try again."); setStarted(false); }
    finally { setLoading(false); }
  };

  const submitAnswer = async () => {
    if (!answer.trim() || loading) return;
    const ans = answer.trim();
    setAnswer("");
    setPhase("feedback");
    setLoading(true);

    const newHistory = [...history, { role: "user", content: ans }];

    try {
      const r = await fetchMockInterview(domain, difficulty, newHistory, ans, questionNum);
      const d = r.data;

      // Log this Q&A for review
      setFeedbackLog(prev => [...prev, { question: currentQuestion?.question, answer: ans, data: d }]);

      if (d.is_final || d.type === "summary") {
        setSummary(d);
        setPhase("done");
      } else {
        setHistory([...newHistory, { role: "assistant", content: JSON.stringify(d) }]);
        setCurrentQuestion({ ...d, question: d.next_question });
        setQuestionNum(n => n + 1);
        setPhase("answering");
      }
    } catch { alert("Something went wrong."); setPhase("answering"); }
    finally { setLoading(false); }
  };

  const reset = () => {
    setStarted(false); setLoading(false); setAnswer("");
    setQuestionNum(1); setCurrentQuestion(null);
    setHistory([]); setFeedbackLog([]); setSummary(null); setPhase("question");
  };

  if (!started) {
    return (
      <div className="mock-interview-setup">
        <div className="mock-setup-card">
          <div className="mock-setup-icon"><Briefcase size={28} /></div>
          <h2>Mock Interview</h2>
          <p>Practice with an AI interviewer. Get real-time feedback and scores on every answer.</p>

          <div className="mock-setup-fields">
            <div className="smart-study-field">
              <label>Domain</label>
              <div className="mock-domain-chips">
                {DOMAINS.map(d => (
                  <button
                    key={d}
                    type="button"
                    className={`mock-domain-chip ${domain === d && !customDomain ? "active" : ""}`}
                    onClick={() => { setDomain(d); setCustomDomain(""); setDomainError(""); }}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <div className="mock-or-divider"><span>OR</span></div>
              <input
                className="gr-goal-input"
                placeholder="Enter custom topic (e.g. Node.js, Docker, AWS...)"
                value={customDomain}
                onChange={e => { setCustomDomain(e.target.value); setDomainError(""); }}
                style={{ marginTop: 0 }}
              />
              {domainError && <div className="auth-error" style={{ marginTop: "0.4rem" }}>{domainError}</div>}
            </div>
            <div className="smart-study-field">
              <label>Level</label>
              <div className="gr-btns">
                {DIFFICULTIES.map(d => (
                  <button key={d} type="button" className={`ctrl-btn ${difficulty === d ? "active" : ""}`} onClick={() => setDifficulty(d)}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mock-setup-info">
            <span>📋 8 questions</span>
            <span>·</span>
            <span>⏱ ~20 minutes</span>
            <span>·</span>
            <span>🎯 Scored feedback</span>
          </div>

          <button className="generate-btn mock-start-btn" onClick={start}>
            <Briefcase size={16} /> Start Interview
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mock-interview-page">
      {/* Header */}
      <div className="mock-header">
        <div className="mock-header-info">
          <Briefcase size={16} />
          <span><strong>{domain}</strong> · {difficulty}</span>
          {!summary && <span className="mock-q-counter">Q{questionNum}/8</span>}
        </div>
        <button className="smart-study-reset" onClick={reset}><RotateCcw size={14} /> New Interview</button>
      </div>

      {/* Progress bar */}
      {!summary && (
        <div className="mock-progress">
          <div className="mock-progress-fill" style={{ width: `${((questionNum - 1) / 8) * 100}%` }} />
        </div>
      )}

      {/* Current question */}
      {currentQuestion && !summary && (
        <div className="mock-question-card">
          <div className="mock-q-header">
            <span className="mock-q-num">Question {questionNum}</span>
            {currentQuestion.question_type && (
              <span className="mock-q-type" style={{ color: TYPE_COLOR[currentQuestion.question_type] }}>
                {currentQuestion.question_type}
              </span>
            )}
          </div>
          <p className="mock-q-text">{currentQuestion.question || currentQuestion.next_question}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="mock-loading">
          <div className="spinner" />
          <p>{phase === "feedback" ? "Evaluating your answer..." : "Preparing next question..."}</p>
        </div>
      )}

      {/* Feedback log */}
      {feedbackLog.length > 0 && (
        <div className="mock-feedback-log">
          <div className="mock-log-label">📋 Review ({feedbackLog.length} answered)</div>
          {feedbackLog.map((item, i) => <FeedbackCard key={i} item={item} />)}
        </div>
      )}

      {/* Summary */}
      {summary && <SummaryCard data={summary} />}

      {/* Answer input */}
      {!summary && !loading && phase === "answering" && (
        <div className="mock-answer-area">
          <textarea
            className="mock-answer-input"
            placeholder="Type your answer here... Be as detailed as you can."
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            rows={5}
            autoFocus
          />
          <div className="mock-answer-actions">
            <span className="mock-answer-hint">Press Submit when ready</span>
            <button className="generate-btn" onClick={submitAnswer} disabled={!answer.trim()}>
              <Send size={14} /> Submit Answer
            </button>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
