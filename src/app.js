import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";

// Create __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true // Fixed typo: should be "credentials", not "credential"
}));
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// Set EJS as view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.get("/",async (req,res) => {
    return res.render('home.ejs');
});

import userRouter from "./routes/user.route.js";
import outbreak from "./routes/outbreak.route.js";
import ashaWorker from "./routes/ashaWorker.route.js";
import vacciSchedule from "./routes/vacciSchedule.route.js";

app.use("/api/v1/users", userRouter);
app.use("/api/outbreak", outbreak);
app.use("/api/ashaWorker",ashaWorker);
app.use("/api/vacciSchedule",vacciSchedule);

export { app };