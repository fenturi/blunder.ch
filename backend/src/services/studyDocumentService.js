import crypto from "node:crypto";

const VALID_NAGS = new Set(["!", "?", "!!", "??", "!?", "?!"]);
const VALID_CLASSIFICATIONS = new Set([
  "book",
  "only",
  "best",
  "good",
  "inaccuracy",
  "mistake",
  "blunder",
  "miss",
  "analysis",
]);

function legacyMoveId(move, index) {
  const token = String(move?.uci || move?.san || "move")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  return `legacy-${index}-${token || "move"}`;
}

export function normalizeMarks(value) {
  const circles = Array.isArray(value?.circles)
    ? [...new Set(value.circles.filter((square) => /^[a-h][1-8]$/.test(square)))]
    : [];
  const arrows = Array.isArray(value?.arrows)
    ? value.arrows
      .filter((arrow) => /^[a-h][1-8]$/.test(arrow?.from) && /^[a-h][1-8]$/.test(arrow?.to))
      .filter((arrow, index, all) => all.findIndex((candidate) => (
        candidate.from === arrow.from && candidate.to === arrow.to
      )) === index)
      .map((arrow) => ({ from: arrow.from, to: arrow.to }))
    : [];

  return { arrows, circles };
}

export function normalizeStudyMoves(value) {
  const source = Array.isArray(value) ? value : [];
  let previousId = null;

  return source.map((move, index) => {
    const id = move?.id || legacyMoveId(move, index);
    const hasParent = Object.hasOwn(move || {}, "parentId");
    const normalized = {
      ...move,
      id,
      parentId: hasParent ? move.parentId || null : previousId,
      order: Number.isFinite(Number(move?.order)) ? Number(move.order) : index,
      comment: String(move?.comment || "").slice(0, 10_000),
      commentAuthor: move?.commentAuthor && typeof move.commentAuthor === "object"
        ? {
          id: String(move.commentAuthor.id || ""),
          provider: String(move.commentAuthor.provider || ""),
          username: String(move.commentAuthor.username || ""),
          profileSlug: String(move.commentAuthor.profileSlug || ""),
        }
        : null,
      commentUpdatedAt: move?.commentUpdatedAt || null,
      classificationSource: String(move?.classificationSource || ""),
      bookPolicyVersion: Number(move?.bookPolicyVersion || 0) || null,
      nags: Array.isArray(move?.nags)
        ? [...new Set(move.nags.filter((nag) => VALID_NAGS.has(nag)))]
        : [],
      annotations: normalizeMarks(move?.annotations),
    };
    previousId = id;
    return normalized;
  });
}

function descendantIds(moves, rootId) {
  const removed = new Set([rootId]);
  let changed = true;

  while (changed) {
    changed = false;
    for (const move of moves) {
      if (move.parentId && removed.has(move.parentId) && !removed.has(move.id)) {
        removed.add(move.id);
        changed = true;
      }
    }
  }

  return removed;
}

function cleanMovePatch(patch) {
  const next = {};

  if (Object.hasOwn(patch, "comment")) next.comment = String(patch.comment || "").slice(0, 10_000);
  if (Object.hasOwn(patch, "commentAuthor")) {
    next.commentAuthor = patch.commentAuthor && typeof patch.commentAuthor === "object"
      ? {
        id: String(patch.commentAuthor.id || ""),
        provider: String(patch.commentAuthor.provider || ""),
        username: String(patch.commentAuthor.username || ""),
        profileSlug: String(patch.commentAuthor.profileSlug || ""),
      }
      : null;
  }
  if (Object.hasOwn(patch, "commentUpdatedAt")) next.commentUpdatedAt = patch.commentUpdatedAt || null;
  if (Object.hasOwn(patch, "nags")) {
    next.nags = [...new Set((Array.isArray(patch.nags) ? patch.nags : []).filter((nag) => VALID_NAGS.has(nag)))];
  }
  if (Object.hasOwn(patch, "annotations")) next.annotations = normalizeMarks(patch.annotations);
  if (Object.hasOwn(patch, "classification")) {
    next.classification = VALID_CLASSIFICATIONS.has(patch.classification)
      ? patch.classification
      : "analysis";
  }
  if (Object.hasOwn(patch, "classificationStatus")) {
    next.classificationStatus = ["checking", "classified", "not-book", "failed"].includes(patch.classificationStatus)
      ? patch.classificationStatus
      : "";
  }
  if (Object.hasOwn(patch, "bookMove")) next.bookMove = patch.bookMove || null;
  if (Object.hasOwn(patch, "opening")) next.opening = patch.opening || null;
  if (Object.hasOwn(patch, "classifiedAt")) next.classifiedAt = patch.classifiedAt || null;
  if (Object.hasOwn(patch, "classificationSource")) {
    next.classificationSource = ["masters", "stockfish"].includes(patch.classificationSource)
      ? patch.classificationSource
      : "";
  }
  if (Object.hasOwn(patch, "bookPolicyVersion")) {
    next.bookPolicyVersion = Number(patch.bookPolicyVersion || 0) || null;
  }
  if (Object.hasOwn(patch, "cpLoss")) next.cpLoss = Number(patch.cpLoss) || 0;
  if (Object.hasOwn(patch, "evaluationBefore")) next.evaluationBefore = Number(patch.evaluationBefore) || 0;
  if (Object.hasOwn(patch, "evaluationAfter")) next.evaluationAfter = Number(patch.evaluationAfter) || 0;
  if (Object.hasOwn(patch, "depth")) next.depth = Number(patch.depth) || 0;

  return next;
}

export function applyStudyOperation(document, operation) {
  const moves = normalizeStudyMoves(document?.moves);
  const rootAnnotations = normalizeMarks(document?.rootAnnotations);
  const payload = operation?.payload || {};

  if (operation?.type === "append_move") {
    const parentId = payload.parentId || null;
    if (parentId && !moves.some((move) => move.id === parentId)) {
      throw Object.assign(new Error("Parent move not found"), { status: 409 });
    }

    const duplicate = moves.find((move) => (
      (move.parentId || null) === parentId
      && String(move.uci || "").toLowerCase() === String(payload.move?.uci || "").toLowerCase()
    ));
    if (duplicate) {
      return { moves, rootAnnotations, selectedMoveId: duplicate.id, changed: false };
    }

    const siblingCount = moves.filter((move) => (move.parentId || null) === parentId).length;
    const move = {
      ...payload.move,
      id: payload.move?.id || crypto.randomUUID(),
      parentId,
      order: siblingCount,
      comment: "",
      commentAuthor: null,
      commentUpdatedAt: null,
      classificationSource: "",
      bookPolicyVersion: null,
      nags: [],
      annotations: normalizeMarks(null),
      classification: "analysis",
      classificationStatus: "checking",
    };

    return {
      moves: [...moves, move],
      rootAnnotations,
      selectedMoveId: move.id,
      changed: true,
    };
  }

  if (operation?.type === "update_move") {
    const moveId = String(payload.moveId || "");
    let found = false;
    const nextMoves = moves.map((move) => {
      if (move.id !== moveId) return move;
      found = true;
      return { ...move, ...cleanMovePatch(payload.patch || {}) };
    });

    if (!found) throw Object.assign(new Error("Move not found"), { status: 404 });
    return { moves: nextMoves, rootAnnotations, selectedMoveId: moveId, changed: true };
  }

  if (operation?.type === "delete_move") {
    const moveId = String(payload.moveId || "");
    if (!moves.some((move) => move.id === moveId)) {
      throw Object.assign(new Error("Move not found"), { status: 404 });
    }
    const removed = descendantIds(moves, moveId);
    const deletedMove = moves.find((move) => move.id === moveId);
    return {
      moves: moves.filter((move) => !removed.has(move.id)),
      rootAnnotations,
      selectedMoveId: deletedMove?.parentId || null,
      changed: true,
    };
  }

  if (operation?.type === "set_position_annotations") {
    const moveId = payload.moveId || null;
    const annotations = normalizeMarks(payload.annotations);
    if (!moveId) {
      return { moves, rootAnnotations: annotations, selectedMoveId: null, changed: true };
    }

    let found = false;
    const nextMoves = moves.map((move) => {
      if (move.id !== moveId) return move;
      found = true;
      return { ...move, annotations };
    });
    if (!found) throw Object.assign(new Error("Move not found"), { status: 404 });
    return { moves: nextMoves, rootAnnotations, selectedMoveId: moveId, changed: true };
  }

  if (operation?.type === "promote_variation") {
    const moveId = String(payload.moveId || "");
    const target = moves.find((move) => move.id === moveId);
    if (!target) throw Object.assign(new Error("Move not found"), { status: 404 });

    const siblings = moves
      .filter((move) => (move.parentId || null) === (target.parentId || null))
      .sort((left, right) => left.order - right.order);
    const nextOrder = new Map([moveId, ...siblings.filter((move) => move.id !== moveId).map((move) => move.id)]
      .map((id, index) => [id, index]));
    return {
      moves: moves.map((move) => nextOrder.has(move.id) ? { ...move, order: nextOrder.get(move.id) } : move),
      rootAnnotations,
      selectedMoveId: moveId,
      changed: true,
    };
  }

  throw Object.assign(new Error("Unsupported study operation"), { status: 400 });
}
