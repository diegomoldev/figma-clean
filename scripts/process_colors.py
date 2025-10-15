#!/usr/bin/env python3
"""
Process find-all-colors output and generate replace-colors-batch payload
"""
import json
import subprocess

# Step 1: Get colors from find-all-colors
print("Finding all colors...")
result = subprocess.run([
    'curl', '-X', 'POST', 'http://localhost:3001/api/find-all-colors',
    '-H', 'Content-Type: application/json',
    '-d', '{"nodeIds":["2571:6357"]}'
], capture_output=True, text=True)

colors_data = json.loads(result.stdout)

if not colors_data['success']:
    print(f"Error: {colors_data.get('error', 'Unknown error')}")
    exit(1)

# Step 2: Build replacements array
replacements = []
for color_group in colors_data['data']['colors']:
    color = color_group['color']
    for node_ref in color_group['nodes']:
        replacements.append({
            'nodeId': node_ref['nodeId'],
            'property': node_ref['property'],
            'index': node_ref['index'],
            'color': {
                'r': color['r'],
                'g': color['g'],
                'b': color['b']
            }
        })

# Step 3: Create payload
payload = {
    'autoMapToGreys': True,
    'collectionName': 'Swatch',
    'greyPrefix': 'neutral-',
    'replacements': replacements
}

print(f"\nGenerated {len(replacements)} replacements from {colors_data['data']['totalColors']} unique colors")

# Step 4: Save payload to file
payload_file = 'replace-colors-payload.json'
with open(payload_file, 'w') as f:
    json.dump(payload, f)

# Step 5: Execute replacement using file
print("\nExecuting color replacement...")
replace_result = subprocess.run([
    'curl', '-X', 'POST', 'http://localhost:3001/api/replace-colors-batch',
    '-H', 'Content-Type: application/json',
    '-d', f'@{payload_file}'
], capture_output=True, text=True)

replace_data = json.loads(replace_result.stdout)

if replace_data['success']:
    print(f"\nSuccess!")
    print(f"  Total replacements: {replace_data['data']['totalReplacements']}")
    print(f"  Successful: {replace_data['data']['successCount']}")
    print(f"  Errors: {replace_data['data']['errorCount']}")

    if replace_data['data'].get('errors'):
        print(f"\nErrors encountered:")
        for error in replace_data['data']['errors'][:10]:  # Show first 10 errors
            print(f"  - {error}")
else:
    print(f"\nError: {replace_data.get('error', 'Unknown error')}")
