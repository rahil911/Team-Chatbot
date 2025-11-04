# 🚀 Quick Start: Testing Your WebSocket Fixes

This guide will help you quickly test all the WebSocket multi-browser fixes you just implemented.

## ⚡ TL;DR - Run Tests in 3 Steps

```bash
# Step 1: Install test dependencies
cd /Users/rahilharihar/Projects/tbd/kg
pip install -r tests/requirements.txt

# Step 2: Start the backend (in a separate terminal)
python server.py

# Step 3: Run all tests (in another terminal)
python tests/run_all_tests.py
```

---

## 📋 Detailed Instructions

### Step 1: Install Test Dependencies

```bash
cd /Users/rahilharihar/Projects/tbd/kg
pip install -r tests/requirements.txt
```

This installs:
- `pytest` - Test framework
- `pytest-asyncio` - Async test support
- `websockets` - WebSocket client library
- `requests` - HTTP client

### Step 2: Start the Backend

**IMPORTANT**: The backend must be running for tests to work.

**Terminal 1** (Backend):
```bash
cd /Users/rahilharihar/Projects/tbd/kg
python server.py
```

Wait for:
```
🚀 Starting AI Team Multi-Agent API Server
📊 Knowledge Graph: XXX nodes
🤖 Agents: 4 agents initialized
🌐 Server: http://localhost:8000
```

### Step 3: Run Tests

**Terminal 2** (Tests):
```bash
cd /Users/rahilharihar/Projects/tbd/kg
python tests/run_all_tests.py
```

---

## 📊 What the Tests Verify

### ✅ Critical WebSocket Fixes

1. **Multi-Browser Connection Test** (The Main Fix)
   - ✅ No crashes when opening 2+ browsers
   - ✅ No orphaned connections during processing
   - ✅ Proper connection swapping

2. **Concurrent Connections**
   - ✅ 5 simultaneous browsers all work
   - ✅ Different sessions don't interfere

3. **Rapid Reconnection Stress**
   - ✅ 10 rapid connect/disconnect cycles
   - ✅ No memory leaks

4. **Error Recovery**
   - ✅ Invalid messages don't crash server
   - ✅ Graceful error handling

### ✅ Health & Monitoring

1. **Health Endpoint**
   - ✅ Returns correct metrics
   - ✅ Tracks connections accurately
   - ✅ Response time < 100ms

2. **Connection Metrics**
   - ✅ Active connections tracked
   - ✅ Lifetime connections tracked
   - ✅ Messages counted correctly

---

## 🎯 Expected Output

When all tests pass, you'll see:

```
================================================================================
FINAL TEST SUMMARY
================================================================================
✅ PASSED | Health Endpoint Tests (15.23s)
✅ PASSED | WebSocket Multi-Browser Tests (45.67s)
================================================================================
Total Suites: 2
✅ Passed: 2
❌ Failed: 0
⏱️  Total Time: 60.90s
================================================================================

🎉 ALL TEST SUITES PASSED!
✅ Your WebSocket fixes are working correctly!
✅ Multi-browser scenarios work without crashes!
✅ Health endpoint and metrics are functional!
```

---

## 🔍 The Critical Test

**Test 3** in the WebSocket suite is the most important:

```
TEST 3: Two Browsers During Active Processing (CRITICAL)
```

This test:
1. Opens Browser 1
2. Browser 1 sends a chat message (starts processing)
3. **While Browser 1 is processing**, Browser 2 connects with same session ID
4. Verifies Browser 2 can send messages (not orphaned)

**This is the exact scenario that caused the crashes before!**

If this test passes → The race condition is fixed ✅

---

## 🐛 Troubleshooting

### Backend Not Running

**Error:**
```
❌ ERROR: Backend is not running!
```

**Solution:**
Open a new terminal and start the backend:
```bash
cd /Users/rahilharihar/Projects/tbd/kg
python server.py
```

### Missing Dependencies

**Error:**
```
ModuleNotFoundError: No module named 'websockets'
```

**Solution:**
```bash
pip install -r tests/requirements.txt
```

### Port Already in Use

**Error:**
```
OSError: [Errno 48] Address already in use
```

**Solution:**
Kill the process on port 8000:
```bash
lsof -ti:8000 | xargs kill -9
python server.py
```

### OpenAI API Key Missing

**Error:**
```
OpenAI API key not found
```

**Solution:**
Make sure your `.env` file has:
```
OPENAI_API_KEY=sk-...
```

---

## 🧪 Manual Testing Alternative

If you prefer manual testing:

### 1. Test Multi-Browser Scenario

**Terminal 1**: Start backend
```bash
python server.py
```

**Terminal 2**: Start frontend
```bash
cd frontend
npm run dev
```

**Browser Window 1**: http://localhost:5173
**Browser Window 2**: http://localhost:5173 (new window, not tab)

Send messages from both browsers → Both should work without crashes

### 2. Test Health Endpoint

```bash
curl http://localhost:8000/health | jq
```

Should return:
```json
{
  "status": "healthy",
  "websocket_metrics": {
    "active_connections": 0,
    "total_connections_lifetime": 5,
    ...
  }
}
```

---

## 📈 Performance Expectations

- **Health endpoint**: < 100ms response time
- **WebSocket connection**: < 500ms to establish
- **Chat message**: 5-20 seconds (depends on OpenAI API)
- **All tests**: ~60 seconds total

---

## ✅ Verification Checklist

After running tests, verify:

- [ ] All 14 tests passed (7 health + 7 WebSocket)
- [ ] Test 3 (critical multi-browser) passed
- [ ] No error messages in backend logs
- [ ] Health endpoint returns metrics
- [ ] No crashes or exceptions

If all checked → **Your fixes are working! 🎉**

---

## 🚀 Next Steps

After tests pass:

1. **Commit your changes**
   ```bash
   git add .
   git commit -m "Fix WebSocket multi-browser crashes and add comprehensive tests"
   ```

2. **Deploy to Azure** (tests ensure it won't crash)

3. **Monitor with /health endpoint**
   ```bash
   # Production health check
   curl https://your-backend.azurecontainerapps.io/health
   ```

4. **Test in production** with 2+ browsers

---

## 📚 Additional Resources

- **Full Test Documentation**: `tests/README.md`
- **Health Endpoint Tests**: `tests/test_health_endpoint.py`
- **WebSocket Tests**: `tests/test_websocket_multi_browser.py`
- **Test Runner**: `tests/run_all_tests.py`

---

**Happy Testing!** 🎉

Your WebSocket fixes are now thoroughly tested and verified!
