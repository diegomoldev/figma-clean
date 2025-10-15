import { Command, CommandResponse } from '../../types';
import { serializeNode } from './helpers';

// Helper function to build hierarchy (same as in crud.ts)
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

// get-selection: Get currently selected nodes with response modes
export async function handleGetSelection(msg: Command): Promise<CommandResponse> {
  try {
    const {
      maxDepth = 5,
      responseMode = 'full',
      hierarchyDepth = 1
    } = msg.payload || {};

    const selection = Array.from(figma.currentPage.selection);

    if (selection.length === 0) {
      return {
        id: msg.id,
        success: true,
        data: {
          selection: [],
          count: 0,
          message: 'No nodes selected'
        }
      };
    }

    // Enable performance optimization
    figma.skipInvisibleInstanceChildren = true;

    // Format response based on mode
    let data: any;

    switch (responseMode) {
      case 'ids-only':
        data = {
          selection: selection.map(n => n.id),
          count: selection.length
        };
        break;

      case 'minimal':
        data = {
          selection: selection.map(n => ({
            id: n.id,
            name: n.name,
            type: n.type,
            childCount: 'children' in n ? (n as FrameNode).children.length : 0,
            parent: n.parent?.id || null
          })),
          count: selection.length
        };
        break;

      case 'hierarchy':
        data = {
          selection: selection.map(n => buildHierarchy(n as SceneNode, hierarchyDepth)),
          count: selection.length
        };
        break;

      default: // 'full'
        const serialized = selection.map((node) => serializeNode(node as SceneNode, 0, maxDepth));
        data = {
          selection: serialized,
          count: serialized.length
        };
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

// set-selection: Set selection to specific nodes by IDs
export async function handleSetSelection(msg: Command): Promise<CommandResponse> {
  try {
    const { nodeIds } = msg.payload;

    if (!nodeIds || !Array.isArray(nodeIds)) {
      return { id: msg.id, success: false, error: 'nodeIds array is required' };
    }

    const nodes: SceneNode[] = [];
    const notFound: string[] = [];

    for (const nodeId of nodeIds) {
      const node = figma.getNodeById(nodeId);
      if (node && 'id' in node) {
        nodes.push(node as SceneNode);
      } else {
        notFound.push(nodeId);
      }
    }

    figma.currentPage.selection = nodes;

    // Zoom to selection if nodes were found
    if (nodes.length > 0) {
      figma.viewport.scrollAndZoomIntoView(nodes);
    }

    return {
      id: msg.id,
      success: true,
      data: {
        selectedCount: nodes.length,
        notFound: notFound.length > 0 ? notFound : undefined
      }
    };
  } catch (error) {
    return { id: msg.id, success: false, error: String(error) };
  }
}
