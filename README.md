# Figma Bridge

Programmable bridge for Figma automation via WebSocket. Control Figma variables, styles, and more from external tools like Claude Code.

## Architecture

```
Claude Code → HTTP API → Bridge Server → WebSocket → Figma Plugin
     ↓                       ↓              ↑              ↓
  Commands             Command Queue    Responses    Figma API
```

## Project Structure

```
figma-clean/
├── plugin/                 # Figma plugin (TypeScript)
│   ├── manifest.json      # Plugin configuration
│   ├── code.ts           # Main thread (Figma API)
│   ├── code.js           # Compiled output
│   ├── ui.html           # UI thread (WebSocket client)
│   ├── tsconfig.json
│   └── package.json
├── bridge-server/         # WebSocket bridge (Node.js)
│   ├── src/
│   │   ├── server.ts     # WebSocket + HTTP server
│   │   └── queue.ts      # Command queue
│   ├── dist/             # Compiled output
│   ├── tsconfig.json
│   └── package.json
├── shared/
│   └── types.ts          # Shared TypeScript types
└── README.md
```

## Setup

### 1. Install Dependencies

```bash
# Install plugin dependencies
cd plugin
npm install
npm run build

# Install bridge server dependencies
cd ../bridge-server
npm install
npm run build
```

### 2. Install Figma Plugin

1. Open Figma desktop app
2. Go to Plugins > Development > Import plugin from manifest
3. Select `plugin/manifest.json`
4. Plugin "Figma Bridge" is now installed

### 3. Start Bridge Server

```bash
cd bridge-server
npm start
```

Server will start on:
- WebSocket: `ws://localhost:3000`
- HTTP API: `http://localhost:3001`

### 4. Run Plugin in Figma

1. Open any Figma file
2. Go to Plugins > Development > Figma Bridge
3. Plugin UI will show connection status
4. Wait for "Connected to bridge server" status

## Available Commands

### Sync Variables

Create or update variable collections with modes and variables.

```bash
curl -X POST http://localhost:3001/api/sync-variables \
  -H "Content-Type: application/json" \
  -d '{
    "collection": {
      "name": "semantic-colors",
      "modes": [
        {"name": "light"},
        {"name": "dark"}
      ],
      "variables": [
        {
          "name": "text-primary",
          "type": "COLOR",
          "values": {
            "light": {"r": 0, "g": 0, "b": 0},
            "dark": {"r": 1, "g": 1, "b": 1}
          },
          "description": "Primary text color"
        }
      ]
    }
  }'
```

### Sync Styles

Create or update paint, text, effect, and grid styles.

```bash
curl -X POST http://localhost:3001/api/sync-styles \
  -H "Content-Type: application/json" \
  -d '{
    "paintStyles": [
      {
        "name": "brand/primary",
        "description": "Primary brand color",
        "paints": [{
          "type": "SOLID",
          "color": {"r": 0.2, "g": 0.4, "b": 0.8}
        }]
      }
    ],
    "textStyles": [
      {
        "name": "heading/h1",
        "fontSize": 32,
        "fontName": {"family": "Inter", "style": "Bold"}
      }
    ]
  }'
```

### Read Variables

Export all variable collections from Figma.

```bash
curl http://localhost:3001/api/read-variables
```

### Read Styles

Export all styles from Figma.

```bash
curl http://localhost:3001/api/read-styles
```

### Check Status

```bash
curl http://localhost:3001/api/status
```

## Variable Types

- `COLOR`: RGB color values `{r: number, g: number, b: number}`
- `FLOAT`: Numeric values
- `STRING`: Text values
- `BOOLEAN`: True/false values

## Variable Scopes

Control where variables can be used:
- `ALL_SCOPES`
- `ALL_FILLS`, `FRAME_FILL`, `SHAPE_FILL`, `TEXT_FILL`
- `STROKE_COLOR`
- `EFFECT_COLOR`
- `WIDTH_HEIGHT`, `GAP`, `CORNER_RADIUS`
- `TEXT_CONTENT`, `FONT_FAMILY`, `FONT_STYLE`, `FONT_WEIGHT`, `FONT_SIZE`
- `LINE_HEIGHT`, `LETTER_SPACING`, `PARAGRAPH_SPACING`, `PARAGRAPH_INDENT`

## Development

### Watch Mode

Terminal 1 - Plugin:
```bash
cd plugin
npm run watch
```

Terminal 2 - Bridge Server:
```bash
cd bridge-server
npm run watch
```

Terminal 3 - Run Server:
```bash
cd bridge-server
npm start
```

### Rebuild

```bash
# Plugin
cd plugin
npm run build

# Bridge Server
cd bridge-server
npm run build
```

## Usage from Claude Code

Once the bridge server is running and the plugin is connected, you can control Figma programmatically:

```typescript
// Example: Create a design system
const response = await fetch('http://localhost:3001/api/sync-variables', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    collection: {
      name: 'spacing',
      modes: [{ name: 'default' }],
      variables: [
        { name: 'space-xs', type: 'FLOAT', values: { default: 4 } },
        { name: 'space-sm', type: 'FLOAT', values: { default: 8 } },
        { name: 'space-md', type: 'FLOAT', values: { default: 16 } },
        { name: 'space-lg', type: 'FLOAT', values: { default: 24 } },
      ]
    }
  })
});
```

## Troubleshooting

### Plugin not connecting
- Verify bridge server is running on port 3000
- Check Figma desktop app (plugin requires desktop, not browser)
- Check plugin console for WebSocket errors

### Commands timing out
- Ensure plugin UI is open in Figma
- Check bridge server logs for errors
- Verify JSON payload structure matches types

### TypeScript errors
- Run `npm install` in both plugin and bridge-server
- Rebuild with `npm run build`

## Architecture Notes

- **Symmetric JSON**: Read operations return the same format that write operations accept
- **Unified Endpoints**: Single command handles create or update operations
- **WebSocket Communication**: Real-time bidirectional communication
- **Command Queue**: Handles concurrent requests with 30-second timeout
- **Type Safety**: Full TypeScript support with shared types
