#!/usr/bin/env python3
"""
Bind colors in selection to nearest matching Swatch variables
"""
import json
import subprocess
import math

def color_distance(c1, c2):
    """Calculate Euclidean distance between two RGB colors"""
    r_diff = c1['r'] - c2['r']
    g_diff = c1['g'] - c2['g']
    b_diff = c1['b'] - c2['b']
    return math.sqrt(r_diff**2 + g_diff**2 + b_diff**2)

# Get current selection
print("Getting selection...")
sel_result = subprocess.run([
    'curl', '-s', '-X', 'POST', 'http://localhost:3001/api/get-selection',
    '-H', 'Content-Type: application/json',
    '-d', '{}'
], capture_output=True, text=True)

selection = json.loads(sel_result.stdout)
if not selection['success']:
    print(f"Error: {selection.get('error', 'Unknown')}")
    exit(1)

# Read Swatch collection
print("Reading Swatch collection...")
vars_result = subprocess.run([
    'curl', '-s', '-X', 'POST', 'http://localhost:3001/api/read-variables',
    '-H', 'Content-Type: application/json',
    '-d', '{}'
], capture_output=True, text=True)

vars_data = json.loads(vars_result.stdout)
swatches = [c for c in vars_data['data']['collections'] if c['name'] == 'Swatch']

if not swatches:
    print("Error: Swatch collection not found")
    exit(1)

swatch_vars = swatches[0]['variables']
print(f"Found {len(swatch_vars)} variables in Swatch collection\n")

# Find all colors in selection (recursively)
def find_colors(node, colors):
    """Recursively find all solid color fills"""
    if 'fills' in node and node['fills']:
        for idx, fill in enumerate(node['fills']):
            if isinstance(fill, dict) and fill.get('type') == 'SOLID':
                color = fill.get('color')
                if color and 'r' in color:
                    colors.append({
                        'nodeId': node['id'],
                        'nodeName': node['name'],
                        'property': 'fills',
                        'index': idx,
                        'color': color
                    })

    if 'strokes' in node and node['strokes']:
        for idx, stroke in enumerate(node['strokes']):
            if isinstance(stroke, dict) and stroke.get('type') == 'SOLID':
                color = stroke.get('color')
                if color and 'r' in color:
                    colors.append({
                        'nodeId': node['id'],
                        'nodeName': node['name'],
                        'property': 'strokes',
                        'index': idx,
                        'color': color
                    })

    if 'children' in node:
        for child in node['children']:
            find_colors(child, colors)

colors_found = []
for node in selection['data']['selection']:
    find_colors(node, colors_found)

print(f"Found {len(colors_found)} colors in selection\n")

# Match each color to nearest swatch variable
bindings = []

for color_ref in colors_found:
    color = color_ref['color']

    # Find nearest swatch variable
    best_match = None
    best_distance = float('inf')

    for var in swatch_vars:
        if var['type'] == 'COLOR':
            var_color = var['values']['Value']
            # Skip if variable color has alpha channel but not RGB
            if 'r' not in var_color:
                continue
            distance = color_distance(color, var_color)

            if distance < best_distance:
                best_distance = distance
                best_match = var

    if best_match:
        bindings.append({
            'nodeId': color_ref['nodeId'],
            'property': color_ref['property'],
            'index': color_ref['index'],
            'variableId': best_match['id']
        })

        rgb_orig = (int(color['r']*255), int(color['g']*255), int(color['b']*255))
        rgb_match = (
            int(best_match['values']['Value']['r']*255),
            int(best_match['values']['Value']['g']*255),
            int(best_match['values']['Value']['b']*255)
        )

        print(f"  {color_ref['nodeName'][:30]:30s} rgb{rgb_orig} -> {best_match['name'][:30]:30s} rgb{rgb_match}")

print(f"\n\nBinding {len(bindings)} colors to Swatch variables...")

# Apply bindings
payload = {
    'autoMapToGreys': False,
    'replacements': bindings
}

replace_result = subprocess.run([
    'curl', '-s', '-X', 'POST', 'http://localhost:3001/api/replace-colors-batch',
    '-H', 'Content-Type: application/json',
    '-d', json.dumps(payload)
], capture_output=True, text=True)

replace_data = json.loads(replace_result.stdout)

if replace_data['success']:
    print(f"\nSuccess!")
    print(f"  Total replacements: {replace_data['data']['totalReplacements']}")
    print(f"  Successful: {replace_data['data']['successCount']}")
    print(f"  Errors: {replace_data['data']['errorCount']}")

    if replace_data['data'].get('errors'):
        print(f"\nErrors:")
        for err in replace_data['data']['errors'][:5]:
            print(f"  - {err}")
else:
    print(f"\nError: {replace_data.get('error', 'Unknown error')}")
