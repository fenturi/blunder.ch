import express from "express";
import {
  addStudyCollaborator,
  applyChapterOperationForUser,
  createChapterForUser,
  createStudyForUser,
  deleteChapterForUser,
  deleteStudyForUser,
  getStudyAccess,
  getStudyForUser,
  listStudiesForUser,
  removeStudyCollaborator,
  renameStudyForUser,
  updateChapterForUser,
} from "../repositories/studiesRepository.js";
import { getUserByProviderUsername } from "../repositories/usersRepository.js";
import { publishStudyEvent, subscribeToStudy } from "../services/studyRealtimeService.js";

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

function publicPresenceUser(user) {
  return {
    id: user.id,
    provider: user.provider,
    username: user.username,
    profile_slug: user.profile_slug,
    avatar_preset: user.avatar_preset,
    avatar_data_url: user.avatar_data_url,
  };
}

function publishUpdate(studyId, user, type, detail = {}) {
  publishStudyEvent(studyId, "study-update", {
    studyId,
    type,
    actor: publicPresenceUser(user),
    ...detail,
  });
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

      if (studies.some((study) => study.access_role === "owner")) {
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

studiesRouter.get("/:id/events", async (req, res, next) => {
  try {
    const user = await requireStudyUser(req, res);
    if (!user) return;

    const access = await getStudyAccess({ userId: user.id, studyId: req.params.id });
    if (!access) {
      res.status(404).json({ error: "Study not found" });
      return;
    }

    res.status(200);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    const unsubscribe = subscribeToStudy({
      studyId: req.params.id,
      user: publicPresenceUser(user),
      response: res,
    });
    req.on("close", unsubscribe);
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

    publishUpdate(req.params.id, user, "study-renamed");
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

    publishUpdate(req.params.id, user, "study-deleted");
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

    publishUpdate(req.params.id, user, "chapter-created", { chapterId: chapter.id });
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
    if (Object.hasOwn(req.body, "rootAnnotations")) patch.rootAnnotations = req.body.rootAnnotations;

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

    publishUpdate(req.params.id, user, "chapter-updated", { chapterId: req.params.chapterId });
    res.json(chapter);
  } catch (error) {
    next(error);
  }
});

studiesRouter.post("/:id/chapters/:chapterId/operations", async (req, res, next) => {
  try {
    const user = await requireStudyUser(req, res);
    if (!user) return;

    const operation = {
      type: req.body.type,
      payload: req.body.payload,
    };
    if (
      operation.type === "update_move"
      && Object.hasOwn(operation.payload?.patch || {}, "comment")
    ) {
      const comment = String(operation.payload.patch.comment || "").trim();
      operation.payload = {
        ...operation.payload,
        patch: {
          ...operation.payload.patch,
          commentAuthor: comment ? {
            id: user.id,
            provider: user.provider,
            username: user.username,
            profileSlug: user.profile_slug || "",
          } : null,
          commentUpdatedAt: comment ? new Date().toISOString() : null,
        },
      };
    }

    const result = await applyChapterOperationForUser({
      userId: user.id,
      studyId: req.params.id,
      chapterId: req.params.chapterId,
      operation,
    });

    if (!result) {
      res.status(404).json({ error: "Chapter not found or is read-only" });
      return;
    }

    publishUpdate(req.params.id, user, "chapter-operation", {
      chapterId: req.params.chapterId,
      revision: result.chapter.revision,
    });
    res.json(result);
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

    publishUpdate(req.params.id, user, "chapter-deleted", { chapterId: req.params.chapterId });
    res.json({ deleted: true });
  } catch (error) {
    next(error);
  }
});

studiesRouter.post("/:id/collaborators", async (req, res, next) => {
  try {
    const user = await requireStudyUser(req, res);
    if (!user) return;

    const collaboratorProvider = String(req.body.collaboratorProvider || req.body.providerToAdd || "").toLowerCase();
    const collaboratorUsername = String(req.body.collaboratorUsername || req.body.usernameToAdd || "").trim();
    if (!["chess.com", "lichess"].includes(collaboratorProvider) || !collaboratorUsername) {
      res.status(400).json({ error: "Collaborator provider and username are required" });
      return;
    }

    const collaborator = await getUserByProviderUsername({
      provider: collaboratorProvider,
      username: collaboratorUsername,
    });
    if (!collaborator) {
      res.status(404).json({ error: "That user does not have a blunder.ch account yet." });
      return;
    }

    const added = await addStudyCollaborator({
      ownerId: user.id,
      studyId: req.params.id,
      collaboratorId: collaborator.id,
      role: req.body.role,
    });
    if (!added) {
      res.status(404).json({ error: "Only the study owner can add collaborators." });
      return;
    }

    const study = await getStudyForUser({ userId: user.id, studyId: req.params.id });
    publishUpdate(req.params.id, user, "collaborator-added", {
      collaborator: publicPresenceUser(collaborator),
    });
    res.status(201).json({ collaborators: study.collaborators });
  } catch (error) {
    next(error);
  }
});

studiesRouter.delete("/:id/collaborators/:userId", async (req, res, next) => {
  try {
    const user = await requireStudyUser(req, res);
    if (!user) return;

    const deleted = await removeStudyCollaborator({
      ownerId: user.id,
      studyId: req.params.id,
      collaboratorId: req.params.userId,
    });
    if (!deleted) {
      res.status(404).json({ error: "Collaborator not found or only the owner can remove them." });
      return;
    }

    publishUpdate(req.params.id, user, "collaborator-removed", {
      collaboratorId: req.params.userId,
    });
    res.json({ deleted: true });
  } catch (error) {
    next(error);
  }
});
