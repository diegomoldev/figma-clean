import { Command, CommandResponse } from '../../types';
import { serializeNode } from './helpers';

// get-selection: Get currently selected nodes
export async function handleGetSelection(msg: Command): Promise<CommandResponse> {
  try {
    const { maxDepth = 5 } = msg.payload || {};

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

    const serialized = selection.map((node) => serializeNode(node as SceneNode, 0, maxDepth));

    return {
      id: msg.id,
      success: true,
      data: {
        selection: serialized,
        count: serialized.length
      }
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
