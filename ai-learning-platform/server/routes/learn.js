
const express = require("express");
const router = express.Router();
const { getCache, setCache }                     = require("../lib/cache");
const { checkSemanticCache, storeSemanticCache } = require("../lib/semanticCache");
const { routeAI }                                = require("../lib/aiRouter");
const { recordSemanticHit, recordHashHit, recordMiss } = require("../lib/stats");

/* ── Groq error classifier ──────────────────────────────────
   Maps provider HTTP errors to clean { status, message } pairs.
   Never leaks raw SDK objects to the frontend.
   ──────────────────────────────────────────────────────── */
function classifyGroqError(e) {
  const status = e?.status ?? e?.response?.status ?? e?.statusCode ?? null;

  if (status === 429) {
    return { httpStatus: 503, message: "AI service is busy. Please try again in 30 seconds.", code: "rate_limited" };
  }
  if (status >= 500 && status < 600) {
    return { httpStatus: 500, message: "AI service temporarily unavailable.", code: "groq_server_error" };
  }
  if (status === 401 || status === 403) {
    return { httpStatus: 500, message: "AI service configuration error.", code: "auth_error" };
  }
  return { httpStatus: 500, message: "Something went wrong. Please try again.", code: "unknown_error" };
}

/* ── call(prompt, endpoint) ─────────────────────────────────
   Thin wrapper around routeAI. Passes the endpoint hint so the
   router can skip keyword classification for known route types.
   Normalises errors into the same shape as before.
   ──────────────────────────────────────────────────────── */
async function call(prompt, endpoint = "") {
  try {
    return await routeAI(prompt, endpoint);
  } catch (e) {
    // If routeAI already attached httpStatus (all_providers_failed), re-throw as-is
    if (e.httpStatus) throw e;
    const { httpStatus, message, code } = classifyGroqError(e);
    console.error(`[AI Error] ${code} (${httpStatus}):`, e.message);
    const err = new Error(message);
    err.httpStatus = httpStatus;
    err.code = code;
    throw err;
  }
}

/* ── Shared route error responder ───────────────────────────
   Reads the structured info attached by classifyGroqError,
   or falls back to 500 for unexpected throws.
   ──────────────────────────────────────────────────────── */
function handleError(res, e, context = "") {
  const status  = e.httpStatus ?? 500;
  const message = e.message   ?? "Something went wrong. Please try again.";
  const code    = e.code      ?? "unknown_error";
  if (!e.httpStatus) {
    // Not a classified Groq error — log it fully
    console.error(`[Route Error]${context ? " " + context + ":" : ""}`, e.message);
  }
  return res.status(status).json({ success: false, error: message, code });
}

/* ── Cache-aware request wrapper ────────────────────────────
   Lookup order:
     1. Semantic cache  (Cohere similarity ≥ 0.85, level-scoped)
     2. Hash cache      (exact SHA-256 match)
     3. Groq API        (cache miss — writes both caches after)

   All cache writes are fire-and-forget (never block the response).
   ──────────────────────────────────────────────────────── */
async function withCache({ topic, level, endpoint, hashKey, generate, res }) {

  // 1. Semantic cache check (level-scoped, TTL-filtered, best-match only)
  const semanticHit = await checkSemanticCache(topic, level, endpoint);
  if (semanticHit) {
    recordSemanticHit();
    console.log(`[Semantic Cache HIT] ${endpoint} "${topic}" @ ${level}`);
    return res.json({ ...semanticHit, _cached: true, _cache: "semantic" });
  }

  // 2. Exact hash cache check
  const hashHit = await getCache(topic, hashKey);
  if (hashHit) {
    recordHashHit();
    console.log(`[Hash Cache HIT] ${endpoint} "${topic}" @ ${level}`);
    storeSemanticCache(topic, level, endpoint, hashHit);
    return res.json({ ...hashHit, _cached: true, _cache: "hash" });
  }

  recordMiss();
  console.log(`[AI API CALL (Groq)] ${endpoint} "${topic}" @ ${level}`);

  // 3. Call Groq — write both caches on success
  try {
    const result = await generate();
    // FIX 6: only cache valid, non-null results
    if (result) {
      setCache(topic, hashKey, result);
      storeSemanticCache(topic, level, endpoint, result);
    }
    return res.json(result);
  } catch (e) {
    return handleError(res, e, endpoint);
  }
}

// POST /api/generate-all — fires all modules in parallel
router.post("/generate-all", async (req, res) => {
  const { topic, level } = req.body;

  await withCache({
    topic, level,
    endpoint: "generate-all",
    hashKey:  `generate-all:${level}`,
    res,
    generate: async () => {
      const learnPrompt = `
You are an expert AI tutor. Teach "${topic}" at "${level}" level as a mini course.
Return ONLY valid JSON:
{
  "title": "", "difficulty": "${level}",
  "intuitive_start": "", "why_this_matters": "",
  "core_concepts": [{"name":"","intuitive_explanation":"","technical_explanation":"","real_world_example":""}],
  "subtopics": [{"name":"","deep_explanation":"","step_by_step_working":[],"real_world_example":"","code_example":"","code_explanation":""}],
  "how_it_works_flow": [], "visual_explanation": "",
  "common_mistakes": [], "interview_ready_points": [], "summary": ""
}`;

  const roadmapPrompt = `
Create a learning roadmap for "${topic}" at "${level}" level.
Return ONLY valid JSON:
{
  "title": "", "overview": "", "estimated_time": "",
  "phases": [{"phase":1,"title":"","description":"","topics":[],"outcome":"","resources_type":"theory"}],
  "final_project": "", "career_paths": []
}`;

  const practicePrompt = `
Create 5 practice tasks for "${topic}" at "${level}" level (2 easy, 2 medium, 1 hard).
Return ONLY valid JSON:
{"tasks": [{"title":"","problem":"","hint":"","difficulty":"easy","expected_approach":""}]}`;

  const interviewPrompt = `
Generate 8 interview questions for "${topic}" at "${level}" level. Mix easy/medium/hard.
Return ONLY valid JSON:
{
  "title": "", "quick_summary": "",
  "questions": [{"question":"","type":"conceptual","difficulty":"easy","answer":"","key_points":[],"follow_up":""}],
  "common_mistakes": [], "tips": [], "cheat_sheet": []
}`;

      const [learnRaw, roadmapRaw, practiceRaw, interviewRaw] = await Promise.all([
        call(learnPrompt),
        call(roadmapPrompt),
        call(practicePrompt),
        call(interviewPrompt),
      ]);

      return {
        learn:     JSON.parse(learnRaw),
        roadmap:   JSON.parse(roadmapRaw),
        practice:  JSON.parse(practiceRaw),
        interview: JSON.parse(interviewRaw),
      };
    },
  });
});

// POST /api/learn
router.post("/learn", async (req, res) => {
  const { topic, level } = req.body;

  await withCache({
    topic, level,
    endpoint: "learn",
    hashKey:  level,
    res,
    generate: async () => {
      const prompt = `
You are an expert AI tutor and professor.
Teach the topic: "${topic}"
Student level: "${level}"

Your goal: Make the student FULLY UNDERSTAND the concept, not just read it.

IMPORTANT TEACHING RULES:
- Do NOT give shallow explanations
- Explain WHY and HOW at every step
- Start with intuition, then move to technical explanation
- Use real-world examples to build understanding
- Break complex ideas into small steps
- Make it feel like you are teaching a student personally

STRUCTURE YOUR RESPONSE LIKE A MINI COURSE.
If the topic is technical, include parameter explanation and working logic in detail.

Return ONLY valid JSON (no markdown, no extra text):
{
  "title": "",
  "difficulty": "${level}",
  "intuitive_start": "",
  "why_this_matters": "",
  "core_concepts": [
    {
      "name": "",
      "intuitive_explanation": "",
      "technical_explanation": "",
      "real_world_example": ""
    }
  ],
  "subtopics": [
    {
      "name": "",
      "deep_explanation": "",
      "step_by_step_working": ["Step 1: ...", "Step 2: ..."],
      "real_world_example": "",
      "code_example": "",
      "code_explanation": ""
    }
  ],
  "how_it_works_flow": [],
  "visual_explanation": "",
  "common_mistakes": [],
  "interview_ready_points": [],
  "summary": ""
}`;
      const raw = await call(prompt);
      return JSON.parse(raw);
    },
  });
});

// POST /api/quiz
router.post("/quiz", async (req, res) => {
  const { topic, level } = req.body;

  await withCache({
    topic, level,
    endpoint: "quiz",
    hashKey:  `quiz:${level}`,
    res,
    generate: async () => {
      const prompt = `
Generate 5 MCQs for "${topic}" at "${level}" level.
Also provide feedback template.

Return ONLY valid JSON:
{
  "questions": [
    {
      "question": "",
      "options": ["", "", "", ""],
      "correct_answer": "",
      "explanation": ""
    }
  ],
  "feedback": {
    "strengths": [],
    "weak_areas": [],
    "improvement_suggestions": []
  }
}`;
      const raw = await call(prompt);
      return JSON.parse(raw);
    },
  });
});

// POST /api/playground
router.post("/playground", async (req, res) => {
  const { topic, level } = req.body;
  const prompt = `
Create 3 practice tasks for "${topic}" at "${level}" level.
Rules:
- Tasks must be practical
- Do NOT give full solution
- Give hints only

Return ONLY valid JSON:
{
  "tasks": [
    {
      "title": "",
      "problem": "",
      "hint": "",
      "difficulty": ""
    }
  ]
}`;
  try {
    const raw = await call(prompt);
    res.json(JSON.parse(raw));
  } catch (e) {
    return handleError(res, e, "playground");
  }
});

// POST /api/eli10
router.post("/eli10", async (req, res) => {
  const { topic } = req.body;
  const prompt = `
Explain "${topic}" to a 10-year-old.
Rules:
- Use a story
- No technical words
- Make it fun and memorable

Return ONLY valid JSON:
{"story": ""}`;
  try {
    const raw = await call(prompt);
    res.json(JSON.parse(raw));
  } catch (e) {
    return handleError(res, e, "eli10");
  }
});

// POST /api/revision
router.post("/revision", async (req, res) => {
  const { topic } = req.body;

  const cached = await getCache(topic, "revision");
  if (cached) {
    console.log(`[cache HIT] revision "${topic}"`);
    return res.json({ ...cached, _cached: true });
  }

  const prompt = `
Summarize "${topic}" for quick revision.
Return ONLY valid JSON:
{
  "definition": "",
  "key_points": [],
  "example": "",
  "formula_or_core_rule": ""
}`;
  try {
    const raw = await call(prompt);
    const result = JSON.parse(raw);
    setCache(topic, "revision", result);
    res.json(result);
  } catch (e) {
    return handleError(res, e, "revision");
  }
});

// POST /api/doubt
router.post("/doubt", async (req, res) => {
  const { topic, question } = req.body;
  const prompt = `
You are a friendly AI tutor helping a student understand "${topic}".
Student doubt: "${question}"
Instructions:
- Be conversational and supportive
- If concept is complex → simplify it
- Use analogy first, then technical explanation
- If needed, give a small example

Return ONLY valid JSON:
{
  "answer": "",
  "simple_explanation": "",
  "example": ""
}`;
  try {
    const raw = await call(prompt);
    res.json(JSON.parse(raw));
  } catch (e) {
    return handleError(res, e, "doubt");
  }
});

// POST /api/mock-interview
router.post("/mock-interview", async (req, res) => {
  const { domain, difficulty, history, userAnswer, questionNumber } = req.body;

  const isFirst = !history?.length;

  const systemPrompt = `You are a professional technical interviewer conducting a mock interview for ${domain} at ${difficulty} level.

Rules:
- Ask ONE question at a time
- Mix technical and behavioral questions (70% technical, 30% HR/behavioral)
- After user answers: give score (0-10), detailed feedback, then ask next question
- Keep track of question number (currently on Q${questionNumber || 1})
- After 8 questions, give a final summary with overall score and recommendations
- Be professional but encouraging
- For technical questions: check correctness, depth, and clarity
- For behavioral: check structure (STAR method), relevance

Return ONLY valid JSON:
{
  "type": "question|feedback|summary",
  "question": "",
  "question_type": "technical|behavioral|coding",
  "feedback": "",
  "score": null,
  "score_breakdown": { "accuracy": 0, "depth": 0, "clarity": 0 },
  "ideal_answer_hint": "",
  "next_question": "",
  "overall_score": null,
  "strengths": [],
  "improvements": [],
  "is_final": false
}

If type is "question": populate question, question_type. Leave feedback/score null.
If type is "feedback": populate feedback, score, score_breakdown, ideal_answer_hint, next_question.
If type is "summary": populate overall_score, strengths, improvements, is_final=true.`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...(history || []),
    ...(isFirst
      ? [{ role: "user", content: `Start the interview. Ask the first question.` }]
      : [{ role: "user", content: userAnswer }]
    )
  ];

  try {
    const { callGroq } = require("../lib/aiRouter");
    const r = await callGroq(
      messages.map(m => `${m.role === "system" ? "[SYSTEM]" : "[USER]"} ${m.content}`).join("\n\n")
    );
    // callGroq already runs clean() which does robust JSON extraction
    res.json(JSON.parse(r));
  } catch (e) {
    const { httpStatus, message, code } = classifyGroqError(e);
    console.error(`[AI Error] mock-interview ${code} (${httpStatus}):`, e.message);
    return res.status(httpStatus).json({ success: false, error: message, code });
  }
});

// POST /api/roadmap-overview — lightweight phase overview
router.post("/roadmap-overview", async (req, res) => {
  const { goal, level = "beginner" } = req.body;

  const cached = await getCache(goal, `roadmap-overview:${level}`);
  if (cached) {
    console.log(`[cache HIT] roadmap-overview "${goal}" @ ${level}`);
    return res.json({ ...cached, _cached: true });
  }

  const prompt = `Create a simple learning roadmap overview for: "${goal}" at ${level} level.
Keep it minimal — just phases and key topics.
Return ONLY valid JSON:
{
  "phases": [
    { "phase": 1, "title": "", "topics": ["", "", ""], "duration": "Week 1-2" },
    { "phase": 2, "title": "", "topics": ["", "", ""], "duration": "Week 3-4" },
    { "phase": 3, "title": "", "topics": ["", "", ""], "duration": "Week 5-6" },
    { "phase": 4, "title": "", "topics": ["", "", ""], "duration": "Week 7-8" }
  ]
}`;
  try {
    const raw = await call(prompt);
    const result = JSON.parse(raw);
    setCache(goal, `roadmap-overview:${level}`, result);
    res.json(result);
  } catch (e) {
    return handleError(res, e, "roadmap-overview");
  }
});

// POST /api/daily-plan — generates 30-day plan in 3 batches of 10
router.post("/daily-plan", async (req, res) => {
  const { goal, level = "beginner" } = req.body;

  const cached = await getCache(goal, `daily-plan:${level}`);
  if (cached) {
    console.log(`[cache HIT] daily-plan "${goal}" @ ${level}`);
    return res.json({ ...cached, _cached: true });
  }

  const batchPrompt = (startDay, endDay, phase) => `
You are a personal AI mentor creating a daily learning plan.
Goal: "${goal}" | Level: ${level}
Generate days ${startDay} to ${endDay} (${phase} phase).

Each day MUST have ALL 5 sections. Be specific and actionable.

Return ONLY valid JSON:
{
  "days": [
    {
      "day": ${startDay},
      "title": "short day title",
      "concept": "What concept to learn today (1-2 sentences explaining the idea)",
      "learn": "Specific topic to study today (name the exact topic/subtopic)",
      "practice": "Small hands-on exercise (doable in 20 min, very specific)",
      "apply": "Mini real-world task using today's concept (specific scenario)",
      "revise": "Quick recall question or flashcard to review (1 question + answer)",
      "time": "total estimated time"
    }
  ]
}`;

  try {
    const [b1, b2, b3] = await Promise.all([
      call(batchPrompt(1, 10, "foundations")),
      call(batchPrompt(11, 20, "intermediate")),
      call(batchPrompt(21, 30, "advanced application")),
    ]);

    const days = [
      ...JSON.parse(b1).days,
      ...JSON.parse(b2).days,
      ...JSON.parse(b3).days,
    ];

    const result = { title: `30-Day ${goal} Plan`, goal, level, total_days: days.length, days };
    setCache(goal, `daily-plan:${level}`, result);
    res.json(result);
  } catch (e) {
    return handleError(res, e, "daily-plan");
  }
});

// POST /api/goal-roadmap
router.post("/goal-roadmap", async (req, res) => {
  const { goal, level = "beginner", weeks = 6 } = req.body;
  const actualWeeks = Math.min(parseInt(weeks) || 6, 6);

  const cached = await getCache(goal, `goal-roadmap:${level}:${actualWeeks}w`);
  if (cached) {
    console.log(`[cache HIT] goal-roadmap "${goal}" @ ${level} ${actualWeeks}w`);
    return res.json({ ...cached, _cached: true });
  }

  const prompt = `You are an expert learning curriculum designer.
Create a structured learning roadmap for: "${goal}"
Level: ${level} | Duration: ${actualWeeks} weeks

STRICT LEARNING FLOW — every week must follow this exact order:
1. TOPICS → What to learn this week (list of specific topics)
2. CONCEPTS → Key ideas to understand (explain WHY, not just WHAT)
3. PRACTICE → Small hands-on exercises (no projects yet, just drills)
4. APPLICATION → Mini task applying what was learned this week

RULES:
- Week 1-2: Fundamentals only. No datasets, no projects, no advanced tools.
- Week 3-4: Guided practice with simple examples.
- Week 5+: Apply knowledge to real mini-tasks.
- Each phase must be beginner-friendly and build on the previous week.
- DO NOT skip the Learn → Understand → Practice → Apply flow.
- Practice tasks must be small and doable in 30 minutes.
- Application tasks must use only what was taught that week.

Return ONLY valid JSON:
{
  "title": "",
  "goal": "${goal}",
  "level": "${level}",
  "total_weeks": ${actualWeeks},
  "weeks": [
    {
      "week": 1,
      "title": "",
      "weekly_goal": "",
      "topics": ["specific topic 1", "specific topic 2", "specific topic 3"],
      "concepts": [
        { "name": "", "explanation": "" },
        { "name": "", "explanation": "" }
      ],
      "practice": [
        { "task": "", "what_to_do": "" },
        { "task": "", "what_to_do": "" }
      ],
      "application": {
        "task": "",
        "description": "",
        "expected_output": ""
      },
      "resources": [
        { "title": "", "type": "course|book|tool|article" },
        { "title": "", "type": "course|book|tool|article" }
      ]
    }
  ]
}`;

  try {
    const raw = await call(prompt);
    const parsed = JSON.parse(raw);
    parsed.total_weeks = parsed.weeks?.length || actualWeeks;
    setCache(goal, `goal-roadmap:${level}:${actualWeeks}w`, parsed);
    res.json(parsed);
  } catch (e) {
    return handleError(res, e, "goal-roadmap");
  }
});

// POST /api/study-chat
router.post("/study-chat", async (req, res) => {
  const { subject, level, history, userMessage } = req.body;

  const systemPrompt = `You are a professional teacher specializing in "${subject}" at "${level}" level.

Your teaching style:
- Explain concepts step-by-step, building on previous answers
- After each explanation, ask ONE follow-up question to check understanding
- If the student answers correctly → increase complexity slightly, praise them
- If the student answers incorrectly → simplify, give a different analogy, try again
- Occasionally give mini quizzes (1 question with 4 options labeled A/B/C/D)
- Use real-world examples relevant to the student's level
- Keep responses focused and not too long (3-5 sentences max per turn)
- Track what has been covered and don't repeat

Response format — Return ONLY valid JSON:
{
  "message": "Your teaching response here",
  "type": "explanation|question|quiz|feedback|encouragement",
  "quiz": null,
  "difficulty_adjustment": "same|increase|decrease"
}

If type is "quiz", populate quiz:
{
  "question": "",
  "options": {"A":"","B":"","C":"","D":""},
  "correct": "A|B|C|D",
  "explanation": ""
}`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...(history || []),
    { role: "user", content: userMessage }
  ];

  try {
    const { callGroq } = require("../lib/aiRouter");
    const fullPrompt = messages.map(m => `${m.role === "system" ? "[SYSTEM]" : "[USER]"} ${m.content}`).join("\n\n");
    const text = await callGroq(fullPrompt);
    res.json(JSON.parse(text));
  } catch (e) {
    const { httpStatus, message, code } = classifyGroqError(e);
    console.error(`[AI Error] study-chat ${code} (${httpStatus}):`, e.message);
    return res.status(httpStatus).json({ success: false, error: message, code });
  }
});

// POST /api/detect-intent
router.post("/detect-intent", async (req, res) => {
  const { query } = req.body;
  const prompt = `
Analyze this user query: "${query}"
Detect the best learning mode for it.

Modes:
- "learn"     → user wants to understand a concept deeply
- "roadmap"   → user wants a structured learning path
- "practice"  → user wants to practice or solve problems
- "interview" → user wants interview preparation
- "ask"       → general question, career advice, or conversational

Return ONLY valid JSON:
{ "mode": "learn|roadmap|practice|interview|ask", "topic": "", "confidence": "high|medium" }`;
  try {
    const raw = await call(prompt);
    res.json(JSON.parse(raw));
  } catch (e) {
    // detect-intent is non-critical — fall back silently
    console.error("[Groq Error] detect-intent:", e.message);
    res.json({ mode: "learn", topic: query, confidence: "medium" });
  }
});

// POST /api/search-answer
router.post("/search-answer", async (req, res) => {
  const { query } = req.body;
  const prompt = `
You are a helpful AI tutor. A user searched: "${query}"

Provide a complete, self-contained learning response with visual explanation and quick practice.

Return ONLY valid JSON:
{
  "topic": "",
  "definition": "",
  "explanation": "",
  "real_world_example": "",
  "visual_explanation": "Describe how to visualize this concept mentally. Use spatial/physical analogies. Example: 'Imagine a tree branching out...' or 'Picture a map with colored regions...'",
  "key_points": ["", "", ""],
  "quick_breakdown": ["Step 1: ...", "Step 2: ..."],
  "quick_practice": [
    { "question": "", "answer": "" },
    { "question": "", "answer": "" }
  ],
  "interactive_actions": {
    "simpler_explanation": "",
    "another_example": "",
    "real_world_application": ""
  },
  "explore_more": ["Related question 1", "Related question 2", "Related question 3"]
}

Rules:
- visual_explanation: 2-4 sentences using spatial/physical analogies, no jargon
- quick_practice: 1-2 simple questions to test immediate understanding
- interactive_actions: pre-generate responses for the action buttons
- explore_more: 3 natural follow-up questions`;
  try {
    const raw = await call(prompt);
    res.json(JSON.parse(raw));
  } catch (e) {
    return handleError(res, e, "search-answer");
  }
});

// POST /api/roadmap
router.post("/roadmap", async (req, res) => {
  const { topic, level } = req.body;

  const cached = await getCache(topic, `roadmap:${level}`);
  if (cached) {
    console.log(`[cache HIT] roadmap "${topic}" @ ${level}`);
    return res.json({ ...cached, _cached: true });
  }

  const prompt = `
You are a structured course designer.
Create a complete learning roadmap for "${topic}" at "${level}" level.
Break it into logical phases with clear progression.

Return ONLY valid JSON:
{
  "title": "",
  "overview": "",
  "estimated_time": "",
  "phases": [
    {
      "phase": 1,
      "title": "",
      "description": "",
      "topics": ["", ""],
      "outcome": "",
      "resources_type": "theory|practice|project"
    }
  ],
  "final_project": "",
  "career_paths": [""]
}`;
  try {
    const raw = await call(prompt);
    const result = JSON.parse(raw);
    setCache(topic, `roadmap:${level}`, result);
    res.json(result);
  } catch (e) {
    return handleError(res, e, "roadmap");
  }
});

// POST /api/interview
router.post("/interview", async (req, res) => {
  const { topic, level, count = 5, difficulty = "mixed" } = req.body;

  const cached = await getCache(topic, `interview:${level}:${count}:${difficulty}`);
  if (cached) {
    console.log(`[cache HIT] interview "${topic}" @ ${level}`);
    return res.json({ ...cached, _cached: true });
  }

  const diffNote = difficulty === "mixed"
    ? "Mix easy, medium, and hard questions"
    : `All questions should be ${difficulty} difficulty`;

  const prompt = `
You are an expert interview coach.
Generate exactly ${count} interview questions for "${topic}" at "${level}" level.
${diffNote}.

Return ONLY valid JSON:
{
  "title": "",
  "quick_summary": "",
  "questions": [
    {
      "question": "",
      "type": "conceptual|practical|behavioral",
      "difficulty": "easy|medium|hard",
      "answer": "",
      "key_points": [""],
      "follow_up": ""
    }
  ],
  "common_mistakes": [""],
  "tips": [""],
  "cheat_sheet": [""]
}`;
  try {
    const raw = await call(prompt);
    const result = JSON.parse(raw);
    setCache(topic, `interview:${level}:${count}:${difficulty}`, result);
    res.json(result);
  } catch (e) {
    return handleError(res, e, "interview");
  }
});

// POST /api/auto-practice
router.post("/auto-practice", async (req, res) => {
  const { topic, level } = req.body;

  const cached = await getCache(topic, `auto-practice:${level}`);
  if (cached) {
    console.log(`[cache HIT] auto-practice "${topic}" @ ${level}`);
    return res.json({ ...cached, _cached: true });
  }

  const prompt = `
You are an expert tutor creating a progressive practice set for "${topic}" at "${level}" level.
Generate exactly 5 practice questions with increasing difficulty: 2 easy, 2 medium, 1 hard.

Rules:
- Questions must require the student to APPLY the concept, not just recall
- Do NOT give full solutions — only hints
- Each question must be self-contained and clear

Return ONLY valid JSON:
{
  "tasks": [
    {
      "title": "",
      "problem": "",
      "hint": "",
      "difficulty": "easy|medium|hard",
      "expected_approach": ""
    }
  ]
}`;
  try {
    const raw = await call(prompt);
    const result = JSON.parse(raw);
    setCache(topic, `auto-practice:${level}`, result);
    res.json(result);
  } catch (e) {
    return handleError(res, e, "auto-practice");
  }
});

// POST /api/check-answer
router.post("/check-answer", async (req, res) => {
  const { topic, task, userAnswer } = req.body;
  const prompt = `
You are an expert tutor evaluating a student's answer.
Topic: "${topic}"
Task: "${task}"
Student's answer: "${userAnswer}"

Evaluate the answer deeply. Focus on mistake-based learning.

Return ONLY valid JSON:
{
  "is_correct": false,
  "mistake_type": "",
  "what_user_did": "",
  "why_it_is_wrong": "",
  "correct_approach": "",
  "step_by_step_fix": ["Step 1: ...", "Step 2: ..."],
  "correct_solution": "",
  "prevention_tip": "",
  "optimization_tip": ""
}`;
  try {
    const raw = await call(prompt);
    res.json(JSON.parse(raw));
  } catch (e) {
    return handleError(res, e, "check-answer");
  }
});

// POST /api/next-steps
router.post("/next-steps", async (req, res) => {
  const { topic, level, weakAreas } = req.body;

  // Only cache when there are no weak areas (personalised responses shouldn't be cached)
  const cacheKey = `next-steps:${level}`;
  if (!weakAreas?.length) {
    const cached = await getCache(topic, cacheKey);
    if (cached) {
      console.log(`[cache HIT] next-steps "${topic}" @ ${level}`);
      return res.json({ ...cached, _cached: true });
    }
  }

  const weakContext = weakAreas?.length ? `The student struggled with: ${weakAreas.join(", ")}.` : "";
  const prompt = `
You are an expert learning advisor.
A student just finished learning "${topic}" at "${level}" level. ${weakContext}
Suggest exactly 3 next topics to learn, ordered by logical progression.

For each topic provide:
- Why it's the natural next step
- How it connects to "${topic}"
- What new skill it unlocks

Return ONLY valid JSON:
{
  "steps": [
    {
      "topic": "",
      "reason": "",
      "connection": "",
      "skill_unlocked": ""
    }
  ]
}`;
  try {
    const raw = await call(prompt);
    const result = JSON.parse(raw);
    if (!weakAreas?.length) setCache(topic, `next-steps:${level}`, result);
    res.json(result);
  } catch (e) {
    return handleError(res, e, "next-steps");
  }
});

// POST /api/try-yourself
router.post("/try-yourself", async (req, res) => {
  const { topic, subtopic } = req.body;
  const prompt = `
Create 1 small practice question for the subtopic "${subtopic}" (part of ${topic}).
Rules:
- Question must be practical and make the student APPLY the concept
- Do NOT give the full solution
- Give only a helpful hint
- Keep it concise

Return ONLY valid JSON:
{ "question": "", "hint": "" }`;
  try {
    const raw = await call(prompt);
    res.json(JSON.parse(raw));
  } catch (e) {
    return handleError(res, e, "try-yourself");
  }
});

// POST /api/selfcheck
router.post("/selfcheck", async (req, res) => {
  const { topic, level } = req.body;

  const cached = await getCache(topic, `selfcheck:${level}`);
  if (cached) {
    console.log(`[cache HIT] selfcheck "${topic}" @ ${level}`);
    return res.json({ ...cached, _cached: true });
  }

  const prompt = `
Generate 5 conceptual self-check questions for "${topic}" at "${level}" level.
Rules:
- Questions should make the student THINK, not just recall
- Each question must have a clear, concise answer
- Mix "why", "how", and "what happens if" style questions

Return ONLY valid JSON:
{
  "questions": [
    { "question": "", "answer": "" }
  ]
}`;
  try {
    const raw = await call(prompt);
    const result = JSON.parse(raw);
    setCache(topic, `selfcheck:${level}`, result);
    res.json(result);
  } catch (e) {
    return handleError(res, e, "selfcheck");
  }
});

// POST /api/tutor-action
router.post("/tutor-action", async (req, res) => {
  const { topic, concept, action } = req.body;

  const prompts = {
    simpler: `Explain "${concept}" (part of ${topic}) in the simplest possible way.
Use a very basic analogy a child could understand. Avoid all jargon.
Return ONLY valid JSON: {"response": ""}`,

    deeper: `You are an expert AI tutor. The student wants to go deeper into "${concept}" (part of ${topic}).
Provide advanced context, edge cases, and low-level implementation details.
Return ONLY valid JSON:
{
  "deepDive": "Advanced technical explanation with internals, performance considerations, and advanced usage",
  "examples": ["Advanced use-case or edge case 1", "Advanced use-case or edge case 2"]
}`,

    example: `Give a completely different real-world example to explain "${concept}" (part of ${topic}).
Make it practical and memorable. Return ONLY valid JSON: {"response": ""}`,

    testme: `Create 1 quick question to test the student's understanding of "${concept}" (part of ${topic}).
Include the answer and a short explanation.
Return ONLY valid JSON: {"question": "", "answer": "", "explanation": ""}`,

    struggling: `The student is struggling to understand "${concept}" (part of ${topic}).
They may have answered questions wrong or asked repeated doubts.
Provide an encouraging response, break down the core hurdle, and give clear actionable steps.
Return ONLY valid JSON:
{
  "motivation": "Encouraging and empathetic words to motivate them",
  "simplifiedExplanation": "A crystal-clear, plain-English breakdown of the problem — use a story or real-life scenario first, then a simple technical explanation",
  "actionableSteps": ["Concrete step 1 to overcome the confusion", "Concrete step 2", "Concrete step 3"]
}`,
  };

  const prompt = prompts[action];
  if (!prompt) return res.status(400).json({ error: "Invalid action" });

  try {
    const raw = await call(prompt);
    res.json(JSON.parse(raw));
  } catch (e) {
    return handleError(res, e, "tutor-action");
  }
});

module.exports = router;
