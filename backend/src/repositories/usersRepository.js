import { pool } from "../db.js";

export async function upsertUser({ provider, username, email = null, passwordHash = null, isPremium = false, deviceId = null }) {
  const query = `
    insert into users (provider, username, email, password_hash, is_premium, premium_redeemed_at, device_id)
    values ($1, $2, $3, $4, $5, case when $5 then now() else null end, $6)
    on conflict (provider, username)
    do update set username = excluded.username,
                  email = coalesce(excluded.email, users.email),
                  password_hash = coalesce(excluded.password_hash, users.password_hash),
                  is_premium = users.is_premium or excluded.is_premium,
                  device_id = coalesce(users.device_id, excluded.device_id),
                  premium_redeemed_at = case
                    when users.is_premium or excluded.is_premium then coalesce(users.premium_redeemed_at, now())
                    else users.premium_redeemed_at
                  end
    returning *
  `;

  const { rows } = await pool.query(query, [
    provider,
    username.toLowerCase(),
    email?.toLowerCase() ?? null,
    passwordHash,
    isPremium,
    deviceId,
  ]);
  return rows[0];
}

export async function getUserByEmail(email) {
  const { rows } = await pool.query(
    "select * from users where lower(email) = lower($1)",
    [email]
  );
  return rows[0] ?? null;
}

export async function getUserByProviderUsername({ provider, username }) {
  const query = `
    select *
    from users
    where provider = $1 and username = $2
  `;

  const { rows } = await pool.query(query, [provider, username.toLowerCase()]);
  return rows[0] ?? null;
}

export async function getUserByDeviceId(deviceId) {
  const { rows } = await pool.query(
    "select * from users where device_id = $1",
    [deviceId]
  );
  return rows[0] ?? null;
}

export async function redeemPremium({ provider, username }) {
  const query = `
    update users
    set is_premium = true,
        premium_redeemed_at = coalesce(premium_redeemed_at, now())
    where provider = $1 and username = $2
    returning *
  `;

  const { rows } = await pool.query(query, [provider, username.toLowerCase()]);
  return rows[0] ?? null;
}

export async function activatePremium({ provider, username }) {
  return redeemPremium({ provider, username });
}
