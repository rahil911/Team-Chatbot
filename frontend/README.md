# AI Team Intelligence Platform - Frontend

Modern React TypeScript dashboard with Cytoscape.js knowledge graph visualization and real-time multi-agent chat.

## Features

- 🗺️ **Interactive Knowledge Graph**: 327 nodes, 429 edges with Cytoscape.js
- 🤖 **4 AI Agents**: Multi-agent system with streaming responses
- 🎨 **Real-time Highlighting**: AI observability with color-coded node highlighting
- 🔄 **Resizable Layout**: Adjustable split-pane (60/40 default)
- 💬 **Dual Chat Modes**: Group Chat & Orchestrator
- 🎤 **Voice Input**: Real-time audio support (coming soon)
- 🎯 **Fortune 500 Grade**: Corporate styling with Tailwind CSS

## Tech Stack

- React 19 + TypeScript
- Vite (build tool)
- Tailwind CSS
- Cytoscape.js (graph visualization)
- WebSocket (real-time communication)
- React Resizable Panels

## Setup

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Backend Integration

The frontend connects to the FastAPI backend at:
- HTTP API: `http://localhost:8000`
- WebSocket: `ws://localhost:8000/ws`
- Realtime Audio: `ws://localhost:8000/ws/realtime`

Make sure the backend is running before starting the frontend:

```bash
cd /Users/rahilharihar/Projects/tbd/kg
python server.py
```

## Usage

1. Start the backend server (port 8000)
2. Start the frontend dev server (port 5173)
3. Open http://localhost:5173
4. Choose a chat mode (Group Chat or Orchestrator)
5. Ask questions and watch the knowledge graph highlight relevant nodes!

## Components

- `GraphPanel`: Cytoscape.js knowledge graph with real-time highlighting
- `ChatPanel`: Agent conversation interface
- `AgentCard`: Animated agent cards with streaming text
- `VoiceInput`: Voice recording component
- `TextInput`: Text message input
- `ModeSelector`: Chat mode toggle

## Agent Profiles

- **Mathew Jerry Meleth** (Data Engineer) - Blue #2196F3
- **Rahil M. Harihar** (Product Lead) - Purple #7E57C2
- **Shreyas B Subramanya** (Product Manager) - Green #4CAF50
- **Siddarth Bhave** (Software Engineer) - Orange #FF9800

## Development

```bash
# Type checking
npm run type-check

# Lint
npm run lint

# Format
npm run format
```

## Architecture

```
src/
├── components/      # React components
├── hooks/           # Custom hooks
├── services/        # API services
├── types/           # TypeScript types
└── App.tsx          # Main app
```

## License

Proprietary - Fortune 500 Corporate Use
