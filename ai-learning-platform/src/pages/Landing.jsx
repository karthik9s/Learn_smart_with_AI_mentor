import { Zap, BookOpen, Brain, Trophy, ArrowRight, CheckCircle,
  Dumbbell, Briefcase, Map, Star, Users, TrendingUp } from "lucide-react";

const FEATURES = [
  { icon: <Brain size={22} />,     color: "#A78BFA", bg: "rgba(167,139,250,0.12)",
    title: "AI-Powered Learning",   desc: "Deep, structured explanations adapted to your level — basic, intermediate, or advanced." },
  { icon: <BookOpen size={22} />,  color: "#22D3EE", bg: "rgba(34,211,238,0.10)",
    title: "Guided Course Flow",    desc: "Learn through Intuition → Concepts → Subtopics → Practice → Quiz in a structured path." },
  { icon: <Dumbbell size={22} />,  color: "#10B981", bg: "rgba(16,185,129,0.10)",
    title: "Hands-on Practice",     desc: "Solve real problems with AI feedback. Build skills that actually stick." },
  { icon: <Briefcase size={22} />, color: "#F59E0B", bg: "rgba(245,158,11,0.10)",
    title: "Interview Prep",        desc: "Practice Q&A, mock interviews with scoring, and cheat sheets for any role." },
  { icon: <Map size={22} />,       color: "#8B5CF6", bg: "rgba(139,92,246,0.12)",
    title: "30-Day Learning Plans", desc: "Get a personalized daily roadmap with tasks, goals, and progress tracking." },
  { icon: <Trophy size={22} />,    color: "#F97316", bg: "rgba(249,115,22,0.10)",
    title: "Gamification",          desc: "Earn XP, level up, maintain streaks, and unlock badges as you learn." },
];

const HOW_STEPS = [
  { n: "01", icon: "🔍", t: "Enter a topic",       d: "Type any subject — from recursion to machine learning" },
  { n: "02", icon: "⚡", t: "AI builds your module", d: "Get explanations, examples, practice tasks, and quizzes instantly" },
  { n: "03", icon: "📚", t: "Learn step by step",   d: "Follow the guided 5-step flow at your own pace" },
  { n: "04", icon: "🏆", t: "Track your progress",  d: "Earn XP, maintain streaks, and level up your skills" },
];

const STATS = [
  { value: "12,000+", label: "Active learners"  },
  { value: "50+",     label: "Topics covered"   },
  { value: "30-day",  label: "Learning plans"   },
  { value: "4.9 ★",   label: "Average rating"   },
];

const INSTITUTIONS = [
  { name: "IIT Delhi",      abbr: "IIT"  },
  { name: "NIT Trichy",     abbr: "NIT"  },
  { name: "BITS Pilani",    abbr: "BITS" },
  { name: "VIT University", abbr: "VIT"  },
  { name: "Manipal",        abbr: "MU"   },
  { name: "SRM University", abbr: "SRM"  },
];

const TESTIMONIALS = [
  { name: "Arjun S.",  role: "CS Student, IIT Delhi",        avatar: "A", stars: 5,
    text: "MentorAI explained recursion better than my professor did in 3 lectures. The step-by-step flow is genuinely impressive." },
  { name: "Priya M.",  role: "Data Analyst, Bangalore",      avatar: "P", stars: 5,
    text: "I used the 30-day ML plan and landed my first data role within 2 months. The daily tasks kept me consistent when nothing else did." },
  { name: "Rahul K.",  role: "Software Engineer, Hyderabad", avatar: "R", stars: 5,
    text: "The mock interview feature is a game changer. I scored 8/10 on my first attempt and got an offer from a product company." },
  { name: "Sneha T.",  role: "Final Year, NIT Trichy",       avatar: "S", stars: 5,
    text: "I was struggling with DSA for months. MentorAI's guided flow made everything click. Cleared campus placement in 6 weeks." },
  { name: "Vikram N.", role: "ML Engineer, Pune",            avatar: "V", stars: 5,
    text: "The XP and streak system sounds gimmicky but it genuinely kept me coming back every day. Finished the Deep Learning plan in 28 days." },
  { name: "Ananya R.", role: "Web Dev, Chennai",             avatar: "A", stars: 5,
    text: "Ask AI is like having a senior dev on call 24/7. I've stopped Googling basic questions — I just ask MentorAI and get a clear answer." },
];

export default function Landing({ onGetStarted }) {
  // Build signup URL with topic + level query params
  const handleStart = (topic, level = "beginner") => {
    const params = new URLSearchParams({ topic, level });
    // Update URL without reload so App.jsx can read params on next render
    window.history.pushState({}, "", `?${params.toString()}`);
    onGetStarted();
  };

  return (
    <div className="ln-page">

      {/* ── Nav ──────────────────────────────────────────── */}
      <nav className="ln-nav">
        <div className="ln-logo">
          <span className="ln-logo-icon">🎓</span>
          <span className="ln-logo-text">Mentor<span className="logo-ai">AI</span></span>
        </div>
        <div className="ln-nav-links">
          <a href="#features" className="ln-nav-link">Features</a>
          <a href="#how" className="ln-nav-link">How it works</a>
        </div>
        <button className="ln-signin-btn" onClick={onGetStarted}>Sign In</button>
      </nav>

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="ln-hero">
        <div className="ln-hero-badge">
          <Zap size={12} /> AI-Powered Learning Platform
        </div>
        <h1 className="ln-hero-title">
          Learn Anything with Your<br />
          <span className="ln-gradient">Personal AI Mentor</span>
        </h1>
        <p className="ln-hero-sub">
          Type any topic. Get a complete learning module — explanations, examples,
          practice tasks, and quizzes — all powered by AI. Free to start.
        </p>
        <div className="ln-hero-actions">
          <button className="ln-cta-btn" onClick={onGetStarted}>
            Start Learning Free <ArrowRight size={16} />
          </button>
          <button className="ln-ghost-btn" onClick={onGetStarted}>
            See how it works
          </button>
        </div>

        {/* Social proof */}
        <div className="ln-social-proof">
          <div className="ln-avatars">
            {["A","B","C","D"].map((l,i) => (
              <div key={i} className="ln-avatar" style={{ zIndex: 4-i }}>{l}</div>
            ))}
          </div>
          <span className="ln-social-text">Join learners already using MentorAI</span>
        </div>

        {/* Hero card preview */}
        <div className="ln-hero-card">
          <div className="ln-hero-card-header">
            <div className="ln-hero-card-dot" style={{ background: "#8B5CF6" }} />
            <span className="ln-hero-card-title">Start learning instantly →</span>
          </div>
          <div className="ln-hero-chips">
            {[
              { topic: "Recursion",        level: "beginner"     },
              { topic: "Neural Networks",  level: "intermediate" },
              { topic: "SQL Joins",        level: "beginner"     },
              { topic: "System Design",    level: "advanced"     },
              { topic: "React Hooks",      level: "intermediate" },
              { topic: "DBSCAN",           level: "advanced"     },
            ].map(({ topic, level }, i) => (
              <button
                key={i}
                className="ln-hero-chip"
                onClick={() => handleStart(topic, level)}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats bar ────────────────────────────────────── */}
      <section className="ln-stats-bar">
        {STATS.map((s, i) => (
          <div key={i} className="ln-stat">
            <div className="ln-stat-val">{s.value}</div>
            <div className="ln-stat-label">{s.label}</div>
          </div>
        ))}
      </section>

      {/* ── Trust bar — institutions ─────────────────────── */}
      <section className="ln-trust">
        <p className="ln-trust-label">Trusted by students from</p>
        <div className="ln-trust-logos">
          {INSTITUTIONS.map((inst, i) => (
            <div key={i} className="ln-trust-logo">
              <span className="ln-trust-abbr">{inst.abbr}</span>
              <span className="ln-trust-name">{inst.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────── */}
      <section className="ln-features" id="features">
        <div className="ln-section-badge">Features</div>
        <h2 className="ln-section-title">Everything you need to learn effectively</h2>
        <p className="ln-section-sub">One platform for learning, practice, interview prep, and progress tracking.</p>
        <div className="ln-features-grid">
          {FEATURES.map((f, i) => (
            <div key={i} className="ln-feature-card">
              <div className="ln-feature-icon" style={{ background: f.bg, color: f.color }}>{f.icon}</div>
              <h3 className="ln-feature-title">{f.title}</h3>
              <p className="ln-feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────── */}
      <section className="ln-how" id="how">
        <div className="ln-section-badge">How it works</div>
        <h2 className="ln-section-title">From zero to confident in 4 steps</h2>
        <div className="ln-how-grid">
          {HOW_STEPS.map((s, i) => (
            <div key={i} className="ln-how-card">
              <div className="ln-how-num">{s.n}</div>
              <div className="ln-how-icon">{s.icon}</div>
              <h4 className="ln-how-title">{s.t}</h4>
              <p className="ln-how-desc">{s.d}</p>
              {i < HOW_STEPS.length - 1 && <div className="ln-how-arrow">→</div>}
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────── */}
      <section className="ln-testimonials">
        <div className="ln-section-badge">Testimonials</div>
        <h2 className="ln-section-title">Loved by learners</h2>
        <div className="ln-testimonials-grid">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="ln-testimonial-card">
              <div className="ln-testimonial-stars">{"★".repeat(t.stars)}</div>
              <p className="ln-testimonial-text">"{t.text}"</p>
              <div className="ln-testimonial-author">
                <div className="ln-testimonial-avatar">{t.avatar}</div>
                <div>
                  <div className="ln-testimonial-name">{t.name}</div>
                  <div className="ln-testimonial-role">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA section ──────────────────────────────────── */}
      <section className="ln-cta-section">
        <div className="ln-cta-card">
          <div className="ln-cta-glow" />
          <h2 className="ln-cta-title">Ready to start learning?</h2>
          <p className="ln-cta-sub">Join thousands of learners using AI to master new skills. Free to start, no credit card required.</p>
          <div className="ln-cta-checks">
            {["Free to start", "No credit card", "AI-powered", "30-day plans"].map((c, i) => (
              <span key={i} className="ln-cta-check"><CheckCircle size={14} /> {c}</span>
            ))}
          </div>

          {/* Popular topic quick-start buttons */}
          <div className="ln-cta-topics">
            <p className="ln-cta-topics-label">Pick a topic to start right now:</p>
            <div className="ln-cta-topic-btns">
              {[
                { topic: "Python",         level: "beginner"     },
                { topic: "React",          level: "intermediate" },
                { topic: "Machine Learning", level: "beginner"   },
                { topic: "System Design",  level: "advanced"     },
                { topic: "SQL",            level: "beginner"     },
                { topic: "Data Structures", level: "intermediate"},
              ].map(({ topic, level }, i) => (
                <button
                  key={i}
                  className="ln-cta-topic-btn"
                  onClick={() => handleStart(topic, level)}
                >
                  Start Learning {topic} →
                </button>
              ))}
            </div>
          </div>

          <button className="ln-cta-btn ln-cta-btn-large" onClick={onGetStarted}>
            <Zap size={18} /> Get Started Free
          </button>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="ln-footer">
        <div className="ln-footer-logo">🎓 Mentor<span className="logo-ai">AI</span></div>
        <p className="ln-footer-sub">Your Personal AI Learning Mentor</p>
        <p className="ln-footer-copy">© 2026 MentorAI. All rights reserved.</p>
      </footer>
    </div>
  );
}
