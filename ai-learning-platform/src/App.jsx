import { useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import { fetchGenerateAll } from "./api";
import { useAppStore, XP } from "./store/useAppStore";
import { useAuth } from "./context/AuthContext";
import { saveTopic, saveQuizResult, recordPractice as dbRecordPractice } from "./lib/db";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import FloatingChat from "./components/FloatingChat";
import XPToast from "./components/XPToast";
import LevelUpToast from "./components/LevelUpToast";
import LimitReachedModal from "./components/LimitReachedModal";
import Landing from "./pages/Landing";
import AuthPage from "./pages/AuthPage";
import Home from "./pages/Home";
import LearnPage from "./pages/LearnPage";
import PlaygroundPage from "./pages/PlaygroundPage";
import QuizPage from "./pages/QuizPage";
import ProgressPage from "./pages/ProgressPage";
import AskAIPage from "./pages/AskAIPage";
import SmartStudyPage from "./pages/SmartStudyPage";
import InterviewPrepPage from "./pages/InterviewPrepPage";
import DailyPlanPage from "./pages/DailyPlanPage";
import HistoryPage from "./pages/HistoryPage";
import AchievementToast from "./components/AchievementToast";
import { saveToHistory } from "./lib/storage";
import { addTopicToMemory, addQuizResult as addQuizToMemory, addWeakArea } from "./lib/memory";
import { canUse, incrementUsage } from "./lib/subscription";
import { saveSession } from "./lib/session";
import PricingPage from "./pages/PricingPage";
import Onboarding, { hasOnboarded } from "./components/Onboarding";
import "./App.css";

export default function App() {
  const { user, loading: authLoading, logout } = useAuth();
  const [authMode, setAuthMode] = useState(null); // null | "auth"
  const [page, setPage] = useState("home");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("learn");
  const [allModules, setAllModules] = useState(null);
  const [interviewData, setInterviewData] = useState(null);
  const [limitInfo, setLimitInfo] = useState(null); // for 403 modal
  const store = useAppStore();

  // Show landing if not logged in and not in guest mode
  const [guestMode, setGuestMode] = useState(false);
  const isAuthenticated = !!user || guestMode;
  const [showOnboarding, setShowOnboarding] = useState(false);

  if (authLoading) return <div className="loader-wrap"><div className="spinner" /></div>;

  if (!isAuthenticated && authMode !== "auth") {
    return <Landing onGetStarted={() => setAuthMode("auth")} />;
  }

  if (authMode === "auth" && !isAuthenticated) {
    return <AuthPage onSuccess={() => {
      setAuthMode(null);
      setGuestMode(!user);
      if (!hasOnboarded()) setShowOnboarding(true);
    }} />;
  }

  if (showOnboarding) {
    return <Onboarding
      userName={user?.user_metadata?.name?.split(" ")[0] || ""}
      onComplete={({ goal, level }) => {
        if (level) store.setLevel(level === "beginner" ? "basic" : level === "advanced" ? "advanced" : "intermediate");
        setShowOnboarding(false);
      }}
    />;
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
    setAllModules(null); setInterviewData(null);
    try {
      const r = await fetchGenerateAll(t, store.level);
      const modules = r.data;
      setAllModules(modules);
      store.setLearnData(modules.learn);
      store.setPgData(modules.practice);
      
      setInterviewData(modules.interview);
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
      case "pricing":       return <PricingPage onUpgrade={() => setPage("home")} />;
      case "history":
        return <HistoryPage onReopen={(entry) => {
          store.setTopic(entry.topic);
          store.setActiveTopic(entry.topic);
          store.setLearnData(entry.modules?.learn || null);
          store.setPgData(entry.modules?.practice || null);
          
          setInterviewData(entry.modules?.interview || null);
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
        <main className="app-content">{renderPage()}</main>
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
