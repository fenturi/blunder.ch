import { pool } from "../db.js";

export async function replaceAnnotationsForGame(gameId, annotations) {
  await pool.query("delete from move_annotations where game_id = $1", [gameId]);

  for (const annotation of annotations) {
    const query = `
      insert into move_annotations (
        game_id,
        move_index,
        ply,
        san,
        from_square,
        to_square,
        fen_before,
        fen_after,
        classification,
        evaluation_before,
        evaluation_after,
        evaluation_loss,
        cp_loss,
        game_phase,
        clock_seconds,
        move_time_seconds,
        time_trouble
      )
      values (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13, $14, $15, $16,
        $17
      )
    `;

    const values = [
      gameId,
      annotation.moveIndex,
      annotation.ply,
      annotation.san,
      annotation.fromSquare,
      annotation.toSquare,
      annotation.fenBefore,
      annotation.fenAfter,
      annotation.classification,
      annotation.evaluationBefore,
      annotation.evaluationAfter,
      annotation.evaluationLoss,
      annotation.cpLoss,
      annotation.gamePhase,
      annotation.clockSeconds,
      annotation.moveTimeSeconds,
      annotation.timeTrouble,
    ];

    await pool.query(query, values);
  }
}
