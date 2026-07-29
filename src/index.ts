import express, { Request, Response } from "express";
import { middlewareLogResponsess } from "./middleware/middlewareLogResponses.js";

const app = express();
const PORT = 8080;
app.use("/app", express.static("./src/app"));
app.use(middlewareLogResponsess);

app.get("/healthz", (req: Request, res: Response) => {
  console.log("here");
  res.set("Content-Type", "text/plain");
  res.status(200).send("OK");
});
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
