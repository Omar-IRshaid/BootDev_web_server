import express, { Request, Response } from "express";
import { middlewareLogResponsess } from "./middleware/middlewareLogResponses.js";
import { middlewareMetricsInc } from "./middleware/middlewareMetricsInc.js";
import { config } from "./config.js";
import { errorHandler } from "./error/errorHandler.js";
import { BadRequestError } from "./error/customerErrorHanlders/badRequestError.js";
import postgres from "postgres";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import { createUser, deleteAllUsers, getSingleUser, getSingleUserById, updateSingleUser, updateSingleUserToChirpyRed } from "./db/queries/users.js";
import { ForbiddenError } from "./error/customerErrorHanlders/forbiddenError.js";
import { createChirp, deleteSingleChirp, getAllChirps, getSingleChirp } from "./db/queries/chirps.js";
import { NotFoundError } from "./error/customerErrorHanlders/notFoundError.js";
import { checkPasswordHash, getBearerToken, hashPassword, makeJWT, makeRefreshToken, validateJWT } from "./auth.js";
import { UnauthorizedError } from "./error/customerErrorHanlders/unauthorizedError.js";
import { createRefreshToken, getSingleRToken, updateSingleRToken } from "./db/queries/refreshToken.js";
import { validate as isUUID } from "uuid";

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
  };

  const params: parameters = req.body;
  if (!params.body) {
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

  const token = getBearerToken(req);
  const userId = validateJWT(token, config.secret);
  const chirp = await createChirp({ body: str, userId: userId });
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

  if (!isUUID(id)) {
    throw new BadRequestError("Invalid UUID ID");
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

  const expiresInSeconds = 3600;
  const token = makeJWT(user.id, expiresInSeconds, config.secret);
  const refreshToken = makeRefreshToken();
  const RTokenObj = await createRefreshToken({ token: refreshToken, user_id: user.id, expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) });
  if (!RTokenObj) {
    throw new BadRequestError("Coudnt create the Refresh token obj!!!");
  }

  const { hashed_password, ...userResponse } = user;

  const obj = {
    token: token,
    refreshToken: refreshToken,
  };

  res.status(200).json({ ...userResponse, ...obj });
});

app.post("/api/refresh", async (req: Request, res: Response) => {
  const refreshToken = getBearerToken(req);

  const RTokenObj = await getSingleRToken(refreshToken);
  if (!RTokenObj) {
    res.status(401).send();
    return;
  }

  const user = await getSingleUserById(RTokenObj.user_id);
  if (!user) {
    throw new NotFoundError("User Not Found!!");
  }

  const token = makeJWT(user.id, 3600, config.secret);

  res.status(200).json({ token: token });
});

app.post("/api/revoke", async (req: Request, res: Response) => {
  const refreshToken = getBearerToken(req);

  const RTokenObj = await getSingleRToken(refreshToken);
  if (!RTokenObj) {
    res.status(401).send();
  }

  await updateSingleRToken(RTokenObj.token);
  res.status(204).send();
});

app.put("/api/users", async (req: Request, res: Response) => {
  type parameters = {
    email: string;
    password: string;
  };

  const body = req.body;
  const BToken = getBearerToken(req);
  console.log(BToken);
  const userId = validateJWT(BToken, config.secret);
  const user = await getSingleUserById(userId);
  if (!user) {
    throw new NotFoundError("User Not Found!!");
  }
  const hashed_password = await hashPassword(body.password);
  if (body.email) user.email = body.email;
  if (body.password) user.hashed_password = hashed_password;

  const updatedUser = await updateSingleUser(user);
  res.status(200).json(updatedUser);
});

app.get("/api/users/:userId", async (req: Request, res: Response) => {
  const id = req.params.userId;
  if (typeof id !== "string") {
    throw new BadRequestError("Invalid ID!!");
  }

  if (!isUUID(id)) {
    throw new BadRequestError("Invalid UUID ID");
  }

  const user = await getSingleUserById(id);
  if (!user) {
    throw new NotFoundError("Chirp Not Found!!");
  }

  res.status(200).json(user);
});

app.delete("/api/chirps/:chirpId", async (req: Request, res: Response) => {
  const id = req.params.chirpId;
  if (typeof id !== "string") {
    throw new BadRequestError("Invalid ID!!");
  }

  if (!isUUID(id)) {
    throw new BadRequestError("Invalid UUID ID");
  }

  const token = getBearerToken(req);
  const userId = validateJWT(token, config.secret);
  const chirp = await getSingleChirp(id);
  if (!chirp) {
    throw new NotFoundError("Chirp Not Found!!");
  }

  if (chirp.userId === userId) {
    await deleteSingleChirp(id);
    res.status(204).json({ success: true, msg: "Chirp deleted successfully" });
  } else {
    throw new ForbiddenError("User is not the author of this CHIRP!!");
  }
});

app.post("/api/polka/webhooks", async (req: Request, res: Response) => {
  type parameters = {
    event: string;
    data: {
      userId: string;
    };
  };

  const body: parameters = req.body;
  if (!body.event || !body.data || !body.data.userId) {
    throw new BadRequestError("Missing Fields!!");
  }

  if (body.event !== "user.upgraded") {
    res.status(204).send("Even is not User.updgrade!!");
    return;
  }

  const user = await getSingleUserById(body.data.userId);
  if (!user) {
    throw new NotFoundError("User Not Found!!");
  }

  await updateSingleUserToChirpyRed(user.id);
  res.status(204).send();
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
