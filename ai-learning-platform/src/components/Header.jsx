import { RefreshCw, Zap, FlaskConical } from "lucide-react";
import ModeSelector from "./ModeSelector";
import UsageCounter from "./UsageCounter";
import { fetchLearn } from "../api";

const LEVELS = ["basic", "intermediate", "advanced"];

export default function Header({ topic, setTopic, level, setLevel, onGenerate, loading, hasData, currentPage, mode, setMode }) {
  if (currentPage === "home") {
    return (
      <header className="app-header-bar app-header-minimal">
        <div className="header-brand">
          <h1>🎓 Mentor<span className="logo-ai">AI</span></h1>
          <p>Your Personal AI Learning Mentor</p>
        </div>
      </header>
    );
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!topic.trim()) return;
    console.log("Generating:", topic);
    onGenerate();
  };

  const testAPI = async () => {
    console.log("[TEST] Calling /api/learn with topic=arrays, level=basic");
    try {
      const r = await fetchLearn("arrays", "basic");
      console.log("[TEST] Response:", r.data);
      alert(`✅ API works! Got: "${r.data?.title || r.data?.definition?.slice(0, 60)}..."`);
    } catch (e) {
      console.error("[TEST] Failed:", e.message);
      alert(`❌ API failed: ${e.message}`);
    }
  };

  return (
    <header className="app-header-bar">
      <div className="header-brand">
        <h1>🎓 Mentor<span className="logo-ai">AI</span></h1>
      </div>
      <div className="header-search-area">
        <form className="header-top-row" onSubmit={handleSubmit}>
          <div className="header-input-wrap">
            <input
              className="header-input"
              placeholder="Enter any topic..."
              value={topic}
              onChange={e => setTopic(e.target.value)}
            />
          </div>
          <div className="header-actions">
            <div className="header-levels">
              {LEVELS.map(l => (
                <button key={l} type="button" className={`level-btn ${level === l ? "active" : ""}`} onClick={() => setLevel(l)}>
                  {l}
                </button>
              ))}
            </div>
            <UsageCounter onUpgrade={() => {}} />
            <button type="submit" className="generate-btn" disabled={loading}>
              <Zap size={15} />{loading ? "Generating all modules..." : "Generate"}
            </button>
            {hasData && (
              <button type="button" className="regen-btn" onClick={onGenerate} disabled={loading} title="Regenerate">
                <RefreshCw size={14} />
              </button>
            )}
            <button type="button" className="regen-btn" onClick={testAPI} title="Test API connection" style={{ color: "#10b981" }}>
              <FlaskConical size={14} />
            </button>
          </div>
        </form>
        <ModeSelector mode={mode} setMode={setMode} disabled={loading} />
      </div>
    </header>
  );
}
