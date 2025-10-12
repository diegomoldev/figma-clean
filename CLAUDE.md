# Claude Context - Figma Bridge Project

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
Claude Code → HTTP API → Bridge Server → WebSocket → Figma Plugin
     ↓                       ↓              ↑              ↓
  Commands             Command Queue    Responses    Figma API
```

### Components

1. **Figma Plugin** (`plugin/`)
   - Main thread: `code.ts` - Executes Figma API operations
   - UI thread: `ui.html` - WebSocket client, connects to bridge
   - Compiled to: `code.js` (no module system, plain JavaScript)

2. **Bridge Server** (`bridge-server/`)
   - WebSocket server (port 3000) - Connects to plugin
   - HTTP API (port 3001) - Receives commands from external tools
   - Command queue with 30s timeout

3. **Shared Types** (`shared/`)
   - TypeScript type definitions
   - Used by bridge server only (plugin has inline types)

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

### Not Yet Implemented ✗
- Components (create, manage, publish)
- Layout (frames, auto-layout, constraints)
- Nodes (rectangles, text, images)
- Prototyping (links, interactions)
- Exports (settings, asset generation)

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

## Development Notes

### TypeScript Configuration
- **Plugin**: No module system, plain ES2017 output
- **Bridge Server**: CommonJS modules for Node.js
- **Shared types**: Only used by bridge server

### Adding New Commands

1. Add command type to `plugin/code.ts`:
```typescript
type CommandType = '...' | 'new-command';
```

2. Add case to switch statement:
```typescript
case 'new-command':
  response = await handleNewCommand(msg);
  break;
```

3. Implement handler function:
```typescript
async function handleNewCommand(msg: Command): Promise<CommandResponse> {
  // Implementation
}
```

4. Rebuild: `cd plugin && npm run build`

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

## Important Reminders

1. **Keep tests minimal** - Create small test data, verify functionality, clean up
2. **Focus on plugin development** - Build features, don't populate Figma
3. **Ask before extensive work** - Confirm scope before creating large datasets
4. **Clean up after testing** - Use delete commands to remove test data
5. **Document new features** - Update this file and README when adding commands
