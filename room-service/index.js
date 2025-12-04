const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const axios = require("axios");

const app = express();
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let nextRoomId = 1;
const rooms = new Map(); 
// rooms[roomId] = { players: [id1, id2], sockets: { id1: ws, id2: ws }, status }

function broadcast(roomId, payload) {
  const room = rooms.get(roomId);
  if (!room) return;

  const message = JSON.stringify(payload);
  for (const userId of room.players) {
    const socket = room.sockets[userId];
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(message);
    }
  }
}

// HTTP endpoint 
app.post("/rooms", (req, res) => {
  const { userId } = req.body;
  const roomId = String(nextRoomId++);
  rooms.set(roomId, {
    roomId,
    players: [userId],
    sockets: {},
    status: "waiting"
  });
  res.json({ roomId });
});

// --- WebSocket part ---
wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.userId = null;
  ws.username = null;
  ws.roomId = null;

  ws.on("message", async (data) => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return ws.send(JSON.stringify({ type: "error", error: "invalid JSON" }));
    }

    const type = msg.type;

    // ------------ LOGIN HANDLER ------------
    if (type === "login") {
      const { username } = msg;

      try {
        const resp = await axios.post("http://localhost:3001/register", { username });
        ws.userId = resp.data.userId;
        ws.username = username;

        ws.send(JSON.stringify({
          type: "login_success",
          userId: ws.userId,
          username: ws.username
        }));
      } catch (err) {
        return ws.send(JSON.stringify({ type: "error", error: "User Service unavailable" }));
      }
    }

    // Must be logged in after this point
    else if (!ws.userId) {
      return ws.send(JSON.stringify({ type: "error", error: "please login first" }));
    }

    // ------------ CREATE ROOM ------------
    else if (type === "create_room") {
      const roomId = String(nextRoomId++);
      rooms.set(roomId, {
        roomId,
        players: [ws.userId],
        sockets: { [ws.userId]: ws },
        status: "waiting"
      });
      ws.roomId = roomId;

      ws.send(JSON.stringify({
        type: "room_joined",
        roomId,
        players: [ws.userId]
      }));
    }

    // ------------ JOIN ROOM ------------
    else if (type === "join_room") {
      const { roomId } = msg;
      const room = rooms.get(roomId);

      if (!room) {
        return ws.send(JSON.stringify({ type: "error", error: "Room does not exist" }));
      }
      if (room.players.length >= 2) {
        return ws.send(JSON.stringify({ type: "error", error: "Room is full" }));
      }

      room.players.push(ws.userId);
      room.sockets[ws.userId] = ws;
      ws.roomId = roomId;

      broadcast(roomId, {
        type: "room_joined",
        roomId,
        players: room.players
      });

      // Start game once 2 players
      if (room.players.length === 2) {
        try {
          const resp = await axios.post("http://localhost:3002/startGame", {
            roomId,
            playerIds: room.players
          });

          const game = resp.data;
          room.status = "playing";

          broadcast(roomId, {
            type: "game_started",
            roomId,
            players: room.players,
            currentTurnUserId: game.currentTurnUserId,
            secretRange: game.secretRange,
            status: game.status
          });

        } catch (err) {
          return broadcast(roomId, { type: "error", error: "Failed to start game" });
        }
      }
    }

    // ------------ GUESS HANDLER ------------
    else if (type === "guess") {
      const { roomId, guess } = msg;
      const room = rooms.get(roomId);

      if (!room) return ws.send(JSON.stringify({ type: "error", error: "room not found" }));
      if (room.status !== "playing")
        return ws.send(JSON.stringify({ type: "error", error: "game not active" }));

      try {
        const resp = await axios.post("http://localhost:3002/guess", {
          roomId,
          playerId: ws.userId,
          guess: Number(guess)
        });

        broadcast(roomId, {
          type: "guess_result",
          roomId,
          playerId: ws.userId,
          guess,
          ...resp.data
        });

        if (resp.data.status === "finished") {
          room.status = "finished";
        }

      } catch (err) {
        ws.send(JSON.stringify({
          type: "error",
          error: err.response?.data?.error || "Game Rules Service error"
        }));
      }
    }

    else {
      ws.send(JSON.stringify({ type: "error", error: "unknown event type" }));
    }
  });

  ws.on("close", () => console.log("Client disconnected"));
});

const PORT = 3003;
server.listen(PORT, () => {
  console.log(`Room Service running on http://localhost:${PORT}`);
});
