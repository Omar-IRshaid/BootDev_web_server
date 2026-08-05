import { db } from "../index.js";
import { NewUser, SelectUser, users } from "../schema.js";
import { asc, eq } from "drizzle-orm";

export async function createUser(user: NewUser) {
  type UserResponse = Omit<NewUser, "hashed_password">;
  const [result] = await db.insert(users).values(user).onConflictDoNothing().returning();
  if (!result) return undefined;
  const { hashed_password, ...userResponse } = result;
  return userResponse satisfies UserResponse;
}

export async function deleteAllUsers() {
  await db.delete(users);
}

export async function getSingleUser(email: string) {
  const [result] = await db.select().from(users).where(eq(users.email, email));
  return result;
}

export async function getSingleUserById(id: string) {
  const [result] = await db.select().from(users).where(eq(users.id, id));
  return result;
}

export async function updateSingleUser(user: SelectUser) {
  const [result] = await db.update(users).set(user).where(eq(users.id, user.id)).returning();
  const { hashed_password, ...updatedUser } = result;
  return updatedUser;
}

export async function updateSingleUserToChirpyRed(id: string) {
  const [result] = await db.update(users).set({ isChirpyRed: true }).where(eq(users.id, id)).returning();
  if (!result) return undefined;
  const { hashed_password, ...updatedUser } = result;
  return updatedUser;
}
