import { useState, useRef, useEffect } from "react";
import { Bot, Send, Sparkles, RotateCcw, Copy, Check } from "lucide-react";
import { fetchSearchAnswer } from "../api";

const STARTERS = [
  { icon: "🧠", text: "How do I start learning machine learning?" },
  { icon: "🗄️", text: "What's the difference between SQL and NoSQL?" },
  { icon: "💼", text: "How to prepare for a software engineering interview?" },
  { icon: "🤖", text: "Explain neural networks like I'm 10" },
  { icon: "🐍", text: "What should I learn after Python basics?" },
  { icon: "⚡", text: "What is the difference between REST and GraphQL?" },
];

/* ── Copy button for AI messages ───────────────────────── */
function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button className="ac-copy-btn" onClick={copy} title="Copy">
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}

/* ── Message bubble ────────────────────────────────────── */
function Message({ msg }) {
  const isAI = msg.role === "ai";
  return (
    <div className={`ac-msg-row ${isAI ? "ai" : "user"}`}>
      {isAI && (
        <div className="ac-avatar ai">
          <Bot size={15} />
        </div>
      )}
      <div className={`ac-bubble ${isAI ? "ai" : "user"}`}>
        {msg.text.split("\n").map((line, i, arr) => (
          <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
        ))}
        {isAI && <CopyBtn text={msg.text} />}
      </div>
      {!isAI && <div className="ac-avatar user">U</div>}
    </div>
  );
}

/* ── Typing indicator ──────────────────────────────────── */
function TypingIndicator() {
  return (
    <div className="ac-msg-row ai">
      <div className="ac-avatar ai"><Bot size={15} /></div>
      <div className="ac-bubble ai ac-typing">
        <span /><span /><span />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════════════════ */
export default function AskAIPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const isEmpty   = messages.length === 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!loading) inputRef.current?.focus();
  }, [loading]);

  const send = async (text) => {
    const q = (text || input).trim();
    if (!q || loading) return;
    setInput("");
    setMessages(p => [...p, { role: "user", text: q }]);
    setLoading(true);
    try {
      const r = await fetchSearchAnswer(q);
      const d = r.data;
      let reply = d.definition ? `${d.definition}` : "";
      if (d.explanation) reply += (reply ? "\n\n" : "") + d.explanation;
      if (d.real_world_example) reply += `\n\n🌍 ${d.real_world_example}`;
      if (d.explore_more?.length) reply += "\n\n💡 Explore more:\n" + d.explore_more.map(f => `• ${f}`).join("\n");
      if (!reply) reply = "I couldn't find a specific answer. Try rephrasing your question.";
      setMessages(p => [...p, { role: "ai", text: reply }]);
    } catch {
      setMessages(p => [...p, { role: "ai", text: "Something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const clear = () => setMessages([]);

  return (
    <div className="ac-page">

      {/* ── Header ─────────────────────────────────────── */}
      <div className="ac-header">
        <div className="ac-header-left">
          <div className="ac-header-avatar"><Bot size={18} /></div>
          <div>
            <div className="ac-header-title">Ask Mentor<span className="logo-ai">AI</span></div>
            <div className="ac-header-sub">Conversational AI tutor — ask anything</div>
          </div>
        </div>
        {!isEmpty && (
          <button className="ac-clear-btn" onClick={clear}>
            <RotateCcw size={13} /> New chat
          </button>
        )}
      </div>

      {/* ── Chat area ──────────────────────────────────── */}
      <div className="ac-chat-area">

        {/* Welcome / empty state */}
        {isEmpty && (
          <div className="ac-welcome">
            <div className="ac-welcome-icon"><Sparkles size={28} /></div>
            <h2 className="ac-welcome-title">What do you want to learn?</h2>
            <p className="ac-welcome-sub">Ask me anything — concepts, career advice, code explanations, or just explore ideas.</p>
            <div className="ac-starters-grid">
              {STARTERS.map((s, i) => (
                <button key={i} className="ac-starter-card" onClick={() => send(s.text)} disabled={loading}>
                  <span className="ac-starter-icon">{s.icon}</span>
                  <span className="ac-starter-text">{s.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {!isEmpty && (
          <div className="ac-messages">
            {messages.map((m, i) => <Message key={i} msg={m} />)}
            {loading && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>
        )}

        {isEmpty && <div ref={bottomRef} />}
      </div>

      {/* ── Input bar ──────────────────────────────────── */}
      <div className="ac-input-section">
        <form className="ac-input-bar" onSubmit={e => { e.preventDefault(); send(); }}>
          <textarea
            ref={inputRef}
            className=""
            placeholder="Ask ..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            rows={1}
            disabled={loading}
          />
          <button type="submit" className="ac-send-btn" disabled={loading || !input.trim()}>
            <Send size={16} />
          </button>
        </form>
        <p className="ac-input-hint">Press Enter to send · Shift+Enter for new line</p>
      </div>

    </div>
  );
}
