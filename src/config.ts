import type { MigrationConfig } from "drizzle-orm/migrator";
process.loadEnvFile();

type DBConfig = {
  migrationConfig: MigrationConfig;
  url: string;
};

type APIConfig = {
  fileserverHits: number;
  platform: string;
};

type Config = {
  db: DBConfig;
  api: APIConfig;
  secret: string;
};

const migrationConfig: MigrationConfig = {
  migrationsFolder: "./src/db/migrations",
};

const DB_URL = process.env.DB_URL;
if (!envOrThrow(DB_URL)) {
  throw new Error("DB_URL is not defined!!");
}

const platform = process.env.PLATFORM;
if (!envOrThrow(platform)) {
  throw new Error("PLATFORM is not defined!!");
}
const secret = process.env.SECRET;
if (!envOrThrow(secret)) {
  throw new Error("SECRET is not defined!!");
}

const config: Config = {
  db: {
    migrationConfig: migrationConfig,
    url: DB_URL,
  },
  api: {
    fileserverHits: 0,
    platform: platform,
  },
  secret: secret,
};

export { config };

function envOrThrow(key: string | undefined): key is string {
  return typeof key === "string";
}
