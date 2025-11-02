#!/bin/bash

# AI Team Intelligence Platform - One-Click Startup Script
# This script installs dependencies and runs both backend and frontend

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo -e "${PURPLE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║       AI TEAM INTELLIGENCE PLATFORM                        ║"
echo "║       Fortune 500 Knowledge Graph Dashboard                ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Function to print section headers
print_section() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
print_section "Checking Prerequisites"

if ! command_exists python3; then
    echo -e "${RED}❌ Python 3 is not installed. Please install Python 3.9+${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Python 3 found: $(python3 --version)${NC}"

if ! command_exists node; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js found: $(node --version)${NC}"

if ! command_exists npm; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm found: $(npm --version)${NC}"

# Check for .env file
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  No .env file found. Creating one...${NC}"
    cat > .env << EOF
# OpenAI API Key
OPENAI_API_KEY=your-api-key-here
EOF
    echo -e "${YELLOW}⚠ Created .env file - Please add your OpenAI API key${NC}"
    echo -e "${YELLOW}  Edit .env and add your key, or set OPENAI_API_KEY environment variable${NC}"
else
    echo -e "${GREEN}✓ .env file exists${NC}"
fi

# Install Python dependencies
print_section "Installing Python Dependencies"

if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Creating Python virtual environment...${NC}"
    python3 -m venv venv
    echo -e "${YELLOW}Installing Python packages...${NC}"
    venv/bin/pip install -q --upgrade pip
    venv/bin/pip install -q -r requirements.txt
    echo -e "${GREEN}✓ Python dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Virtual environment already exists${NC}"
    # Quick check if key packages are installed
    if ! venv/bin/python -c "import fastapi, openai, networkx" 2>/dev/null; then
        echo -e "${YELLOW}Installing missing Python packages...${NC}"
        venv/bin/pip install -q --upgrade pip
        venv/bin/pip install -q -r requirements.txt
        echo -e "${GREEN}✓ Python dependencies installed${NC}"
    else
        echo -e "${GREEN}✓ Python dependencies already installed${NC}"
    fi
fi

# Install Frontend dependencies
print_section "Installing Frontend Dependencies"

cd frontend

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing Node.js packages (this may take a minute)...${NC}"
    npm install --legacy-peer-deps --silent
    echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Node modules already installed (skipping)${NC}"
fi

# Ensure no stale build artifacts linger between runs
rm -rf dist node_modules/.vite

cd ..

# Kill any existing processes on ports 8000 and 5173
print_section "Checking for Existing Processes"

if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${YELLOW}Killing process on port 8000...${NC}"
    kill -9 $(lsof -t -i:8000) 2>/dev/null || true
fi

if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${YELLOW}Killing process on port 5173...${NC}"
    kill -9 $(lsof -t -i:5173) 2>/dev/null || true
fi

echo -e "${GREEN}✓ Ports cleared${NC}"

# Create log directory
mkdir -p logs

# Start Backend
print_section "Starting Backend Server"

echo -e "${YELLOW}Starting FastAPI backend on port 8000...${NC}"
nohup venv/bin/python server.py > logs/backend.log 2>&1 &
BACKEND_PID=$!

echo -e "${GREEN}✓ Backend starting (PID: $BACKEND_PID)${NC}"

# Wait for backend to be ready
echo -e "${YELLOW}Waiting for backend to initialize...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:8000/ > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend is ready!${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Backend failed to start. Check logs/backend.log${NC}"
        exit 1
    fi
    sleep 1
    echo -n "."
done
echo ""

# Get backend stats
BACKEND_INFO=$(curl -s http://localhost:8000/)
echo -e "${GREEN}Backend info: $BACKEND_INFO${NC}"

# Start Frontend
print_section "Starting Frontend Server"

echo -e "${YELLOW}Starting React frontend on port 5173...${NC}"
cd frontend
nohup npm run dev -- --force > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!

echo -e "${GREEN}✓ Frontend starting (PID: $FRONTEND_PID)${NC}"

# Wait for frontend to be ready
echo -e "${YELLOW}Waiting for frontend to initialize...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:5173/ > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Frontend is ready!${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Frontend failed to start. Check logs/frontend.log${NC}"
        exit 1
    fi
    sleep 1
    echo -n "."
done
echo ""

cd ..

# Save PIDs for cleanup
echo $BACKEND_PID > logs/backend.pid
echo $FRONTEND_PID > logs/frontend.pid

# Success message
echo -e "\n${GREEN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║  ✅  SYSTEM READY FOR DEMO!                                ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${PURPLE}🌐 Frontend Dashboard:${NC}  http://localhost:5173"
echo -e "${PURPLE}🔧 Backend API:${NC}         http://localhost:8000"
echo -e "${PURPLE}📖 API Documentation:${NC}   http://localhost:8000/docs"
echo ""

echo -e "${BLUE}📊 System Info:${NC}"
echo -e "   • Knowledge Graph: 327 nodes, 429 edges"
echo -e "   • AI Agents: Mathew, Rahil, Shreyas, Siddarth"
echo -e "   • Chat: LLM-based routing, @mentions, agent-to-agent"
echo -e "   • Graph: Filters, search, neighborhoods, agent comparison"
echo ""

echo -e "${YELLOW}📝 Process IDs:${NC}"
echo -e "   • Backend PID: $BACKEND_PID"
echo -e "   • Frontend PID: $FRONTEND_PID"
echo ""

echo -e "${YELLOW}📁 Logs:${NC}"
echo -e "   • Backend:  tail -f logs/backend.log"
echo -e "   • Frontend: tail -f logs/frontend.log"
echo ""

echo -e "${GREEN}🎯 Demo Tips:${NC}"
echo -e "   1. Use @mentions to target specific agents (e.g., '@Mathew')"
echo -e "   2. Try filters to explore specific node types or agents"
echo -e "   3. Search for nodes, compare agents, click nodes for neighborhoods"
echo -e "   4. Watch sessions reset on page refresh (ephemeral memory)"
echo ""

echo -e "${RED}🛑 To stop the servers:${NC}"
echo -e "   Run: ./stop.sh"
echo ""

echo -e "${PURPLE}Example Questions:${NC}"
echo -e "   • 'Who is the team leader?' (smart routing)"
echo -e "   • '@Mathew, what are your top skills?' (targeted)"
echo -e "   • 'How can you help build a BI dashboard with AI?'"
echo -e "   • Try filters: skills + Rahil, search: 'React', compare agents"
echo ""

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Opening browser in 3 seconds...${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

sleep 3

# Open browser (works on macOS, Linux, and WSL)
if command_exists open; then
    open http://localhost:5173
elif command_exists xdg-open; then
    xdg-open http://localhost:5173
elif command_exists wslview; then
    wslview http://localhost:5173
else
    echo -e "${YELLOW}Please open http://localhost:5173 in your browser${NC}"
fi

echo ""
echo -e "${PURPLE}🚀 Ready to demo! The dashboard should open in your browser.${NC}"
echo ""

