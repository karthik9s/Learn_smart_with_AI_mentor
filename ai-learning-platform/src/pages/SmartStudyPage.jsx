import { useState, useRef, useEffect } from "react";
import { GraduationCap, Send, RotateCcw, TrendingUp, TrendingDown, Sparkles, BookOpen, Brain } from "lucide-react";
import { fetchStudyChat } from "../api";

const SUBJECTS = [
  "Mathematics", "Physics", "Chemistry", "Biology",
  "Computer Science", "Data Structures", "Machine Learning",
  "Web Development", "Python", "JavaScript",
  "History", "Economics", "English Grammar",
];
const LEVELS = ["beginner", "intermediate", "advanced"];
const STUDY_KEY = "mentorai_study_sessions";

function saveSession(subject, level, messages) {
  const sessions = JSON.parse(localStorage.getItem(STUDY_KEY) || "{}");
  sessions[`${subject}_${level}`] = { subject, level, messages, updatedAt: Date.now() };
  localStorage.setItem(STUDY_KEY, JSON.stringify(sessions));
}
function loadSession(subject, level) {
  const sessions = JSON.parse(localStorage.getItem(STUDY_KEY) || "{}");
  return sessions[`${subject}_${level}`]?.messages || null;
}

/* ── Quiz Card ─────────────────────────────────────────── */
function QuizCard({ quiz, onAnswer }) {
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);

  const handle = (opt) => {
    if (revealed) return;
    setSelected(opt); setRevealed(true);
    onAnswer(opt === quiz.correct, opt);
  };

  return (
    <div className="ss-quiz-card">
      <p className="ss-quiz-q">🧪 {quiz.question}</p>
      <div className="ss-quiz-options">
        {Object.entries(quiz.options).map(([key, val]) => {
          let cls = "ss-quiz-opt";
          if (revealed) {
            if (key === quiz.correct) cls += " correct";
            else if (key === selected) cls += " wrong";
          } else if (key === selected) cls += " selected";
          return (
            <button key={key} className={cls} onClick={() => handle(key)}>
              <span className="ss-quiz-key">{key}</span>{val}
            </button>
          );
        })}
      </div>
      {revealed && (
        <div className="ss-quiz-explanation">
          {selected === quiz.correct ? "✅ Correct! " : "❌ Not quite. "}{quiz.explanation}
        </div>
      )}
    </div>
  );
}

/* ── Message ───────────────────────────────────────────── */
function Message({ msg, onQuizAnswer }) {
  const isAI = msg.role === "ai";
  const adj  = msg.data?.difficulty_adjustment;
  return (
    <div className={`ss-msg-row ${isAI ? "ai" : "user"}`}>
      {isAI && (
        <div className="ss-msg-avatar ai">
          <GraduationCap size={14} />
        </div>
      )}
      <div className={`ss-msg-bubble ${isAI ? "ai" : "user"}`}>
        {isAI && adj && adj !== "same" && (
          <div className={`ss-adj ${adj}`}>
            {adj === "increase"
              ? <><TrendingUp size={11} /> Increasing difficulty</>
              : <><TrendingDown size={11} /> Simplifying</>}
          </div>
        )}
        <p>{msg.text}</p>
        {isAI && msg.data?.quiz && (
          <QuizCard quiz={msg.data.quiz}
            onAnswer={(correct, opt) => onQuizAnswer(correct, opt, msg.data.quiz)} />
        )}
      </div>
      {!isAI && <div className="ss-msg-avatar user">U</div>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════════════════ */
export default function SmartStudyPage() {
  const [subject, setSubject] = useState("Computer Science");
  const [level, setLevel]     = useState("beginner");
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const [apiHistory, setApiHistory] = useState([]);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (started) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, started]);

  const startSession = () => {
    const saved = loadSession(subject, level);
    if (saved?.length) {
      setMessages(saved);
      // Restore only the last 10 exchanges into apiHistory — the sliding window
      // in sendMessage will keep it bounded going forward, and we match that here
      // so a resumed session doesn't blow the context window on the first message.
      const hist = saved.flatMap(m => m.role === "user"
        ? [{ role: "user", content: m.text }]
        : [{ role: "assistant", content: m.text }]);
      setApiHistory(hist.slice(-10));
    } else {
      setMessages([]); setApiHistory([]);
      sendMessage("Hello! I'm ready to start learning.", true);
    }
    setStarted(true);
  };

  const sendMessage = async (text, isInit = false) => {
    const q = (text || input).trim();
    if (!q || loading) return;
    if (!isInit) setInput("");
    const userMsg = { role: "user", text: q };
    const newMessages = isInit ? [userMsg] : [...messages, userMsg];
    setMessages(newMessages);

    // Sliding window: keep only the last 10 exchanges (5 user + 5 AI) sent to the API.
    // This prevents context window overflow on long study sessions while preserving
    // enough recent context for the AI to maintain teaching continuity.
    const WINDOW = 10;
    const windowedHistory = apiHistory.slice(-WINDOW);
    const newHistory = [...windowedHistory, { role: "user", content: q }];

    setLoading(true);
    try {
      const r = await fetchStudyChat(subject, level, windowedHistory, q);
      const d = r.data;
      const aiMsg = { role: "ai", text: d.message, data: d };
      const finalMessages = [...newMessages, aiMsg];
      setMessages(finalMessages);
      setApiHistory([...newHistory, { role: "assistant", content: d.message }]);
      saveSession(subject, level, finalMessages);
    } catch {
      setMessages(p => [...p, { role: "ai", text: "Something went wrong. Please try again." }]);
    } finally { setLoading(false); }
  };

  const handleQuizAnswer = (correct, opt, quiz) => {
    sendMessage(correct ? "Great job! I got it right ✅" : `I chose ${opt} but the answer was ${quiz.correct}`);
  };

  const reset = () => {
    setStarted(false); setMessages([]); setApiHistory([]); setInput("");
  };

  /* ── Setup Screen ──────────────────────────────────── */
  if (!started) {
    return (
      <div className="ss-setup-page">
        <div className="ss-setup-card">

          {/* Icon + heading */}
          <div className="ss-setup-top">
            <div className="ss-setup-icon">
              <GraduationCap size={28} />
            </div>
            <div>
              <h2 className="ss-setup-title">Smart Study</h2>
              <p className="ss-setup-sub">Your AI teacher explains concepts step-by-step, asks questions, and adapts to your level in real time.</p>
            </div>
          </div>

          {/* Feature pills */}
          <div className="ss-feature-pills">
            <span className="ss-feature-pill"><Brain size={12} /> Adaptive difficulty</span>
            <span className="ss-feature-pill"><Sparkles size={12} /> Interactive quizzes</span>
            <span className="ss-feature-pill"><BookOpen size={12} /> Step-by-step teaching</span>
          </div>

          {/* Fields */}
          <div className="ss-fields">
            <div className="ss-field">
              <label className="ss-field-label">Subject</label>
              <div className="ss-select-wrap">
                <select className="ss-select" value={subject} onChange={e => setSubject(e.target.value)}>
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <span className="ss-select-arrow">▾</span>
              </div>
            </div>
            <div className="ss-field">
              <label className="ss-field-label">Difficulty Level</label>
              <div className="ss-level-btns">
                {LEVELS.map(l => (
                  <button key={l} type="button"
                    className={`ss-level-btn ${level === l ? "active" : ""}`}
                    onClick={() => setLevel(l)}>
                    {l === "beginner" ? "🌱" : l === "intermediate" ? "⚡" : "🔥"} {l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Info row */}
          <div className="ss-info-row">
            <span>📋 Adaptive questions</span>
            <span>·</span>
            <span>🎯 Personalized pace</span>
            <span>·</span>
            <span>💡 Instant feedback</span>
          </div>

          <button className="ss-start-btn" onClick={startSession}>
            <GraduationCap size={17} /> Start Learning Session
          </button>
        </div>
      </div>
    );
  }

  /* ── Chat Interface ────────────────────────────────── */
  return (
    <div className="ss-chat-page">

      {/* Header */}
      <div className="ss-chat-header">
        <div className="ss-chat-header-left">
          <div className="ss-chat-avatar"><GraduationCap size={16} /></div>
          <div>
            <div className="ss-chat-title">{subject}</div>
            <div className="ss-chat-sub">
              <span className={`ss-level-dot ss-level-${level}`} />
              {level}
            </div>
          </div>
        </div>
        <button className="ss-reset-btn" onClick={reset}>
          <RotateCcw size={13} /> New Session
        </button>
      </div>

      {/* Messages */}
      <div className="ss-messages">
        {messages.map((msg, i) => (
          <Message key={i} msg={msg} onQuizAnswer={handleQuizAnswer} />
        ))}
        {loading && (
          <div className="ss-msg-row ai">
            <div className="ss-msg-avatar ai"><GraduationCap size={14} /></div>
            <div className="ss-msg-bubble ai ss-typing">
              <span /><span /><span />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form className="ss-input-row" onSubmit={e => { e.preventDefault(); sendMessage(); }}>
        <input className="ss-input"
          placeholder="Type your answer or ask a question..."
          value={input} onChange={e => setInput(e.target.value)}
          disabled={loading} autoFocus />
        <button type="submit" className="ss-send-btn" disabled={loading || !input.trim()}>
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
