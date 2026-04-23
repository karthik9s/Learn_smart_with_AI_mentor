import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Zap } from "lucide-react";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 21 21">
      <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
      <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
    </svg>
  );
}

export default function AuthPage({ onSuccess, prefillTopic = "", prefillLevel = "" }) {
  const [mode, setMode]   = useState("login");
  const [form, setForm]   = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading]       = useState(false);
  const [socialLoading, setSocialLoading] = useState(null);
  const { signup, login, loginWithGoogle, loginWithMicrosoft } = useAuth();

  const handleSocial = async (provider) => {
    setError("");
    setSocialLoading(provider);
    try {
      if (provider === "google")    await loginWithGoogle();
      if (provider === "microsoft") await loginWithMicrosoft();
      // OAuth redirects — onSuccess called after redirect back
    } catch (err) {
      setError(err.message || "Social login failed");
      setSocialLoading(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "signup") await signup(form.name, form.email, form.password);
      else await login(form.email, form.password);
      onSuccess?.();
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">🎓 Mentor<span className="logo-ai">AI</span></div>
        <h2>{mode === "login" ? "Welcome back" : "Create your account"}</h2>
        <p className="auth-sub">{mode === "login" ? "Sign in to continue learning" : "Start your AI learning journey"}</p>

        {/* Prefill topic banner */}
        {prefillTopic && (
          <div className="auth-prefill-banner">
            <span className="auth-prefill-icon">📘</span>
            <span>
              You'll start learning <strong>{prefillTopic}</strong>
              {prefillLevel && <> at <strong>{prefillLevel}</strong> level</>}
            </span>
          </div>
        )}

        {/* Social Buttons */}
        <div className="auth-social">
          <button
            className="social-btn"
            onClick={() => handleSocial("google")}
            disabled={!!socialLoading || loading}
            type="button"
          >
            {socialLoading === "google"
              ? <span className="tutor-spinner" />
              : <GoogleIcon />
            }
            Continue with Google
          </button>
          <button
            className="social-btn"
            onClick={() => handleSocial("microsoft")}
            disabled={!!socialLoading || loading}
            type="button"
          >
            {socialLoading === "microsoft"
              ? <span className="tutor-spinner" />
              : <MicrosoftIcon />
            }
            Continue with Microsoft
          </button>
        </div>

        {/* Divider */}
        <div className="auth-divider">
          <span />
          <p>or</p>
          <span />
        </div>

        {/* Manual Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          {mode === "signup" && (
            <input className="auth-input" placeholder="Your name"
              value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
          )}
          <input className="auth-input" type="email" placeholder="Email address"
            value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
          <input className="auth-input" type="password" placeholder="Password"
            value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />

          {error && <div className="auth-error">{error}</div>}

          <button className="generate-btn auth-submit" type="submit" disabled={loading || !!socialLoading}>
            <Zap size={15} />
            {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <p className="auth-switch">
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <button type="button" onClick={() => { setMode(m => m === "login" ? "signup" : "login"); setError(""); }}>
            {mode === "login" ? "Sign up" : "Sign in"}
          </button>
        </p>

        <button className="auth-guest" type="button" onClick={onSuccess}>
          Continue as guest →
        </button>
      </div>
    </div>
  );
}
