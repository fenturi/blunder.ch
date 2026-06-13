import express from "express";
import { getDailyPlanUsage } from "../repositories/importsRepository.js";
import {
  countUnreadNotifications,
  createNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../repositories/notificationsRepository.js";
import { puzzleQuota } from "../repositories/puzzlesRepository.js";
import { getUserByProviderUsername } from "../repositories/usersRepository.js";

export const notificationsRouter = express.Router();

const PLAN_LIMITS = {
  free: 1,
  pro: 5,
};

async function requireNotificationUser(req, res) {
  const source = { ...req.query, ...req.body };
  const provider = source.provider?.toLowerCase();
  const username = source.username?.trim();

  if (!["chess.com", "lichess"].includes(provider) || !username) {
    res.status(400).json({ error: "provider and username are required" });
    return null;
  }

  const user = await getUserByProviderUsername({ provider, username });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return null;
  }

  return user;
}

function restockKey(prefix, availableAt) {
  return `${prefix}:${new Date(availableAt).toISOString()}`;
}

async function ensureRestockNotifications(user) {
  const quota = puzzleQuota(user);

  if (!user.is_premium && quota.usedToday > 0 && quota.resetsAt) {
    await createNotification({
      userId: user.id,
      type: "puzzle_restock",
      title: "Puzzles restocked",
      body: `Your ${quota.dailyLimit} daily puzzles are available again.`,
      href: "/puzzles",
      entityKey: restockKey("puzzles", quota.resetsAt),
      availableAt: quota.resetsAt,
    });
  }

  const plan = user.is_premium ? "pro" : "free";
  const usage = await getDailyPlanUsage(user.id, plan);

  if (usage.used > 0 && usage.resetAt) {
    await createNotification({
      userId: user.id,
      type: "analysis_restock",
      title: "Game analyses restocked",
      body: `Your ${PLAN_LIMITS[plan]} daily game ${PLAN_LIMITS[plan] === 1 ? "analysis is" : "analyses are"} available again.`,
      href: "/import",
      entityKey: restockKey(`analysis-${plan}`, usage.resetAt),
      availableAt: usage.resetAt,
    });
  }
}

notificationsRouter.get("/", async (req, res, next) => {
  try {
    const user = await requireNotificationUser(req, res);
    if (!user) return;

    await ensureRestockNotifications(user);
    const [notifications, unreadCount] = await Promise.all([
      listNotifications(user.id),
      countUnreadNotifications(user.id),
    ]);

    res.json({
      notifications,
      unreadCount,
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.get("/unread-count", async (req, res, next) => {
  try {
    const user = await requireNotificationUser(req, res);
    if (!user) return;

    await ensureRestockNotifications(user);
    const unreadCount = await countUnreadNotifications(user.id);
    res.json({ unreadCount });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.post("/read-all", async (req, res, next) => {
  try {
    const user = await requireNotificationUser(req, res);
    if (!user) return;

    const updated = await markAllNotificationsRead(user.id);
    res.json({ updated });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.post("/:id/read", async (req, res, next) => {
  try {
    const user = await requireNotificationUser(req, res);
    if (!user) return;

    const notification = await markNotificationRead({
      notificationId: req.params.id,
      userId: user.id,
    });

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    res.json(notification);
  } catch (error) {
    next(error);
  }
});
