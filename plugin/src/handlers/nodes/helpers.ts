export function getComponentByKey(key: string): ComponentNode | null {
  const allComponents = figma.root.findAll(node => node.type === "COMPONENT") as ComponentNode[];
  for (const component of allComponents) {
    if (component.key === key) {
      return component;
    }
  }
  return null;
}

// Helper function to load all fonts used in a text node
export async function loadTextFonts(textNode: TextNode): Promise<void> {
  const fontNames = textNode.getRangeAllFontNames(0, textNode.characters.length);
  await Promise.all(fontNames.map(figma.loadFontAsync));
}

// Extract character-level formatting from text node
export function extractCharacterFormatting(textNode: TextNode): any[] {
  const chars = textNode.characters;
  const formatting: any[] = [];

  let currentFormat: any = null;
  let startIndex = 0;

  for (let i = 0; i <= chars.length; i++) {
    const fills = i < chars.length ? textNode.getRangeFills(i, i + 1) : null;
    const fontSize = i < chars.length ? textNode.getRangeFontSize(i, i + 1) : null;
    const fontName = i < chars.length ? textNode.getRangeFontName(i, i + 1) : null;
    const fillColor = i < chars.length ? textNode.getRangeFillStyleId(i, i + 1) : null;

    const format = {
      fills: fills !== figma.mixed ? fills : 'mixed',
      fontSize: fontSize !== figma.mixed ? fontSize : 'mixed',
      fontName: fontName !== figma.mixed ? fontName : 'mixed'
    };

    const formatKey = JSON.stringify(format);
    const currentKey = currentFormat ? JSON.stringify(currentFormat) : null;

    // When format changes or we reach the end
    if (formatKey !== currentKey) {
      if (currentFormat) {
        formatting.push({
          start: startIndex,
          end: i,
          text: chars.substring(startIndex, i),
          ...currentFormat
        });
      }
      currentFormat = format;
      startIndex = i;
    }
  }

  return formatting;
}

// Apply character-level formatting to text node
export async function applyCharacterFormatting(textNode: TextNode, formatting: any[]): Promise<void> {
  // Load all required fonts first
  await loadTextFonts(textNode);

  const uniqueFonts = new Set<string>();
  for (const range of formatting) {
    if (range.fontName && range.fontName !== 'mixed') {
      uniqueFonts.add(JSON.stringify(range.fontName));
    }
  }

  for (const fontStr of uniqueFonts) {
    const font = JSON.parse(fontStr);
    await figma.loadFontAsync(font as FontName);
  }

  // Apply formatting to each range
  for (const range of formatting) {
    const { start, end, fills, fontSize, fontName } = range;

    if (fills && fills !== 'mixed') {
      textNode.setRangeFills(start, end, fills as Paint[]);
    }

    if (fontSize && fontSize !== 'mixed') {
      textNode.setRangeFontSize(start, end, fontSize as number);
    }

    if (fontName && fontName !== 'mixed') {
      textNode.setRangeFontName(start, end, fontName as FontName);
    }
  }
}

// Helper function to apply common properties to nodes
export function applyCommonProperties(node: SceneNode, props: any): void {
  if (props.name !== undefined) node.name = props.name;
  if (props.visible !== undefined) node.visible = props.visible;
  if (props.locked !== undefined) node.locked = props.locked;
  if ('opacity' in node && props.opacity !== undefined) node.opacity = props.opacity;

  if ('x' in node && props.x !== undefined) (node as FrameNode | RectangleNode | TextNode | EllipseNode).x = props.x;
  if ('y' in node && props.y !== undefined) (node as FrameNode | RectangleNode | TextNode | EllipseNode).y = props.y;

  // Handle sizing - for text nodes with textAutoResize: HEIGHT, only set width
  if ('resize' in node && props.width !== undefined) {
    if (node.type === 'TEXT') {
      const textNode = node as TextNode;
      // If textAutoResize is HEIGHT, only set width, not height
      if (textNode.textAutoResize === 'HEIGHT') {
        textNode.resize(props.width, textNode.height);
      } else if (props.height !== undefined) {
        textNode.resize(props.width, props.height);
      }
    } else if (props.height !== undefined) {
      (node as FrameNode | RectangleNode | EllipseNode).resize(props.width, props.height);
    }
  }

  if ('fills' in node && props.fills !== undefined) {
    (node as GeometryMixin).fills = props.fills as Paint[];
  }
  if ('strokes' in node && props.strokes !== undefined) {
    (node as GeometryMixin).strokes = props.strokes as Paint[];
  }
  if ('strokeWeight' in node && props.strokeWeight !== undefined) {
    (node as GeometryMixin).strokeWeight = props.strokeWeight;
  }
  if ('strokeAlign' in node && props.strokeAlign !== undefined) {
    (node as GeometryMixin).strokeAlign = props.strokeAlign;
  }
  if ('effects' in node && props.effects !== undefined) {
    (node as BlendMixin).effects = props.effects as Effect[];
  }

  // Layout properties for auto-layout children
  if ('layoutAlign' in node && props.layoutAlign !== undefined) {
    (node as SceneNode & LayoutMixin).layoutAlign = props.layoutAlign;
  }
  if ('layoutGrow' in node && props.layoutGrow !== undefined) {
    (node as SceneNode & LayoutMixin).layoutGrow = props.layoutGrow;
  }
  if ('layoutPositioning' in node && props.layoutPositioning !== undefined) {
    (node as SceneNode & LayoutMixin).layoutPositioning = props.layoutPositioning;
  }
}

// Helper function to apply frame-specific properties
export function applyFrameProperties(frame: FrameNode, props: any): void {
  if (props.cornerRadius !== undefined) frame.cornerRadius = props.cornerRadius;
  if (props.clipsContent !== undefined) frame.clipsContent = props.clipsContent;

  // Auto layout properties
  if (props.layoutMode !== undefined) frame.layoutMode = props.layoutMode;
  if (props.primaryAxisSizingMode !== undefined) frame.primaryAxisSizingMode = props.primaryAxisSizingMode;
  if (props.counterAxisSizingMode !== undefined) frame.counterAxisSizingMode = props.counterAxisSizingMode;
  if (props.primaryAxisAlignItems !== undefined) frame.primaryAxisAlignItems = props.primaryAxisAlignItems;
  if (props.counterAxisAlignItems !== undefined) frame.counterAxisAlignItems = props.counterAxisAlignItems;
  if (props.paddingLeft !== undefined) frame.paddingLeft = props.paddingLeft;
  if (props.paddingRight !== undefined) frame.paddingRight = props.paddingRight;
  if (props.paddingTop !== undefined) frame.paddingTop = props.paddingTop;
  if (props.paddingBottom !== undefined) frame.paddingBottom = props.paddingBottom;
  if (props.itemSpacing !== undefined) frame.itemSpacing = props.itemSpacing;
  if (props.layoutWrap !== undefined) frame.layoutWrap = props.layoutWrap;
  if (props.counterAxisSpacing !== undefined) frame.counterAxisSpacing = props.counterAxisSpacing;
}

// Helper function to create child nodes recursively
export async function createChildNodes(parent: FrameNode | GroupNode, children: any[]): Promise<void> {
  for (const childData of children) {
    let child: SceneNode;

    switch (childData.type) {
      case 'FRAME':
        child = figma.createFrame();
        applyCommonProperties(child, childData);
        applyFrameProperties(child as FrameNode, childData);
        if (childData.children) {
          await createChildNodes(child as FrameNode, childData.children);
        }
        break;

      case 'RECTANGLE':
        child = figma.createRectangle();
        applyCommonProperties(child, childData);
        if (childData.cornerRadius !== undefined) (child as RectangleNode).cornerRadius = childData.cornerRadius;
        break;

      case 'TEXT':
        child = figma.createText();

        // Load Inter Regular first (default font for new text nodes)
        await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });

        // Load target font if different from Inter Regular
        const fontName = childData.fontName || { family: 'Inter', style: 'Regular' };
        if (fontName.family !== 'Inter' || fontName.style !== 'Regular') {
          await figma.loadFontAsync(fontName as FontName);
          // Change font immediately to avoid issues with textAutoResize
          (child as TextNode).fontName = fontName as FontName;
        }

        // Append to parent FIRST (required for layout sizing properties)
        parent.appendChild(child);

        // Set textAutoResize and layout sizing BEFORE setting width via applyCommonProperties
        if (childData.textAutoResize !== undefined) (child as TextNode).textAutoResize = childData.textAutoResize;
        if (childData.layoutSizingHorizontal !== undefined) (child as TextNode).layoutSizingHorizontal = childData.layoutSizingHorizontal;
        if (childData.layoutSizingVertical !== undefined) (child as TextNode).layoutSizingVertical = childData.layoutSizingVertical;
        applyCommonProperties(child, childData);
        if (childData.characters !== undefined) (child as TextNode).characters = childData.characters;
        if (childData.fontSize !== undefined) (child as TextNode).fontSize = childData.fontSize;
        if (childData.fontName !== undefined) (child as TextNode).fontName = childData.fontName as FontName;
        if (childData.textAlignHorizontal !== undefined) (child as TextNode).textAlignHorizontal = childData.textAlignHorizontal;
        if (childData.textAlignVertical !== undefined) (child as TextNode).textAlignVertical = childData.textAlignVertical;
        if (childData.lineHeight !== undefined) (child as TextNode).lineHeight = childData.lineHeight;
        if (childData.letterSpacing !== undefined) (child as TextNode).letterSpacing = childData.letterSpacing;
        continue; // Skip the appendChild at the end since we already did it

      case 'ELLIPSE':
        child = figma.createEllipse();
        applyCommonProperties(child, childData);
        break;

      case 'GROUP':
        const tempFrame = figma.createFrame();
        await createChildNodes(tempFrame, childData.children || []);
        child = figma.group(tempFrame.children as SceneNode[], parent);
        tempFrame.remove();
        applyCommonProperties(child, childData);
        break;

      default:
        continue;
    }

    parent.appendChild(child);
  }
}

// Helper function to serialize node to JSON
export function serializeNode(node: SceneNode, depth: number, maxDepth: number): any {
  const base: any = {
    id: node.id,
    name: node.name,
    type: node.type,
    visible: node.visible,
    locked: node.locked
  };

  if ('x' in node) base.x = (node as FrameNode).x;
  if ('y' in node) base.y = (node as FrameNode).y;
  if ('width' in node) base.width = (node as FrameNode).width;
  if ('height' in node) base.height = (node as FrameNode).height;
  if ('opacity' in node) base.opacity = (node as BlendMixin).opacity;

  if ('fills' in node) {
    if (node.fills as any === figma.mixed) {
      base.fills = 'mixed';
    } else {
      base.fills = [...(node.fills as Paint[])];
    }
  }
  if ('strokes' in node) {
    if (node.strokes as any === figma.mixed) {
      base.strokes = 'mixed';
    } else {
      base.strokes = [...(node.strokes as Paint[])];
    }
  }
  if ('strokeWeight' in node) {
    if (node.strokeWeight as any === figma.mixed) {
      base.strokeWeight = 'mixed';
    } else {
      base.strokeWeight = (node as GeometryMixin).strokeWeight;
    }
  }
  if ('effects' in node) {
    if (node.effects as any === figma.mixed) {
      base.effects = 'mixed';
    } else {
      base.effects = [...(node.effects as Effect[])];
    }
  }

  if (node.type === 'FRAME') {
    const frame = node as FrameNode;
    if (frame.cornerRadius as any === figma.mixed) {
      base.cornerRadius = 'mixed';
    } else {
      base.cornerRadius = frame.cornerRadius;
    }
    base.clipsContent = frame.clipsContent;
    base.layoutMode = frame.layoutMode;
    if (frame.layoutMode !== 'NONE') {
      base.primaryAxisSizingMode = frame.primaryAxisSizingMode;
      base.counterAxisSizingMode = frame.counterAxisSizingMode;
      base.primaryAxisAlignItems = frame.primaryAxisAlignItems;
      base.counterAxisAlignItems = frame.counterAxisAlignItems;
      base.paddingLeft = frame.paddingLeft;
      base.paddingRight = frame.paddingRight;
      base.paddingTop = frame.paddingTop;
      base.paddingBottom = frame.paddingBottom;
      base.itemSpacing = frame.itemSpacing;
    }
  }

  if (node.type === 'RECTANGLE') {
    const rect = node as RectangleNode;
    if (rect.cornerRadius as any === figma.mixed) {
      base.cornerRadius = 'mixed';
    } else {
      base.cornerRadius = rect.cornerRadius;
    }
    base.topLeftRadius = rect.topLeftRadius;
    base.topRightRadius = rect.topRightRadius;
    base.bottomLeftRadius = rect.bottomLeftRadius;
    base.bottomRightRadius = rect.bottomRightRadius;
  }

  if (node.type === 'TEXT') {
    const text = node as TextNode;
    base.characters = text.characters;
    if (text.fontSize as any === figma.mixed) {
      base.fontSize = 'mixed';
    } else {
      base.fontSize = text.fontSize;
    }
    if (text.fontName as any === figma.mixed) {
      base.fontName = 'mixed';
    } else {
      base.fontName = text.fontName;
    }
    if (text.textAlignHorizontal as any === figma.mixed) {
      base.textAlignHorizontal = 'mixed';
    } else {
      base.textAlignHorizontal = text.textAlignHorizontal;
    }
    if (text.textAlignVertical as any === figma.mixed) {
      base.textAlignVertical = 'mixed';
    } else {
      base.textAlignVertical = text.textAlignVertical;
    }
    if (text.lineHeight as any === figma.mixed) {
      base.lineHeight = 'mixed';
    } else {
      base.lineHeight = text.lineHeight;
    }
    if (text.letterSpacing as any === figma.mixed) {
      base.letterSpacing = 'mixed';
    } else {
      base.letterSpacing = text.letterSpacing;
    }

    // Read character-level formatting for mixed properties
    if (text.fills as any === figma.mixed || text.fontSize as any === figma.mixed || text.fontName as any === figma.mixed) {
      base.characterFormatting = extractCharacterFormatting(text);
    }
  }

  if ('children' in node && depth < maxDepth) {
    base.children = (node as FrameNode | GroupNode).children.map((child) =>
      serializeNode(child as SceneNode, depth + 1, maxDepth)
    );
  }

  return base;
}
