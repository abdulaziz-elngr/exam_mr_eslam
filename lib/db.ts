import { neon } from "@neondatabase/serverless";

// Lazy so `next build` doesn't need a database.
export const db = () => neon(process.env.DATABASE_URL!);
