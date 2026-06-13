import assert from "node:assert/strict";
import test from "node:test";
import {
  applyStudyOperation,
  normalizeMarks,
  normalizeStudyMoves,
} from "../src/services/studyDocumentService.js";

const firstMove = {
  id: "move-1",
  uci: "e2e4",
  san: "e4",
  fenBefore: "start",
  fenAfter: "after-e4",
};

test("legacy linear study moves become a parent-linked main line", () => {
  const moves = normalizeStudyMoves([
    { uci: "e2e4", san: "e4" },
    { uci: "e7e5", san: "e5" },
  ]);

  assert.equal(moves[0].parentId, null);
  assert.equal(moves[1].parentId, moves[0].id);
  assert.deepEqual(moves[0].annotations, { arrows: [], circles: [] });
});

test("append move creates a branch and deduplicates the same continuation", () => {
  const first = applyStudyOperation({ moves: [firstMove] }, {
    type: "append_move",
    payload: {
      parentId: "move-1",
      move: { id: "move-2", uci: "c7c5", san: "c5" },
    },
  });
  const duplicate = applyStudyOperation({ moves: first.moves }, {
    type: "append_move",
    payload: {
      parentId: "move-1",
      move: { id: "another-id", uci: "c7c5", san: "c5" },
    },
  });

  assert.equal(first.moves.length, 2);
  assert.equal(first.moves[1].parentId, "move-1");
  assert.equal(duplicate.moves.length, 2);
  assert.equal(duplicate.selectedMoveId, "move-2");
});

test("delete move removes its complete descendant tree but keeps sibling variations", () => {
  const moves = [
    firstMove,
    { id: "move-2", parentId: "move-1", order: 0, uci: "e7e5" },
    { id: "move-3", parentId: "move-2", order: 0, uci: "g1f3" },
    { id: "move-4", parentId: "move-1", order: 1, uci: "c7c5" },
  ];
  const result = applyStudyOperation({ moves }, {
    type: "delete_move",
    payload: { moveId: "move-2" },
  });

  assert.deepEqual(result.moves.map((move) => move.id), ["move-1", "move-4"]);
  assert.equal(result.selectedMoveId, "move-1");
});

test("comments, authors, classifications, and board annotations are normalized", () => {
  const updated = applyStudyOperation({ moves: [firstMove] }, {
    type: "update_move",
    payload: {
      moveId: "move-1",
      patch: {
        comment: "Critical position",
        commentAuthor: {
          id: "user-1",
          provider: "lichess",
          username: "teacher",
          profileSlug: "teacher",
        },
        classification: "mistake",
        classificationStatus: "classified",
        cpLoss: 175,
        evaluationBefore: 30,
        evaluationAfter: -145,
        depth: 16,
        classificationSource: "stockfish",
        bookPolicyVersion: null,
      },
    },
  });
  const marked = applyStudyOperation({ moves: updated.moves }, {
    type: "set_position_annotations",
    payload: {
      moveId: "move-1",
      annotations: {
        circles: ["e4", "e4", "z9"],
        arrows: [
          { from: "g1", to: "f3" },
          { from: "g1", to: "f3" },
          { from: "x1", to: "f3" },
        ],
      },
    },
  });

  assert.equal(marked.moves[0].comment, "Critical position");
  assert.equal(marked.moves[0].commentAuthor.username, "teacher");
  assert.equal(marked.moves[0].classification, "mistake");
  assert.equal(marked.moves[0].cpLoss, 175);
  assert.equal(marked.moves[0].evaluationAfter, -145);
  assert.equal(marked.moves[0].classificationSource, "stockfish");
  assert.deepEqual(marked.moves[0].annotations, {
    circles: ["e4"],
    arrows: [{ from: "g1", to: "f3" }],
  });
  assert.deepEqual(normalizeMarks(null), { arrows: [], circles: [] });
});
