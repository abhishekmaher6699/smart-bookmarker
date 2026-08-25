import {Pool} from "pg";
import { env, requireEnv } from "../config/env.js";

const databaseUrl = requireEnv(env.databaseUrl, "DATABASE_URL");

export const pool = new Pool({
    connectionString: databaseUrl,
})
