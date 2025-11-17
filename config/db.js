import pgPromise from "pg-promise";
import dotenv from "dotenv";

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "campus_activity",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "CREDO",
};

// ✅ log AFTER defining it
console.log("🔍 DB Config:", dbConfig);

const pgp = pgPromise();
const db = pgp(dbConfig);

db.connect()
  .then(() => console.log("✅ Database connected successfully"))
  .catch((err) => console.error("❌ Database connection error:", err.message));

export default db;
