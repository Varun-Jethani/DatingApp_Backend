import dotenv from "dotenv";

import connectDB from "./db/index.js";
import { server } from "./app.js"; // Import server instead of app
dotenv.config({ path: "./.env" });

const startServer = async () => {
  try {
    await connectDB();
    const PORT = process.env.PORT || 8000;
    server.listen(PORT, () => {
      // Use server to start listening
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Error starting server: ", error);
    process.exit(1); // Exit with a failure code
  }
};

startServer();
