import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL || "postgres://elite_reach:elite_reach_dev@localhost:5432/elite_reach";

export const client = postgres(connectionString);
export const db = drizzle(client, { schema });
export type Db = typeof db;
