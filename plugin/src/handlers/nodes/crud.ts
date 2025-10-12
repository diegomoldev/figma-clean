import { Command, CommandResponse } from '../../types';
import { serializeNode, applyCommonProperties, applyFrameProperties, loadTextFonts } from './helpers';

// 6. read-nodes: Read nodes with filters
export async function handleReadNodes(msg: Command): Promise<CommandResponse> {
  try {
    const { type, name, parentId, maxDepth = 10 } = msg.payload || {};
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

    const serialized = nodes.map((node) => serializeNode(node, 0, maxDepth));

    return {
      id: msg.id,
      success: true,
      data: { nodes: serialized, count: serialized.length }
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
      if (props.fontSize !== undefined) textNode.fontSize = props.fontSize;
      if (props.fontName !== undefined) textNode.fontName = props.fontName as FontName;
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
