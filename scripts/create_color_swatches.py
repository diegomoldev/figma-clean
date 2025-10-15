#!/usr/bin/env python3
"""
Extract colors from selection and create color variable collection
"""
import json
import subprocess

# Get selection
print("Getting selection...")
result = subprocess.run([
    'curl', '-X', 'POST', 'http://localhost:3001/api/get-selection',
    '-H', 'Content-Type: application/json',
    '-d', '{}'
], capture_output=True, text=True)

selection_data = json.loads(result.stdout)

if not selection_data['success']:
    print(f"Error: {selection_data.get('error', 'Unknown error')}")
    exit(1)

# Extract colors from rectangles
rectangles = selection_data['data']['selection']
colors = []

color_names = {
    "2473:8136": "color-blue-light",      # Light blue
    "2473:8137": "color-coral",           # Coral/Orange
    "2473:8143": "color-purple",          # Purple
    "2473:8144": "color-lavender",        # Light lavender
    "2473:8145": "color-red",             # Red/Rose
    "2473:8146": "color-peach",           # Light peach
    "2473:8149": "color-teal",            # Teal/Cyan
    "2473:8150": "color-mint"             # Light mint green
}

for rect in rectangles:
    if rect['fills'] and len(rect['fills']) > 0:
        fill = rect['fills'][0]
        if fill['type'] == 'SOLID':
            color_name = color_names.get(rect['id'], f"color-{rect['id']}")
            colors.append({
                'name': color_name,
                'r': fill['color']['r'],
                'g': fill['color']['g'],
                'b': fill['color']['b']
            })

print(f"\nExtracted {len(colors)} colors:")
for c in colors:
    print(f"  - {c['name']}: rgb({int(c['r']*255)}, {int(c['g']*255)}, {int(c['b']*255)})")

# Create variable collection payload
variables = []
for color in colors:
    variables.append({
        'name': color['name'],
        'type': 'COLOR',
        'values': {
            'Value': {
                'r': color['r'],
                'g': color['g'],
                'b': color['b']
            }
        }
    })

payload = {
    'collection': {
        'name': 'Color Swatches',
        'modes': [{'name': 'Value'}],
        'variables': variables
    }
}

print(f"\nCreating variable collection with {len(variables)} color variables...")

# Save payload
with open('color_swatches_payload.json', 'w') as f:
    json.dump(payload, f, indent=2)

# Send to API
create_result = subprocess.run([
    'curl', '-X', 'POST', 'http://localhost:3001/api/sync-variables',
    '-H', 'Content-Type: application/json',
    '-d', f'@color_swatches_payload.json'
], capture_output=True, text=True)

create_data = json.loads(create_result.stdout)

if create_data['success']:
    print(f"\nSuccess! Created collection: {payload['collection']['name']}")
    print(f"Variables created: {len(variables)}")
else:
    print(f"\nError: {create_data.get('error', 'Unknown error')}")
