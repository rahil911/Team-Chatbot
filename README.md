
# 🚀 AI Team Intelligence Platform

**Fortune 500-Grade Knowledge Graph Dashboard with Multi-Agent AI System**

## One-Click Demo Setup

```bash
cd /Users/rahilharihar/Projects/tbd/kg
./start.sh
```

That's it! The script will:
- ✅ Check prerequisites (Python 3.9+, Node.js 18+)
- ✅ Install all Python dependencies
- ✅ Install all Node.js dependencies
- ✅ Start backend server (port 8000)
- ✅ Start frontend server (port 5173)
- ✅ Open dashboard in your browser
- ✅ Ready for demos in ~30 seconds!

## Stop the Servers

```bash
./stop.sh
```

## Features

### 🗺️ Interactive Knowledge Graph (Left Panel)
- **327 nodes, 429 edges** representing team skills, projects, and connections
- **Real-time highlighting** shows which nodes agents reference
- **Color-coded by agent**:
  - 🔵 Mathew (Data Engineer) - Blue
  - 🟣 Rahil (Product Lead) - Purple  
  - 🟢 Shreyas (Product Manager) - Green
  - 🟠 Siddarth (Software Engineer) - Orange
- **Resizable panels** - drag the divider to adjust layout
- **AI Observability** - see exactly what knowledge grounds each response

### 💬 Multi-Agent Chat (Right Panel)
- **4 AI Agents** with distinct personalities and expertise
- **2 Chat Modes**:
  - **Group Chat**: All agents respond simultaneously for comprehensive answers
  - **Orchestrator**: Sequential, focused responses based on relevance
- **Streaming responses** with real-time agent status indicators
- **Animated agent cards** show who's currently thinking/responding
- **Full conversation history** with timestamps

### 🎯 AI Observability
- Watch nodes light up as agents reference skills/technologies
- See connections between team members activate
- Understand how responses are grounded in real knowledge
- Pulse animations for high-relevance nodes

## Quick Demo Guide

### Example Questions to Try

**1. Project Planning & Strategy**
```
"We need to build a BI dashboard with AI-powered insights. How would you approach this?"
```
→ All 4 agents will explain their role and contributions

**2. Technical Capabilities**
```
"What's your experience with Python, React, and cloud technologies?"
```
→ Watch the graph highlight Python, React, AWS nodes

**3. Data Engineering**
```
"We have messy ERP data. How can you help clean and transform it?"
```
→ Mathew (Data Engineer) will take the lead

**4. Product Strategy**
```
"How can your team help us build a competitive AI product?"
```
→ Rahil and Shreyas will discuss product vision and execution

**5. Team Capabilities**
```
"Tell me about your team's experience with machine learning and data pipelines"
```
→ Watch multiple nodes highlight across all team members

## System Architecture

```
┌─────────────────────────────────────────────────┐
│     React Frontend (http://localhost:5173)      │
│  ┌──────────────┐         ┌─────────────────┐  │
│  │  Cytoscape   │         │   Chat Panel    │  │
│  │  Knowledge   │    ↔    │   4 AI Agents   │  │
│  │  Graph (60%) │         │      (40%)      │  │
│  └──────────────┘         └─────────────────┘  │
└─────────────────┬───────────────────────────────┘
                  │ WebSocket (Real-time)
                  ▼
┌─────────────────────────────────────────────────┐
│      FastAPI Backend (http://localhost:8000)    │
│  ┌──────────────┐  ┌────────────────────────┐  │
│  │ Knowledge    │  │ Multi-Agent System     │  │
│  │ Graph Loader │  │  • Mathew (Data Eng)   │  │
│  │ 327 nodes    │  │  • Rahil (Lead) ⭐     │  │
│  │ 429 edges    │  │  • Shreyas (PM)        │  │
│  │              │  │  • Siddarth (SWE)      │  │
│  └──────────────┘  └────────────────────────┘  │
│  ┌──────────────┐                               │
│  │ Entity       │  Real-time node highlighting  │
│  │ Extraction   │  based on agent responses     │
│  └──────────────┘                               │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
          ┌───────────────┐
          │  OpenAI API   │
          │    GPT-4o     │
          │   Streaming   │
          └───────────────┘
```

## Files & Structure

```
kg/
├── start.sh                    # 🚀 ONE-CLICK STARTUP SCRIPT
├── stop.sh                     # 🛑 Stop all servers
├── server.py                   # FastAPI backend with WebSockets
├── agents.py                   # Multi-agent system (4 agents)
├── kg_loader.py                # Knowledge graph loader
├── graph_view.py               # Cytoscape data generator
├── graph_highlighter.py        # Entity extraction & highlighting
├── utils.py                    # Utilities & embeddings
├── requirements.txt            # Python dependencies
├── .env                        # API keys (auto-created)
│
├── personas/                   # Agent system prompts
│   ├── mathew.md              # Data Engineer persona
│   ├── rahil.md               # Product Lead persona (always first)
│   ├── shreyas.md             # Product Manager persona
│   └── siddarth.md            # Software Engineer persona
│
├── data/knowledgeGraphs/       # Knowledge graph JSONs
│   ├── mathew_knowledge_graph.json
│   ├── rahil_knowledge_graph.json
│   ├── shreyas_knowledge_graph.json
│   └── siddarth_knowledge_graph.json
│
├── frontend/                   # React TypeScript dashboard
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── GraphPanel.tsx # Cytoscape graph
│   │   │   ├── ChatPanel.tsx  # Agent chat interface
│   │   │   ├── AgentCard.tsx  # Animated agent cards
│   │   │   ├── VoiceInput.tsx # Voice recording
│   │   │   └── TextInput.tsx  # Text input
│   │   ├── hooks/             # Custom React hooks
│   │   │   ├── useWebSocket.ts
│   │   │   ├── useVoiceRecording.ts
│   │   │   └── useGraphHighlight.ts
│   │   └── types/             # TypeScript types
│   ├── package.json
│   └── README.md
│
└── logs/                       # Server logs
    ├── backend.log
    └── frontend.log
```

## Troubleshooting

### Script fails with "Python not found"
```bash
# Install Python 3.9+
brew install python3  # macOS
```

### Script fails with "Node not found"
```bash
# Install Node.js 18+
brew install node  # macOS
```

### Ports already in use
```bash
# The script automatically kills processes on ports 8000 and 5173
# If you still have issues:
lsof -ti:8000 | xargs kill -9
lsof -ti:5173 | xargs kill -9
```

### Backend won't start
```bash
# Check logs
tail -f logs/backend.log

# Verify API key
cat .env

# Reinstall dependencies
rm -rf venv
./start.sh
```

### Frontend won't start
```bash
# Check logs
tail -f logs/frontend.log

# Clear and reinstall
cd frontend
rm -rf node_modules package-lock.json
cd ..
./start.sh
```

### Graph not loading
```bash
# Test backend API
curl http://localhost:8000/api/graph

# Should return JSON with nodes and edges
```

### WebSocket connection failed
```bash
# Check if backend is running
curl http://localhost:8000/

# Check browser console for errors
# Open DevTools → Console → Look for WebSocket messages
```

## Manual Setup (If Script Fails)

### Backend
```bash
cd /Users/rahilharihar/Projects/tbd/kg
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python server.py
```

### Frontend (in a new terminal)
```bash
cd /Users/rahilharihar/Projects/tbd/kg/frontend
npm install --legacy-peer-deps
npm run dev
```

## API Endpoints

- `GET /` - Health check
- `GET /api/graph` - Get knowledge graph data (nodes + edges)
- `GET /api/agents` - Get agent information
- `POST /api/transcribe` - Transcribe audio (Whisper)
- `POST /api/tts` - Text-to-speech
- `WS /ws` - WebSocket for real-time chat
- `WS /ws/realtime` - WebSocket for real-time audio
- `GET /docs` - Interactive API documentation

## Technology Stack

### Backend
- **FastAPI** - Modern async web framework
- **OpenAI GPT-4o** - Large language model
- **NetworkX** - Graph processing
- **Pydantic** - Data validation
- **WebSockets** - Real-time communication

### Frontend
- **React 19** + **TypeScript** - UI framework
- **Vite** - Build tool (super fast)
- **Tailwind CSS** - Utility-first styling
- **Cytoscape.js** - Graph visualization
- **React Resizable Panels** - Adjustable layout

## Performance

- **Graph Rendering**: ~1-2 seconds for 327 nodes
- **Agent Response Time**: 2-5 seconds per agent (streaming)
- **WebSocket Latency**: <50ms
- **Bundle Size**: ~690KB (gzipped: ~220KB)

## Deployment Notes

### Current Deployment (Azure)

**Frontend**: Deployed to Azure Static Web Apps (HTTPS)
- URL: https://calm-forest-029210d0f.3.azurestaticapps.net
- Auto-deploys from `main` branch via GitHub Actions

**Backend**: Deployed to Azure Container Instances (HTTP only)
- URL: http://52.147.223.151:8000
- Requires HTTPS proxy for production use

### Setting Up HTTPS for Backend

The backend currently runs on HTTP, which causes mixed content issues when the HTTPS frontend tries to connect. To fix this, set up Cloudflare Tunnel for free HTTPS:

**See [CLOUDFLARE_SETUP.md](./CLOUDFLARE_SETUP.md) for detailed instructions.**

Quick steps:
1. Install cloudflared
2. Create tunnel: `cloudflared tunnel create kg-backend`
3. Configure DNS routing
4. Run tunnel: `cloudflared tunnel run kg-backend`
5. Update `frontend/.env.production` with HTTPS URL
6. Redeploy frontend

### CI/CD Workflows

- `.github/workflows/deploy.yml` - Full stack deployment (backend + frontend)
- `.github/workflows/deploy-all-azure.yml` - Frontend-only quick deploy
- `.github/workflows/deploy-frontend.yml` - Legacy frontend deployment

Commit message triggers:
- `[backend]` - Deploy backend only
- `[all]` - Deploy both backend and frontend
- Changes to `frontend/**` - Auto-deploy frontend

### Manual Deployment

For local production deployment:
1. Set proper `OPENAI_API_KEY` in `.env`
2. Configure CORS in `server.py` for your domain
3. Use `npm run build` for frontend production build
4. Serve frontend build with nginx/Apache
5. Run backend with `uvicorn server:app --host 0.0.0.0 --port 8000`
6. Use process manager like `pm2` or `systemd`

## Credits

Built for Fortune 500 corporate demos showcasing:
- AI-powered team intelligence
- Real-time knowledge graph observability
- Multi-agent collaboration systems
- Modern React + Python architecture

**Team Members**:
- Mathew Jerry Meleth (Data Engineer)
- Rahil M. Harihar (Product Lead)
- Shreyas B Subramanya (Product Manager)
- Siddarth Bhave (Software Engineer)

---

**Ready to demo?** Just run `./start.sh` and show off your AI team! 🚀
