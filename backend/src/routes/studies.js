import express from "express";
import {
  createChapterForUser,
  createStudyForUser,
  deleteChapterForUser,
  deleteStudyForUser,
  getStudyForUser,
  listStudiesForUser,
  renameStudyForUser,
  updateChapterForUser,
} from "../repositories/studiesRepository.js";
import { getUserByProviderUsername } from "../repositories/usersRepository.js";

export const studiesRouter = express.Router();

async function requireStudyUser(req, res) {
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

studiesRouter.get("/", async (req, res, next) => {
  try {
    const user = await requireStudyUser(req, res);
    if (!user) return;

    const studies = await listStudiesForUser(user.id);
    res.json({ studies });
  } catch (error) {
    next(error);
  }
});

studiesRouter.post("/", async (req, res, next) => {
  try {
    const user = await requireStudyUser(req, res);
    if (!user) return;

    if (!user.is_premium) {
      const studies = await listStudiesForUser(user.id);

      if (studies.length >= 1) {
        res.status(403).json({ error: "Free accounts can create one study. Upgrade to Pro for unlimited studies." });
        return;
      }
    }

    const study = await createStudyForUser(user.id, req.body.name || "Untitled study");
    res.status(201).json(study);
  } catch (error) {
    next(error);
  }
});

studiesRouter.get("/:id", async (req, res, next) => {
  try {
    const user = await requireStudyUser(req, res);
    if (!user) return;

    const study = await getStudyForUser({ userId: user.id, studyId: req.params.id });

    if (!study) {
      res.status(404).json({ error: "Study not found" });
      return;
    }

    res.json(study);
  } catch (error) {
    next(error);
  }
});

studiesRouter.patch("/:id", async (req, res, next) => {
  try {
    const user = await requireStudyUser(req, res);
    if (!user) return;

    const study = await renameStudyForUser({
      userId: user.id,
      studyId: req.params.id,
      name: req.body.name || "Untitled study",
    });

    if (!study) {
      res.status(404).json({ error: "Study not found" });
      return;
    }

    res.json(study);
  } catch (error) {
    next(error);
  }
});

studiesRouter.delete("/:id", async (req, res, next) => {
  try {
    const user = await requireStudyUser(req, res);
    if (!user) return;

    const deleted = await deleteStudyForUser({ userId: user.id, studyId: req.params.id });

    if (!deleted) {
      res.status(404).json({ error: "Study not found" });
      return;
    }

    res.json({ deleted: true });
  } catch (error) {
    next(error);
  }
});

studiesRouter.post("/:id/chapters", async (req, res, next) => {
  try {
    const user = await requireStudyUser(req, res);
    if (!user) return;

    const chapter = await createChapterForUser({
      userId: user.id,
      studyId: req.params.id,
      name: req.body.name || "New chapter",
    });

    if (!chapter) {
      res.status(404).json({ error: "Study not found" });
      return;
    }

    res.status(201).json(chapter);
  } catch (error) {
    next(error);
  }
});

studiesRouter.patch("/:id/chapters/:chapterId", async (req, res, next) => {
  try {
    const user = await requireStudyUser(req, res);
    if (!user) return;

    const patch = {};
    if (Object.hasOwn(req.body, "name")) patch.name = req.body.name;
    if (Object.hasOwn(req.body, "rootFen")) patch.rootFen = req.body.rootFen;
    if (Object.hasOwn(req.body, "moves")) patch.moves = req.body.moves;

    const chapter = await updateChapterForUser({
      userId: user.id,
      studyId: req.params.id,
      chapterId: req.params.chapterId,
      patch,
    });

    if (!chapter) {
      res.status(404).json({ error: "Chapter not found" });
      return;
    }

    res.json(chapter);
  } catch (error) {
    next(error);
  }
});

studiesRouter.delete("/:id/chapters/:chapterId", async (req, res, next) => {
  try {
    const user = await requireStudyUser(req, res);
    if (!user) return;

    const deleted = await deleteChapterForUser({
      userId: user.id,
      studyId: req.params.id,
      chapterId: req.params.chapterId,
    });

    if (!deleted) {
      res.status(400).json({ error: "Chapter not found or cannot delete the only chapter" });
      return;
    }

    res.json({ deleted: true });
  } catch (error) {
    next(error);
  }
});
