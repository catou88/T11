import express from "express";
import cors from "cors";
import routes from "./routes.js";

function normalizeOrigin(raw, fallback) {
    let s = String(raw ?? fallback).trim();
    if (
        (s.startsWith('"') && s.endsWith('"')) ||
        (s.startsWith("'") && s.endsWith("'"))
    ) {
        s = s.slice(1, -1).trim();
    }
    return s.replace(/\/+$/, "");
}

const FRONTEND_URL = normalizeOrigin(
    process.env.FRONTEND_URL,
    "http://localhost:5173",
);

const app = express();

app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json());
app.use('', routes);

export default app;
