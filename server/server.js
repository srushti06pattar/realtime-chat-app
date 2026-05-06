const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

let users = [];

io.on("connection", (socket) => {
  console.log("User Connected");

  // Join Chat
  socket.on("join", (username) => {
    users.push({
      id: socket.id,
      username,
    });

    io.emit(
      "activeUsers",
      users.map((u) => u.username)
    );
  });

  // Typing Indicator
  socket.on("typing", (username) => {
    socket.broadcast.emit("typing", username);
  });

  // Send Message
  socket.on("sendMessage", (data) => {
    io.emit("receiveMessage", data);
  });

  // Disconnect
  socket.on("disconnect", () => {
    users = users.filter(
      (user) => user.id !== socket.id
    );

    io.emit(
      "activeUsers",
      users.map((u) => u.username)
    );

    console.log("User Disconnected");
  });
});

server.listen(5000, () => {
  console.log("Server running on port 5000");
});