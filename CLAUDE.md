# Claude Context - Figma Bridge Project

## Figma Plugin API Documentation

When working on this project, refer to these official Figma plugin API references:

- **Quickstart Guide:** https://developers.figma.com/docs/plugins/plugin-quickstart-guide/
- **Global Objects:** https://developers.figma.com/docs/plugins/api/global-objects/

## Project Purpose

This project is a **development tool** for building and testing a Figma plugin with WebSocket bridge architecture. The primary goal is to develop the plugin functionality, NOT to populate Figma with design systems.

## Important Context

**Your role in this project:**
- Build and test the Figma plugin infrastructure
- Develop the WebSocket bridge communication
- Implement plugin API features (variables, styles, components, etc.)
- Test commands and functionality
- Debug and fix issues

**NOT your role:**
- Creating production design systems in Figma
- Adding comprehensive variable collections for actual use
- Setting up real design tokens for the user's work

## Project Architecture

```
External Tools → HTTP API → Bridge Server → WebSocket → Figma Plugin
(Claude/Gemini)      ↓            ↓              ↑              ↓
                 Commands    Command Queue    Responses    Figma API
```

### Components

1. **Figma Plugin** (`plugin/`)
   - **Main thread** (`main.ts`): Entry point, delegates to router
   - **Router** (`router.ts`): Routes commands to appropriate handlers
   - **Handlers**: Organized by domain (nodes/, variables, styles, components, etc.)
   - **UI thread** (`ui/ui.html`): WebSocket client, connects to bridge
   - **Types** (`types/index.ts`): Command and response type definitions
   - Compiled output: `code.js` (no module system, plain JavaScript)

2. **Bridge Server** (`bridge-server/`)
   - WebSocket server (port 3000) - Connects to plugin
   - HTTP API (port 3001) - Receives commands from external tools
   - Command queue (`queue.ts`) with 30s timeout
   - Batch command endpoint for multiple operations

3. **Shared Types** (`shared/`)
   - TypeScript type definitions
   - Used by bridge server only (plugin has inline types)

4. **Integration Tools**
   - `generate_curl.py` - Python helper to generate batch curl commands from selection data
   - `gemini.md` - Reference documentation for Figma API usage

## Plugin Features Status

### Fully Implemented ✓

- **Variables CRUD**
  - `sync-variables` - Create/update variable collections
  - `read-variables` - Export all variables
  - `delete-collection` - Delete single collection by name
  - `delete-all-collections` - Delete all collections
  - Supports: COLOR, FLOAT, STRING, BOOLEAN types
  - Multiple modes (light/dark, etc.)
  - Variable scopes

- **Styles**
  - `sync-styles` - Create/update paint, text, effect, grid styles
  - `read-styles` - Export all styles

- **Nodes** (via handlers/nodes/)
  - **Sync operations**: Create/update frames, rectangles, text, ellipses, groups, lines, polygons, stars, vectors
  - **CRUD operations**:
    - `read-nodes` - Read nodes with filters (type, name, parent)
    - `update-node` - Update node properties, move to new parent
    - `delete-node` - Delete single node by ID
    - `delete-nodes` - Delete multiple nodes with filters
  - **Selection**:
    - `get-selection` - Get currently selected nodes
    - `set-selection` - Set selection by node IDs

- **Properties**
  - `set-auto-layout` - Apply auto-layout to frames
  - `set-fills` - Update node fills
  - `set-effects` - Update node effects
  - `set-constraints` - Update node constraints

- **Components**
  - `sync-component` - Create/update components
  - `sync-instance` - Create component instances
  - `read-components` - Read all local components

- **Pages**
  - `sync-page` - Create/update pages
  - `read-pages` - Read all pages
  - `set-current-page` - Switch to specific page
  - `delete-page` - Delete a page
  - `clone-page` - Clone a page

- **Templates**
  - `create-page-structure` - Create full page hierarchy from JSON
  - `create-button` - Create pre-configured button component
  - `create-card` - Create pre-configured card component

- **Export**
  - `export-image` - Export nodes as PNG, JPG, SVG, PDF

- **Batch Operations**
  - `batch-commands` - Execute multiple commands sequentially

- **Color Operations** (via handlers/colors.ts)
  - `find-all-colors` - Scan nodes and extract all solid colors with references
  - `replace-colors-batch` - Replace colors in batch with variable references
  - Supports auto-mapping colors to closest grey variables
  - Uses Euclidean distance for color matching

### Not Yet Implemented ✗
- Image/Video nodes (create, embed)
- Prototyping (links, interactions, flows)
- Plugin data storage
- Component publishing
- Advanced constraints and layout grids

## Testing Approach

When testing new features:
1. Create minimal test data (1-3 items)
2. Verify the feature works
3. Test error cases
4. Clean up test data with `delete-all-collections` if needed

**Do NOT create extensive design systems** unless specifically requested for production use.

## Common Commands

### Start Bridge Server
```bash
cd bridge-server
npm start
```

### Build Plugin
```bash
cd plugin
npm run build
```

### Test Commands (Examples)

**Create test variable:**
```bash
curl -X POST http://localhost:3001/api/sync-variables \
  -H "Content-Type: application/json" \
  -d '{"collection":{"name":"test","modes":[{"name":"default"}],"variables":[{"name":"test-color","type":"COLOR","values":{"default":{"r":1,"g":0,"b":0}}}]}}'
```

**Read variables:**
```bash
curl -X POST http://localhost:3001/api/read-variables \
  -H "Content-Type: application/json" -d "{}"
```

**Delete collection:**
```bash
curl -X POST http://localhost:3001/api/delete-collection \
  -H "Content-Type: application/json" \
  -d '{"name":"test"}'
```

**Delete all collections:**
```bash
curl -X POST http://localhost:3001/api/delete-all-collections \
  -H "Content-Type: application/json" -d "{}"
```

**Get current selection:**
```bash
curl -X POST http://localhost:3001/api/get-selection \
  -H "Content-Type: application/json" -d "{}"
```

**Create rectangle:**
```bash
curl -X POST http://localhost:3001/api/sync-rectangle \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Rect","x":0,"y":0,"width":100,"height":100,"fills":[{"type":"SOLID","color":{"r":1,"g":0,"b":0}}]}'
```

**Batch update nodes:**
```bash
curl -X POST http://localhost:3001/api/batch-commands \
  -H "Content-Type: application/json" \
  -d '{"commands":[{"type":"update-node","payload":{"nodeId":"123:456","fills":[{"type":"SOLID","color":{"r":1,"g":0,"b":0}}]}},{"type":"update-node","payload":{"nodeId":"123:457","fills":[{"type":"SOLID","color":{"r":0,"g":1,"b":0}}]}}]}'
```

**Check server status:**
```bash
curl http://localhost:3001/api/status
```

## Development Notes

### TypeScript Configuration
- **Plugin**: No module system, plain ES2017 output
- **Bridge Server**: CommonJS modules for Node.js
- **Shared types**: Only used by bridge server

### Adding New Commands

1. Add command type to `plugin/src/types/index.ts`:
```typescript
export type CommandType =
  | '...'
  | 'new-command';
```

2. Create handler in appropriate `plugin/src/handlers/` file or create new file:
```typescript
import { Command, CommandResponse } from '../types';

export async function handleNewCommand(msg: Command): Promise<CommandResponse> {
  try {
    // Implementation using Figma API
    const result = // ... your code

    return {
      id: msg.id,
      success: true,
      data: result
    };
  } catch (error) {
    return {
      id: msg.id,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
```

3. Add route to `plugin/src/router.ts`:
```typescript
import { handleNewCommand } from './handlers/yourHandler';

// In routeCommand switch:
case 'new-command':
  return await handleNewCommand(msg);
```

4. Add HTTP endpoint to `bridge-server/src/server.ts` if special handling needed (optional - generic endpoint handles most cases)

5. Rebuild: `cd plugin && npm run build`

### Figma Plugin API Limitations
- Cannot run HTTP servers (CORS restrictions)
- Plugins run in sandboxed iframe with null origin
- No module system (no imports/exports)
- Must use WebSocket as client, not server

## User Preferences

From user's global CLAUDE.md:
- Plain text, no emojis
- Professional, direct tone
- Minimal formatting
- Use multiple agents/tasks to avoid flooding terminal
- Prefer simple, minimal setups
- Dark mode, neutral grays
- Use Phosphor icons when needed
- Don't add unrequired features unless asked
- Challenge user selections if better processes exist

## Next Steps / Potential Features

- [ ] Add component creation/management
- [ ] Add frame/layout operations
- [ ] Add node creation (shapes, text)
- [ ] Add batch operations
- [ ] Add better error handling
- [ ] Add plugin state persistence
- [ ] Add authentication/security

## Working with Text Nodes & Character Formatting

### Text Nodes Inside Component Instances

**Key Discovery:** Text nodes inside component instances CAN be edited directly without needing component properties or `setProperties()`.

- Access text nodes by their full node ID (including instance path)
- Use `update-node` command with the text node ID
- Change `characters` property directly
- Apply character-level formatting using `characterFormatting` array

Example:
```bash
curl -X POST http://localhost:3001/api/update-node \
  -H "Content-Type: application/json" \
  -d '{"nodeId":"I6:3216;2443:4668;2404:3503;2403:734","characters":"New Title"}'
```

### Mixed Text Formatting (Dual Colors)

**Critical Bug Fix Applied:** When updating text with `characterFormatting`, the code was previously applying global `fontSize` and `fontName` properties BEFORE character formatting, causing them to override mixed formatting.

**Solution Implemented in [crud.ts:151-168](f:\Coding Projects\figma-clean\plugin\src\handlers\nodes\crud.ts#L151-L168):**
- Check if `characterFormatting` is provided
- If YES: Skip applying global `fontSize` and `fontName` (let character formatting handle it)
- If NO: Apply global properties as normal
- Always apply alignment and spacing properties (don't conflict with character formatting)

### Character Count Accuracy

**Common Error:** Manually counting characters when creating `characterFormatting` arrays leads to incorrect split points.

**Best Practice:**
1. Calculate exact character count programmatically: `"Your title text.".length`
2. For dual-color titles (dark title + gray description):
   - Dark section: `0` to `titleText.length` (includes period)
   - Gray section: `titleText.length` to `fullText.length`

**Example:**
```typescript
const title = "Culture-building at scale."; // length = 27
const full = "Culture-building at scale. Rest of the text..."; // length = 150

characterFormatting: [
  { start: 0, end: 27, fills: [darkColor], fontSize: 24, fontName: font },
  { start: 27, end: 150, fills: [grayColor], fontSize: 24, fontName: font }
]
```

**Wrong approach (manual counting):** Guessing "around 47 characters" and including parts of the next word.

**Debugging Mixed Formatting Issues:**
1. Read the node: `curl -X POST http://localhost:3001/api/read-nodes`
2. Check `characterFormatting` array in response
3. Look for 3+ formatting segments (should only be 2 for dual-color)
4. Verify split point matches exactly where title ends
5. Recalculate and update with correct character counts

### Common Patterns

**Dual-color section titles:**
- First part (title): Dark color
- Second part (description): Light gray color
- Always use exact character counts, not estimates
- Include period with the title in dark color
- Start gray section with the space after the period

## Color Management Workflow

### Finding and Replacing Colors

The plugin provides two complementary commands for color management:

**1. find-all-colors** - Scan and catalog colors

Scans selected nodes (or provided node IDs) recursively and returns all unique solid colors with their node references.

```bash
curl -X POST http://localhost:3001/api/find-all-colors \
  -H "Content-Type: application/json" \
  -d '{"nodeIds":["2571:6357","2571:6358"]}'
```

Response format:
```json
{
  "success": true,
  "data": {
    "totalColors": 5,
    "totalReferences": 23,
    "colors": [
      {
        "color": {"r": 0.68, "g": 0.68, "b": 0.68, "a": 1},
        "count": 8,
        "nodes": [
          {
            "nodeId": "I2571:6359;2505:11109;2426:1587",
            "nodeName": "Rectangle 25025",
            "property": "fills",
            "index": 0
          }
        ]
      }
    ]
  }
}
```

**2. replace-colors-batch** - Replace colors with variables

Replaces colors in batch with variable references. Supports three modes:

**Mode A: Auto-map to closest greys**
```bash
curl -X POST http://localhost:3001/api/replace-colors-batch \
  -H "Content-Type: application/json" \
  -d '{
    "autoMapToGreys": true,
    "collectionName": "Swatch",
    "greyPrefix": "grey-",
    "replacements": [
      {
        "nodeId": "2571:6359",
        "property": "fills",
        "index": 0,
        "color": {"r": 0.68, "g": 0.68, "b": 0.68}
      }
    ]
  }'
```

**Mode B: Specify variable by name**
```bash
curl -X POST http://localhost:3001/api/replace-colors-batch \
  -H "Content-Type: application/json" \
  -d '{
    "collectionName": "Swatch",
    "replacements": [
      {
        "nodeId": "2571:6359",
        "property": "fills",
        "index": 0,
        "variableName": "grey-500"
      }
    ]
  }'
```

**Mode C: Specify variable by ID**
```bash
curl -X POST http://localhost:3001/api/replace-colors-batch \
  -H "Content-Type: application/json" \
  -d '{
    "replacements": [
      {
        "nodeId": "2571:6359",
        "property": "fills",
        "index": 0,
        "variableId": "VariableID:2571:9611"
      }
    ]
  }'
```

### Typical Workflow

1. Select frames in Figma containing nodes with colors to replace
2. Use `find-all-colors` to scan and get all colors with node references
3. Process the response to create replacement commands
4. Use `replace-colors-batch` with `autoMapToGreys: true` to automatically map to closest grey variables
5. All colors are replaced with variable bindings in a single batch operation

### Key Learnings

**Prefer Plugin Functions Over External Scripts:**
- Create reusable plugin handlers instead of one-off Python/Node scripts
- Plugin functions can be called from any external tool (Claude, Gemini, curl)
- Easier to maintain and extend
- More consistent with the bridge architecture

**Color Distance Calculation:**
- Uses Euclidean distance in RGB space: `sqrt((r1-r2)² + (g1-g2)² + (b1-b2)²)`
- Finds closest match from available grey variables
- Works well for mapping colored designs to neutral greys

**Batch Processing:**
- Split operations into separate "find" and "replace" commands
- "Find" command returns data for processing/preview
- "Replace" command executes the actual changes
- Allows for validation and adjustment before applying changes

## Important Reminders

1. **Keep tests minimal** - Create small test data, verify functionality, clean up
2. **Focus on plugin development** - Build features, don't populate Figma
3. **Ask before extensive work** - Confirm scope before creating large datasets
4. **Clean up after testing** - Use delete commands to remove test data
5. **Document new features** - Update this file and README when adding commands
6. **Character formatting** - Always calculate exact character counts programmatically, never guess
7. **Reusable plugin functions** - Create plugin handlers instead of external scripts for better reusability
