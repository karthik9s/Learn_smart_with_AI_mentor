require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://learn-smart-with-ai-mentor-97l2ln4a0-karthik9s-projects.vercel.app",
    /\.vercel\.app$/,
    process.env.FRONTEND_URL,
  ].filter(Boolean),
  credentials: true,
}));
app.use(express.json());

// Log key status on startup
const key = process.env.GROQ_API_KEY;
console.log("GROQ_API_KEY:", key ? `loaded (${key.slice(0, 8)}...)` : "MISSING ⚠️");

// Routes
const rateLimit = require("./middleware/rateLimit");
app.use("/api/generate-all", rateLimit);
app.use("/api/learn",        rateLimit);
app.use("/api/quiz",         rateLimit);
app.use("/api/mock-interview", rateLimit);
app.use("/api/goal-roadmap", rateLimit);
app.use("/api/daily-plan",   rateLimit);
app.use("/api/study-chat",   rateLimit);
app.use("/api", require("./routes/learn"));

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: "Server error", details: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
