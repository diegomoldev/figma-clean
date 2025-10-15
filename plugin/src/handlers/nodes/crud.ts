import { Command, CommandResponse } from '../../types';
import { serializeNode, applyCommonProperties, applyFrameProperties, loadTextFonts, applyCharacterFormatting, extractCharacterFormatting } from './helpers';

// Helper function to build hierarchy for response
function buildHierarchy(node: SceneNode, depth: number): any {
  const base: any = {
    id: node.id,
    name: node.name,
    type: node.type
  };

  if (depth > 0 && 'children' in node) {
    base.childIds = (node as FrameNode).children.map((c: SceneNode) => c.id);
    if (depth > 1) {
      base.children = (node as FrameNode).children.map((c: SceneNode) => buildHierarchy(c, depth - 1));
    }
  }

  return base;
}

// 6. read-nodes: Read nodes with filters and response modes
export async function handleReadNodes(msg: Command): Promise<CommandResponse> {
  try {
    const {
      type,
      name,
      parentId,
      maxDepth = 10,
      responseMode = 'full',
      limit,
      cursor,
      hierarchyDepth = 1
    } = msg.payload || {};

    // Enable performance optimization
    figma.skipInvisibleInstanceChildren = true;

    let nodes: SceneNode[] = [];

    // Gather nodes based on parentId
    if (parentId) {
      const parent = figma.getNodeById(parentId);
      if (parent && 'children' in parent) {
        nodes = (parent as FrameNode).children as SceneNode[];
      }
    } else {
      // Use findAllWithCriteria for better performance when searching entire page
      if (type) {
        const typeArray = Array.isArray(type) ? type : [type];
        nodes = figma.currentPage.findAllWithCriteria({ types: typeArray as NodeType[] });
      } else {
        nodes = figma.currentPage.children as SceneNode[];
      }
    }

    // Apply type filter if using children (not findAllWithCriteria)
    if (!type && parentId && type) {
      nodes = nodes.filter((n) => n.type === type);
    }

    // Apply name filter
    if (name) {
      const nameRegex = new RegExp(name);
      nodes = nodes.filter((n) => nameRegex.test(n.name));
    }

    // Apply cursor-based pagination
    if (cursor) {
      const startIndex = nodes.findIndex(n => n.id === cursor);
      if (startIndex >= 0) {
        nodes = nodes.slice(startIndex + 1, startIndex + 1 + (limit || 50));
      } else {
        nodes = [];
      }
    } else if (limit) {
      nodes = nodes.slice(0, limit);
    }

    // Format response based on mode
    let data: any;

    switch (responseMode) {
      case 'ids-only':
        data = {
          ids: nodes.map(n => n.id),
          count: nodes.length
        };
        break;

      case 'minimal':
        data = {
          nodes: nodes.map(n => ({
            id: n.id,
            name: n.name,
            type: n.type,
            childCount: 'children' in n ? (n as FrameNode).children.length : 0,
            parent: n.parent?.id || null
          })),
          count: nodes.length
        };
        break;

      case 'hierarchy':
        data = {
          nodes: nodes.map(n => buildHierarchy(n, hierarchyDepth)),
          count: nodes.length
        };
        break;

      default: // 'full'
        const serialized = nodes.map((node) => serializeNode(node, 0, maxDepth));
        data = {
          nodes: serialized,
          count: serialized.length
        };
    }

    // Add pagination metadata
    if (limit) {
      data.nextCursor = nodes.length > 0 ? nodes[nodes.length - 1].id : null;
      data.hasMore = nodes.length === limit;
    }

    return {
      id: msg.id,
      success: true,
      data
    };
  } catch (error) {
    return { id: msg.id, success: false, error: String(error) };
  }
}

// 7. delete-node: Delete single node
export async function handleDeleteNode(msg: Command): Promise<CommandResponse> {
  try {
    const { id } = msg.payload;

    if (!id) {
      return { id: msg.id, success: false, error: 'Node id is required' };
    }

    const node = figma.getNodeById(id);
    if (!node) {
      return { id: msg.id, success: false, error: `Node with id '${id}' not found` };
    }

    const nodeInfo = { id: node.id, name: node.name, type: node.type };
    node.remove();

    return {
      id: msg.id,
      success: true,
      data: { deleted: nodeInfo }
    };
  } catch (error) {
    return { id: msg.id, success: false, error: String(error) };
  }
}

// 8. delete-nodes: Bulk delete nodes
export async function handleDeleteNodes(msg: Command): Promise<CommandResponse> {
  try {
    const { type, name, parentId } = msg.payload || {};
    let nodes: SceneNode[] = [];

    if (parentId) {
      const parent = figma.getNodeById(parentId);
      if (parent && 'children' in parent) {
        nodes = (parent as FrameNode).children as SceneNode[];
      }
    } else {
      nodes = figma.currentPage.children as SceneNode[];
    }

    if (type) {
      nodes = nodes.filter((n) => n.type === type);
    }

    if (name) {
      const nameRegex = new RegExp(name);
      nodes = nodes.filter((n) => nameRegex.test(n.name));
    }

    const deleted = nodes.map((node) => ({ id: node.id, name: node.name, type: node.type }));
    nodes.forEach((node) => node.remove());

    return {
      id: msg.id,
      success: true,
      data: { deleted, count: deleted.length }
    };
  } catch (error) {
    return { id: msg.id, success: false, error: String(error) };
  }
}

// 13. update-node: Update any node's properties and optionally move to new parent
export async function handleUpdateNode(msg: Command): Promise<CommandResponse> {
  try {
    const { nodeId, parentId, ...props } = msg.payload;

    if (!nodeId) {
      return { id: msg.id, success: false, error: 'nodeId is required' };
    }

    const node = figma.getNodeById(nodeId);
    if (!node) {
      return { id: msg.id, success: false, error: `Node with id '${nodeId}' not found` };
    }

    // Handle parent change if parentId is provided
    if (parentId) {
      const newParent = figma.getNodeById(parentId);
      if (!newParent) {
        return { id: msg.id, success: false, error: `Parent node with id '${parentId}' not found` };
      }
      if (!('appendChild' in newParent)) {
        return { id: msg.id, success: false, error: 'Target parent cannot have children' };
      }

      // Move node to new parent
      (newParent as FrameNode | GroupNode).appendChild(node as SceneNode);
    }

    // Handle text-specific updates
    if (node.type === 'TEXT') {
      const textNode = node as TextNode;

      // Always load existing fonts for text nodes to avoid font loading errors
      if (textNode.characters.length > 0) {
        await loadTextFonts(textNode);
      }

      // Load target font if changing fontName
      if (props.fontName) {
        await figma.loadFontAsync(props.fontName as FontName);
      }

      // Set textAutoResize BEFORE width changes
      if (props.textAutoResize !== undefined) textNode.textAutoResize = props.textAutoResize;
      if (props.layoutSizingHorizontal !== undefined) textNode.layoutSizingHorizontal = props.layoutSizingHorizontal;
      if (props.layoutSizingVertical !== undefined) textNode.layoutSizingVertical = props.layoutSizingVertical;

      applyCommonProperties(textNode, props);

      if (props.characters !== undefined) textNode.characters = props.characters;

      // Apply character-level formatting if provided
      if (props.characterFormatting !== undefined) {
        await applyCharacterFormatting(textNode, props.characterFormatting);
      } else {
        // Only apply global text properties if NOT using character formatting
        if (props.fontSize !== undefined) textNode.fontSize = props.fontSize;
        if (props.fontName !== undefined) textNode.fontName = props.fontName as FontName;
      }

      // Always apply alignment and spacing properties
      if (props.textAlignHorizontal !== undefined) textNode.textAlignHorizontal = props.textAlignHorizontal;
      if (props.textAlignVertical !== undefined) textNode.textAlignVertical = props.textAlignVertical;
      if (props.lineHeight !== undefined) textNode.lineHeight = props.lineHeight;
      if (props.letterSpacing !== undefined) textNode.letterSpacing = props.letterSpacing;
    } else if (node.type === 'FRAME') {
      applyCommonProperties(node as SceneNode, props);
      applyFrameProperties(node as FrameNode, props);
    } else {
      applyCommonProperties(node as SceneNode, props);
    }

    return {
      id: msg.id,
      success: true,
      data: { nodeId: node.id, name: node.name, type: node.type }
    };
  } catch (error) {
    return { id: msg.id, success: false, error: String(error) };
  }
}

// Read character-level formatting from text node
export async function handleReadTextFormatting(msg: Command): Promise<CommandResponse> {
  try {
    const { nodeId } = msg.payload;

    if (!nodeId) {
      return { id: msg.id, success: false, error: 'nodeId is required' };
    }

    const node = figma.getNodeById(nodeId);
    if (!node) {
      return { id: msg.id, success: false, error: `Node with id '${nodeId}' not found` };
    }

    if (node.type !== 'TEXT') {
      return { id: msg.id, success: false, error: 'Node must be a TEXT node' };
    }

    const textNode = node as TextNode;
    const formatting = extractCharacterFormatting(textNode);

    return {
      id: msg.id,
      success: true,
      data: {
        nodeId: textNode.id,
        name: textNode.name,
        characters: textNode.characters,
        formatting
      }
    };
  } catch (error) {
    return { id: msg.id, success: false, error: String(error) };
  }
}

// Update character-level formatting in text node
export async function handleUpdateTextFormatting(msg: Command): Promise<CommandResponse> {
  try {
    const { nodeId, formatting } = msg.payload;

    if (!nodeId) {
      return { id: msg.id, success: false, error: 'nodeId is required' };
    }

    if (!formatting) {
      return { id: msg.id, success: false, error: 'formatting is required' };
    }

    const node = figma.getNodeById(nodeId);
    if (!node) {
      return { id: msg.id, success: false, error: `Node with id '${nodeId}' not found` };
    }

    if (node.type !== 'TEXT') {
      return { id: msg.id, success: false, error: 'Node must be a TEXT node' };
    }

    const textNode = node as TextNode;
    await applyCharacterFormatting(textNode, formatting);

    return {
      id: msg.id,
      success: true,
      data: {
        nodeId: textNode.id,
        name: textNode.name,
        characters: textNode.characters
      }
    };
  } catch (error) {
    return { id: msg.id, success: false, error: String(error) };
  }
}

// Get specific nodes by their IDs
export async function handleGetNodesByIds(msg: Command): Promise<CommandResponse> {
  try {
    const { ids, responseMode = 'full', maxDepth = 10 } = msg.payload || {};

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return { id: msg.id, success: false, error: 'ids array is required and must not be empty' };
    }

    // Enable performance optimization
    figma.skipInvisibleInstanceChildren = true;

    const results: any[] = [];
    const notFound: string[] = [];

    for (const nodeId of ids) {
      const node = figma.getNodeById(nodeId);

      if (!node) {
        notFound.push(nodeId);
        continue;
      }

      switch (responseMode) {
        case 'ids-only':
          results.push(node.id);
          break;

        case 'minimal':
          results.push({
            id: node.id,
            name: node.name,
            type: node.type,
            childCount: 'children' in node ? (node as FrameNode).children.length : 0,
            parent: node.parent?.id || null
          });
          break;

        case 'hierarchy':
          results.push(buildHierarchy(node as SceneNode, 1));
          break;

        default: // 'full'
          results.push(serializeNode(node as SceneNode, 0, maxDepth));
      }
    }

    return {
      id: msg.id,
      success: true,
      data: {
        nodes: results,
        count: results.length,
        notFound: notFound.length > 0 ? notFound : undefined
      }
    };
  } catch (error) {
    return { id: msg.id, success: false, error: String(error) };
  }
}
