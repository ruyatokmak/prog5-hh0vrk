const WebSocket = require("ws");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

const ws = new WebSocket("ws://localhost:3003");

let userId = null;
let currentRoomId = null;
let myTurn = false;

ws.on("open", async () => {
  console.log("Connected to server");
  const username = await ask("Enter username: ");

  ws.send(JSON.stringify({
    type: "login",
    username
  }));
});

ws.on("message", async (data) => {
  const msg = JSON.parse(data.toString());

  // -------- LOGIN SUCCESS --------
  if (msg.type === "login_success") {
    userId = msg.userId;
    console.log(`Logged in as ${msg.username} (userId: ${userId})`);

    const choice = await ask("Create room (c) or join room (j)? ");

    if (choice.toLowerCase().startsWith("c")) {
      ws.send(JSON.stringify({ type: "create_room" }));
    } else {
      const roomId = await ask("Enter room ID to join: ");
      ws.send(JSON.stringify({ type: "join_room", roomId }));
    }
  }

  // -------- ROOM JOINED --------
  else if (msg.type === "room_joined") {
    currentRoomId = msg.roomId;
    console.log(`Joined room: ${msg.roomId}`);
    console.log(`Players in room: ${msg.players.join(", ")}`);
  }

  // -------- GAME STARTED --------
  else if (msg.type === "game_started") {
    console.log("\n--- GAME STARTED ---");
    console.log(`Players: ${msg.players.join(" vs ")}`);
    console.log(`Number is between ${msg.secretRange[0]} and ${msg.secretRange[1]}`);
    console.log(`Current turn: User ${msg.currentTurnUserId}\n`);

    myTurn = (msg.currentTurnUserId === userId);

    if (myTurn) {
      const g = await ask("Your turn! Enter your guess: ");
      ws.send(JSON.stringify({
        type: "guess",
        roomId: currentRoomId,
        guess: Number(g)
      }));
    }
  }

  // -------- GUESS RESULT --------
  else if (msg.type === "guess_result") {
    console.log(`\nPlayer ${msg.playerId} guessed ${msg.guess}: ${msg.result}`);

    if (msg.status === "finished") {
      console.log(`🎉 GAME OVER! Winner: ${msg.winnerUserId}`);
      rl.close();
      ws.close();
      return;
    }

    if (msg.nextTurnUserId === userId) {
      myTurn = true;
      const g = await ask("\nYour turn! Enter your guess: ");
      ws.send(JSON.stringify({
        type: "guess",
        roomId: currentRoomId,
        guess: Number(g)
      }));
    } else {
      myTurn = false;
      console.log(`Waiting for opponent's move...`);
    }
  }

  // -------- ERROR --------
  else if (msg.type === "error") {
    console.log("Error:", msg.error);
  }
});

ws.on("error", (err) => {
  console.error("Connection error:", err.message || err);
  rl.close();
  process.exit(1);
});

ws.on("close", () => {
  console.log("Disconnected from server");
  rl.close();
  process.exit(0);
});
