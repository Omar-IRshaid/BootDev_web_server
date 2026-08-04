import express, { Request, Response } from "express";
import { middlewareLogResponsess } from "./middleware/middlewareLogResponses.js";
import { middlewareMetricsInc } from "./middleware/middlewareMetricsInc.js";
import { config } from "./config.js";
import { errorHandler } from "./error/errorHandler.js";
import { BadRequestError } from "./error/customerErrorHanlders/badRequestError.js";
import postgres from "postgres";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import { createUser, deleteAllUsers, getSingleUser } from "./db/queries/users.js";
import { ForbiddenError } from "./error/customerErrorHanlders/forbiddenError.js";
import { createChirp, getAllChirps, getSingleChirp } from "./db/queries/chirps.js";
import { NotFoundError } from "./error/customerErrorHanlders/notFoundError.js";
import { checkPasswordHash, hashPassword, makeJWT } from "./auth.js";
import { UnauthorizedError } from "./error/customerErrorHanlders/unauthorizedError.js";

const app = express();
const PORT = 8080;
let count = 0;
const migrationClient = postgres(config.db.url, { max: 1 });
await migrate(drizzle(migrationClient), config.db.migrationConfig);

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
      <p>Chirpy has been visited ${config.api.fileserverHits} times!</p>
    </body>
  </html>`);
});

app.post("/admin/reset", async (req: Request, res: Response) => {
  if (config.api.platform === "dev") {
    config.api.fileserverHits = 0;
    res.end("Count is set to 0");
    await deleteAllUsers();
  } else {
    throw new ForbiddenError("You Are Not Allowed to use /admin/reset endpoint!!");
  }
});

// app.post("/api/validate_chirp", (req: Request, res: Response) => {
//   type para = {
//     body: string;
//   };
//   res.header("Content-Type", "application/json");

//   const obj: para = req.body;

//   if (obj.body.length > 140) {
//     throw new BadRequestError("Chirp is too long. Max length is 140");
//   } else {
//     const arr = obj.body.split(" ");
//     arr.forEach((word, index) => {
//       if (word.toLowerCase() === "kerfuffle" || word.toLowerCase() === "sharbert" || word.toLowerCase() === "fornax") {
//         arr[index] = "****";
//       }
//     });

//     const str = arr.join(" ");

//     const x = { cleanedBody: str };
//     res.status(200).send(JSON.stringify(x));
//   }
// });

app.post("/api/users", async (req: Request, res: Response) => {
  type parameters = {
    email: string;
    password: string;
  };

  const body: parameters = req.body;
  if (!body.email || !body.password) {
    throw new BadRequestError("Missing Fields!");
  }
  const hashed_password = await hashPassword(body.password);

  const newUser = await createUser({ email: body.email, hashed_password: hashed_password });
  if (newUser) {
    res.status(201).json(newUser);
  } else {
    throw new BadRequestError("This Email already exist!!");
  }
});

app.post("/api/chirps", async (req: Request, res: Response) => {
  type parameters = {
    body: string;
    userId: string;
  };

  const params: parameters = req.body;
  if (!params.body || !params.userId) {
    throw new BadRequestError("Missing Fields!");
  }

  let str = params.body;

  if (str.length > 140) {
    throw new BadRequestError("Chirp is too long. Max length is 140");
  } else {
    const arr = str.split(" ");
    arr.forEach((word, index) => {
      if (word.toLowerCase() === "kerfuffle" || word.toLowerCase() === "sharbert" || word.toLowerCase() === "fornax") {
        arr[index] = "****";
      }
    });

    str = arr.join(" ");
  }

  const chirp = await createChirp({ body: str, userId: params.userId });
  if (!chirp) {
    throw new Error("couldnt create this chirp!!");
  }

  res.status(201).json(chirp);
});

app.get("/api/chirps", async (req: Request, res: Response) => {
  const chirps = await getAllChirps();
  res.status(200).json(chirps);
});

app.get("/api/chirps/:chirpId", async (req: Request, res: Response) => {
  const id = req.params.chirpId;
  if (typeof id !== "string") {
    throw new BadRequestError("Invalid ID!!");
  }

  const chirps = await getSingleChirp(id);
  if (!chirps) {
    throw new NotFoundError("Chirp Not Found!!");
  }

  res.status(200).json(chirps);
});

app.post("/api/login", async (req: Request, res: Response) => {
  type parameters = {
    email: string;
    password: string;
    expiresInSeconds: number;
  };

  const params: parameters = req.body;
  if (!params.email || !params.password) {
    throw new BadRequestError("Missing Fields!");
  }

  const user = await getSingleUser(params.email);
  if (!user) {
    throw new UnauthorizedError("incorrect email or password");
  }

  if (!(await checkPasswordHash(params.password, user.hashed_password))) {
    throw new UnauthorizedError("incorrect email or password");
  }

  const expiresInSeconds = params.expiresInSeconds ? (params.expiresInSeconds > 3600 ? 3600 : params.expiresInSeconds) : 3600;
  const token = makeJWT(user.id, expiresInSeconds, config.secret);

  const { hashed_password, ...userResponse } = user;

  const obj = {
    token: token,
  };

  res.status(200).json({ ...userResponse, ...obj });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
