import { pool, init, localISOString } from "./client";

export interface PushSubscription {
  id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export async function savePushSubscription(endpoint: string, p256dh: string, auth: string): Promise<void> {
  await init();
  await pool.query(
    `INSERT INTO push_subscriptions (endpoint, p256dh, auth, created_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (endpoint) DO UPDATE SET p256dh = $2, auth = $3`,
    [endpoint, p256dh, auth, localISOString()]
  );
}

export async function deletePushSubscription(endpoint: string): Promise<void> {
  await init();
  await pool.query(`DELETE FROM push_subscriptions WHERE endpoint = $1`, [endpoint]);
}

export async function getPushSubscriptions(): Promise<PushSubscription[]> {
  await init();
  const res = await pool.query(`SELECT * FROM push_subscriptions`);
  return res.rows;
}
