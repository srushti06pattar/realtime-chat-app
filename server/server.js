const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

let users = [];

io.on("connection", (socket) => {
  console.log("User Connected");

  
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

  
  socket.on("typing", (username) => {
    socket.broadcast.emit("typing", username);
  });

  
  socket.on("sendMessage", (data) => {
    io.emit("receiveMessage", data);
  });

  // Logout
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