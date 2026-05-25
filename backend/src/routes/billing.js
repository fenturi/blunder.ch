import crypto from "crypto";
import express from "express";
import { config } from "../config.js";
import { activatePremium, getUserByProviderUsername } from "../repositories/usersRepository.js";
import { publicUser } from "../utils/publicUser.js";

export const billingRouter = express.Router();
export const billingWebhookRouter = express.Router();

const STRIPE_API_BASE = "https://api.stripe.com/v1";
const SUBSCRIPTION_AMOUNT_CENTS = config.stripeProAmountCents;
const WEBHOOK_TOLERANCE_SECONDS = 300;

function requireStripeSecret() {
  if (!config.stripeSecretKey) {
    const error = new Error("Stripe is not configured");
    error.status = 503;
    throw error;
  }
}

function parseIdentity(source) {
  const provider = source.provider?.toLowerCase();
  const username = source.username?.trim();

  if (!["chess.com", "lichess"].includes(provider) || !username) {
    return null;
  }

  return { provider, username };
}

function appBaseUrl(req) {
  const configuredUrl = config.publicAppUrl.trim();
  if (configuredUrl) return configuredUrl.replace(/\/+$/, "");

  const origin = req.get("origin");
  if (origin && /^https?:\/\//i.test(origin)) return origin.replace(/\/+$/, "");

  return "http://localhost:5173";
}

async function stripeRequest(path, { method = "GET", body = null } = {}) {
  requireStripeSecret();

  const response = await fetch(`${STRIPE_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${config.stripeSecretKey}`,
      ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body,
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(payload?.error?.message || "Stripe request failed");
    error.status = 502;
    error.details = config.env === "development" ? payload?.error ?? payload : null;
    throw error;
  }

  return payload;
}

function checkoutSessionParams({ req, user, provider, username }) {
  const baseUrl = appBaseUrl(req);
  const params = new URLSearchParams({
    mode: "subscription",
    success_url: `${baseUrl}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/?checkout=cancelled`,
    client_reference_id: `${provider}:${username.toLowerCase()}`,
    "metadata[provider]": provider,
    "metadata[username]": username.toLowerCase(),
    "metadata[user_id]": String(user.id),
    "subscription_data[metadata][provider]": provider,
    "subscription_data[metadata][username]": username.toLowerCase(),
    "subscription_data[metadata][user_id]": String(user.id),
    allow_promotion_codes: "true",
  });

  if (user.email) {
    params.set("customer_email", user.email);
  }

  if (config.stripePriceId) {
    params.set("line_items[0][price]", config.stripePriceId);
    params.set("line_items[0][quantity]", "1");
    return params;
  }

  params.set("line_items[0][price_data][currency]", config.stripeCurrency);
  params.set("line_items[0][price_data][unit_amount]", String(SUBSCRIPTION_AMOUNT_CENTS));
  params.set("line_items[0][price_data][recurring][interval]", "month");
  params.set("line_items[0][price_data][product_data][name]", "Blunder Pro");
  params.set("line_items[0][price_data][product_data][description]", "20 game analyses per 24 hours");
  params.set("line_items[0][quantity]", "1");

  return params;
}

function webhookParts(header) {
  return Object.fromEntries(
    String(header || "")
      .split(",")
      .map((part) => part.split("="))
      .filter(([key, value]) => key && value)
      .map(([key, value]) => [key.trim(), value.trim()])
  );
}

function verifyWebhookSignature(rawBody, header) {
  if (!config.stripeWebhookSecret) {
    const error = new Error("Stripe webhook secret is not configured");
    error.status = 503;
    throw error;
  }

  const parts = webhookParts(header);
  const timestamp = Number.parseInt(parts.t, 10);
  const signature = parts.v1;

  if (!timestamp || !signature) {
    const error = new Error("Invalid Stripe signature header");
    error.status = 400;
    throw error;
  }

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > WEBHOOK_TOLERANCE_SECONDS) {
    const error = new Error("Expired Stripe webhook signature");
    error.status = 400;
    throw error;
  }

  const signedPayload = `${timestamp}.${rawBody.toString("utf8")}`;
  const expected = crypto
    .createHmac("sha256", config.stripeWebhookSecret)
    .update(signedPayload)
    .digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const signatureBuffer = Buffer.from(signature, "hex");

  if (
    expectedBuffer.length !== signatureBuffer.length
    || !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
  ) {
    const error = new Error("Invalid Stripe webhook signature");
    error.status = 400;
    throw error;
  }
}

async function activateFromSession(session) {
  const provider = session?.metadata?.provider;
  const username = session?.metadata?.username;

  if (!["chess.com", "lichess"].includes(provider) || !username) {
    return null;
  }

  return activatePremium({ provider, username });
}

billingRouter.post("/checkout-session", async (req, res, next) => {
  try {
    const identity = parseIdentity(req.body);

    if (!identity) {
      return res.status(400).json({ error: "provider and username are required" });
    }

    const user = await getUserByProviderUsername(identity);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.is_premium) {
      return res.json({ alreadyPremium: true, user: publicUser(user) });
    }

    const session = await stripeRequest("/checkout/sessions", {
      method: "POST",
      body: checkoutSessionParams({
        req,
        user,
        ...identity,
      }),
    });

    return res.status(201).json({ url: session.url });
  } catch (error) {
    next(error);
  }
});

billingRouter.post("/confirm-session", async (req, res, next) => {
  try {
    const identity = parseIdentity(req.body);
    const sessionId = req.body.sessionId?.trim();

    if (!identity || !sessionId) {
      return res.status(400).json({ error: "provider, username, and sessionId are required" });
    }

    const session = await stripeRequest(`/checkout/sessions/${encodeURIComponent(sessionId)}`);
    const sessionProvider = session?.metadata?.provider;
    const sessionUsername = session?.metadata?.username;

    if (
      sessionProvider !== identity.provider
      || sessionUsername !== identity.username.toLowerCase()
    ) {
      return res.status(403).json({ error: "Checkout session does not match this account" });
    }

    if (session.status !== "complete" || session.payment_status !== "paid") {
      return res.status(402).json({ error: "Checkout session is not paid yet" });
    }

    const user = await activateFromSession(session);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json(publicUser(user));
  } catch (error) {
    next(error);
  }
});

billingWebhookRouter.post("/", async (req, res, next) => {
  try {
    verifyWebhookSignature(req.body, req.get("stripe-signature"));

    const event = JSON.parse(req.body.toString("utf8"));

    if (event.type === "checkout.session.completed") {
      const session = event.data?.object;

      if (session?.status === "complete" && session?.payment_status === "paid") {
        await activateFromSession(session);
      }
    }

    return res.json({ received: true });
  } catch (error) {
    next(error);
  }
});
