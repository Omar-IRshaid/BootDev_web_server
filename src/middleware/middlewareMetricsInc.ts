import { NextFunction, Request, Response } from "express";
import { config } from "../config.js";

function middlewareMetricsInc(req: Request, res: Response, next: NextFunction) {
  config.fileserverHits++;
  next();
}

export { middlewareMetricsInc };
