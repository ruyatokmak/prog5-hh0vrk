#!/bin/bash

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_DIR="/Users/ruyatokmak/number-guessing-project"

echo -e "${BLUE}"
echo "═══════════════════════════════════════════════════════════════════════════"
echo "          NUMBER GUESSING GAME - QUICK START SCRIPT"
echo "═══════════════════════════════════════════════════════════════════════════"
echo -e "${NC}"

# Kill any existing processes
echo -e "${YELLOW}[1/4] Stopping any existing services...${NC}"
pkill -f "node index.js" 2>/dev/null || true
pkill -f "node client.js" 2>/dev/null || true
pkill -f "node test-game.js" 2>/dev/null || true
sleep 1

# Start services
echo -e "${YELLOW}[2/4] Starting backend services...${NC}"

cd "$PROJECT_DIR/user-service"
node index.js > /tmp/user-service.log 2>&1 &
USER_SERVICE_PID=$!
echo -e "${GREEN}✓ User Service${NC} (PID: $USER_SERVICE_PID, Port: 3001)"

cd "$PROJECT_DIR/game-rules-service"
node index.js > /tmp/game-rules-service.log 2>&1 &
GAME_SERVICE_PID=$!
echo -e "${GREEN}✓ Game Rules Service${NC} (PID: $GAME_SERVICE_PID, Port: 3002)"

cd "$PROJECT_DIR/room-service"
node index.js > /tmp/room-service.log 2>&1 &
ROOM_SERVICE_PID=$!
echo -e "${GREEN}✓ Room Service${NC} (PID: $ROOM_SERVICE_PID, Port: 3003)"

# Wait for services to start
echo -e "${YELLOW}[3/4] Waiting for services to start...${NC}"
sleep 3

# Verify services are running
echo -e "${YELLOW}[4/4] Verifying services...${NC}"
curl -s http://localhost:3001/register -X POST -H "Content-Type: application/json" -d '{"username":"verify"}' > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ User Service${NC} responding"
else
  echo -e "${RED}✗ User Service${NC} not responding"
fi

curl -s http://localhost:3002/startGame -X POST -H "Content-Type: application/json" -d '{"roomId":"verify","playerIds":["1","2"]}' > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Game Rules Service${NC} responding"
else
  echo -e "${RED}✗ Game Rules Service${NC} not responding"
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}                    ALL SERVICES RUNNING${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo ""
echo -e "${YELLOW}Option 1: Interactive 2-Player Game (Recommended)${NC}"
echo "  Run in a NEW terminal:"
echo -e "    ${GREEN}cd $PROJECT_DIR/cli-client && node client.js${NC}"
echo ""
echo -e "${YELLOW}Option 2: Automated Game${NC}"
echo "  Run in a NEW terminal:"
echo -e "    ${GREEN}cd $PROJECT_DIR/cli-client && node test-game.js${NC}"
echo ""
echo -e "${YELLOW}To stop all services:${NC}"
echo -e "    ${GREEN}pkill -f 'node index.js'${NC}"
echo ""

# Keep script running to maintain services
wait
