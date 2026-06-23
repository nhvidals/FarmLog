import mongoose from "mongoose";
import { app } from "./app";

const port = Number(process.env.PORT ?? 4000);
const mongoUri = process.env.MONGODB_URI ?? "mongodb://localhost:27017/farm_animals";

async function start() {
  await mongoose.connect(mongoUri);
  app.listen(port, () => {
    console.log(`API listening on port ${port}`);
  });
}

start().catch((error) => {
  console.error("Failed to start API", error);
  process.exit(1);
});
