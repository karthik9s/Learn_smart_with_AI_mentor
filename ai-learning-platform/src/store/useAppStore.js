import { useState, useCallback, useEffect, useRef } from "react";

/* ── XP values ─────────────────────────────────────────── */
export const XP = {
  GENERATE:    50,
  QUIZ_Q:      20,
  PRACTICE:    30,
  SELFCHECK:   15,
  STREAK:      25,
  DAILY_LOGIN: 10,
};

/* ── Level thresholds ──────────────────────────────────── */
const LEVEL_XP    = [0, 200, 500, 1000, 2000, 4000, 7000, 10000];
const LEVEL_NAMES = ["", "Beginner", "Explorer", "Learner", "Scholar", "Expert", "Master", "Legend"];

/* ── Achievements ──────────────────────────────────────── */
export const ACHIEVEMENTS = [
  { id: "first_topic",    label: "First Step",       icon: "🎯", desc: "Learned your first topic",         check: s => s.recentTopics.length >= 1 },
  { id: "five_topics",    label: "Explorer",          icon: "🗺️", desc: "Learned 5 topics",                check: s => s.recentTopics.length >= 5 },
  { id: "ten_topics",     label: "Knowledge Seeker",  icon: "📖", desc: "Learned 10 topics",               check: s => s.recentTopics.length >= 10 },
  { id: "streak_3",       label: "On a Roll",         icon: "🔥", desc: "3-day learning streak",            check: s => s.streak >= 3 },
  { id: "streak_7",       label: "Week Warrior",      icon: "⚡", desc: "7-day learning streak",            check: s => s.streak >= 7 },
  { id: "streak_30",      label: "Unstoppable",       icon: "🌟", desc: "30-day learning streak",           check: s => s.streak >= 30 },
  { id: "practice_5",     label: "Practitioner",      icon: "💪", desc: "Completed 5 practice tasks",      check: s => s.practiceCount >= 5 },
  { id: "practice_20",    label: "Grinder",           icon: "⚙️", desc: "Completed 20 practice tasks",     check: s => s.practiceCount >= 20 },
  { id: "quiz_perfect",   label: "Perfect Score",     icon: "🏆", desc: "Got 100% on a quiz",              check: s => s.quizHistory.some(q => q.pct === 100) },
  { id: "quiz_10",        label: "Quiz Master",       icon: "🧠", desc: "Completed 10 quizzes",            check: s => s.quizHistory.length >= 10 },
  { id: "level_3",        label: "Rising Scholar",    icon: "📚", desc: "Reached Level 3",                 check: s => s.userLevel >= 3 },
  { id: "level_5",        label: "Expert Learner",    icon: "🎓", desc: "Reached Level 5",                 check: s => s.userLevel >= 5 },
  { id: "xp_500",         label: "XP Hunter",         icon: "✨", desc: "Earned 500 XP",                   check: s => s.xp >= 500 },
  { id: "xp_2000",        label: "XP Legend",         icon: "💎", desc: "Earned 2000 XP",                  check: s => s.xp >= 2000 },
];

/* ── Persistence helpers ───────────────────────────────── */
const STORE_KEY = "mentorai_gamification";

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    // Guard against corrupted values: must be a plain object, not an array or primitive
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed;
    }
    return null;
  } catch { return null; }
}

function saveState(state) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch {}
}

const TODAY = () => new Date().toDateString();

/* ══════════════════════════════════════════════════════════
   Store
   ══════════════════════════════════════════════════════════ */
export function useAppStore() {
  const saved = loadState();

  /* ── Persisted state ─────────────────────────────────── */
  const [xp, setXp]                   = useState(saved?.xp ?? 0);
  const [streak, setStreak]           = useState(saved?.streak ?? 1);
  const [lastActiveDate, setLastActiveDate] = useState(saved?.lastActiveDate ?? TODAY());
  const [recentTopics, setRecentTopics]     = useState(saved?.recentTopics ?? []);
  const [quizHistory, setQuizHistory]       = useState(saved?.quizHistory ?? []);
  const [weakAreas, setWeakAreas]           = useState(saved?.weakAreas ?? []);
  const [practiceCount, setPracticeCount]   = useState(saved?.practiceCount ?? 0);
  const [unlockedAchievements, setUnlockedAchievements] = useState(saved?.unlockedAchievements ?? []);
  const [dailyGoals, setDailyGoals] = useState(
    saved?.dailyGoals?.date === TODAY()
      ? saved.dailyGoals
      : { date: TODAY(), learnTopic: false, completePractice: false, takeQuiz: false }
  );

  /* ── Session-only state ──────────────────────────────── */
  const [topic, setTopic]             = useState("");
  const [level, setLevel]             = useState("basic");
  const [activeTopic, setActiveTopic] = useState("");
  const [activeSection, setActiveSection] = useState("Intuition");
  const [learnData, setLearnData]     = useState(null);
  const [quizData, setQuizData]       = useState(null);
  const [pgData, setPgData]           = useState(null);
  const [newAchievement, setNewAchievement] = useState(null);
  const [xpGain, setXpGain]           = useState(null); // { amount, label }
  const [levelUp, setLevelUp]         = useState(null); // { level, name }

  /* ── Derived ─────────────────────────────────────────── */
  const userLevel = LEVEL_XP.findIndex((threshold, i) =>
    xp < (LEVEL_XP[i + 1] ?? Infinity)
  );
  const safeLevel  = Math.max(1, Math.min(userLevel, LEVEL_NAMES.length - 1));
  const nextXP     = LEVEL_XP[safeLevel] ?? LEVEL_XP[LEVEL_XP.length - 1];
  const prevXP     = LEVEL_XP[safeLevel - 1] ?? 0;
  const xpProgress = safeLevel >= LEVEL_NAMES.length - 1
    ? 100
    : Math.min(100, Math.round(((xp - prevXP) / (nextXP - prevXP)) * 100));

  const dailyGoalCount = Object.values(dailyGoals).filter(v => v === true).length;
  const avgQuizScore   = quizHistory.length
    ? Math.round(quizHistory.reduce((s, q) => s + q.pct, 0) / quizHistory.length)
    : 0;

  /* ── Persist on every relevant change ───────────────── */
  const persistRef = useRef(false);
  useEffect(() => {
    if (!persistRef.current) { persistRef.current = true; return; } // skip first mount
    saveState({ xp, streak, lastActiveDate, recentTopics, quizHistory, weakAreas, practiceCount, unlockedAchievements, dailyGoals });
  }, [xp, streak, lastActiveDate, recentTopics, quizHistory, weakAreas, practiceCount, unlockedAchievements, dailyGoals]);

  /* ── Daily login XP + streak check on mount ─────────── */
  useEffect(() => {
    const today = TODAY();
    if (lastActiveDate === today) return; // already logged in today

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const wasYesterday = lastActiveDate === yesterday.toDateString();

    setStreak(s => wasYesterday ? s + 1 : 1);
    setLastActiveDate(today);
    setXp(prev => prev + XP.DAILY_LOGIN);
    showXpGain(XP.DAILY_LOGIN, "Daily Login");
    // Reset daily goals for new day
    setDailyGoals({ date: today, learnTopic: false, completePractice: false, takeQuiz: false });
  }, []); // eslint-disable-line

  /* ── Helpers ─────────────────────────────────────────── */
  const showXpGain = useCallback((amount, label) => {
    setXpGain({ amount, label });
    setTimeout(() => setXpGain(null), 2500);
  }, []);

  const checkAchievements = useCallback((state) => {
    ACHIEVEMENTS.forEach(a => {
      if (!state.unlockedAchievements.includes(a.id) && a.check(state)) {
        setUnlockedAchievements(prev => {
          const updated = [...prev, a.id];
          return updated;
        });
        setNewAchievement(a);
        setTimeout(() => setNewAchievement(null), 4500);
      }
    });
  }, []);

  const addXP = useCallback((amount, label = "") => {
    setXp(prev => {
      const next = prev + amount;
      // Check for level up
      const prevLevel = LEVEL_XP.findIndex((t, i) => prev < (LEVEL_XP[i + 1] ?? Infinity));
      const nextLevel = LEVEL_XP.findIndex((t, i) => next < (LEVEL_XP[i + 1] ?? Infinity));
      if (nextLevel > prevLevel && nextLevel < LEVEL_NAMES.length) {
        setTimeout(() => {
          setLevelUp({ level: nextLevel, name: LEVEL_NAMES[nextLevel] });
          setTimeout(() => setLevelUp(null), 4500);
        }, 400);
      }
      return next;
    });
    if (label) showXpGain(amount, label);
  }, [showXpGain]);

  const updateStreak = useCallback(() => {
    const today = TODAY();
    setLastActiveDate(prev => {
      if (prev === today) return prev;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const wasYesterday = prev === yesterday.toDateString();
      setStreak(s => wasYesterday ? s + 1 : 1);
      return today;
    });
  }, []);

  const recordTopic = useCallback((t) => {
    setRecentTopics(prev => [t, ...prev.filter(x => x !== t)].slice(0, 20));
    addXP(XP.GENERATE, "Topic Learned");
    updateStreak();
    setDailyGoals(g => ({ ...g, learnTopic: true }));
    // Check achievements after state update
    setTimeout(() => {
      setRecentTopics(prev => {
        checkAchievements({ recentTopics: prev, streak, practiceCount, quizHistory, xp: xp + XP.GENERATE, userLevel: safeLevel, unlockedAchievements });
        return prev;
      });
    }, 100);
  }, [addXP, updateStreak, checkAchievements, streak, practiceCount, quizHistory, xp, safeLevel, unlockedAchievements]);

  const recordQuiz = useCallback((topic, score, total, feedbackWeakAreas) => {
    const entry = { topic, score, total, date: new Date().toLocaleDateString(), pct: Math.round(score / total * 100) };
    const earned = score * XP.QUIZ_Q;
    setQuizHistory(prev => {
      const updated = [entry, ...prev].slice(0, 30);
      checkAchievements({ recentTopics, streak, practiceCount, quizHistory: updated, xp: xp + earned, userLevel: safeLevel, unlockedAchievements });
      return updated;
    });
    if (feedbackWeakAreas?.length) setWeakAreas(prev => [...new Set([...prev, ...feedbackWeakAreas])].slice(0, 15));
    addXP(earned, `Quiz +${score}/${total}`);
    setDailyGoals(g => ({ ...g, takeQuiz: true }));
  }, [addXP, checkAchievements, recentTopics, streak, practiceCount, quizHistory, xp, safeLevel, unlockedAchievements]);

  const recordPractice = useCallback(() => {
    setPracticeCount(p => {
      const next = p + 1;
      checkAchievements({ recentTopics, streak, practiceCount: next, quizHistory, xp: xp + XP.PRACTICE, userLevel: safeLevel, unlockedAchievements });
      return next;
    });
    addXP(XP.PRACTICE, "Practice Task");
    setDailyGoals(g => ({ ...g, completePractice: true }));
  }, [addXP, checkAchievements, recentTopics, streak, quizHistory, xp, safeLevel, unlockedAchievements]);

  return {
    /* topic/content */
    topic, setTopic, level, setLevel,
    activeTopic, setActiveTopic,
    activeSection, setActiveSection,
    recentTopics, recordTopic,
    learnData, setLearnData,
    quizData, setQuizData,
    pgData, setPgData,
    /* gamification */
    xp, addXP, streak,
    userLevel: safeLevel,
    levelNames: LEVEL_NAMES,
    xpProgress,
    nextLevelXP: LEVEL_XP,
    quizHistory, recordQuiz, avgQuizScore,
    weakAreas,
    practiceCount, recordPractice,
    dailyGoals, dailyGoalCount,
    unlockedAchievements, newAchievement,
    xpGain,
    levelUp,
  };
}
