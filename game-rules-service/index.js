const express = require("express");
const app = express();
app.use(express.json());

const games = new Map(); // roomId -> game state

function createGame(roomId, playerIds) {
  const [p1, p2] = playerIds;
  const secret = Math.floor(Math.random() * 100) + 1; // 1..100
  const startingPlayer = Math.random() < 0.5 ? p1 : p2;

  const game = {
    roomId,
    playerIds,
    secret,
    currentTurnUserId: startingPlayer,
    status: "playing",   // or "finished"
    winnerUserId: null
  };

  games.set(roomId, game);
  return game;
}

// Start a new game for a room
app.post("/startGame", (req, res) => {
  const { roomId, playerIds } = req.body;

  if (!roomId || !Array.isArray(playerIds) || playerIds.length !== 2) {
    return res.status(400).json({ error: "roomId and 2 playerIds required" });
  }

  const game = createGame(roomId, playerIds);

  res.json({
    roomId: game.roomId,
    playerIds: game.playerIds,
    currentTurnUserId: game.currentTurnUserId,
    status: game.status,
    secretRange: [1, 100]
  });
});

// Handle a guess
app.post("/guess", (req, res) => {
  const { roomId, playerId, guess } = req.body;
  const game = games.get(roomId);

  if (!game) {
    return res.status(404).json({ error: "game not found" });
  }

  if (game.status === "finished") {
    return res.status(400).json({ error: "game already finished" });
  }

  if (game.currentTurnUserId !== playerId) {
    return res.status(400).json({ error: "not your turn" });
  }

  if (typeof guess !== "number" || Number.isNaN(guess)) {
    return res.status(400).json({ error: "guess must be a number" });
  }

  let result;
  if (guess < game.secret) {
    result = "too_low";
  } else if (guess > game.secret) {
    result = "too_high";
  } else {
    result = "correct";
    game.status = "finished";
    game.winnerUserId = playerId;
  }

  // Decide next turn
  let nextTurnUserId = game.currentTurnUserId;

  if (game.status !== "finished") {
    const [p1, p2] = game.playerIds;
    nextTurnUserId = game.currentTurnUserId === p1 ? p2 : p1;
    game.currentTurnUserId = nextTurnUserId;
  }

  res.json({
    roomId,
    playerId,
    guess,
    result,
    nextTurnUserId,
    winnerUserId: game.winnerUserId,
    status: game.status
  });
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`Game Rules Service listening on http://localhost:${PORT}`);
});
