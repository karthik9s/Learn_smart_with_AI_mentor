require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const express = require("express");
const cors    = require("cors");

const app = express();

app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "https://learn-smart-with-ai-mentor-97l2ln4a0-karthik9s-projects.vercel.app",
    /\.vercel\.app$/,
    process.env.FRONTEND_URL,
  ].filter(Boolean),
  credentials: true,
}));

// Raw body needed for Razorpay webhook signature verification
app.use("/api/payment/webhook", express.raw({ type: "application/json" }));
app.use(express.json());

// Startup checks
console.log("GROQ_API_KEY:",     process.env.GROQ_API_KEY     ? "✅ loaded" : "⚠️  MISSING");
console.log("SUPABASE_URL:",     process.env.SUPABASE_URL     ? "✅ loaded" : "⚠️  MISSING");
console.log("SUPABASE_SERVICE_KEY:", process.env.SUPABASE_SERVICE_KEY ? "✅ loaded" : "⚠️  MISSING");
console.log("RAZORPAY_KEY_ID:", process.env.RAZORPAY_KEY_ID   ? "✅ loaded" : "⚠️  not set");
console.log("COHERE_API_KEY:",  process.env.COHERE_API_KEY    ? "✅ loaded" : "⚠️  not set (semantic cache disabled)");
console.log("GEMINI_API_KEY:",  process.env.GEMINI_API_KEY    ? "✅ loaded" : "—  not set (will skip in fallback)");
console.log("MISTRAL_API_KEY:", process.env.MISTRAL_API_KEY   ? "✅ loaded" : "—  not set (will skip in fallback)");

// Rate limit middleware applied to AI endpoints
const rateLimit = require("./middleware/rateLimit");
app.use("/api/generate-all",   rateLimit);
app.use("/api/learn",          rateLimit);
app.use("/api/quiz",           rateLimit);
app.use("/api/mock-interview",  rateLimit);
app.use("/api/goal-roadmap",   rateLimit);
app.use("/api/daily-plan",     rateLimit);
app.use("/api/study-chat",     rateLimit);

// Routes
app.use("/api",          require("./routes/learn"));
app.use("/api/auth",     require("./routes/auth"));
app.use("/api/payment",  require("./routes/payment"));
app.use("/api/progress", require("./routes/progress"));
app.use("/api/user",     require("./routes/user"));

// Cache maintenance — POST /api/cache/purge (internal use only)
app.post("/api/cache/purge", async (_req, res) => {
  try {
    const { purgeExpired }         = require("./lib/cache");
    const { purgeSemanticExpired } = require("./lib/semanticCache");
    await Promise.all([purgeExpired(), purgeSemanticExpired()]);
    res.json({ ok: true, message: "Both caches purged of expired entries" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Provider status — GET /api/providers/status
app.get("/api/providers/status", (_req, res) => {
  try {
    const { getStatus } = require("./lib/providerRegistry");
    res.json({ providers: getStatus() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Provider reset — POST /api/providers/reset/:name (dev/ops use)
app.post("/api/providers/reset/:name", (req, res) => {
  try {
    const { resetProvider } = require("./lib/providerRegistry");
    resetProvider(req.params.name);
    res.json({ ok: true, message: `${req.params.name} state reset` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// System stats — GET /api/stats
app.get("/api/stats", (_req, res) => {
  try {
    const { getStatus }    = require("./lib/providerRegistry");
    const { getCacheStats } = require("./lib/stats");
    const providers = getStatus();
    res.json({
      cache:     getCacheStats(),
      providers: providers.map(p => ({
        provider:         p.provider,
        status:           p.available ? "active" : (p.cooldown > 0 ? "cooldown" : "inactive"),
        usage:            p.usage,
        failures:         p.failures,
        cooldown:         p.cooldown,
        avgResponseTime:  p.avgResponseTime,
        lastResponseTime: p.lastResponseTime,
        lastErrorType:    p.lastErrorType,
      })),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: "Server error", details: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT} 🚀`));
