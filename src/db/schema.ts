import { pgTable, timestamp, varchar, uuid, text } from "drizzle-orm/pg-core";
import e from "express";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  email: varchar("email", { length: 256 }).unique().notNull(),
  hashed_password: varchar("hashed_password").notNull().default("unset"),
});

export const chirps = pgTable("chirps", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  body: varchar("body").notNull(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  userId: uuid("user_id").references(() => users.id, {
    onDelete: "cascade",
  }),
});

export const refresh_tokens = pgTable("refresh_tokens", {
  token: text("token").primaryKey(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  expires_at: timestamp("expires_at").notNull(),
  revoked_at: timestamp("revoked_at"),
  user_id: uuid("user_id")
    .notNull()
    .references(() => users.id, {
      onDelete: "cascade",
    }),
});

export type NewChirp = typeof chirps.$inferInsert;
export type NewUser = typeof users.$inferInsert;
export type NewRefreshToken = typeof refresh_tokens.$inferInsert;
export type RefreshTokenSelect = typeof refresh_tokens.$inferSelect;
