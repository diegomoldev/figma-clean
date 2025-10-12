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

## Version History

- **2025-10-12**: Initial context documentation
  - Text sizing discoveries
  - Auto-layout property order
  - Dashboard design pattern
  - Common pitfalls and solutions
