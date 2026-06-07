import "dotenv/config";
import express, { NextFunction, Request, response, Response } from 'express';
import cors from "cors";
import { connect } from "node:http2";
import connectDB from "./config/db.js";
import authRouter from "./routes/authRoutes.js";
import socialAuthRouter from "./routes/socialAuthRoutes.js";
import accountRouter from "./routes/accountsRoutes.js";
import postRouter from "./routes/postRoutes.js";

const app = express();

// Database connection
await connectDB()

// Middleware
app.use(cors())
app.use(express.json());


// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction)=>{
  console.error(err);
  res.status(500).send(err?.response?.data?.message || err?.message)
})

const port = process.env.PORT || 3000;

app.get('/', (_req: Request, res: Response) => {
    res.send('Server is Live!');
});

app.use("/api/auth",authRouter)
app.use("/api/auth",socialAuthRouter)
app.use("/api/accounts",accountRouter)
app.use("/api/posts",postRouter)
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});