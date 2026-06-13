import { pool } from "../db.js";
import { applyStudyOperation, normalizeMarks, normalizeStudyMoves } from "../services/studyDocumentService.js";

export const MAX_STUDY_CHAPTERS = 10;

function normalizeChapter(row) {
  if (!row) return null;
  return {
    ...row,
    moves: normalizeStudyMoves(row.moves),
    root_annotations: normalizeMarks(row.root_annotations),
    revision: Number(row.revision || 0),
  };
}

function normalizeStudy(row) {
  if (!row) return null;
  return {
    ...row,
    chapters: (row.chapters || []).map(normalizeChapter),
    collaborators: row.collaborators || [],
  };
}

async function getAccess(executor, { userId, studyId }) {
  const { rows } = await executor.query(
    `
      select
        s.id,
        s.user_id,
        case
          when s.user_id = $2 then 'owner'
          else sc.role
        end as access_role
      from studies s
      left join study_collaborators sc
        on sc.study_id = s.id and sc.user_id = $2
      where s.id = $1
        and (s.user_id = $2 or sc.user_id = $2)
    `,
    [studyId, userId]
  );
  return rows[0] ?? null;
}

function canEdit(access) {
  return access?.access_role === "owner" || access?.access_role === "editor";
}

export async function getStudyAccess({ userId, studyId }) {
  return getAccess(pool, { userId, studyId });
}

export async function listStudiesForUser(userId) {
  const query = `
    select
      s.id,
      s.user_id,
      s.name,
      s.created_at,
      s.updated_at,
      case when s.user_id = $1 then 'owner' else sc.role end as access_role,
      owner.username as owner_username,
      owner.provider as owner_provider,
      (
        select count(*)::int
        from study_chapters chapters
        where chapters.study_id = s.id
      ) as chapter_count,
      (
        select coalesce(sum(jsonb_array_length(chapters.moves)), 0)::int
        from study_chapters chapters
        where chapters.study_id = s.id
      ) as move_count,
      (
        select count(*)::int
        from study_collaborators collaborators
        where collaborators.study_id = s.id
      ) as collaborator_count
    from studies s
    join users owner on owner.id = s.user_id
    left join study_collaborators sc
      on sc.study_id = s.id and sc.user_id = $1
    where s.user_id = $1 or sc.user_id = $1
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
    select
      s.*,
      case when s.user_id = $2 then 'owner' else sc.role end as access_role,
      owner.username as owner_username,
      owner.provider as owner_provider
    from studies s
    join users owner on owner.id = s.user_id
    left join study_collaborators sc
      on sc.study_id = s.id and sc.user_id = $2
    where s.id = $1
      and (s.user_id = $2 or sc.user_id = $2)
  `;
  const chaptersQuery = `
    select
      id,
      study_id,
      name,
      root_fen,
      root_annotations,
      moves,
      revision,
      sort_order,
      created_at,
      updated_at
    from study_chapters
    where study_id = $1
    order by sort_order asc, created_at asc
  `;
  const collaboratorsQuery = `
    select
      u.id,
      u.provider,
      u.username,
      u.profile_slug,
      u.avatar_preset,
      u.avatar_data_url,
      sc.role,
      sc.created_at
    from study_collaborators sc
    join users u on u.id = sc.user_id
    where sc.study_id = $1
    order by sc.created_at asc
  `;
  const [studyResult, chapterResult, collaboratorResult] = await Promise.all([
    pool.query(studyQuery, [studyId, userId]),
    pool.query(chaptersQuery, [studyId]),
    pool.query(collaboratorsQuery, [studyId]),
  ]);

  if (!studyResult.rows[0]) return null;
  return normalizeStudy({
    ...studyResult.rows[0],
    chapters: chapterResult.rows,
    collaborators: collaboratorResult.rows,
  });
}

export async function renameStudyForUser({ userId, studyId, name }) {
  const access = await getStudyAccess({ userId, studyId });
  if (!canEdit(access)) return null;

  const { rows } = await pool.query(
    `
      update studies
      set name = $2,
          updated_at = now()
      where id = $1
      returning *
    `,
    [studyId, name.trim() || "Untitled study"]
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
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const access = await getAccess(client, { userId, studyId });

    if (!canEdit(access)) {
      await client.query("ROLLBACK");
      return null;
    }

    await client.query("select id from studies where id = $1 for update", [studyId]);
    const chapterResult = await client.query(
      `
        select count(*)::int as chapter_count,
               coalesce(max(sort_order), -1)::int as max_sort_order
        from study_chapters
        where study_id = $1
      `,
      [studyId]
    );
    const { chapter_count: chapterCount, max_sort_order: maxSortOrder } = chapterResult.rows[0];

    if (chapterCount >= MAX_STUDY_CHAPTERS) {
      const error = new Error(`Studies can have up to ${MAX_STUDY_CHAPTERS} chapters.`);
      error.status = 409;
      throw error;
    }

    const nextOrder = maxSortOrder + 1;
    const { rows } = await client.query(
      `
        insert into study_chapters (study_id, name, sort_order)
        values ($1, $2, $3)
        returning *
      `,
      [studyId, name.trim() || `Chapter ${nextOrder + 1}`, nextOrder]
    );
    await client.query("update studies set updated_at = now() where id = $1", [studyId]);
    await client.query("COMMIT");
    return normalizeChapter(rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateChapterForUser({ userId, studyId, chapterId, patch }) {
  const access = await getStudyAccess({ userId, studyId });
  if (!canEdit(access)) return null;

  const nextName = Object.hasOwn(patch, "name")
    ? String(patch.name || "").trim() || "Untitled chapter"
    : null;
  const nextRootFen = Object.hasOwn(patch, "rootFen") ? patch.rootFen : null;
  const nextMoves = Object.hasOwn(patch, "moves") ? JSON.stringify(normalizeStudyMoves(patch.moves)) : null;
  const nextRootAnnotations = Object.hasOwn(patch, "rootAnnotations")
    ? JSON.stringify(normalizeMarks(patch.rootAnnotations))
    : null;

  const { rows } = await pool.query(
    `
      update study_chapters
      set name = coalesce($3, name),
          root_fen = coalesce($4, root_fen),
          moves = coalesce($5::jsonb, moves),
          root_annotations = coalesce($6::jsonb, root_annotations),
          revision = case when $5::jsonb is not null or $6::jsonb is not null then revision + 1 else revision end,
          updated_at = now()
      where id = $1 and study_id = $2
      returning *
    `,
    [chapterId, studyId, nextName, nextRootFen, nextMoves, nextRootAnnotations]
  );
  if (!rows[0]) return null;
  await touchStudy(studyId);
  return normalizeChapter(rows[0]);
}

export async function applyChapterOperationForUser({ userId, studyId, chapterId, operation }) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const access = await getAccess(client, { userId, studyId });
    if (!canEdit(access)) {
      await client.query("ROLLBACK");
      return null;
    }

    const { rows } = await client.query(
      `
        select *
        from study_chapters
        where id = $1 and study_id = $2
        for update
      `,
      [chapterId, studyId]
    );
    const chapter = rows[0];
    if (!chapter) {
      await client.query("ROLLBACK");
      return null;
    }

    const result = applyStudyOperation({
      moves: chapter.moves,
      rootAnnotations: chapter.root_annotations,
    }, operation);
    const updated = await client.query(
      `
        update study_chapters
        set moves = $3::jsonb,
            root_annotations = $4::jsonb,
            revision = revision + 1,
            updated_at = now()
        where id = $1 and study_id = $2
        returning *
      `,
      [chapterId, studyId, JSON.stringify(result.moves), JSON.stringify(result.rootAnnotations)]
    );
    await client.query("update studies set updated_at = now() where id = $1", [studyId]);
    await client.query("COMMIT");
    return {
      chapter: normalizeChapter(updated.rows[0]),
      selectedMoveId: result.selectedMoveId,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteChapterForUser({ userId, studyId, chapterId }) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const access = await getAccess(client, { userId, studyId });
    if (!canEdit(access)) {
      await client.query("ROLLBACK");
      return false;
    }

    await client.query("select id from studies where id = $1 for update", [studyId]);
    const { rows } = await client.query(
      "select count(*)::int as chapter_count from study_chapters where study_id = $1",
      [studyId]
    );
    if ((rows[0]?.chapter_count || 0) <= 1) {
      await client.query("ROLLBACK");
      return false;
    }

    const { rowCount } = await client.query(
      "delete from study_chapters where id = $1 and study_id = $2",
      [chapterId, studyId]
    );
    if (rowCount) {
      await client.query("update studies set updated_at = now() where id = $1", [studyId]);
    }
    await client.query("COMMIT");
    return rowCount > 0;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function addStudyCollaborator({ ownerId, studyId, collaboratorId, role = "editor" }) {
  if (ownerId === collaboratorId) {
    throw Object.assign(new Error("The study owner already has access."), { status: 409 });
  }

  const { rows } = await pool.query(
    `
      insert into study_collaborators (study_id, user_id, role, invited_by)
      select id, $3, $4, $2
      from studies
      where id = $1 and user_id = $2
      on conflict (study_id, user_id)
      do update set role = excluded.role
      returning *
    `,
    [studyId, ownerId, collaboratorId, role === "viewer" ? "viewer" : "editor"]
  );
  if (!rows[0]) return null;
  await touchStudy(studyId);
  return rows[0];
}

export async function removeStudyCollaborator({ ownerId, studyId, collaboratorId }) {
  const { rowCount } = await pool.query(
    `
      delete from study_collaborators
      where study_id = $1
        and user_id = $3
        and exists (
          select 1 from studies where id = $1 and user_id = $2
        )
    `,
    [studyId, ownerId, collaboratorId]
  );
  if (rowCount) await touchStudy(studyId);
  return rowCount > 0;
}

async function touchStudy(studyId) {
  await pool.query("update studies set updated_at = now() where id = $1", [studyId]);
}
