import express, { Request, Response } from "express";
import { middlewareLogResponsess } from "./middleware/middlewareLogResponses.js";
import { middlewareMetricsInc } from "./middleware/middlewareMetricsInc.js";
import { config } from "./config.js";
import { errorHandler } from "./error/errorHandler.js";
import { BadRequestError } from "./error/customerErrorHanlders/badRequestError.js";

const app = express();
const PORT = 8080;
let count = 0;
app.use("/app", middlewareMetricsInc, express.static("./src/app"));
app.use(middlewareLogResponsess);
app.use(express.json());

app.get("/api/healthz", (req: Request, res: Response) => {
  count++;
  console.log("here");
  res.set("Content-Type", "text/plain");
  res.status(200).send("OK");
});

app.get("/admin/metrics", (req: Request, res: Response) => {
  res.set("Content-Type", "text/html; charset=utf-8");
  // res.status(200).send("ok");
  res.status(200).send(`<html>
    <body>
      <h1>Welcome, Chirpy Admin</h1>
      <p>Chirpy has been visited ${config.fileserverHits} times!</p>
    </body>
  </html>`);
});

app.post("/admin/reset", (req: Request, res: Response) => {
  config.fileserverHits = 0;
  res.end("Count is set to 0");
});

app.post("/api/validate_chirp", (req: Request, res: Response) => {
  type para = {
    body: string;
  };
  res.header("Content-Type", "application/json");

  const obj: para = req.body;

  if (obj.body.length > 140) {
    throw new BadRequestError("Chirp is too long. Max length is 140");
  } else {
    const arr = obj.body.split(" ");
    arr.forEach((word, index) => {
      if (word.toLowerCase() === "kerfuffle" || word.toLowerCase() === "sharbert" || word.toLowerCase() === "fornax") {
        arr[index] = "****";
      }
    });

    const str = arr.join(" ");

    const x = { cleanedBody: str };
    res.status(200).send(JSON.stringify(x));
  }
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
