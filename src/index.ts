import express, { Request, Response } from "express";
import { middlewareLogResponsess } from "./middleware/middlewareLogResponses.js";
import { middlewareMetricsInc } from "./middleware/middlewareMetricsInc.js";
import { config } from "./config.js";

const app = express();
const PORT = 8080;
let count = 0;
app.use("/app", middlewareMetricsInc, express.static("./src/app"));
app.use(middlewareLogResponsess);

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
  let body = "";
  res.header("Content-Type", "application/json");

  req.on("data", (data) => {
    body += data;
  });

  req.on("end", () => {
    try {
      const obj: para = JSON.parse(body);

      if (obj.body.length > 140) {
        const x = { error: "Chirp is too long" };
        res.status(400).send(JSON.stringify(x));
      } else {
        const x = { valid: true };
        res.status(200).send(JSON.stringify(x));
      }
    } catch (error) {
      const x = { error: "Something went wrong" };
      res.status(400).send(JSON.stringify(x));
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
