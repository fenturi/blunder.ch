import express from "express";
import { pool } from "../db.js";

export const devRouter = express.Router();

devRouter.get("/users", async (_req, res, next) => {
  try {
    const query = `
      select
        u.id,
        u.provider,
        u.username,
        u.email,
        u.is_premium,
        u.created_at,
        count(distinct i.id)::int as import_count,
        count(distinct g.id)::int as game_count
      from users u
      left join imports i on i.user_id = u.id
      left join games g on g.user_id = u.id
      group by u.id
      order by u.created_at desc
    `;
    const { rows } = await pool.query(query);
    return res.json({ users: rows });
  } catch (error) {
    next(error);
  }
});

devRouter.delete("/users/:id", async (req, res, next) => {
  try {
    const { rowCount } = await pool.query("delete from users where id = $1", [req.params.id]);
    return res.json({ deleted: rowCount });
  } catch (error) {
    next(error);
  }
});

devRouter.delete("/users/:id/games", async (req, res, next) => {
  try {
    const { rowCount } = await pool.query("delete from games where user_id = $1", [req.params.id]);
    return res.json({ deleted: rowCount });
  } catch (error) {
    next(error);
  }
});

devRouter.delete("/imports/:id", async (req, res, next) => {
  try {
    await pool.query("delete from games where import_id = $1", [req.params.id]);
    const { rowCount } = await pool.query("delete from imports where id = $1", [req.params.id]);
    return res.json({ deleted: rowCount });
  } catch (error) {
    next(error);
  }
});

devRouter.post("/reset", async (req, res, next) => {
  try {
    if (req.body?.confirm !== true) {
      return res.status(400).json({ error: "confirm: true is required" });
    }

    await pool.query("truncate table move_annotations, games, imports, users cascade");
    return res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});
