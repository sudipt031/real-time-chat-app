const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:5173", methods: ["GET", "POST"] },
});

const messageHistory = [];
const MAX_HISTORY = 100;

const users = new Map();

const typingUsers = new Set();

function broadcastUsers() {
  io.emit("users_update", Array.from(users.values()));
}

function broadcastTyping() {
  io.emit("typing_update", Array.from(typingUsers));
}

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("join", (username) => {
    users.set(socket.id, username);
    console.log(`${username} joined`);

    socket.emit("message_history", messageHistory);

    const systemMsg = {
      type: "system",
      text: `${username} joined the chat`,
      time: new Date().toISOString(),
    };
    messageHistory.push(systemMsg);
    if (messageHistory.length > MAX_HISTORY) messageHistory.shift();
    io.emit("new_message", systemMsg);

    broadcastUsers();
  });

  socket.on("send_message", ({ text }) => {
    const username = users.get(socket.id);
    if (!username || !text) return;

    const msg = {
      username,
      text,
      time: new Date().toISOString(),
      type: "message",
    };
    messageHistory.push(msg);
    if (messageHistory.length > MAX_HISTORY) messageHistory.shift();
    io.emit("new_message", msg);

    typingUsers.delete(username);
    broadcastTyping();
  });

  socket.on("typing", () => {
    const username = users.get(socket.id);
    if (username) {
      typingUsers.add(username);
      broadcastTyping();
    }
  });

  socket.on("stop_typing", () => {
    const username = users.get(socket.id);
    if (username) {
      typingUsers.delete(username);
      broadcastTyping();
    }
  });

  socket.on("disconnect", () => {
    const username = users.get(socket.id);
    if (username) {
      users.delete(socket.id);
      typingUsers.delete(username);

      const systemMsg = {
        type: "system",
        text: `${username} left the chat`,
        time: new Date().toISOString(),
      };
      messageHistory.push(systemMsg);
      if (messageHistory.length > MAX_HISTORY) messageHistory.shift();
      io.emit("new_message", systemMsg);

      broadcastUsers();
      broadcastTyping();
    }
    console.log("Client disconnected:", socket.id);
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`âœ… Server running at http://localhost:${PORT}`);
});