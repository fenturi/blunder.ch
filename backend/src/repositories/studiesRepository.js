import { pool } from "../db.js";

function normalizeStudy(row) {
  if (!row) return null;

  return {
    ...row,
    chapters: row.chapters || [],
  };
}

export async function listStudiesForUser(userId) {
  const query = `
    select
      s.id,
      s.user_id,
      s.name,
      s.created_at,
      s.updated_at,
      count(sc.id)::int as chapter_count,
      coalesce(sum(jsonb_array_length(sc.moves)), 0)::int as move_count
    from studies s
    left join study_chapters sc on sc.study_id = s.id
    where s.user_id = $1
    group by s.id
    order by s.updated_at desc, s.created_at desc
  `;
  const { rows } = await pool.query(query, [userId]);
  return rows;
}

export async function createStudyForUser(userId, name = "Untitled study") {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const studyResult = await client.query(
      `
        insert into studies (user_id, name)
        values ($1, $2)
        returning *
      `,
      [userId, name.trim() || "Untitled study"]
    );
    const study = studyResult.rows[0];
    await client.query(
      `
        insert into study_chapters (study_id, name, sort_order)
        values ($1, 'Chapter 1', 0)
      `,
      [study.id]
    );
    await client.query("COMMIT");
    return getStudyForUser({ userId, studyId: study.id });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getStudyForUser({ userId, studyId }) {
  const studyQuery = `
    select *
    from studies
    where id = $1 and user_id = $2
  `;
  const chaptersQuery = `
    select
      id,
      study_id,
      name,
      root_fen,
      moves,
      sort_order,
      created_at,
      updated_at
    from study_chapters
    where study_id = $1
    order by sort_order asc, created_at asc
  `;
  const [studyResult, chapterResult] = await Promise.all([
    pool.query(studyQuery, [studyId, userId]),
    pool.query(chaptersQuery, [studyId]),
  ]);

  if (!studyResult.rows[0]) return null;
  return normalizeStudy({
    ...studyResult.rows[0],
    chapters: chapterResult.rows,
  });
}

export async function renameStudyForUser({ userId, studyId, name }) {
  const { rows } = await pool.query(
    `
      update studies
      set name = $3,
          updated_at = now()
      where id = $1 and user_id = $2
      returning *
    `,
    [studyId, userId, name.trim() || "Untitled study"]
  );
  return rows[0] ?? null;
}

export async function deleteStudyForUser({ userId, studyId }) {
  const { rowCount } = await pool.query(
    "delete from studies where id = $1 and user_id = $2",
    [studyId, userId]
  );
  return rowCount > 0;
}

export async function createChapterForUser({ userId, studyId, name }) {
  const study = await getStudyForUser({ userId, studyId });
  if (!study) return null;

  const nextOrder = study.chapters.length
    ? Math.max(...study.chapters.map((chapter) => chapter.sort_order || 0)) + 1
    : 0;
  const { rows } = await pool.query(
    `
      insert into study_chapters (study_id, name, sort_order)
      values ($1, $2, $3)
      returning *
    `,
    [studyId, name.trim() || `Chapter ${nextOrder + 1}`, nextOrder]
  );
  await touchStudy(studyId);
  return rows[0] ?? null;
}

export async function updateChapterForUser({ userId, studyId, chapterId, patch }) {
  const study = await getStudyForUser({ userId, studyId });
  if (!study || !study.chapters.some((chapter) => chapter.id === chapterId)) return null;

  const nextName = Object.hasOwn(patch, "name")
    ? String(patch.name || "").trim() || "Untitled chapter"
    : null;
  const nextRootFen = Object.hasOwn(patch, "rootFen") ? patch.rootFen : null;
  const nextMoves = Object.hasOwn(patch, "moves") ? JSON.stringify(patch.moves || []) : null;

  const { rows } = await pool.query(
    `
      update study_chapters
      set name = coalesce($3, name),
          root_fen = coalesce($4, root_fen),
          moves = coalesce($5::jsonb, moves),
          updated_at = now()
      where id = $1 and study_id = $2
      returning *
    `,
    [
      chapterId,
      studyId,
      nextName,
      nextRootFen,
      nextMoves,
    ]
  );
  await touchStudy(studyId);
  return rows[0] ?? null;
}

export async function deleteChapterForUser({ userId, studyId, chapterId }) {
  const study = await getStudyForUser({ userId, studyId });
  if (!study || study.chapters.length <= 1) return false;

  const { rowCount } = await pool.query(
    `
      delete from study_chapters
      where id = $1 and study_id = $2
    `,
    [chapterId, studyId]
  );
  await touchStudy(studyId);
  return rowCount > 0;
}

async function touchStudy(studyId) {
  await pool.query("update studies set updated_at = now() where id = $1", [studyId]);
}
