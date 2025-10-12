// Helper function to load all fonts used in a text node
export async function loadTextFonts(textNode: TextNode): Promise<void> {
  const fontNames = textNode.getRangeAllFontNames(0, textNode.characters.length);
  await Promise.all(fontNames.map(figma.loadFontAsync));
}

// Helper function to apply common properties to nodes
export function applyCommonProperties(node: SceneNode, props: any): void {
  if (props.name !== undefined) node.name = props.name;
  if (props.visible !== undefined) node.visible = props.visible;
  if (props.locked !== undefined) node.locked = props.locked;
  if (props.opacity !== undefined) node.opacity = props.opacity;

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

  if ('fills' in node) base.fills = [...(node as GeometryMixin).fills];
  if ('strokes' in node) base.strokes = [...(node as GeometryMixin).strokes];
  if ('strokeWeight' in node) base.strokeWeight = (node as GeometryMixin).strokeWeight;
  if ('effects' in node) base.effects = [...(node as BlendMixin).effects];

  if (node.type === 'FRAME') {
    const frame = node as FrameNode;
    base.cornerRadius = frame.cornerRadius;
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
    base.cornerRadius = rect.cornerRadius;
    base.topLeftRadius = rect.topLeftRadius;
    base.topRightRadius = rect.topRightRadius;
    base.bottomLeftRadius = rect.bottomLeftRadius;
    base.bottomRightRadius = rect.bottomRightRadius;
  }

  if (node.type === 'TEXT') {
    const text = node as TextNode;
    base.characters = text.characters;
    base.fontSize = text.fontSize;
    base.fontName = text.fontName;
    base.textAlignHorizontal = text.textAlignHorizontal;
    base.textAlignVertical = text.textAlignVertical;
    base.lineHeight = text.lineHeight;
    base.letterSpacing = text.letterSpacing;
  }

  if ('children' in node && depth < maxDepth) {
    base.children = (node as FrameNode | GroupNode).children.map((child) =>
      serializeNode(child as SceneNode, depth + 1, maxDepth)
    );
  }

  return base;
}
