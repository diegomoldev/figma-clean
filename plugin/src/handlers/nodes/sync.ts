import { Command, CommandResponse } from '../../types';
import {
  applyCommonProperties,
  applyFrameProperties,
  createChildNodes,
  loadTextFonts
} from './helpers';

// 1. sync-frame: Create or update frame
export async function handleSyncFrame(msg: Command): Promise<CommandResponse> {
  try {
    const { id, name, parentId, ...props } = msg.payload;
    let frame: FrameNode;
    let parent: BaseNode & ChildrenMixin = figma.currentPage;

    // Resolve parent if parentId is provided
    if (parentId) {
      const parentNode = figma.getNodeById(parentId);
      if (!parentNode || !('appendChild' in parentNode)) {
        return { id: msg.id, success: false, error: `Parent node with id '${parentId}' not found or cannot have children` };
      }
      parent = parentNode as BaseNode & ChildrenMixin;
    }

    if (id) {
      const node = figma.getNodeById(id);
      if (node && node.type === 'FRAME') {
        frame = node as FrameNode;
      } else {
        return { id: msg.id, success: false, error: `Frame with id '${id}' not found` };
      }
    } else if (name) {
      const existing = parent.findOne((n) => n.type === 'FRAME' && n.name === name);
      if (existing) {
        frame = existing as FrameNode;
      } else {
        frame = figma.createFrame();
        frame.name = name;
        parent.appendChild(frame);
      }
    } else {
      frame = figma.createFrame();
      parent.appendChild(frame);
    }

    applyCommonProperties(frame, props);
    applyFrameProperties(frame, props);

    if (props.children) {
      frame.children.forEach((child) => child.remove());
      await createChildNodes(frame, props.children);
    }

    return {
      id: msg.id,
      success: true,
      data: { nodeId: frame.id, name: frame.name, type: frame.type }
    };
  } catch (error) {
    return { id: msg.id, success: false, error: String(error) };
  }
}

// 2. sync-rectangle: Create or update rectangle
export async function handleSyncRectangle(msg: Command): Promise<CommandResponse> {
  try {
    const { id, name, parentId, ...props } = msg.payload;
    let rect: RectangleNode;
    let parent: BaseNode & ChildrenMixin = figma.currentPage;

    // Resolve parent if parentId is provided
    if (parentId) {
      const parentNode = figma.getNodeById(parentId);
      if (!parentNode || !('appendChild' in parentNode)) {
        return { id: msg.id, success: false, error: `Parent node with id '${parentId}' not found or cannot have children` };
      }
      parent = parentNode as BaseNode & ChildrenMixin;
    }

    if (id) {
      const node = figma.getNodeById(id);
      if (node && node.type === 'RECTANGLE') {
        rect = node as RectangleNode;
      } else {
        return { id: msg.id, success: false, error: `Rectangle with id '${id}' not found` };
      }
    } else if (name) {
      const existing = parent.findOne((n) => n.type === 'RECTANGLE' && n.name === name);
      if (existing) {
        rect = existing as RectangleNode;
      } else {
        rect = figma.createRectangle();
        rect.name = name;
        parent.appendChild(rect);
      }
    } else {
      rect = figma.createRectangle();
      parent.appendChild(rect);
    }

    applyCommonProperties(rect, props);
    if (props.cornerRadius !== undefined) rect.cornerRadius = props.cornerRadius;
    if (props.topLeftRadius !== undefined) rect.topLeftRadius = props.topLeftRadius;
    if (props.topRightRadius !== undefined) rect.topRightRadius = props.topRightRadius;
    if (props.bottomLeftRadius !== undefined) rect.bottomLeftRadius = props.bottomLeftRadius;
    if (props.bottomRightRadius !== undefined) rect.bottomRightRadius = props.bottomRightRadius;

    return {
      id: msg.id,
      success: true,
      data: { nodeId: rect.id, name: rect.name, type: rect.type }
    };
  } catch (error) {
    return { id: msg.id, success: false, error: String(error) };
  }
}

// 3. sync-text: Create or update text node
export async function handleSyncText(msg: Command): Promise<CommandResponse> {
  try {
    const { id, name, parentId, ...props } = msg.payload;
    let text: TextNode;
    let parent: BaseNode & ChildrenMixin = figma.currentPage;

    // Resolve parent if parentId is provided
    if (parentId) {
      const parentNode = figma.getNodeById(parentId);
      if (!parentNode || !('appendChild' in parentNode)) {
        return { id: msg.id, success: false, error: `Parent node with id '${parentId}' not found or cannot have children` };
      }
      parent = parentNode as BaseNode & ChildrenMixin;
    }

    if (id) {
      const node = figma.getNodeById(id);
      if (node && node.type === 'TEXT') {
        text = node as TextNode;
      } else {
        return { id: msg.id, success: false, error: `Text node with id '${id}' not found` };
      }
    } else if (name) {
      const existing = parent.findOne((n) => n.type === 'TEXT' && n.name === name);
      if (existing) {
        text = existing as TextNode;
      } else {
        text = figma.createText();
        text.name = name;
        parent.appendChild(text);
      }
    } else {
      text = figma.createText();
      parent.appendChild(text);
    }

    // Load fonts before modifying text
    // For new text nodes or when changing font, load the target font
    if (props.fontName) {
      await figma.loadFontAsync(props.fontName as FontName);
    }

    // Always load Inter Regular as default since createText() uses it
    await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });

    // If updating existing text with characters, load all existing fonts
    if (text.characters.length > 0 && (props.characters !== undefined || props.fontSize !== undefined)) {
      await loadTextFonts(text);
    }

    // Set textAutoResize and layout sizing BEFORE applying common properties (which includes resize)
    if (props.textAutoResize !== undefined) text.textAutoResize = props.textAutoResize;
    if (props.layoutSizingHorizontal !== undefined) text.layoutSizingHorizontal = props.layoutSizingHorizontal;
    if (props.layoutSizingVertical !== undefined) text.layoutSizingVertical = props.layoutSizingVertical;
    applyCommonProperties(text, props);
    if (props.characters !== undefined) text.characters = props.characters;
    if (props.fontSize !== undefined) text.fontSize = props.fontSize;
    if (props.fontName !== undefined) text.fontName = props.fontName as FontName;
    if (props.textAlignHorizontal !== undefined) text.textAlignHorizontal = props.textAlignHorizontal;
    if (props.textAlignVertical !== undefined) text.textAlignVertical = props.textAlignVertical;
    if (props.lineHeight !== undefined) text.lineHeight = props.lineHeight;
    if (props.letterSpacing !== undefined) text.letterSpacing = props.letterSpacing;
    if (props.textCase !== undefined) text.textCase = props.textCase;
    if (props.textDecoration !== undefined) text.textDecoration = props.textDecoration;

    return {
      id: msg.id,
      success: true,
      data: { nodeId: text.id, name: text.name, type: text.type }
    };
  } catch (error) {
    return { id: msg.id, success: false, error: String(error) };
  }
}

// 4. sync-ellipse: Create or update ellipse
export async function handleSyncEllipse(msg: Command): Promise<CommandResponse> {
  try {
    const { id, name, parentId, ...props } = msg.payload;
    let ellipse: EllipseNode;
    let parent: BaseNode & ChildrenMixin = figma.currentPage;

    // Resolve parent if parentId is provided
    if (parentId) {
      const parentNode = figma.getNodeById(parentId);
      if (!parentNode || !('appendChild' in parentNode)) {
        return { id: msg.id, success: false, error: `Parent node with id '${parentId}' not found or cannot have children` };
      }
      parent = parentNode as BaseNode & ChildrenMixin;
    }

    if (id) {
      const node = figma.getNodeById(id);
      if (node && node.type === 'ELLIPSE') {
        ellipse = node as EllipseNode;
      } else {
        return { id: msg.id, success: false, error: `Ellipse with id '${id}' not found` };
      }
    } else if (name) {
      const existing = parent.findOne((n) => n.type === 'ELLIPSE' && n.name === name);
      if (existing) {
        ellipse = existing as EllipseNode;
      } else {
        ellipse = figma.createEllipse();
        ellipse.name = name;
        parent.appendChild(ellipse);
      }
    } else {
      ellipse = figma.createEllipse();
      parent.appendChild(ellipse);
    }

    applyCommonProperties(ellipse, props);

    return {
      id: msg.id,
      success: true,
      data: { nodeId: ellipse.id, name: ellipse.name, type: ellipse.type }
    };
  } catch (error) {
    return { id: msg.id, success: false, error: String(error) };
  }
}

// 5. sync-group: Create or update group
export async function handleSyncGroup(msg: Command): Promise<CommandResponse> {
  try {
    const { id, name, children, ...props } = msg.payload;

    if (!children || children.length === 0) {
      return { id: msg.id, success: false, error: 'Groups must have at least one child' };
    }

    let group: GroupNode;

    if (id) {
      const node = figma.getNodeById(id);
      if (node && node.type === 'GROUP') {
        group = node as GroupNode;
        group.children.forEach((child) => child.remove());
      } else {
        return { id: msg.id, success: false, error: `Group with id '${id}' not found` };
      }
    } else {
      const tempFrame = figma.createFrame();
      await createChildNodes(tempFrame, children);
      group = figma.group(tempFrame.children as SceneNode[], figma.currentPage);
      tempFrame.remove();

      if (name) group.name = name;
    }

    applyCommonProperties(group, props);

    return {
      id: msg.id,
      success: true,
      data: { nodeId: group.id, name: group.name, type: group.type }
    };
  } catch (error) {
    return { id: msg.id, success: false, error: String(error) };
  }
}

// 9. sync-line: Create or update line
export async function handleSyncLine(msg: Command): Promise<CommandResponse> {
  try {
    const { id, name, ...props } = msg.payload;
    let line: LineNode;

    if (id) {
      const node = figma.getNodeById(id);
      if (node && node.type === 'LINE') {
        line = node as LineNode;
      } else {
        return { id: msg.id, success: false, error: `Line with id '${id}' not found` };
      }
    } else if (name) {
      const existing = figma.currentPage.findOne((n) => n.type === 'LINE' && n.name === name);
      if (existing) {
        line = existing as LineNode;
      } else {
        line = figma.createLine();
        line.name = name;
        figma.currentPage.appendChild(line);
      }
    } else {
      line = figma.createLine();
      figma.currentPage.appendChild(line);
    }

    applyCommonProperties(line, props);

    return {
      id: msg.id,
      success: true,
      data: { nodeId: line.id, name: line.name, type: line.type }
    };
  } catch (error) {
    return { id: msg.id, success: false, error: String(error) };
  }
}

// 10. sync-polygon: Create or update polygon
export async function handleSyncPolygon(msg: Command): Promise<CommandResponse> {
  try {
    const { id, name, ...props } = msg.payload;
    let polygon: PolygonNode;

    if (id) {
      const node = figma.getNodeById(id);
      if (node && node.type === 'POLYGON') {
        polygon = node as PolygonNode;
      } else {
        return { id: msg.id, success: false, error: `Polygon with id '${id}' not found` };
      }
    } else if (name) {
      const existing = figma.currentPage.findOne((n) => n.type === 'POLYGON' && n.name === name);
      if (existing) {
        polygon = existing as PolygonNode;
      } else {
        polygon = figma.createPolygon();
        polygon.name = name;
        figma.currentPage.appendChild(polygon);
      }
    } else {
      polygon = figma.createPolygon();
      figma.currentPage.appendChild(polygon);
    }

    applyCommonProperties(polygon, props);
    if (props.pointCount !== undefined) polygon.pointCount = props.pointCount;

    return {
      id: msg.id,
      success: true,
      data: { nodeId: polygon.id, name: polygon.name, type: polygon.type }
    };
  } catch (error) {
    return { id: msg.id, success: false, error: String(error) };
  }
}

// 11. sync-star: Create or update star
export async function handleSyncStar(msg: Command): Promise<CommandResponse> {
  try {
    const { id, name, ...props } = msg.payload;
    let star: StarNode;

    if (id) {
      const node = figma.getNodeById(id);
      if (node && node.type === 'STAR') {
        star = node as StarNode;
      } else {
        return { id: msg.id, success: false, error: `Star with id '${id}' not found` };
      }
    } else if (name) {
      const existing = figma.currentPage.findOne((n) => n.type === 'STAR' && n.name === name);
      if (existing) {
        star = existing as StarNode;
      } else {
        star = figma.createStar();
        star.name = name;
        figma.currentPage.appendChild(star);
      }
    } else {
      star = figma.createStar();
      figma.currentPage.appendChild(star);
    }

    applyCommonProperties(star, props);
    if (props.pointCount !== undefined) star.pointCount = props.pointCount;
    if (props.innerRadius !== undefined) star.innerRadius = props.innerRadius;

    return {
      id: msg.id,
      success: true,
      data: { nodeId: star.id, name: star.name, type: star.type }
    };
  } catch (error) {
    return { id: msg.id, success: false, error: String(error) };
  }
}

// 12. sync-vector: Create or update vector
export async function handleSyncVector(msg: Command): Promise<CommandResponse> {
  try {
    const { id, name, ...props } = msg.payload;
    let vector: VectorNode;

    if (id) {
      const node = figma.getNodeById(id);
      if (node && node.type === 'VECTOR') {
        vector = node as VectorNode;
      } else {
        return { id: msg.id, success: false, error: `Vector with id '${id}' not found` };
      }
    } else if (name) {
      const existing = figma.currentPage.findOne((n) => n.type === 'VECTOR' && n.name === name);
      if (existing) {
        vector = existing as VectorNode;
      } else {
        vector = figma.createVector();
        vector.name = name;
        figma.currentPage.appendChild(vector);
      }
    } else {
      vector = figma.createVector();
      figma.currentPage.appendChild(vector);
    }

    applyCommonProperties(vector, props);
    if (props.vectorPaths !== undefined) vector.vectorPaths = props.vectorPaths;
    if (props.vectorNetwork !== undefined) vector.vectorNetwork = props.vectorNetwork;

    return {
      id: msg.id,
      success: true,
      data: { nodeId: vector.id, name: vector.name, type: vector.type }
    };
  } catch (error) {
    return { id: msg.id, success: false, error: String(error) };
  }
}
