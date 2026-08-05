import * as argon2 from "argon2";
import jwt, { JsonWebTokenError } from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";
import { UnauthorizedError } from "./error/customerErrorHanlders/unauthorizedError.js";
import express, { Request, Response } from "express";
import crypto from "crypto";
import { BadRequestError } from "./error/customerErrorHanlders/badRequestError.js";

type payload = Pick<JwtPayload, "iss" | "sub" | "iat" | "exp">;

export async function hashPassword(password: string): Promise<string> {
  const str = await argon2.hash(password);
  return str;
}

export async function checkPasswordHash(password: string, hash: string): Promise<boolean> {
  if (await argon2.verify(hash, password)) {
    return true;
  }

  return false;
}
export function makeJWT(userID: string, expiresIn: number, secret: string): string {
  const iat = Math.floor(Date.now() / 1000);
  const payload: payload = {
    iss: "chirpy",
    sub: userID,
    iat: iat,
    exp: iat + expiresIn,
  };
  const token = jwt.sign(payload, secret);
  return token;
}

export function validateJWT(tokenString: string, secret: string): string {
  let decoded: payload;
  try {
    decoded = jwt.verify(tokenString, secret) as JwtPayload;
    if (decoded.iss !== "chirpy") throw new UnauthorizedError("Invalid issuer");
    if (!decoded.sub) throw new UnauthorizedError("no User id in token");
    return decoded.sub;
  } catch (err) {
    throw new UnauthorizedError("Invalid Token");
  }
}

export function getBearerToken(req: Request): string {
  const token = req.get("Authorization");
  if (!token) {
    throw new UnauthorizedError("Token Doesnt exist in the Request!!");
  }

  const arr = token.split(" ");
  if (arr.length < 2 || arr[0] !== "Bearer") {
    throw new BadRequestError("Malformed authorization header");
  }
  return arr[1];
}

export function makeRefreshToken(): string {
  const buffer = crypto.randomBytes(16);
  return buffer.toString("hex");
}

export function getAPIKey(req: Request) {
  const polka_key = req.get("Authorization");
  if (!polka_key) {
    throw new UnauthorizedError("polka key Doesnt exist in the Request!!");
  }

  const arr = polka_key.split(" ");
  if (arr.length < 2 || arr[0] !== "ApiKey") {
    throw new BadRequestError("Malformed authorization header");
  }
  return arr[1];
}
