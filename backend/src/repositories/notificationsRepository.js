import { pool } from "../db.js";

export async function createNotification({
  userId,
  type,
  title,
  body = "",
  href = "",
  entityKey,
  availableAt = new Date(),
}) {
  const { rows } = await pool.query(
    `
      insert into notifications (
        user_id,
        type,
        title,
        body,
        href,
        entity_key,
        available_at
      )
      values ($1, $2, $3, $4, $5, $6, $7)
      on conflict (user_id, type, entity_key)
      do update set
        title = excluded.title,
        body = excluded.body,
        href = excluded.href,
        available_at = excluded.available_at,
        updated_at = now()
      returning *
    `,
    [userId, type, title, body, href, entityKey, availableAt]
  );

  return rows[0];
}

export async function listNotifications(userId, limit = 100) {
  const { rows } = await pool.query(
    `
      select
        *,
        available_at <= now() as is_available
      from notifications
      where user_id = $1
      order by
        (available_at <= now() and read_at is null) desc,
        (available_at > now()) desc,
        available_at desc,
        created_at desc
      limit $2
    `,
    [userId, limit]
  );

  return rows;
}

export async function countUnreadNotifications(userId) {
  const { rows } = await pool.query(
    `
      select count(*)::int as unread_count
      from notifications
      where user_id = $1
        and available_at <= now()
        and read_at is null
    `,
    [userId]
  );

  return rows[0]?.unread_count ?? 0;
}

export async function markNotificationRead({ notificationId, userId }) {
  const { rows } = await pool.query(
    `
      update notifications
      set read_at = coalesce(read_at, now()),
          updated_at = now()
      where id = $1
        and user_id = $2
        and available_at <= now()
      returning *
    `,
    [notificationId, userId]
  );

  return rows[0] ?? null;
}

export async function markAllNotificationsRead(userId) {
  const { rowCount } = await pool.query(
    `
      update notifications
      set read_at = now(),
          updated_at = now()
      where user_id = $1
        and available_at <= now()
        and read_at is null
    `,
    [userId]
  );

  return rowCount;
}
