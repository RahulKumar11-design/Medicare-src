import serverless from "serverless-http";
import { app } from "../src/app.js";
import connectDB from "../src/db/index.js";

// Connect DB once when the Lambda cold starts
let connected = false;
async function ensureDB() {
  if (!connected) {
    await connectDB();
    connected = true;
    console.log("✅ MongoDB connected (Vercel)");
  }
}

const handler = async (req, res) => {
  await ensureDB();
  const wrapped = serverless(app);
  return wrapped(req, res);
};

export default handler;
