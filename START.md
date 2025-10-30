# 🚀 AI Team Intelligence Platform - Quick Start Guide

## ✅ Prerequisites

- Python 3.9+ installed
- Node.js 18+ installed
- OpenAI API key configured in `.env`

## 📦 Setup (First Time Only)

### Backend Setup
```bash
cd /Users/rahilharihar/Projects/tbd/kg
pip install -r requirements.txt
```

### Frontend Setup
```bash
cd /Users/rahilharihar/Projects/tbd/kg/frontend
npm install --legacy-peer-deps
```

## 🏃‍♂️ Running the Application

### Option 1: Start Both Servers (Recommended)

**Terminal 1 - Backend:**
```bash
cd /Users/rahilharihar/Projects/tbd/kg
python server.py
```

Expected output:
```
============================================================
🚀 Starting AI Team Multi-Agent API Server
============================================================
📊 Knowledge Graph: 327 nodes
🤖 Agents: 4 agents initialized
🌐 Server: http://localhost:8000
🔌 WebSocket: ws://localhost:8000/ws
📖 API Docs: http://localhost:8000/docs
============================================================
```

**Terminal 2 - Frontend:**
```bash
cd /Users/rahilharihar/Projects/tbd/kg/frontend
npm run dev
```

Expected output:
```
VITE v7.x.x ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

### Option 2: Quick Start Script

```bash
# Start backend
cd /Users/rahilharihar/Projects/tbd/kg && python server.py &

# Wait 3 seconds
sleep 3

# Start frontend
cd /Users/rahilharihar/Projects/tbd/kg/frontend && npm run dev
```

## 🌐 Access the Application

Once both servers are running:

1. **Frontend Dashboard**: http://localhost:5173
2. **Backend API**: http://localhost:8000
3. **API Docs**: http://localhost:8000/docs

## 🧪 Testing the System

### 1. Check Backend Health
```bash
curl http://localhost:8000/
```

Should return:
```json
{
  "service": "AI Team Multi-Agent API",
  "status": "running",
  "agents": 4,
  "nodes": 327
}
```

### 2. Test Graph Data
```bash
curl http://localhost:8000/api/graph
```

### 3. Test Agents
```bash
curl http://localhost:8000/api/agents
```

## 💬 Using the Dashboard

### Chat Modes

**Group Chat Mode:**
- All 4 agents respond simultaneously
- Best for brainstorming and comprehensive answers
- Agents: Mathew (Data), Rahil (Product Lead), Shreyas (PM), Siddarth (Engineering)

**Orchestrator Mode:**
- Sequential, focused responses based on relevance
- Best for specific technical questions

### Example Questions

1. **Project Planning:**
   ```
   "We need to build a BI dashboard with AI-powered insights. How would you approach this?"
   ```

2. **Technical Implementation:**
   ```
   "What's the best way to integrate real-time data streaming into our Python backend?"
   ```

3. **Product Strategy:**
   ```
   "How can we leverage our team's skills to build a competitive AI product?"
   ```

4. **Data Engineering:**
   ```
   "We have ERP systems with inconsistent data. How should we clean and transform it?"
   ```

## 🎨 Features

✅ **Interactive Knowledge Graph** (Left Panel)
- 327 nodes, 429 edges
- Real-time highlighting as agents respond
- Color-coded by agent (Blue, Purple, Green, Orange)
- Resizable panels (drag the divider)

✅ **Multi-Agent Chat** (Right Panel)
- 4 AI agents with distinct personalities
- Streaming responses
- Live agent cards with animations
- Voice input (coming soon)

✅ **AI Observability**
- Watch which skills/tech nodes are referenced
- See connections between team members
- Understand grounding in real knowledge

## 🔧 Troubleshooting

### Backend Won't Start
- Check if port 8000 is already in use: `lsof -i :8000`
- Kill existing process: `kill -9 <PID>`
- Verify OpenAI API key in `.env`

### Frontend Won't Start
- Check if port 5173 is already in use: `lsof -i :5173`
- Clear node_modules: `rm -rf node_modules && npm install --legacy-peer-deps`

### WebSocket Connection Failed
- Ensure backend is running on port 8000
- Check browser console for errors
- Verify CORS settings in `server.py`

### Graph Not Loading
- Check backend logs for graph loading errors
- Verify JSON files exist in `data/knowledgeGraphs/`
- Test API endpoint: `curl http://localhost:8000/api/graph`

### Agents Not Responding
- Check OpenAI API key is valid
- Verify network connection
- Check backend logs for API errors
- Try fallback key if quota exceeded

## 📊 System Architecture

```
┌─────────────────────────────────────────────────┐
│          React Frontend (Port 5173)             │
│  ┌──────────────┐         ┌─────────────────┐  │
│  │   Cytoscape  │         │   Chat Panel    │  │
│  │  Graph (60%) │         │  4 Agents (40%) │  │
│  └──────────────┘         └─────────────────┘  │
└────────────────┬────────────────────────────────┘
                 │ WebSocket
                 ▼
┌─────────────────────────────────────────────────┐
│        FastAPI Backend (Port 8000)              │
│  ┌─────────────┐  ┌──────────────────────────┐ │
│  │ GraphHighlighter │  │ MultiAgentSystem   │ │
│  │ Entity Extraction │  │  - Mathew         │ │
│  │ Node Highlighting │  │  - Rahil (Lead)   │ │
│  └─────────────┘  │  - Shreyas        │ │
│                   │  - Siddarth       │ │
│  ┌─────────────┐  └──────────────────────────┘ │
│  │ KG Loader   │         ▲                      │
│  │ 327 nodes   │         │                      │
│  │ 429 edges   │         │                      │
│  └─────────────┘         │                      │
└──────────────────────────┼──────────────────────┘
                           │
                           ▼
                   ┌───────────────┐
                   │  OpenAI API   │
                   │   GPT-4o      │
                   └───────────────┘
```

## 🎯 Next Steps

1. ✅ Start both servers
2. ✅ Open http://localhost:5173
3. ✅ Ask a question
4. ✅ Watch the knowledge graph highlight relevant nodes
5. ✅ See all 4 agents respond with their expertise

## 📝 Notes

- **Backend logs**: Check terminal for agent responses and errors
- **Frontend console**: Open browser DevTools for WebSocket messages
- **Hot reload**: Both backend and frontend support live reloading
- **Graph layout**: The graph will reorganize on load (this is normal)

## 🆘 Support

If you encounter issues:
1. Check both terminal outputs for errors
2. Verify API key is set: `echo $OPENAI_API_KEY` or check `.env`
3. Test backend health: `curl http://localhost:8000/`
4. Check WebSocket connection in browser console
5. Review logs in both terminals

---

**Ready to start? Run the commands above and experience the AI Team Intelligence Platform!** 🚀

