#!/usr/bin/env python3
"""
Add usability colors (success, error, warning) to Swatch collection
Colors are calculated to match the current palette direction (muted, professional)
"""
import json
import subprocess

# Read current Swatch collection to understand palette direction
print("Analyzing current color palette...")
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

# Analyze existing accent colors to determine palette direction
accent_colors = [v for v in swatches[0]['variables'] if v['name'].startswith('accent/')]

# Calculate average saturation and brightness
total_saturation = 0
total_brightness = 0

for var in accent_colors:
    r = var['values']['Value']['r']
    g = var['values']['Value']['g']
    b = var['values']['Value']['b']

    # Calculate HSB
    max_c = max(r, g, b)
    min_c = min(r, g, b)
    brightness = max_c
    saturation = 0 if max_c == 0 else (max_c - min_c) / max_c

    total_saturation += saturation
    total_brightness += brightness

avg_saturation = total_saturation / len(accent_colors) if accent_colors else 0.5
avg_brightness = total_brightness / len(accent_colors) if accent_colors else 0.7

print(f"Palette analysis:")
print(f"  Average saturation: {avg_saturation:.2f}")
print(f"  Average brightness: {avg_brightness:.2f}")
print(f"  Direction: {'Muted/Professional' if avg_saturation < 0.6 else 'Vibrant'}\n")

# Create usability colors matching the palette direction
# Using professional, muted tones that work well in UI

usability_vars = []

# Success colors (green-based)
# Base: Muted professional green
success_base = {
    'name': 'usability/success',
    'type': 'COLOR',
    'values': {
        'Value': {
            'r': 0.22,  # 56
            'g': 0.70,  # 179
            'b': 0.57,  # 145
            'a': 1
        }
    }
}

success_light = {
    'name': 'usability/success-light',
    'type': 'COLOR',
    'values': {
        'Value': {
            'r': 0.78,  # 199
            'g': 0.93,  # 237
            'b': 0.85,  # 217
            'a': 1
        }
    }
}

success_dark = {
    'name': 'usability/success-dark',
    'type': 'COLOR',
    'values': {
        'Value': {
            'r': 0.15,  # 38
            'g': 0.52,  # 133
            'b': 0.42,  # 107
            'a': 1
        }
    }
}

# Warning colors (amber/orange-based)
warning_base = {
    'name': 'usability/warning',
    'type': 'COLOR',
    'values': {
        'Value': {
            'r': 0.95,  # 242
            'g': 0.67,  # 171
            'b': 0.28,  # 71
            'a': 1
        }
    }
}

warning_light = {
    'name': 'usability/warning-light',
    'type': 'COLOR',
    'values': {
        'Value': {
            'r': 1.0,   # 255
            'g': 0.93,  # 237
            'b': 0.84,  # 214
            'a': 1
        }
    }
}

warning_dark = {
    'name': 'usability/warning-dark',
    'type': 'COLOR',
    'values': {
        'Value': {
            'r': 0.76,  # 194
            'g': 0.50,  # 127
            'b': 0.15,  # 38
            'a': 1
        }
    }
}

# Error colors (red-based)
error_base = {
    'name': 'usability/error',
    'type': 'COLOR',
    'values': {
        'Value': {
            'r': 0.88,  # 224
            'g': 0.41,  # 105
            'b': 0.42,  # 107
            'a': 1
        }
    }
}

error_light = {
    'name': 'usability/error-light',
    'type': 'COLOR',
    'values': {
        'Value': {
            'r': 1.0,   # 255
            'g': 0.89,  # 227
            'b': 0.89,  # 227
            'a': 1
        }
    }
}

error_dark = {
    'name': 'usability/error-dark',
    'type': 'COLOR',
    'values': {
        'Value': {
            'r': 0.68,  # 173
            'g': 0.22,  # 56
            'b': 0.23,  # 59
            'a': 1
        }
    }
}

# Info color (blue-based, using existing accent blue as base)
info_base = {
    'name': 'usability/info',
    'type': 'COLOR',
    'values': {
        'Value': {
            'r': 0.40,  # 102
            'g': 0.65,  # 166
            'b': 0.86,  # 219
            'a': 1
        }
    }
}

info_light = {
    'name': 'usability/info-light',
    'type': 'COLOR',
    'values': {
        'Value': {
            'r': 0.67,  # 171
            'g': 0.87,  # 222
            'b': 0.97,  # 247
            'a': 1
        }
    }
}

info_dark = {
    'name': 'usability/info-dark',
    'type': 'COLOR',
    'values': {
        'Value': {
            'r': 0.25,  # 64
            'g': 0.48,  # 122
            'b': 0.71,  # 181
            'a': 1
        }
    }
}

usability_vars = [
    success_base, success_light, success_dark,
    warning_base, warning_light, warning_dark,
    error_base, error_light, error_dark,
    info_base, info_light, info_dark
]

print("Usability colors to be added:\n")
for var in usability_vars:
    r = int(var['values']['Value']['r'] * 255)
    g = int(var['values']['Value']['g'] * 255)
    b = int(var['values']['Value']['b'] * 255)
    print(f"  {var['name']:30s} rgb({r:3d}, {g:3d}, {b:3d})")

# Create payload with new usability variables
payload = {
    'collection': {
        'name': 'Swatch',
        'modes': swatches[0]['modes'],
        'variables': usability_vars
    }
}

print(f"\nAdding {len(usability_vars)} usability colors to Swatch collection...")

# Send to API
create_result = subprocess.run([
    'curl', '-s', '-X', 'POST', 'http://localhost:3001/api/sync-variables',
    '-H', 'Content-Type: application/json',
    '-d', json.dumps(payload)
], capture_output=True, text=True)

create_data = json.loads(create_result.stdout)

if create_data['success']:
    print(f"\nSuccess! Usability colors added")
    print(f"  Collection: Swatch")
    print(f"  New group: usability")
    print(f"  Colors: success, warning, error, info (with light/dark variants)")
else:
    print(f"\nError: {create_data.get('error', 'Unknown error')}")
