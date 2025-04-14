import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { Server } from "socket.io"; // Updated import
import http from "http"; // Added import for HTTP server
import dotenv from "dotenv";
dotenv.config();
const app = express();
const corsOptions = {
  origin: true, // Allow requests from any origin
  optionsSuccessStatus: 200,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cookieParser());

import userRouter from "./routes/user.routes.js";
import bodyParser from "body-parser";
app.use("/user", userRouter);

app.use("/", (req, res) => {
  res.json("Hell");
});

const server = http.createServer(app); // Create HTTP server
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
}); // Initialize socket.io with CORS options

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);
  });
}); // Basic socket connection setup

export { app, server }; // Export both app and server
