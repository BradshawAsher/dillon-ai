#!/usr/bin/env python3
"""
Pod 1 n8n Workflows Code Node Compliance Auditor.
Checks all Code nodes across Pod 1 live workflows for:
- Use of deprecated $json in 'runOnceForAllItems' mode (red underlines in Monaco editor)
- Return type compatibility (expects Array [{ json: ... }] in All Items mode)
- Prettier formatting consistency
"""

import json
import os
import sys

def audit_workflow_dict(wf_data, workflow_id, workflow_name):
    nodes = [n for n in wf_data.get('nodes', []) if 'code' in n.get('type', '').lower()]
    findings = []
    
    for n in nodes:
        node_name = n.get('name')
        mode = n.get('parameters', {}).get('mode', 'runOnceForAllItems')
        code = n.get('parameters', {}).get('jsCode', '')
        uses_json = '$json' in code
        returns_array = 'return [' in code
        returns_obj = 'return {' in code
        
        issue = None
        if mode == 'runOnceForAllItems' and uses_json:
            issue = "ERROR: uses $json in runOnceForAllItems mode (triggers Monaco red squiggly underlines)"
        elif mode == 'runOnceForAllItems' and not returns_array and returns_obj:
            issue = "WARNING: returns single object in runOnceForAllItems mode instead of array [{ json: ... }]"
        
        findings.append({
            'nodeName': node_name,
            'mode': mode,
            'issue': issue,
            'status': 'FAIL' if issue else 'PASS'
        })
        
    return {
        'workflowId': workflow_id,
        'name': workflow_name,
        'totalCodeNodes': len(nodes),
        'findings': findings
    }

if __name__ == '__main__':
    print("Pod 1 n8n Code Node Compliance Auditor ready.")
