import { useState, Suspense, lazy } from "react";
import { Toaster, toast } from "react-hot-toast";
import { fetchGenerateAll } from "./api";
import { useAppStore } from "./store/useAppStore";
import { useAuth } from "./context/AuthContext";
import { saveTopic, saveQuizResult, recordPractice as dbRecordPractice } from "./lib/db";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import FloatingChat from "./components/FloatingChat";
import XPToast from "./components/XPToast";
import LevelUpToast from "./components/LevelUpToast";
import LimitReachedModal from "./components/LimitReachedModal";
import AchievementToast from "./components/AchievementToast";
import Onboarding, { hasOnboarded } from "./components/Onboarding";

// Lazy-load all pages — each becomes its own JS chunk downloaded only when visited
const Landing          = lazy(() => import("./pages/Landing"));
const AuthPage         = lazy(() => import("./pages/AuthPage"));
const Home             = lazy(() => import("./pages/Home"));
const LearnPage        = lazy(() => import("./pages/LearnPage"));
const PlaygroundPage   = lazy(() => import("./pages/PlaygroundPage"));
const QuizPage         = lazy(() => import("./pages/QuizPage"));
const ProgressPage     = lazy(() => import("./pages/ProgressPage"));
const AskAIPage        = lazy(() => import("./pages/AskAIPage"));
const SmartStudyPage   = lazy(() => import("./pages/SmartStudyPage"));
const InterviewPrepPage = lazy(() => import("./pages/InterviewPrepPage"));
const DailyPlanPage    = lazy(() => import("./pages/DailyPlanPage"));
const HistoryPage      = lazy(() => import("./pages/HistoryPage"));
const PricingPage      = lazy(() => import("./pages/PricingPage"));
const PricingFeaturePage = lazy(() => import("./pages/PricingFeaturePage"));
const SystemStatsPage  = lazy(() => import("./pages/SystemStatsPage"));
const GoalRoadmapPage  = lazy(() => import("./pages/GoalRoadmapPage"));
const MockInterviewPage = lazy(() => import("./pages/MockInterviewPage"));
const SubscriptionPage = lazy(() => import("./pages/SubscriptionPage"));
import { saveToHistory } from "./lib/storage";
import { addTopicToMemory, addQuizResult as addQuizToMemory, addWeakArea } from "./lib/memory";
import { canUse, incrementUsage } from "./lib/subscription";
import { saveSession } from "./lib/session";
import "./App.css";

// Spinner shown while a lazy page chunk is loading
function PageLoader() {
  return <div className="loader-wrap"><div className="spinner" /></div>;
}

export default function App() {
  const { user, loading: authLoading, logout } = useAuth();
  const [authMode, setAuthMode] = useState(null); // null | "auth"
  const [page, setPage] = useState("home");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("learn");
  const [allModules, setAllModules] = useState(null);
  const [limitInfo, setLimitInfo] = useState(null); // for 403 modal
  const store = useAppStore();

  // ── Read topic/level from URL query params ──────────────
  const [prefillTopic] = useState(() => {
    const p = new URLSearchParams(window.location.search);
    return p.get("topic") || "";
  });
  const [prefillLevel] = useState(() => {
    const p = new URLSearchParams(window.location.search);
    const l = p.get("level") || "";
    return ["basic", "intermediate", "advanced", "beginner"].includes(l) ? l : "";
  });

  // Show landing if not logged in and not in guest mode
  const [guestMode, setGuestMode] = useState(false);
  const isAuthenticated = !!user || guestMode;
  const [showOnboarding, setShowOnboarding] = useState(false);

  if (authLoading) return <div className="loader-wrap"><div className="spinner" /></div>;

  if (!isAuthenticated && authMode !== "auth") {
    return (
      <Suspense fallback={<PageLoader />}>
        <Landing onGetStarted={() => setAuthMode("auth")} />
      </Suspense>
    );
  }

  if (authMode === "auth" && !isAuthenticated) {
    return (
      <Suspense fallback={<PageLoader />}>
        <AuthPage
          prefillTopic={prefillTopic}
          prefillLevel={prefillLevel}
          onSuccess={() => {
            setAuthMode(null);
            setGuestMode(!user);
            // Apply prefill topic/level from URL params
            if (prefillTopic) {
              store.setTopic(prefillTopic);
              const normalizedLevel = prefillLevel === "beginner" ? "basic" : prefillLevel || "basic";
              store.setLevel(normalizedLevel);
            }
            // Clean params from URL without reload
            window.history.replaceState({}, "", window.location.pathname);
            if (!hasOnboarded()) setShowOnboarding(true);
          }}
        />
      </Suspense>
    );
  }

  if (showOnboarding) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Onboarding
          userName={user?.user_metadata?.name?.split(" ")[0] || ""}
          onComplete={({ level }) => {
            if (level) store.setLevel(level === "beginner" ? "basic" : level === "advanced" ? "advanced" : "intermediate");
            setShowOnboarding(false);
          }}
        />
      </Suspense>
    );
  }

  const persistTopic = async (t, lvl) => {
    if (user) {
      try { await saveTopic(user.id, t, lvl); } catch {}
    }
  };

  const persistQuiz = async (topic, score, total, weakAreas) => {
    if (user) {
      try { await saveQuizResult(user.id, topic, score, total, weakAreas); } catch {}
    }
  };

  const persistPractice = async () => {
    if (user) {
      try { await dbRecordPractice(user.id); } catch {}
    }
  };

  const generate = async (overrideTopic) => {
    if (loading) return; // prevent duplicate calls
    const t = (overrideTopic || store.topic).trim();
    console.log("Generate clicked:", t);
    if (!t) { toast.error("Please enter a topic"); return; }

    // Usage gate
    if (!canUse("generates")) {
      toast.error("Daily limit reached. Upgrade to Pro for unlimited access!");
      setPage("pricing");
      return;
    }

    if (overrideTopic) store.setTopic(overrideTopic);
    setLoading(true);
    store.setLearnData(null); store.setQuizData(null); store.setPgData(null);
    setAllModules(null);
    try {
      const r = await fetchGenerateAll(t, store.level);
      const modules = r.data;
      setAllModules(modules);
      store.setLearnData(modules.learn);
      store.setPgData(modules.practice);
      store.setActiveTopic(t);
      store.recordTopic(t);
      store.setActiveSection("Intuition");
      setPage("learn");
      persistTopic(t, store.level);
      addTopicToMemory(t, store.level, mode); // persist to memory
      incrementUsage("generates"); // track usage
      saveToHistory({ topic: t, mode, level: store.level, modules, timestamp: Date.now() });
      saveSession({ topic: t, mode, step: "Intuition", page: "learn", level: store.level });
      toast.success(`✅ "${t}" ready!`, { duration: 2000 });
    } catch (err) {
      console.error("Generate error:", err.message);
      if (err.response?.status === 403 && err.response?.data?.error === "daily_limit_reached") {
        setLimitInfo({
          used:  err.response.data.used,
          limit: err.response.data.limit,
          plan:  err.response.data.plan,
        });
      } else {
        toast.error("Something went wrong. Check your API key.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuizComplete = (topic, score, total, weakAreas) => {
    store.recordQuiz(topic, score, total, weakAreas);
    persistQuiz(topic, score, total, weakAreas);
    addQuizToMemory(topic, score, total); // persist to memory
    weakAreas?.forEach(w => addWeakArea(w));
  };

  const handlePractice = () => {
    store.recordPractice();
    persistPractice();
  };

  const renderPage = () => {
    switch (page) {
      case "home":
        return <Home
          topic={store.topic}
          setTopic={store.setTopic}
          recentTopics={store.recentTopics}
          mode={mode}
          setMode={setMode}
          onGenerate={(t) => {
            if (t) store.setTopic(t);
            generate(t || store.topic);
          }}
          setPage={setPage}
          xp={store.xp}
          userLevel={store.userLevel}
          levelName={store.levelNames[store.userLevel]}
          xpProgress={store.xpProgress}
          streak={store.streak}
          dailyGoals={store.dailyGoals}
          dailyGoalCount={store.dailyGoalCount}
          unlockedAchievements={store.unlockedAchievements}
          completedCount={Object.values(store.quizHistory || []).length}
          weakAreas={store.weakAreas}
          quizHistory={store.quizHistory}
          nextLevelXP={store.nextLevelXP}
          levelNames={store.levelNames}
          onResume={(session) => {
            if (session?.topic) store.setTopic(session.topic);
            if (session?.mode)  setMode(session.mode);
            generate(session?.topic || store.topic);
          }}
        />;
      case "learn":
        return <LearnPage
          learnData={store.learnData} quizData={store.quizData} pgData={store.pgData}
          loading={loading} topic={store.activeTopic}
          onTopicSelect={t => generate(t)}
          onSectionChange={store.setActiveSection}
          onPractice={handlePractice}
          weakAreas={store.weakAreas}
          allModules={allModules} mode={mode} level={store.level}
        />;
      case "playground":
        return <PlaygroundPage pgData={store.pgData} loading={loading} onPractice={handlePractice} topic={store.activeTopic} />;
      case "quiz":
        return <QuizPage quizData={store.quizData} loading={loading} onQuizComplete={handleQuizComplete} topic={store.activeTopic} />;
      case "ask":           return <AskAIPage />;
      case "study":         return <SmartStudyPage />;
      case "interviewprep": return <InterviewPrepPage />;
      case "learningplan":  return <DailyPlanPage />;
      case "goalroadmap":   return <GoalRoadmapPage />;
      case "mockinterview": return <MockInterviewPage />;
      case "pricing":       return <PricingFeaturePage />;
      case "subscription":  return <SubscriptionPage />;
      case "stats":         return <SystemStatsPage />;
      case "history":
        return <HistoryPage onReopen={(entry) => {
          store.setTopic(entry.topic);
          store.setActiveTopic(entry.topic);
          store.setLearnData(entry.modules?.learn || null);
          store.setPgData(entry.modules?.practice || null);
          setAllModules(entry.modules);
          setMode(entry.mode || "learn");
          setPage("learn");
        }} />;
      case "progress":
        return <ProgressPage
          recentTopics={store.recentTopics}
          xp={store.xp} userLevel={store.userLevel}
          levelName={store.levelNames[store.userLevel]}
          xpProgress={store.xpProgress}
          nextLevelXP={store.nextLevelXP}
          quizHistory={store.quizHistory}
          weakAreas={store.weakAreas}
          practiceCount={store.practiceCount}
          streak={store.streak}
          onTopicSelect={t => generate(t)}
          dailyGoals={store.dailyGoals}
          dailyGoalCount={store.dailyGoalCount}
          unlockedAchievements={store.unlockedAchievements}
          avgQuizScore={store.avgQuizScore}
        />;
      default: return null;
    }
  };

  return (
    <div className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <Toaster position="top-right" />
      <Sidebar
        page={page} setPage={setPage}
        mode={mode} setMode={setMode}
        collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed}
        xp={store.xp} userLevel={store.userLevel}
        levelName={store.levelNames[store.userLevel]} xpProgress={store.xpProgress}
        user={user} onLogout={() => { logout(); setGuestMode(false); setAuthMode(null); }}
      />
      <div className="app-main">
        <Header
          topic={store.topic} setTopic={store.setTopic}
          level={store.level} setLevel={store.setLevel}
          onGenerate={() => generate()} loading={loading}
          hasData={!!store.learnData} currentPage={page}
          xp={store.xp} userLevel={store.userLevel}
          user={user}
          mode={mode} setMode={setMode}
        />
        <main className="app-content">
          <Suspense fallback={<PageLoader />}>
            {renderPage()}
          </Suspense>
        </main>
      </div>
      <FloatingChat topic={store.activeTopic} section={store.activeSection} />
      <XPToast xpGain={store.xpGain} />
      <LevelUpToast levelUp={store.levelUp} />
      <AchievementToast achievement={store.newAchievement} />
      <LimitReachedModal
        info={limitInfo}
        onClose={() => setLimitInfo(null)}
        onUpgraded={() => setLimitInfo(null)}
      />
    </div>
  );
}
