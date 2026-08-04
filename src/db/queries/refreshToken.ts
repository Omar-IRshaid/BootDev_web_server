import { NewRefreshToken, refresh_tokens, RefreshTokenSelect } from "../schema.js";
import { db } from "../index.js";
import { asc, eq, and, isNotNull, gt, isNull } from "drizzle-orm";

export async function createRefreshToken(RToken: NewRefreshToken) {
  const [result] = await db.insert(refresh_tokens).values(RToken).onConflictDoNothing().returning();
  return result;
}

export async function getSingleRToken(token: string) {
  const [result] = await db
    .select()
    .from(refresh_tokens)
    .where(and(eq(refresh_tokens.token, token), isNull(refresh_tokens.revoked_at), gt(refresh_tokens.expires_at, new Date())));
  return result;
}

export async function updateSingleRToken(token: string) {
  const [result] = await db.update(refresh_tokens).set({ revoked_at: new Date() }).where(eq(refresh_tokens.token, token));
  return result;
}
