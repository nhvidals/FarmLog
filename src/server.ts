import "dotenv/config";
import mongoose from "mongoose";
import { app } from "./app";

const port = Number(process.env.PORT ?? 4000);
const mongoUri = process.env.MONGODB_URI ?? "mongodb://localhost:27017/farm_animals";

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is not set — refusing to start. Set it in your environment or .env file.");
  process.exit(1);
}

async function start() {
  await mongoose.connect(mongoUri);
  const server = app.listen(port, () => {
    console.log(`API listening on port ${port}`);
  });

  // Graceful shutdown: stop accepting connections, then close the DB.
  const shutdown = async (signal: string) => {
    console.log(`${signal} received, shutting down...`);
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

start().catch((error) => {
  console.error("Failed to start API", error);
  process.exit(1);
});
