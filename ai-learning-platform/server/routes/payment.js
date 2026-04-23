/* ── Payment routes (Razorpay + Supabase) ──────────────────
   create-order  → Razorpay order
   verify-payment → HMAC check → update profiles + insert payment
   status        → current plan + expiry
   webhook       → Razorpay async events
   ──────────────────────────────────────────────────────── */
const express    = require("express");
const router     = express.Router();
const crypto     = require("crypto");
const Razorpay   = require("razorpay");
const auth       = require("../middleware/auth");
const { getSupabase } = require("../lib/supabase");

const PLAN_PRICES = { pro: 19900, premium: 49900 }; // paise

let _rzp = null;
function getRazorpay() {
  if (_rzp) return _rzp;
  const key_id     = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) throw new Error("Razorpay keys not configured");
  _rzp = new Razorpay({ key_id, key_secret });
  return _rzp;
}

// POST /api/payment/create-order
router.post("/create-order", auth, async (req, res) => {
  const { plan } = req.body;
  if (!PLAN_PRICES[plan])
    return res.status(400).json({ error: "Invalid plan. Choose 'pro' or 'premium'." });

  try {
    const order = await getRazorpay().orders.create({
      amount:   PLAN_PRICES[plan],
      currency: "INR",
      receipt:  `rcpt_${req.user.id.slice(0, 8)}_${Date.now()}`,
      notes:    { plan, userId: req.user.id },
    });
    res.json({ order_id: order.id, amount: order.amount, currency: order.currency, plan });
  } catch (e) {
    console.error("[create-order]", e.message);
    res.status(500).json({ error: "Failed to create order", details: e.message });
  }
});

// POST /api/payment/verify-payment
router.post("/verify-payment", auth, async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !plan)
    return res.status(400).json({ error: "Missing payment fields" });

  // 1. Verify HMAC signature — NEVER trust frontend for this
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expected !== razorpay_signature)
    return res.status(400).json({ error: "Payment verification failed. Invalid signature." });

  // 2. Signature valid — update Supabase
  try {
    const sb     = getSupabase();
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);

    // Update profile plan + expiry
    const { error: profileErr } = await sb
      .from("profiles")
      .update({ plan, expiry_date: expiry.toISOString() })
      .eq("id", req.user.id);

    if (profileErr) throw profileErr;

    // Record payment
    await sb.from("payments").insert({
      user_id:    req.user.id,
      plan,
      amount:     PLAN_PRICES[plan],
      payment_id: razorpay_payment_id,
      order_id:   razorpay_order_id,
    });

    res.json({
      success: true,
      plan,
      expiry:  expiry.toISOString(),
      message: `🎉 You are now a ${plan.toUpperCase()} user!`,
    });
  } catch (e) {
    console.error("[verify-payment] DB error:", e.message);
    res.status(500).json({ error: "Payment verified but failed to update plan", details: e.message });
  }
});

// GET /api/payment/status
router.get("/status", auth, async (req, res) => {
  try {
    const sb = getSupabase();
    let { data: profile, error } = await sb
      .from("profiles")
      .select("plan, expiry_date")
      .eq("id", req.user.id)
      .single();

    if (error || !profile) {
      // Auto-create if missing
      await sb.from("profiles").upsert({ id: req.user.id, email: req.user.email, plan: "free" });
      return res.json({ plan: "free", expiry: null });
    }

    // Auto-downgrade expired plan
    if (profile.plan !== "free" && profile.expiry_date && new Date() > new Date(profile.expiry_date)) {
      await sb.from("profiles").update({ plan: "free", expiry_date: null }).eq("id", req.user.id);
      profile.plan = "free";
      profile.expiry_date = null;
    }

    res.json({ plan: profile.plan, expiry: profile.expiry_date });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/payment/webhook
router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const secret    = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers["x-razorpay-signature"];
  if (!secret || !signature) return res.status(400).json({ error: "Webhook not configured" });

  const expected = crypto
    .createHmac("sha256", secret)
    .update(req.body)
    .digest("hex");

  if (expected !== signature) return res.status(400).json({ error: "Invalid webhook signature" });

  try {
    const event = JSON.parse(req.body.toString());
    console.log("[Webhook] Razorpay event:", event.event);
    // Add handlers for payment.captured, refund.created, etc. here
    res.json({ received: true });
  } catch (e) {
    res.status(400).json({ error: "Invalid webhook payload" });
  }
});

module.exports = router;
