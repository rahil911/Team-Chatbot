# WebSocket & API Test Suite

Comprehensive test suite for verifying the WebSocket multi-browser fixes and API health endpoints.

## 🎯 What These Tests Verify

### Critical WebSocket Fixes
- ✅ **No crashes** when opening 2+ browsers simultaneously
- ✅ **No orphaned connections** when new browser connects during processing
- ✅ **Proper connection swapping** when same session ID reconnects
- ✅ **Concurrent connections** from multiple different sessions
- ✅ **Rapid reconnection** stress testing
- ✅ **Error recovery** without server crashes

### Health & Monitoring
- ✅ `/health` endpoint returns correct structure
- ✅ **Connection metrics** update correctly
- ✅ **Lifetime tracking** of connections and messages
- ✅ **Response time** is acceptable (< 100ms)
- ✅ **Concurrent load** handling

## 📋 Prerequisites

### 1. Install Test Dependencies

```bash
cd /Users/rahilharihar/Projects/tbd/kg
pip install -r tests/requirements.txt
```

### 2. Start the Backend Server

**IMPORTANT**: The backend must be running before tests can execute.

```bash
# In Terminal 1: Start the backend
cd /Users/rahilharihar/Projects/tbd/kg
python server.py
```

Wait for the server to fully start (you'll see "🚀 Starting AI Team Multi-Agent API Server").

## 🚀 Running Tests

### Option 1: Run All Tests (Recommended)

```bash
# Run the master test runner (runs all test suites)
python tests/run_all_tests.py
```

This will:
1. Check if backend is running
2. Run health endpoint tests
3. Run WebSocket multi-browser tests
4. Provide comprehensive summary

### Option 2: Run Individual Test Suites

```bash
# Health endpoint tests
python tests/test_health_endpoint.py

# WebSocket multi-browser tests
python tests/test_websocket_multi_browser.py
```

### Option 3: Run with pytest (Advanced)

```bash
# Run all tests with pytest
pytest tests/ -v

# Run specific test file
pytest tests/test_websocket_multi_browser.py -v

# Run specific test function
pytest tests/test_websocket_multi_browser.py::test_two_browsers_same_session_during_processing -v
```

## 📊 Test Suites

### 1. Health Endpoint Tests (`test_health_endpoint.py`)

**7 Tests** covering:
- Root endpoint basic info
- Health endpoint structure validation
- Metrics initial state
- Metrics update with active connections
- Response time performance
- API graph endpoint
- Concurrent load stress test

**Expected Output:**
```
✅ Passed: 7/7
🎉 ALL TESTS PASSED!
```

### 2. WebSocket Multi-Browser Tests (`test_websocket_multi_browser.py`)

**7 Tests** covering:
- Single browser connection (baseline)
- Two browsers sequential replacement
- **CRITICAL**: Two browsers during active processing (the bug scenario)
- Concurrent browsers with different sessions
- Rapid reconnection stress test
- Chat message delivery to multiple browsers
- Error recovery and exception handling

**Expected Output:**
```
✅ Passed: 7/7
🎉 ALL TESTS PASSED!
```

## 🔍 Understanding Test Output

### Successful Test Run

```
====================
TEST 3: Two Browsers During Active Processing (CRITICAL)
====================
✅ [Browser-1] Connected to WebSocket
📤 [Browser-1] Registered with session ID: session_003_critical
📨 Browser 1 sending chat message to trigger processing...
🔌 Browser 2 connecting WHILE Browser 1 is processing...
✅ [Browser-2] Connected to WebSocket
📤 [Browser-2] Registered with session ID: session_003_critical
🏓 [Browser-2] Ping sent
✅ CRITICAL: Browser 2 is functional even though Browser 1 was processing
📥 Collecting messages from Browser 1...
📥 Collecting messages from Browser 2...
✅ TEST 3 PASSED: No crashes during processing + new connection
```

This is the **CRITICAL TEST** that verifies the main bug fix.

### Failed Test (What to Look For)

If Test 3 fails with:
```
❌ Browser 2 can't send ping (orphaned connection!)
```

This means the connection manager race condition is still present.

## 🐛 Troubleshooting

### Backend Not Running

```
❌ ERROR: Backend is not running!
   Please start the backend with: python server.py
```

**Solution**: Start the backend in a separate terminal.

### Connection Refused

```
❌ [Browser-1] Connection failed: [Errno 61] Connection refused
```

**Solution**:
1. Check backend is running
2. Verify it's listening on `http://localhost:8000`
3. Check for port conflicts

### Tests Timeout

```
❌ WebSocket Multi-Browser Tests TIMED OUT (300.00s)
```

**Solution**:
1. Check if OpenAI API key is set
2. Verify backend is responding
3. Check logs for errors

### Import Errors

```
ModuleNotFoundError: No module named 'websockets'
```

**Solution**: Install test dependencies:
```bash
pip install -r tests/requirements.txt
```

## 📈 Performance Benchmarks

### Expected Response Times

- Health endpoint: **< 100ms**
- WebSocket connection: **< 500ms**
- Chat message roundtrip: **5-20 seconds** (depends on OpenAI API)

### Expected Success Rates

- All tests should pass: **100%**
- Concurrent requests: **50/50 successful**
- Rapid reconnections: **10/10 successful**

## 🧪 Manual Testing

If you want to test manually without scripts:

### Test Multi-Browser Scenario

1. **Terminal 1**: Start backend
   ```bash
   python server.py
   ```

2. **Terminal 2**: Start frontend
   ```bash
   cd frontend
   npm run dev
   ```

3. **Browser 1**: Open http://localhost:5173
4. **Browser 2**: Open http://localhost:5173 (new window, not tab)
5. **Both browsers**: Send chat messages simultaneously
6. **Expected**: Both work without crashes

### Test Health Endpoint

```bash
# Check health
curl http://localhost:8000/health | jq

# Expected output:
{
  "status": "healthy",
  "service": "AI Team Multi-Agent API",
  "timestamp": 1234567890.123,
  "uptime_hours": 0.0123,
  "websocket_metrics": {
    "active_connections": 0,
    "unique_browser_sessions": 0,
    "processing_connections": 0,
    "pending_swaps": 0,
    "total_connections_lifetime": 5,
    "total_messages": 10,
    "avg_messages_per_connection": 2.0
  },
  "knowledge_graph": {
    "nodes": 756,
    "edges": 429
  },
  "agents": 4
}
```

## 📝 Test Coverage

### Code Coverage

- `server.py`: ConnectionManager class (100%)
- `server.py`: /health endpoint (100%)
- `conversation_manager.py`: async methods (partial)
- WebSocket message handlers (partial)

### Scenario Coverage

✅ Single browser connection
✅ Multiple browsers, different sessions
✅ Multiple browsers, same session (sequential)
✅ Multiple browsers, same session (during processing) **← CRITICAL**
✅ Rapid reconnection stress
✅ Invalid message handling
✅ Connection cleanup
✅ Metrics tracking
✅ Concurrent load

## 🎓 Understanding the Critical Test

**Test 3** is the most important - it replicates the exact scenario that caused crashes:

1. Browser 1 connects and starts processing a chat message
2. **While Browser 1 is still processing**, Browser 2 connects with same session ID
3. **Before fix**: Browser 2 would be queued but never activated → orphaned → crash
4. **After fix**: Browser 2 is immediately usable, proper swap happens after processing

This test **MUST PASS** for the fix to be validated.

## 🔄 Continuous Testing

Run tests before deploying:

```bash
# Run all tests
python tests/run_all_tests.py

# If all pass, deploy
git add .
git commit -m "Fix WebSocket multi-browser crashes"
git push
```

## 📊 Test Results Interpretation

### All Green (Success)
```
✅ Passed: 14/14
🎉 ALL TEST SUITES PASSED!
```

**Meaning**: All fixes working correctly. Safe to deploy.

### Some Red (Failure)
```
✅ Passed: 12/14
❌ Failed: 2/14
```

**Meaning**: Issues found. Review failed tests and fix before deploying.

## 🆘 Getting Help

If tests fail unexpectedly:

1. Check backend logs for errors
2. Verify OpenAI API key is set
3. Restart backend and try again
4. Check for port conflicts
5. Review the error output in detail

---

**Happy Testing!** 🎉

These tests ensure your WebSocket fixes work correctly and prevent regressions.
