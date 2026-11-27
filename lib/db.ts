import postgres from "postgres";

const g = globalThis as unknown as { sql?: ReturnType<typeof postgres> };
export const sql = g.sql ?? postgres(process.env.DATABASE_URL!, { prepare: false, max: 5 });
if (process.env.NODE_ENV !== "production") g.sql = sql;
