import mongoose from "mongoose";
import User from "../models/User.js";

export async function connectDB() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error("MONGO_URI is missing from your .env file");
  }

  // If you previously hit DNS SRV (querySrv ECONNREFUSED) errors with Atlas,
  // uncomment the two lines below to force Node to use public DNS resolvers.
  // import dns from "dns";
  // dns.setServers(["8.8.8.8", "8.8.4.4"]);

  mongoose.connection.on("connected", () => {
    console.log("[db] MongoDB Atlas connected");
  });

  mongoose.connection.on("error", (err) => {
    console.error("[db] MongoDB connection error:", err.message);
  });

  await mongoose.connect(uri);

  // Reconcile indexes with the current User schema. This matters because
  // an older version of this project (or a previous seed) had a unique
  // `username` field that's since been removed from the schema — but the
  // unique index on that column survives in MongoDB regardless of what the
  // schema says. Every new user then gets an implicit `username: null`,
  // and the SECOND person to register collides with the first on that
  // stale index (E11000 duplicate key error, username_1, dup key: null).
  // syncIndexes() drops indexes that no longer match the schema (like
  // username_1) and creates any that are missing (like email_1) — so this
  // fixes it automatically, for anyone's database, without a manual step.
  try {
    await User.syncIndexes();
  } catch (err) {
    console.error("[db] Could not sync User indexes:", err.message);
  }
}
