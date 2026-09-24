import dotenv from "dotenv";
dotenv.config();

import cors from "cors";
import express, { Express, Request, Response } from "express";
import { errorHandler } from "./middleware/errorHandler";
import routes from "./routes";

const app: Express = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

app.use("/", routes);

app.use(errorHandler);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running on port ${PORT}`);
});
