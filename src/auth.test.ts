import { describe, it, expect, beforeAll } from "vitest";
import { checkPasswordHash, hashPassword, makeJWT, validateJWT } from "./auth.js";

describe("Password Hashing", () => {
  const password1 = "correctPassword123!";
  const password2 = "anotherPassword456!";
  let hash1: string;
  let hash2: string;

  beforeAll(async () => {
    hash1 = await hashPassword(password1);
    hash2 = await hashPassword(password2);
  });

  it("should return true for the correct password", async () => {
    const result = await checkPasswordHash(password1, hash1);
    expect(result).toBe(true);
  });
});

describe("JWT", () => {
  const password1 = "correctPassword123!";
  const password2 = "anotherPassword456!";
  const secret = "omar";
  let token1: string;
  let token2: string;
  let token3: string;

  beforeAll(async () => {
    token1 = makeJWT("1", 20000, secret);
    token2 = makeJWT("2", 20000, secret);
    token3 = makeJWT("3", -1, secret);
  });

  it("should return true for the correct password", async () => {
    const result = validateJWT(token1, secret);
    expect(result).toBe("1");
  });

  it("should return true for the correct password", async () => {
    const result = validateJWT(token2, secret);
    expect(result).toBe("2");
  });

  it("should reject an expired token", () => {
    expect(() => validateJWT(token3, secret)).toThrow();
  });
});
