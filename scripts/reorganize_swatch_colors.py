#!/usr/bin/env python3
"""
Reorganize existing Swatch collection variables into groups
"""
import json
import subprocess

# Mapping: old_name -> new_name (with group)
rename_mapping = {
    # Utility colors
    "transparent": "utility/transparent",

    # Light colors (grayscale lights)
    "light-100": "light/100",
    "light-100-o20": "light/100-o20",
    "light-200": "light/200",

    # Dark colors
    "dark-800": "dark/800",
    "dark-900": "dark/900",
    "dark-900-o20": "dark/900-o20",

    # Brand colors
    "brand-100": "brand/100",
    "brand-200": "brand/200",
    "brand-300": "brand/300",
    "brand-400": "brand/400",
    "brand-500": "brand/500",
    "brand-600": "brand/600",
    "brand-700": "brand/700",
    "brand-800": "brand/800",
    "brand-900": "brand/900"
}

# Read current variables
print("Reading Swatch collection...")
result = subprocess.run([
    'curl', '-s', '-X', 'POST', 'http://localhost:3001/api/read-variables',
    '-H', 'Content-Type: application/json',
    '-d', '{}'
], capture_output=True, text=True)

data = json.loads(result.stdout)
swatches = [c for c in data['data']['collections'] if c['name'] == 'Swatch']

if not swatches:
    print("Error: Swatch collection not found")
    exit(1)

collection = swatches[0]
variables = collection['variables']

print(f"Found {len(variables)} variables in Swatch collection\n")

# Update variable names
updated_vars = []
renamed_count = 0

for var in variables:
    old_name = var['name']

    if old_name in rename_mapping:
        var['name'] = rename_mapping[old_name]
        print(f"  {old_name:30s} -> {var['name']}")
        renamed_count += 1

    updated_vars.append(var)

print(f"\nRenamed {renamed_count} variables")

# Create payload with updated names
payload = {
    'collection': {
        'name': 'Swatch',
        'modes': collection['modes'],
        'variables': updated_vars
    }
}

print(f"\nUpdating Swatch collection...")

# Send to API
update_result = subprocess.run([
    'curl', '-s', '-X', 'POST', 'http://localhost:3001/api/sync-variables',
    '-H', 'Content-Type: application/json',
    '-d', json.dumps(payload)
], capture_output=True, text=True)

update_data = json.loads(update_result.stdout)

if update_data['success']:
    print(f"\nSuccess! Swatch collection reorganized")
    print(f"  Groups: utility, light, dark, brand, neutral, accent")
else:
    print(f"\nError: {update_data.get('error', 'Unknown error')}")
