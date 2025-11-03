# Quick Test Script

Run the application and test these specific scenarios:

## 1. Test Filters (Main Issue)

```bash
# Start the app
./start.sh

# In browser:
1. Click "Filters" button (top right)
2. Check "Skills" and "Technologies"
3. Check "Mathew"
4. Notice: Graph DOES NOT change yet
5. Click "Apply Filters" button (purple)
6. ✅ Expected: Graph updates, shows only Mathew's skills/tech, cleanly arranged
```

## 2. Test Agent Switching (Clumsy Graph Issue)

```bash
# In browser:
1. Click "Rahil" tab
2. ✅ Expected: Only Rahil's nodes, cleanly arranged (NOT scattered)
3. Click "Mathew" tab  
4. ✅ Expected: Only Mathew's nodes, cleanly arranged
5. Click "All Agents" tab
6. ✅ Expected: All nodes back, cleanly arranged
```

## 3. Test Layout Animation

```bash
# In browser:
1. Apply any filter
2. ✅ Expected: Smooth 500ms animation as nodes rearrange
3. Not instant jump - should animate smoothly
```

## Issues to Watch For:
- [ ] Filters apply immediately without clicking "Apply" (should NOT happen)
- [ ] Graph stays scattered/clumsy after switching agents (should NOT happen)
- [ ] No animation when layout changes (should animate smoothly)

If all three tests pass, both issues are fixed! ✅
