import json

with open('selection.json') as f:
    data = json.load(f)

ids = [node['id'] for node in data['data']['selection'][0]['children'][:20]]

commands = [
    {
        'type': 'update-node',
        'payload': {
            'nodeId': id,
            'fills': [{'type': 'SOLID', 'color': {'r': 1, 'g': 0, 'b': 0}}]
        }
    }
    for id in ids
]

print(f'curl -X POST -H "Content-Type: application/json" -d 
{json.dumps(commands)}
 http://localhost:3001/api/batch-commands')
