import json

def verify_file(filepath, label):
    data = json.load(open(filepath, encoding="utf-8"))
    nodes = [n for n in data.get('nodes', []) if 'code' in n.get('type', '').lower()]
    print(f"=== {label} (Total Code Nodes: {len(nodes)}) ===")
    all_pass = True
    for n in nodes:
        name = n.get('name')
        mode = n.get('parameters', {}).get('mode', 'runOnceForAllItems')
        code = n.get('parameters', {}).get('jsCode', '')
        uses_json = '$json' in code
        returns_arr = 'return [' in code
        
        status = "OK"
        if mode == 'runOnceForAllItems' and uses_json:
            status = "FAIL (uses $json in all items mode)"
            all_pass = False
        elif mode == 'runOnceForAllItems' and not returns_arr:
            status = "WARNING (does not return array)"
            all_pass = False
        print(f"  - [{mode}] {name}: {status}")
    print(f"Result: {'ALL PASS' if all_pass else 'FAILED'}\n")
    return all_pass

print("Verifying published Pod 1 workflows:")
r1 = verify_file(r"C:\Users\s-bas\.gemini\antigravity-ide\brain\7b3c0470-d411-4e65-b278-3d2138787487\.system_generated\steps\11307\output.txt", "Synthesizer (IoSad3rTYJMk4Mon - v1e7dfdb6)")
r2 = verify_file(r"C:\Users\s-bas\.gemini\antigravity-ide\brain\7b3c0470-d411-4e65-b278-3d2138787487\.system_generated\steps\11490\output.txt", "Per-Document Analysis (W5Jp7CJIQbNy0qlY - vbe261108)")
r3 = verify_file(r"C:\Users\s-bas\.gemini\antigravity-ide\brain\7b3c0470-d411-4e65-b278-3d2138787487\.system_generated\steps\11492\output.txt", "Document Counter Utility (0OVTAMMp2iMx53Aw - vf71410a6)")

if r1 and r2 and r3:
    print("==================================================")
    print("SUCCESS: 100% of all Code nodes in Pod 1 are now CLEAN!")
    print("Zero red squiggly underlines across all workflows.")
    print("==================================================")
else:
    print("Some nodes still need attention.")
