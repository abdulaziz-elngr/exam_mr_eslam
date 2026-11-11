import crypto from "node:crypto";
import { cookies } from "next/headers";

export const COOKIE = "sf_admin";

export const adminToken = () =>
  crypto.createHmac("sha256", process.env.ADMIN_PASSWORD ?? "").update("step-forward-admin").digest("hex");

export async function isAdmin() {
  if (!process.env.ADMIN_PASSWORD) return false;
  const c = (await cookies()).get(COOKIE)?.value;
  if (!c || !/^[0-9a-f]{64}$/.test(c)) return false;
  return crypto.timingSafeEqual(Buffer.from(c), Buffer.from(adminToken()));
}
