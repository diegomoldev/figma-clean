#!/usr/bin/env python3
"""
Create color swatch variables with groups using forward slash notation
Groups: accent/blue, accent/coral, accent/purple, etc.
"""
import json
import subprocess

# Get selection
print("Getting color selection from Figma...")
result = subprocess.run([
    'curl', '-s', '-X', 'POST', 'http://localhost:3001/api/get-selection',
    '-H', 'Content-Type: application/json',
    '-d', '{}'
], capture_output=True, text=True)

selection_data = json.loads(result.stdout)

if not selection_data['success']:
    print(f"Error: {selection_data.get('error', 'Unknown error')}")
    exit(1)

# Color mapping with groups
# Format: rectangle_id -> (group, base_name, variant)
color_mapping = {
    "2473:8136": ("accent", "blue", "light"),     # Light blue
    "2473:8137": ("accent", "coral", "base"),     # Coral/Orange
    "2473:8143": ("accent", "purple", "base"),    # Purple
    "2473:8144": ("accent", "purple", "light"),   # Light lavender
    "2473:8145": ("accent", "red", "base"),       # Red/Rose
    "2473:8146": ("accent", "coral", "light"),    # Light peach
    "2473:8149": ("accent", "teal", "base"),      # Teal/Cyan
    "2473:8150": ("accent", "teal", "light")      # Light mint
}

rectangles = selection_data['data']['selection']
print(f"\nFound {len(rectangles)} selected rectangles\n")

variables = []

for rect in rectangles:
    if rect['fills'] and len(rect['fills']) > 0:
        fill = rect['fills'][0]
        if fill['type'] == 'SOLID':
            color = fill['color']

            # Get color mapping
            if rect['id'] in color_mapping:
                group, base_name, variant = color_mapping[rect['id']]

                # Use forward slash notation for grouping
                if variant == "light":
                    var_name = f"{group}/{base_name}-light"
                else:
                    var_name = f"{group}/{base_name}"
            else:
                var_name = f"color/{rect['id']}"

            variables.append({
                'name': var_name,
                'type': 'COLOR',
                'values': {
                    'Value': {
                        'r': color['r'],
                        'g': color['g'],
                        'b': color['b']
                    }
                }
            })

            rgb = (int(color['r']*255), int(color['g']*255), int(color['b']*255))
            print(f"  {var_name:30s} rgb({rgb[0]:3d}, {rgb[1]:3d}, {rgb[2]:3d})")

# Create collection payload - add to Swatch collection
payload = {
    'collection': {
        'name': 'Swatch',
        'modes': [{'name': 'Value'}],
        'variables': variables
    }
}

print(f"\nAdding {len(variables)} variables to 'Swatch' collection...")

# Send to API
create_result = subprocess.run([
    'curl', '-s', '-X', 'POST', 'http://localhost:3001/api/sync-variables',
    '-H', 'Content-Type: application/json',
    '-d', json.dumps(payload)
], capture_output=True, text=True)

create_data = json.loads(create_result.stdout)

if create_data['success']:
    print(f"\nSuccess! Variables added to Swatch collection")
    print(f"  Collection: {payload['collection']['name']}")
    print(f"  Variables added: {len(variables)}")
    print(f"  Organized in 'accent' group with subgroups: blue, coral, purple, red, teal")
else:
    print(f"\nError: {create_data.get('error', 'Unknown error')}")
