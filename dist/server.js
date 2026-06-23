"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const app_1 = require("./app");
const port = Number(process.env.PORT ?? 4000);
const mongoUri = process.env.MONGODB_URI ?? "mongodb://localhost:27017/farm_animals";
async function start() {
    await mongoose_1.default.connect(mongoUri);
    app_1.app.listen(port, () => {
        console.log(`API listening on port ${port}`);
    });
}
start().catch((error) => {
    console.error("Failed to start API", error);
    process.exit(1);
});
