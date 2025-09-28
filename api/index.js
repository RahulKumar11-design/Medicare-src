import serverless from "serverless-http";
import { app } from "../src/app.js";
import connectDB from "../src/db/index.js";

let dbReady = false;

const handler = async (req, res) => {
  if (!dbReady) {
    await connectDB();
    dbReady = true;
  }

  const wrapped = serverless(app);
  return wrapped(req, res);
};

export default handler;
