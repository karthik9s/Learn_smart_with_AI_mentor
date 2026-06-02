import { useState } from "react";
import { Lightbulb, ZoomIn, RefreshCw, HelpCircle, AlertTriangle, X } from "lucide-react";
import { fetchTutorAction } from "../api";

const ACTIONS = [
  { key: "simpler",    label: "Explain Simpler", icon: <Lightbulb size={13} />,   color: "#f59e0b" },
  { key: "deeper",     label: "Explain Deeper",  icon: <ZoomIn size={13} />,       color: "#38bdf8" },
  { key: "example",    label: "Another Example", icon: <RefreshCw size={13} />,    color: "#10b981" },
  { key: "testme",     label: "Test Me",         icon: <HelpCircle size={13} />,   color: "#a78bfa" },
  { key: "struggling", label: "I'm Struggling",  icon: <AlertTriangle size={13} />,color: "#ef4444" },
];

export default function TutorActions({ topic, concept, wrongCount = 0 }) {
  const [loading, setLoading]       = useState(null);
  const [result, setResult]         = useState(null);
  const [activeAction, setActiveAction] = useState(null);

  // Auto-suggest struggling if wrong answers detected
  const showStruggleHint = wrongCount >= 2 && !result;

  const trigger = async (action) => {
    if (loading) return;
    setLoading(action);
    setResult(null);
    setActiveAction(action);
    try {
      const r = await fetchTutorAction(topic, concept, action);
      setResult({ action, data: r.data });
    } catch {
      setResult({ action, data: { response: "Something went wrong. Try again." } });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="tutor-actions">
      {showStruggleHint && (
        <div className="struggle-hint">
          <AlertTriangle size={13} /> Looks like you're finding this tricky — try "I'm Struggling" for a fresh explanation
        </div>
      )}

      <div className="tutor-btns">
        {ACTIONS.map(({ key, label, icon, color }) => (
          <button
            key={key}
            className={`tutor-btn ${activeAction === key && result ? "active" : ""}`}
            onClick={() => trigger(key)}
            disabled={!!loading}
            style={activeAction === key && result ? { borderColor: color, color } : {}}
          >
            {loading === key ? <span className="tutor-spinner" /> : icon}
            {label}
          </button>
        ))}
      </div>

      {result && (
        <div className={`tutor-result ${result.action}`}>
          <button className="tutor-result-close" onClick={() => { setResult(null); setActiveAction(null); }}>
            <X size={13} />
          </button>

          {(result.action === "simpler" || result.action === "example") && (
            <p>
              <span className="tutor-tag">
                {result.action === "simpler" && "💡 Simpler"}
                {result.action === "example" && "🌍 Example"}
              </span>
              {result.data.response}
            </p>
          )}

          {result.action === "struggling" && (
            <div>
              <p><span className="tutor-tag">🆘 Fresh Start</span></p>
              <p style={{ color: "#a78bfa", marginBottom: "0.5rem" }}>
                <strong>💪 </strong>{result.data.motivation}
              </p>
              <p style={{ marginBottom: "0.5rem" }}>{result.data.simplifiedExplanation}</p>
              {result.data.actionableSteps?.length > 0 && (
                <ol style={{ paddingLeft: "1.2rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  {result.data.actionableSteps.map((step, i) => (
                    <li key={i} style={{ color: "#94A3B8", fontSize: "0.85rem" }}>{step}</li>
                  ))}
                </ol>
              )}
            </div>
          )}

          {result.action === "deeper" && (
            <div>
              <p><span className="tutor-tag">🔬 Deeper</span></p>
              <p style={{ marginBottom: "0.5rem" }}>{result.data.deepDive}</p>
              {result.data.examples?.length > 0 && (
                <ul style={{ paddingLeft: "1.2rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  {result.data.examples.map((ex, i) => (
                    <li key={i} style={{ color: "#38bdf8", fontSize: "0.85rem" }}>{ex}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {result.action === "testme" && <TestMeResult data={result.data} />}
        </div>
      )}
    </div>
  );
}

function TestMeResult({ data }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div>
      <p><span className="tutor-tag">🧪 Test</span> {data.question}</p>
      {!revealed
        ? <button className="reveal-btn" style={{ marginTop: "0.6rem" }} onClick={() => setRevealed(true)}>Show Answer</button>
        : <div style={{ marginTop: "0.6rem" }}>
            <p className="example-text">✅ <strong>Answer:</strong> {data.answer}</p>
            {data.explanation && <p className="why" style={{ marginTop: "0.3rem" }}>📝 {data.explanation}</p>}
          </div>
      }
    </div>
  );
}
