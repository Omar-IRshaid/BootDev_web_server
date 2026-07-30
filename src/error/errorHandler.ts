import { Request, Response, NextFunction } from "express";
import { NotFoundError } from "./customerErrorHanlders/notFoundError.js";
import { BadRequestError } from "./customerErrorHanlders/badRequestError.js";
import { UnauthorizedError } from "./customerErrorHanlders/unauthorizedError.js";
import { ForbiddenError } from "./customerErrorHanlders/forbiddenError.js";

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  if (err instanceof NotFoundError) {
    res.status(404).json({
      error: err.message,
    });
  } else if (err instanceof BadRequestError) {
    res.status(400).json({
      error: err.message,
    });
  } else if (err instanceof UnauthorizedError) {
    res.status(401).json({
      error: err.message,
    });
  } else if (err instanceof ForbiddenError) {
    res.status(403).json({
      error: err.message,
    });
  }
  console.error("Uh oh, spaghetti-o");
  console.log(err.message);
}
