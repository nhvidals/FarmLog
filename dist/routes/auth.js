"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_1 = require("../models/User");
const token_1 = require("../utils/token");
const http_1 = require("../utils/http");
exports.authRouter = (0, express_1.Router)();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function parseCredentials(body) {
    const { email, password } = (body ?? {});
    if (typeof email !== "string" || typeof password !== "string")
        return null;
    const trimmed = email.trim().toLowerCase();
    if (!EMAIL_RE.test(trimmed) || password.length < 8)
        return null;
    return { email: trimmed, password };
}
exports.authRouter.post("/register", async (req, res) => {
    const creds = parseCredentials(req.body);
    if (!creds) {
        return res.status(400).json({ message: "Valid email and password (min 8 chars) are required" });
    }
    try {
        const existing = await User_1.UserModel.exists({ email: creds.email });
        if (existing)
            return res.status(409).json({ message: "Email already registered" });
        const passwordHash = await bcryptjs_1.default.hash(creds.password, 10);
        const user = await User_1.UserModel.create({ email: creds.email, passwordHash });
        const token = (0, token_1.signToken)(String(user._id));
        return res.status(201).json({ token, user: { id: user._id, email: user.email } });
    }
    catch (error) {
        return (0, http_1.serverError)(res);
    }
});
exports.authRouter.post("/login", async (req, res) => {
    const creds = parseCredentials(req.body);
    if (!creds) {
        return res.status(401).json({ message: "Invalid credentials" });
    }
    try {
        const user = await User_1.UserModel.findOne({ email: creds.email });
        // Always run a hash comparison to avoid leaking whether the email exists.
        const ok = user
            ? await bcryptjs_1.default.compare(creds.password, user.passwordHash)
            : await bcryptjs_1.default.compare(creds.password, "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv");
        if (!user || !ok)
            return res.status(401).json({ message: "Invalid credentials" });
        const token = (0, token_1.signToken)(String(user._id));
        return res.json({ token, user: { id: user._id, email: user.email } });
    }
    catch (error) {
        return (0, http_1.serverError)(res);
    }
});
