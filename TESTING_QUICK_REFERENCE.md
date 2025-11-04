# 🚀 Testing Quick Reference Card

## ⚡ Run Tests (3 Commands)

```bash
# 1. Install dependencies
pip install -r tests/requirements.txt

# 2. Start backend (Terminal 1)
python server.py

# 3. Run tests (Terminal 2)
python tests/run_all_tests.py
```

## ✅ Expected Output

```
🎉 ALL TEST SUITES PASSED!
✅ Your WebSocket fixes are working correctly!
✅ Multi-browser scenarios work without crashes!
✅ Health endpoint and metrics are functional!
```

## 🎯 The Critical Test

**Test 3** (most important): Two browsers connecting during processing

- ✅ PASS = Bug is fixed
- ❌ FAIL = Race condition still exists

## 📊 Test Coverage

- **14 total tests**
- 7 WebSocket multi-browser tests
- 7 Health endpoint tests

## 🐛 If Tests Fail

1. Check backend is running: `curl http://localhost:8000/health`
2. Check for errors in backend logs
3. Verify OpenAI API key is set
4. Restart backend and try again

## 📁 Test Files

- `tests/test_websocket_multi_browser.py` - Multi-browser tests
- `tests/test_health_endpoint.py` - Health/metrics tests
- `tests/run_all_tests.py` - Master runner
- `tests/README.md` - Full documentation

## 🚀 After Tests Pass

```bash
git add .
git commit -m "Fix WebSocket multi-browser crashes + comprehensive tests"
git push
```

## 📈 Performance Benchmarks

- Health endpoint: **< 100ms**
- WebSocket connect: **< 500ms**
- All tests complete: **~60 seconds**

---

**Need help?** See `QUICKSTART_TESTING.md` or `tests/README.md`
