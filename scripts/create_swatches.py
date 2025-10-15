#!/usr/bin/env python3
"""
Create color swatch variables from selected rectangles
"""
import json
import subprocess

# Color names mapping based on visual appearance
# Format: rectangle_name -> (primary_name, light_variant_name)
color_mapping = {
    "Rectangle 25091": ("blue", "blue-light"),        # Light blue
    "Rectangle 25092": ("coral", "coral-light"),      # Coral/Orange
    "Rectangle 25098": ("purple", "purple-light"),    # Purple
    "Rectangle 25099": ("lavender", "lavender-light"),# Light lavender
    "Rectangle 25100": ("red", "red-light"),          # Red/Rose
    "Rectangle 25101": ("peach", "peach-light"),      # Light peach
    "Rectangle 25102": ("teal", "teal-light"),        # Teal/Cyan
    "Rectangle 25103": ("mint", "mint-light")         # Light mint
}

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

# Extract colors
rectangles = selection_data['data']['selection']
print(f"\nFound {len(rectangles)} selected rectangles\n")

variables = []

for rect in rectangles:
    if rect['fills'] and len(rect['fills']) > 0:
        fill = rect['fills'][0]
        if fill['type'] == 'SOLID':
            color = fill['color']

            # Determine if this is a light or dark variant based on brightness
            brightness = (color['r'] + color['g'] + color['b']) / 3

            # Get color name from mapping
            if rect['name'] in color_mapping:
                base_name, light_name = color_mapping[rect['name']]
                var_name = light_name if brightness > 0.6 else base_name
            else:
                var_name = f"color-{rect['id']}"

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
            print(f"  {var_name:20s} rgb({rgb[0]:3d}, {rgb[1]:3d}, {rgb[2]:3d})")

# Create collection payload
payload = {
    'collection': {
        'name': 'Color Swatches',
        'modes': [{'name': 'Value'}],
        'variables': variables
    }
}

print(f"\nCreating 'Color Swatches' collection with {len(variables)} variables...")

# Send to API
create_result = subprocess.run([
    'curl', '-s', '-X', 'POST', 'http://localhost:3001/api/sync-variables',
    '-H', 'Content-Type: application/json',
    '-d', json.dumps(payload)
], capture_output=True, text=True)

create_data = json.loads(create_result.stdout)

if create_data['success']:
    print(f"\n✓ Success! Color Swatches collection created")
    print(f"  Collection: {payload['collection']['name']}")
    print(f"  Variables: {len(variables)}")
else:
    print(f"\n✗ Error: {create_data.get('error', 'Unknown error')}")
