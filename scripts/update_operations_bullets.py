#!/usr/bin/env python3
"""
Update Operations & Safety (Solution 03) bullet points to match site-content.md
"""
import json
import subprocess

# Correct content from docs for Operations section 3rd bullet group
operations_bullets = {
    "title": "Strengthen operational consistency",
    "description": "When everyone's on the same page, work gets done faster and with fewer mistakes. We help you create clear, accessible task flows for every role and site.",
    "bullets": [
        "Standardise checklists, SOPs and routines across locations",
        "Push operational updates and key info in real-time",
        "Use templates and rules to streamline repeatable tasks",
        "Track task completion and spot gaps before they become risks"
    ]
}

print("Searching for Operations section...")
print(f"\nCorrect content from docs:")
print(f"Title: {operations_bullets['title']}")
print(f"\nBullets:")
for b in operations_bullets['bullets']:
    print(f"  - {b}")

print("\n\nPlease select the Operations section (SOLUTION-03) in Figma with the incorrect bullet points.")
print("Press Enter when ready...")
input()

# Get selection
result = subprocess.run([
    'curl', '-s', '-X', 'POST', 'http://localhost:3001/api/get-selection',
    '-H', 'Content-Type: application/json',
    '-d', '{}'
], capture_output=True, text=True)

selection = json.loads(result.stdout)
if not selection['success'] or selection['data']['count'] == 0:
    print("Error: No selection found")
    exit(1)

print(f"\nFound selection: {selection['data']['selection'][0]['name']}")
print("\nSearching for text nodes to update...")

# You'll need to manually identify the node IDs for the 4 bullet text nodes
# This is a template - adjust based on actual node structure

print("\n\nTo complete this update, we need the node IDs of the 4 bullet text nodes.")
print("Run this command to see all text in your selection:")
print("curl -X POST http://localhost:3001/api/read-nodes -d '{\"filters\":{\"type\":\"TEXT\"}}'")
