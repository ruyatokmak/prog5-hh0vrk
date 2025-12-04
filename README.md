# Number Guessing Game - Setup Guide

## System Architecture

The game consists of 3 backend microservices and 1 CLI client:

```
┌─────────────────────────────────────────────┐
│           CLI Client (client.js)            │
│       (WebSocket Connection to Room)        │
└──────────────────┬──────────────────────────┘
                   │
                   │ WebSocket
                   ▼
    ┌──────────────────────────────────┐
    │    Room Service (Port 3003)      │
    │  - Manages game rooms            │
    │  - Handles player connections    │
    │  - Coordinates turns             │
    └──────────┬─────────────┬─────────┘
               │ HTTP        │ HTTP
               ▼             ▼
    ┌──────────────────┐  ┌──────────────────────────┐
    │ User Service     │  │ Game Rules Service       │
    │ (Port 3001)      │  │ (Port 3002)              │
    │ - Register users │  │ - Apply game logic       │
    │ - Manage players │  │ - Validate guesses       │
    └──────────────────┘  │ - Determine winners      │
                          └──────────────────────────┘
```

## Quick Start (3 Steps)

### Step 1: Start All Services

```bash
# Navigate to project root
cd /Users/ruyatokmak/number-guessing-project

# Make the startup script executable
chmod +x start-services.sh

# Run the startup script
./start-services.sh
```

This will:
- ✅ Stop any existing services
- ✅ Start User Service on port 3001
- ✅ Start Game Rules Service on port 3002
- ✅ Start Room Service on port 3003
- ✅ Verify all services are responding

### Step 2: Start the CLI Client

Open a **NEW terminal window** and run:

```bash
cd /Users/ruyatokmak/number-guessing-project/cli-client
node client.js
```

### Step 3: Play the Game

Follow the prompts:

1. **Enter Username**: Type any username (e.g., `player1`)
   ```
   Enter username: player1
   ```

2. **Create or Join Room**:
   - Type `c` to create a new room
   - OR type `j` to join an existing room

3. **If creating a room (`c`):**
   - Share the room ID with another player
   - Wait for them to join
   - Game starts automatically when 2 players join

4. **If joining a room (`j`):**
   - Enter the room ID provided by the room creator
   - Wait for the game to start

5. **Play:**
   - When it's your turn, enter your guess (1-100)
   - See the result: `too_low`, `too_high`, or `correct`
   - Take turns with the other player
   - First one to guess the secret number wins!

## Manual Setup (If You Prefer)

### Terminal 1: User Service

```bash
cd /Users/ruyatokmak/number-guessing-project/user-service
node index.js
```

Output should show:
```
User Service listening on http://localhost:3001
```

### Terminal 2: Game Rules Service

```bash
cd /Users/ruyatokmak/number-guessing-project/game-rules-service
node index.js
```

Output should show:
```
Game Rules Service listening on http://localhost:3002
```

### Terminal 3: Room Service

```bash
cd /Users/ruyatokmak/number-guessing-project/room-service
node index.js
```

Output should show:
```
Room Service running on http://localhost:3003
```

### Terminal 4: CLI Client

```bash
cd /Users/ruyatokmak/number-guessing-project/cli-client
node client.js
```

Then repeat steps for a second player in a new terminal.

## Troubleshooting

### Services won't start
- Check if ports 3001, 3002, 3003 are already in use
- Kill existing processes: `pkill -f "node index.js"`
- Try again

### Can't connect to room service
- Verify room service is running: `lsof -i :3003`
- Check logs: `cat /tmp/room-service.log`

### Game won't start
- Ensure exactly 2 players are in the room
- Check room service logs for errors
- Restart all services

### Stop all services
```bash
pkill -f "node index.js"
pkill -f "node client.js"
```

## Game Rules

1. **Secret Number**: Between 1 and 100
2. **Turns**: Players alternate making guesses
3. **Feedback**: Each guess receives:
   - `too_low` - guess is below the secret
   - `too_high` - guess is above the secret
   - `correct` - you found it! (You win!)
4. **Win Condition**: First player to guess correctly wins

## Project Structure

```
number-guessing-project/
├── user-service/
│   ├── index.js          # User registration & validation
│   └── package.json
├── game-rules-service/
│   ├── index.js          # Game logic & guess validation
│   └── package.json
├── room-service/
│   ├── index.js          # Room management & WebSocket server
│   └── package.json
├── cli-client/
│   ├── client.js         # Interactive CLI client
│   └── package.json
└── start-services.sh     # Quick startup script
```

## Service-to-Service APIs

Microservices communicate via HTTP REST endpoints to share data and coordinate game logic.

### Room Service → User Service

**GET /users/{userId}**
- **Purpose**: Retrieve player information
- **Request**: 
  ```
  GET /users/player1
  ```
- **Response** (200 OK):
  ```json
  {
    "userId": "player1",
    "username": "player1",
    "createdAt": "2025-12-04T13:05:00Z"
  }
  ```
- **Error** (404 Not Found):
  ```json
  {
    "error": "User not found"
  }
  ```

### Room Service → Game Rules Service

**POST /validate-guess**
- **Purpose**: Validate a player's guess against the secret number
- **Request**:
  ```json
  {
    "guess": 50,
    "secretNumber": 42
  }
  ```
- **Response** (200 OK):
  ```json
  {
    "result": "too_high",
    "message": "Your guess is too high"
  }
  ```

**POST /generate-number**
- **Purpose**: Generate a random secret number for the game
- **Request**: `POST /generate-number`
- **Response** (200 OK):
  ```json
  {
    "secretNumber": 42
  }
  ```

## Client-Server APIs (WebSocket)

The CLI client communicates with the Room Service via WebSocket for real-time game interactions.

### Client to Server Messages

**1. Join/Create Room**
```json
{
  "type": "join_room",
  "action": "create",
  "username": "player1"
}
```
or
```json
{
  "type": "join_room",
  "action": "join",
  "username": "player2",
  "roomId": "room123"
}
```

**2. Make a Guess**
```json
{
  "type": "guess",
  "guess": 50,
  "playerId": "player1"
}
```

**3. Get Room Status**
```json
{
  "type": "get_status",
  "roomId": "room123"
}
```

### Server to Client Messages

**1. Room Created**
```json
{
  "type": "room_created",
  "roomId": "room123",
  "message": "Room created successfully",
  "players": ["player1"]
}
```

**2. Player Joined**
```json
{
  "type": "player_joined",
  "username": "player2",
  "players": ["player1", "player2"],
  "message": "Game is starting with 2 players"
}
```

**3. Game Started**
```json
{
  "type": "game_started",
  "roomId": "room123",
  "currentTurn": "player1",
  "message": "Game has started. Player1 goes first."
}
```

**4. Guess Result**
```json
{
  "type": "guess_result",
  "playerId": "player1",
  "guess": 50,
  "result": "too_high",
  "message": "Your guess 50 is too high",
  "nextTurn": "player2"
}
```

**5. Game Won**
```json
{
  "type": "game_won",
  "winner": "player1",
  "secretNumber": 42,
  "guess": 42,
  "message": "Congratulations! You won!",
  "gameOver": true
}
```

**6. Game Over (All Players)**
```json
{
  "type": "game_over",
  "winner": "player1",
  "roomId": "room123",
  "message": "Game has ended. player1 is the winner!"
}
```

**7. Error Message**
```json
{
  "type": "error",
  "message": "Invalid guess. Please enter a number between 1 and 100"
}
```

**8. Room Status**
```json
{
  "type": "status",
  "roomId": "room123",
  "players": ["player1", "player2"],
  "currentTurn": "player1",
  "gameState": "in_progress",
  "guessHistory": [
    {
      "player": "player1",
      "guess": 50,
      "result": "too_high"
    }
  ]
}
```

## Development Notes

- **User Service**: Express REST API
- **Game Rules Service**: Express REST API
- **Room Service**: Express + WebSocket (ws library)
- **CLI Client**: Node.js with readline & WebSocket

All services communicate via HTTP/WebSocket and maintain state in memory.
