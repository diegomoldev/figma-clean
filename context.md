# Figma Plugin Development Context

This document contains important discoveries, patterns, and best practices learned during the development of this Figma plugin with WebSocket bridge architecture.

## Table of Contents
- [Architecture Overview](#architecture-overview)
- [Text Node Sizing Issues](#text-node-sizing-issues)
- [Auto-Layout Properties](#auto-layout-properties)
- [Best Practices](#best-practices)
- [Common Pitfalls](#common-pitfalls)

---

## Architecture Overview

### WebSocket Bridge Pattern
- **Bridge Server**: localhost:3000 (WebSocket) + localhost:3001 (HTTP)
- **Plugin Side**: Runs in Figma sandbox, connects via WebSocket
- **Command/Response Pattern**: Request-response with 30s timeout
- **Symmetric JSON**: Read format matches write format for consistency

### File Structure
```
plugin/src/
├── main.ts              # Command routing
├── handlers/
│   ├── nodes.ts         # Node CRUD operations
│   ├── properties.ts    # Advanced property management
│   ├── components.ts    # Component operations
│   ├── templates.ts     # Template builders
│   ├── pages.ts         # Page management
│   └── variables.ts     # Variables & Collections
└── types/
    └── index.ts         # Command types
```

---

## Text Node Sizing Issues

### Critical Discovery: Text Width = 0 Problem

**Problem**: When creating text nodes with `layoutSizingHorizontal: "FILL"`, the text width becomes 0 and wraps character-by-character.

**Root Cause**: Layout sizing properties (`layoutSizingHorizontal`, `layoutSizingVertical`) can only be set AFTER the node is appended to an auto-layout parent.

**Solution**: Use **fixed widths** for all text nodes initially.

### Text Property Order (CRITICAL)

When creating or updating text nodes, properties MUST be set in this exact order:

```typescript
// 1. Create text node
const text = figma.createText();

// 2. Load fonts FIRST
await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });

// 3. Append to parent (if using layout sizing properties)
parent.appendChild(text);

// 4. Set textAutoResize BEFORE any width/height changes
text.textAutoResize = 'HEIGHT'; // or 'WIDTH_AND_HEIGHT', 'NONE'

// 5. Set layout sizing (only works if node is child of auto-layout)
text.layoutSizingHorizontal = 'FILL'; // or 'HUG', 'FIXED'
text.layoutSizingVertical = 'HUG';

// 6. Apply common properties (includes resize)
applyCommonProperties(text, props);

// 7. Set text content and styling
text.characters = 'Hello World';
text.fontSize = 16;
```

### Text Width Calculation

When using fixed widths, calculate based on container width minus padding:

```typescript
// Example: Card is 437px wide with 24px padding on each side
const textWidth = 437 - (24 + 24); // = 389px

// Example: Dashboard is 1440px wide with 40px padding on each side
const titleWidth = 1440 - (40 + 40); // = 1360px
```

### textAutoResize Property

**Valid Values:**
- `'NONE'`: Fixed size textbox
- `'HEIGHT'`: Fixed width, wraps text, height auto-adjusts (use this for wrapping text)
- `'WIDTH_AND_HEIGHT'`: Both dimensions auto-adjust, no wrapping
- `'TRUNCATE'`: (Deprecated) Use `textTruncation` instead

**Best Practice:**
```typescript
// For body text that should wrap:
text.textAutoResize = 'HEIGHT';
text.resize(fixedWidth, text.height);

// For labels/titles that shouldn't wrap:
text.textAutoResize = 'WIDTH_AND_HEIGHT';
```

---

## Auto-Layout Properties

### Layout Sizing Properties

**layoutSizingHorizontal / layoutSizingVertical**

Controls how a node sizes itself within an auto-layout parent.

**Valid Values:**
- `'FIXED'`: Maintains specific width/height
- `'HUG'`: Adjusts to content size (only for auto-layout frames and text nodes)
- `'FILL'`: Expands to fill available space (only for auto-layout children)

**IMPORTANT**: Can only be set on nodes that are already children of an auto-layout frame.

### Other Auto-Layout Properties

**layoutAlign** (for auto-layout children)
- `'INHERIT'`: Default, doesn't stretch
- `'STRETCH'`: Stretches along counter axis

**layoutGrow** (for auto-layout children)
- `0`: Fixed size along primary axis
- `1`: Stretches along primary axis

**layoutPositioning** (for auto-layout children)
- `'AUTO'`: Follow auto-layout rules
- `'ABSOLUTE'`: Position manually (taken out of auto-layout flow)

**layoutMode** (for frames)
- `'NONE'`: No auto-layout
- `'HORIZONTAL'`: Horizontal auto-layout
- `'VERTICAL'`: Vertical auto-layout

### Auto-Layout Frame Properties

```typescript
frame.layoutMode = 'VERTICAL'; // or 'HORIZONTAL'
frame.primaryAxisSizingMode = 'AUTO'; // or 'FIXED'
frame.counterAxisSizingMode = 'FIXED'; // or 'AUTO'
frame.primaryAxisAlignItems = 'MIN'; // or 'CENTER', 'MAX', 'SPACE_BETWEEN'
frame.counterAxisAlignItems = 'MIN'; // or 'CENTER', 'MAX'
frame.paddingLeft = 24;
frame.paddingRight = 24;
frame.paddingTop = 24;
frame.paddingBottom = 24;
frame.itemSpacing = 16;
```

---

## Best Practices

### 1. Start with Fixed Container Sizes

Always create your top-level container with explicit width and height:

```typescript
// BAD: Container will default to 100x100
const frame = figma.createFrame();
frame.layoutMode = 'VERTICAL';

// GOOD: Explicitly set size first
const frame = figma.createFrame();
frame.resize(1440, 900);
frame.layoutMode = 'VERTICAL';
```

### 2. Calculate Child Widths Explicitly

Don't rely on `layoutSizingHorizontal: 'FILL'` for text nodes. Calculate and set explicit widths:

```typescript
// Container width - (left padding + right padding)
const containerWidth = 1440;
const padding = 40;
const childWidth = containerWidth - (padding * 2); // 1360px
```

### 3. Font Loading

Always load fonts before modifying text:

```typescript
// Load default font
await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });

// If changing font, load the new font
if (props.fontName) {
  await figma.loadFontAsync(props.fontName as FontName);
}

// If updating existing text, load all existing fonts
if (text.characters.length > 0) {
  const fontNames = text.getRangeAllFontNames(0, text.characters.length);
  await Promise.all(fontNames.map(figma.loadFontAsync));
}
```

### 4. Child Node Creation Order

When creating nested structures, follow this order:

```typescript
// 1. Create parent frame
const parent = figma.createFrame();
parent.resize(width, height);
parent.layoutMode = 'VERTICAL';

// 2. Create child nodes
const child = figma.createText();
await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });

// 3. Append child BEFORE setting layout sizing properties
parent.appendChild(child);

// 4. Set layout properties
child.textAutoResize = 'HEIGHT';
child.layoutSizingHorizontal = 'FILL'; // Only works after appendChild

// 5. Set other properties
child.characters = 'Hello';
child.fontSize = 16;
```

### 5. Groups vs Frames

**Use Groups When:**
- You only need organization/grouping
- You don't need layout control
- You want auto-sizing based on children

**Use Frames When:**
- You need auto-layout
- You need clipping
- You need fixed sizing
- You're building UI components

**Key Differences:**
```typescript
// Groups
- Auto-sized to children
- No layout control
- No clipping
- Require children to exist

// Frames
- Can have fixed size
- Support auto-layout
- Can clip content
- Can exist empty
```

---

## Common Pitfalls

### 1. Text Width = 0

**Symptom**: Text wraps character-by-character, height becomes very large (700px+)

**Cause**: Using `layoutSizingHorizontal: 'FILL'` before appending to parent

**Fix**: Use fixed widths instead
```typescript
// Instead of:
text.layoutSizingHorizontal = 'FILL';

// Do:
text.resize(calculatedWidth, text.height);
```

### 2. Font Not Loaded Error

**Error**: "Cannot write to node with unloaded font"

**Cause**: Modifying text properties before loading font

**Fix**: Always load fonts first
```typescript
await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
text.characters = 'Hello';
```

### 3. Layout Sizing Property Error

**Error**: "node must be an auto-layout frame or a child of an auto-layout frame"

**Cause**: Setting layout sizing properties before appending to parent

**Fix**: Append first, then set properties
```typescript
parent.appendChild(child);
child.layoutSizingHorizontal = 'FILL';
```

### 4. Container Size Collapse

**Symptom**: Container defaults to 100x100px even though you specified width

**Cause**: Not setting size before adding children with auto-layout

**Fix**: Set container size explicitly first
```typescript
const frame = figma.createFrame();
frame.resize(1440, 900); // Set size FIRST
frame.layoutMode = 'VERTICAL'; // Then set layout mode
```

### 5. Property Order in applyCommonProperties

**Issue**: Text sizing doesn't work correctly

**Cause**: `resize()` is called before `textAutoResize` is set

**Fix**: Set text-specific properties before calling `applyCommonProperties`
```typescript
// Set textAutoResize BEFORE applyCommonProperties
if (props.textAutoResize) text.textAutoResize = props.textAutoResize;
applyCommonProperties(text, props); // This calls resize()
```

---

## Dashboard Design Pattern

When creating complex layouts like dashboards:

### 1. Create Container First
```typescript
// 1440px desktop container
const dashboard = figma.createFrame();
dashboard.resize(1440, 900);
dashboard.layoutMode = 'VERTICAL';
dashboard.paddingLeft = 40;
dashboard.paddingRight = 40;
dashboard.paddingTop = 40;
dashboard.paddingBottom = 40;
dashboard.itemSpacing = 32;
```

### 2. Add Title with Fixed Width
```typescript
// Title: 1440 - (40 + 40) = 1360px
const title = figma.createText();
await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
dashboard.appendChild(title);
title.textAutoResize = 'HEIGHT';
title.resize(1360, title.height);
title.characters = 'Analytics Dashboard';
title.fontSize = 32;
```

### 3. Create Stat Cards Row
```typescript
// Stats Row: 1360px wide (to match title)
const statsRow = figma.createFrame();
statsRow.resize(1360, 120);
statsRow.layoutMode = 'HORIZONTAL';
statsRow.itemSpacing = 24;
statsRow.fills = []; // Transparent

// Each card: (1360 - 48) / 3 = 437px
const card = figma.createFrame();
card.resize(437, 120);
card.layoutMode = 'VERTICAL';
card.paddingLeft = 24;
card.paddingRight = 24;
card.paddingTop = 20;
card.paddingBottom = 20;
card.itemSpacing = 8;
```

### 4. Add Text to Cards
```typescript
// Card text: 437 - (24 + 24) = 389px
const label = figma.createText();
await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
card.appendChild(label);
label.textAutoResize = 'HEIGHT';
label.resize(389, label.height);
label.characters = 'Total Users';
label.fontSize = 14;
```

---

## Implementation in handlers/nodes.ts

### Key Functions

**createChildNodes()**
- Handles nested node creation
- Manages font loading for text nodes
- Appends nodes to parent BEFORE setting layout sizing properties
- Uses `continue` for text nodes to skip duplicate `appendChild`

**applyCommonProperties()**
- Handles common properties like x, y, fills, strokes
- Special handling for text nodes with `textAutoResize: 'HEIGHT'`
- Sets layout properties (layoutAlign, layoutGrow, layoutPositioning)

**handleSyncFrame()**
- Creates or updates frames
- Applies frame properties (auto-layout, padding, spacing)
- Handles nested children creation

**handleSyncText()**
- Creates or updates text nodes
- Loads fonts before modifications
- Sets `textAutoResize` BEFORE `applyCommonProperties`
- Supports all text properties

---

## Testing Checklist

When creating new node types or modifying existing ones, verify:

- [ ] Text nodes have non-zero width
- [ ] Text heights are reasonable (not 700px+)
- [ ] Containers maintain specified width (not collapsing to 100px)
- [ ] Fonts are loaded before text modification
- [ ] Layout sizing properties only set after appendChild
- [ ] textAutoResize is set before resize()
- [ ] Child widths are calculated based on parent width minus padding
- [ ] Auto-layout spacing and padding work correctly
- [ ] Text wraps properly within containers (no clipping)

---

## Useful Figma Plugin API References

- [TextNode.textAutoResize](https://developers.figma.com/docs/plugins/api/properties/TextNode-textautoresize/)
- [layoutSizingHorizontal](https://developers.figma.com/docs/plugins/api/properties/nodes-layoutsizinghorizontal/)
- [layoutSizingVertical](https://developers.figma.com/docs/plugins/api/properties/nodes-layoutsizingvertical/)
- [layoutAlign](https://developers.figma.com/docs/plugins/api/properties/nodes-layoutalign/)
- [layoutGrow](https://developers.figma.com/docs/plugins/api/properties/nodes-layoutgrow/)
- [layoutPositioning](https://developers.figma.com/docs/plugins/api/properties/nodes-layoutpositioning/)
- [Auto Layout Guide](https://help.figma.com/hc/en-us/articles/360040451373-Guide-to-auto-layout)

---

## Duotone Text Formatting

### Mixed-Color Text (Duotone Titles)

Many design systems use duotone text where the first sentence is dark and the rest is gray/lighter color. This creates visual hierarchy in section titles and hero descriptions.

### Critical: Accurate Character Counting

**Problem**: Manually counting characters to determine split points leads to errors:
- Mid-word splits
- Incorrect color boundaries
- Three or more color segments instead of two

**Solution**: ALWAYS calculate split position programmatically using `text.find('.') + 1`

### Correct Approach

```python
# Calculate exact split position
text = "Scale performance, not just process. Real productivity gains come from alignment."
first_period_pos = text.find('.') + 1  # Returns 36 (includes the period)
total_length = len(text)  # Returns 81

# Now apply formatting
characterFormatting = [
    {
        "start": 0,
        "end": first_period_pos,  # 36
        "fills": [{"type": "SOLID", "color": {"r": 0.105, "g": 0.105, "b": 0.105}}],  # Dark
        "fontSize": 24,
        "fontName": {"family": "Biennale", "style": "Medium"}
    },
    {
        "start": first_period_pos,  # 36
        "end": total_length,  # 81
        "fills": [{"type": "SOLID", "color": {"r": 0.651, "g": 0.651, "b": 0.651}}],  # Gray
        "fontSize": 24,
        "fontName": {"family": "Biennale", "style": "Medium"}
    }
]
```

### Common Duotone Patterns

**Section Titles (24-30px):**
- First sentence (ending with period): Dark color (#1B1B1B or rgb(0.105, 0.105, 0.105))
- Rest of text: Gray color (#A6A6A6 or rgb(0.651, 0.651, 0.651))

**Hero Taglines (21px):**
- First sentence: Dark
- Supporting text: Gray

**Large Headers (38px):**
- Question or statement: Dark
- Follow-up explanation: Gray

### Debugging Duotone Issues

When duotone text looks wrong:

1. **Check character formatting in read-nodes response:**
   ```bash
   curl -X POST http://localhost:3001/api/read-text-content -d '{"nodeId":"..."}'
   ```

2. **Look for these signs of errors:**
   - More than 2 formatting segments (should only be 2 for duotone)
   - Split point doesn't match where first sentence ends
   - Words are split across color boundaries

3. **Recalculate using Python:**
   ```bash
   python -c "text = 'Your text here.'; print(text.find('.') + 1, len(text))"
   ```

4. **Update with exact positions**

### Special Characters

Watch out for special characters that may affect character counting:
- Smart quotes (' ' " ") vs straight quotes (' ")
- Em dash (—) vs hyphen (-)
- Non-breaking spaces
- Unicode characters

Always get the text directly from Figma using `read-text-content` command, then calculate split position on that exact text.

### Best Practice Workflow

1. **Read the actual text from Figma:**
   ```bash
   curl -X POST http://localhost:3001/api/read-text-content -d '{"nodeId":"6:3211"}'
   ```

2. **Extract text and calculate split:**
   ```python
   text = "Communication that connects at the right time. Modern workforces are mobile..."
   split = text.find('.') + 1  # Includes the period
   total = len(text)
   ```

3. **Apply formatting with exact positions:**
   ```bash
   curl -X POST http://localhost:3001/api/update-node -d '{
     "nodeId": "...",
     "characterFormatting": [
       {"start": 0, "end": split, "fills": [dark_color], ...},
       {"start": split, "end": total, "fills": [gray_color], ...}
     ]
   }'
   ```

4. **Verify split is correct:**
   - First segment should end with the period
   - No mid-word splits
   - Exactly 2 segments

---

## Layer Ordering in Figma

### Critical: Figma's Inverted Layer Stack

**Figma's layer panel displays layers in reverse order from their index:**
- Index 0 = **BOTTOM** of layers panel (back in z-order)
- Last index = **TOP** of layers panel (front in z-order)

This is the opposite of what you might expect!

### Reordering by Y Position

When reordering children based on their Y position (top to bottom on canvas), you must **REVERSE** the sorted array:

```typescript
// Sort by Y position (top to bottom on canvas)
const sorted = children.sort((a, b) => a.y - b.y);

// REVERSE because Figma's layer panel is inverted
sorted.reverse();

// Now reinsert: index 0 gets highest Y (bottom of canvas, bottom of panel)
// Last index gets lowest Y (top of canvas, top of panel)
for (let i = 0; i < sorted.length; i++) {
  parent.insertChild(i, sorted[i]);
}
```

### Implemented Command

The `reorder-children` command handles this correctly:

```bash
curl -X POST http://localhost:3001/api/reorder-children \
  -H "Content-Type: application/json" \
  -d '{"nodeId":"6:3211","orderBy":"y"}'
```

This will:
1. Find all children of the node
2. Sort by Y position (low Y = top of canvas)
3. **Reverse the array**
4. Reinsert so layer panel matches canvas order (top to bottom)

---

## Content Management Best Practices

### Systematic Content Checking

When verifying or fixing content across multiple pages:

1. **Use read-text-content for overview:**
   ```bash
   curl -X POST http://localhost:3001/api/read-text-content \
     -d '{"nodeId":"page-id"}'
   ```

   Returns: All text sorted by Y position with fontSize, hasMixedFills, and character count

2. **Check one page at a time** - Don't try to fix all pages at once

3. **Focus on key text sizes:**
   - 70px = Hero titles
   - 38px = Large section headers
   - 30px = Medium section titles
   - 24px = Duotone section titles
   - 21px = Hero taglines / descriptions
   - 18px = Bullet titles (keep under 18 characters)

4. **Verify duotone text:**
   - All should have `hasMixedFills: true`
   - Check split position programmatically

5. **Update context.md** with learnings

### Page Naming Convention

Keep frame names synchronized with content:
- SOLUTION-01 Comms = Communications & Engagement
- SOLUTION-02 Productivity = Productivity & Performance
- SOLUTION-03 Operations = Operations & Safety
- SOLUTION-04 HR-IT = HR & IT Self-Service

### Bullet Title Length Rules

Section bullet titles should be **under 18 characters** for consistent layout:

Good examples:
- "Target comms" (12 chars)
- "Priority updates" (16 chars)
- "Track reach" (11 chars)
- "Visibility" (10 chars)

Too long:
- "Eliminate redundancy" (20 chars) ❌
- "Policies and resources" (22 chars) ❌

---

## API Endpoints Reference

### Base URL
- HTTP API: `http://localhost:3001/api`
- WebSocket: `ws://localhost:3000`

### Endpoint Format
All endpoints accept POST requests with JSON payloads:
```bash
curl -X POST http://localhost:3001/api/{command-type} \
  -H "Content-Type: application/json" \
  -d '{"payload": "here"}'
```

### Variables & Collections

**sync-variables** - Create or update variable collections
```bash
curl -X POST http://localhost:3001/api/sync-variables \
  -d '{"collection":{"name":"Colors","modes":[{"name":"default"}],"variables":[{"name":"primary","type":"COLOR","values":{"default":{"r":1,"g":0,"b":0}}}]}}'
```

**read-variables** - Read all variable collections
```bash
curl -X POST http://localhost:3001/api/read-variables -d "{}"
```

**delete-collection** - Delete a single collection
```bash
curl -X POST http://localhost:3001/api/delete-collection -d '{"name":"Colors"}'
```

**delete-all-collections** - Delete all collections
```bash
curl -X POST http://localhost:3001/api/delete-all-collections -d "{}"
```

### Styles

**sync-styles** - Create or update paint/text/effect/grid styles
```bash
curl -X POST http://localhost:3001/api/sync-styles \
  -d '{"styles":[{"name":"Primary","type":"PAINT","paints":[{"type":"SOLID","color":{"r":1,"g":0,"b":0}}]}]}'
```

**read-styles** - Read all styles
```bash
curl -X POST http://localhost:3001/api/read-styles -d "{}"
```

### Nodes - Sync (Create/Update)

**sync-frame** - Create or update frame
```bash
curl -X POST http://localhost:3001/api/sync-frame \
  -d '{"name":"Container","x":0,"y":0,"width":1440,"height":900,"fills":[{"type":"SOLID","color":{"r":1,"g":1,"b":1}}]}'
```

**sync-rectangle** - Create or update rectangle
```bash
curl -X POST http://localhost:3001/api/sync-rectangle \
  -d '{"name":"Box","x":0,"y":0,"width":100,"height":100,"fills":[{"type":"SOLID","color":{"r":1,"g":0,"b":0}}]}'
```

**sync-text** - Create or update text node
```bash
curl -X POST http://localhost:3001/api/sync-text \
  -d '{"name":"Title","x":0,"y":0,"characters":"Hello World","fontSize":24,"fontName":{"family":"Inter","style":"Regular"}}'
```

**sync-ellipse** - Create or update ellipse
```bash
curl -X POST http://localhost:3001/api/sync-ellipse \
  -d '{"name":"Circle","x":0,"y":0,"width":100,"height":100}'
```

**sync-group** - Create or update group
```bash
curl -X POST http://localhost:3001/api/sync-group \
  -d '{"name":"MyGroup","children":[...]}'
```

### Nodes - Read

**read-nodes** - Read nodes with filters
```bash
# Read all nodes
curl -X POST http://localhost:3001/api/read-nodes -d "{}"

# Filter by type
curl -X POST http://localhost:3001/api/read-nodes -d '{"filters":{"type":"TEXT"}}'

# Filter by name
curl -X POST http://localhost:3001/api/read-nodes -d '{"filters":{"name":"Title"}}'

# Filter by parent
curl -X POST http://localhost:3001/api/read-nodes -d '{"filters":{"parentId":"123:456"}}'

# Filter by specific node IDs
curl -X POST http://localhost:3001/api/read-nodes -d '{"filters":{"nodeIds":["123:456","123:457"]}}'
```

**get-nodes-by-ids** - Get specific nodes by their IDs
```bash
curl -X POST http://localhost:3001/api/get-nodes-by-ids \
  -d '{"nodeIds":["123:456","123:457"]}'
```

**read-text-content** - Read all text content from a page/frame (sorted by Y position)
```bash
curl -X POST http://localhost:3001/api/read-text-content \
  -d '{"nodeId":"6:3211"}'
```

**read-text-formatting** - Read text node with character formatting details
```bash
curl -X POST http://localhost:3001/api/read-text-formatting \
  -d '{"nodeId":"123:456"}'
```

### Nodes - Update

**update-node** - Update existing node properties
```bash
# Update text
curl -X POST http://localhost:3001/api/update-node \
  -d '{"nodeId":"123:456","characters":"New text","fontSize":20}'

# Update fills
curl -X POST http://localhost:3001/api/update-node \
  -d '{"nodeId":"123:456","fills":[{"type":"SOLID","color":{"r":1,"g":0,"b":0}}]}'

# Update with character formatting (duotone text)
curl -X POST http://localhost:3001/api/update-node \
  -d '{"nodeId":"123:456","characters":"First sentence. Rest of text.","characterFormatting":[{"start":0,"end":15,"fills":[{"type":"SOLID","color":{"r":0.105,"g":0.105,"b":0.105}}]},{"start":15,"end":31,"fills":[{"type":"SOLID","color":{"r":0.651,"g":0.651,"b":0.651}}]}]}'

# Move node to new parent
curl -X POST http://localhost:3001/api/update-node \
  -d '{"nodeId":"123:456","parentId":"123:789"}'
```

**update-text-formatting** - Update text formatting (simplified interface)
```bash
curl -X POST http://localhost:3001/api/update-text-formatting \
  -d '{"nodeId":"123:456","characterFormatting":[...]}'
```

**reorder-children** - Reorder children by Y position
```bash
curl -X POST http://localhost:3001/api/reorder-children \
  -d '{"nodeId":"123:456","orderBy":"y"}'
```

### Nodes - Delete

**delete-node** - Delete single node
```bash
curl -X POST http://localhost:3001/api/delete-node \
  -d '{"nodeId":"123:456"}'
```

**delete-nodes** - Delete multiple nodes with filters
```bash
# Delete by type
curl -X POST http://localhost:3001/api/delete-nodes \
  -d '{"filters":{"type":"RECTANGLE"}}'

# Delete by name pattern
curl -X POST http://localhost:3001/api/delete-nodes \
  -d '{"filters":{"name":"test"}}'
```

### Selection

**get-selection** - Get currently selected nodes
```bash
curl -X POST http://localhost:3001/api/get-selection -d "{}"
```

**set-selection** - Set selection by node IDs
```bash
curl -X POST http://localhost:3001/api/set-selection \
  -d '{"nodeIds":["123:456","123:457"]}'
```

### Properties

**set-auto-layout** - Apply auto-layout to frame
```bash
curl -X POST http://localhost:3001/api/set-auto-layout \
  -d '{"nodeId":"123:456","layoutMode":"VERTICAL","paddingLeft":24,"paddingRight":24,"paddingTop":24,"paddingBottom":24,"itemSpacing":16}'
```

**set-fills** - Update node fills
```bash
curl -X POST http://localhost:3001/api/set-fills \
  -d '{"nodeId":"123:456","fills":[{"type":"SOLID","color":{"r":1,"g":0,"b":0}}]}'
```

**set-effects** - Update node effects
```bash
curl -X POST http://localhost:3001/api/set-effects \
  -d '{"nodeId":"123:456","effects":[{"type":"DROP_SHADOW","color":{"r":0,"g":0,"b":0,"a":0.25},"offset":{"x":0,"y":4},"radius":8}]}'
```

**set-constraints** - Update node constraints
```bash
curl -X POST http://localhost:3001/api/set-constraints \
  -d '{"nodeId":"123:456","constraints":{"horizontal":"CENTER","vertical":"CENTER"}}'
```

### Components

**sync-component** - Create or update component
```bash
curl -X POST http://localhost:3001/api/sync-component \
  -d '{"name":"Button","width":120,"height":40}'
```

**sync-instance** - Create component instance
```bash
curl -X POST http://localhost:3001/api/sync-instance \
  -d '{"componentId":"123:456","x":0,"y":0}'
```

**read-components** - Read all local components
```bash
curl -X POST http://localhost:3001/api/read-components -d "{}"
```

### Pages

**sync-page** - Create or update page
```bash
curl -X POST http://localhost:3001/api/sync-page \
  -d '{"name":"Design System"}'
```

**read-pages** - Read all pages
```bash
curl -X POST http://localhost:3001/api/read-pages -d "{}"
```

**set-current-page** - Switch to specific page
```bash
curl -X POST http://localhost:3001/api/set-current-page \
  -d '{"name":"Design System"}'
```

**delete-page** - Delete a page
```bash
curl -X POST http://localhost:3001/api/delete-page \
  -d '{"name":"Old Page"}'
```

**clone-page** - Clone a page
```bash
curl -X POST http://localhost:3001/api/clone-page \
  -d '{"sourceName":"Template","newName":"New Page"}'
```

### Templates

**create-page-structure** - Create full page from JSON
```bash
curl -X POST http://localhost:3001/api/create-page-structure \
  -d '{"structure":{...}}'
```

**create-button** - Create pre-configured button
```bash
curl -X POST http://localhost:3001/api/create-button \
  -d '{"label":"Click Me","x":0,"y":0}'
```

**create-card** - Create pre-configured card
```bash
curl -X POST http://localhost:3001/api/create-card \
  -d '{"title":"Card Title","description":"Description text","x":0,"y":0}'
```

### Export

**export-image** - Export nodes as images
```bash
curl -X POST http://localhost:3001/api/export-image \
  -d '{"nodeId":"123:456","format":"PNG","scale":2}'
```

### Color Management

**find-all-colors** - Scan and catalog all colors in selection
```bash
curl -X POST http://localhost:3001/api/find-all-colors \
  -d '{"nodeIds":["123:456","123:457"]}'
```

**replace-colors-batch** - Replace colors with variable references
```bash
# Auto-map to closest greys
curl -X POST http://localhost:3001/api/replace-colors-batch \
  -d '{"autoMapToGreys":true,"collectionName":"Swatch","greyPrefix":"grey-","replacements":[{"nodeId":"123:456","property":"fills","index":0,"color":{"r":0.68,"g":0.68,"b":0.68}}]}'

# Specify variable by name
curl -X POST http://localhost:3001/api/replace-colors-batch \
  -d '{"collectionName":"Swatch","replacements":[{"nodeId":"123:456","property":"fills","index":0,"variableName":"grey-500"}]}'

# Specify variable by ID
curl -X POST http://localhost:3001/api/replace-colors-batch \
  -d '{"replacements":[{"nodeId":"123:456","property":"fills","index":0,"variableId":"VariableID:123:789"}]}'
```

**replace-all-colors-global** - Replace all instances of a color globally
```bash
curl -X POST http://localhost:3001/api/replace-all-colors-global \
  -d '{"sourceColor":{"r":0.68,"g":0.68,"b":0.68},"variableId":"VariableID:123:789","collectionName":"Swatch"}'
```

### Batch Operations

**batch-commands** - Execute multiple commands sequentially
```bash
curl -X POST http://localhost:3001/api/batch-commands \
  -d '{"commands":[{"type":"update-node","payload":{"nodeId":"123:456","characters":"Text 1"}},{"type":"update-node","payload":{"nodeId":"123:457","characters":"Text 2"}}]}'
```

### Utility

**status** - Check server status
```bash
curl http://localhost:3001/api/status
```

Returns:
```json
{
  "connected": true,
  "pendingCommands": 0
}
```

---

## Version History

- **2025-10-15**: Added comprehensive API endpoints reference
  - Complete list of all 36+ available endpoints
  - Example curl commands for each endpoint
  - Organized by category (Variables, Nodes, Colors, etc.)

- **2025-10-13**: Added duotone text formatting, layer ordering, and content management
  - Programmatic character counting for mixed-color text
  - Figma's inverted layer stack explanation
  - reorder-children command documentation
  - Content checking workflow
  - Bullet title length guidelines

- **2025-10-12**: Initial context documentation
  - Text sizing discoveries
  - Auto-layout property order
  - Dashboard design pattern
  - Common pitfalls and solutions
