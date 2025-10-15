import { Command, CommandResponse } from '../../types';

export async function handleReorderChildren(msg: Command): Promise<CommandResponse> {
  try {
    const { nodeId, orderBy } = msg.payload;

    if (!nodeId) {
      return {
        id: msg.id,
        success: false,
        error: 'nodeId is required'
      };
    }

    const node = figma.getNodeById(nodeId);
    if (!node) {
      return {
        id: msg.id,
        success: false,
        error: `Node with id ${nodeId} not found`
      };
    }

    // Check if node can have children
    if (!('children' in node)) {
      return {
        id: msg.id,
        success: false,
        error: 'Node does not support children'
      };
    }

    const parent = node as FrameNode | GroupNode | ComponentNode | InstanceNode;

    // Get all children with their positions
    const childrenWithPositions = parent.children.map(child => ({
      node: child,
      y: child.y,
      x: child.x
    }));

    // Sort by Y position (top to bottom), then by X if Y is same
    const sortedChildren = childrenWithPositions.sort((a, b) => {
      if (orderBy === 'y' || !orderBy) {
        // Sort by Y first, then X as tiebreaker
        if (Math.abs(a.y - b.y) < 0.1) {
          return a.x - b.x;
        }
        return a.y - b.y;
      } else if (orderBy === 'x') {
        // Sort by X first, then Y as tiebreaker
        if (Math.abs(a.x - b.x) < 0.1) {
          return a.y - b.y;
        }
        return a.x - b.x;
      }
      return 0;
    });

    // Reorder children by removing and re-appending in sorted order
    // We need to collect all children first, then reorder
    const orderedNodes = sortedChildren.map(item => item.node);

    // In Figma's layer panel: index 0 = BOTTOM of panel, last index = TOP of panel
    // In Y coordinates: lower Y = TOP of canvas, higher Y = BOTTOM of canvas
    // So we need to REVERSE the sorted order to match layer panel expectations
    // Element with lowest Y (top of canvas) should be at highest index (top of panel)
    orderedNodes.reverse();

    // Re-insert children in the correct order
    // Now orderedNodes[0] has the highest Y (bottom of canvas) -> goes to index 0 (bottom of panel)
    // And orderedNodes[last] has the lowest Y (top of canvas) -> goes to last index (top of panel)
    for (let i = 0; i < orderedNodes.length; i++) {
      const child = orderedNodes[i];
      parent.insertChild(i, child);
    }

    return {
      id: msg.id,
      success: true,
      data: {
        nodeId,
        childrenReordered: orderedNodes.length,
        order: orderedNodes.map(n => ({ id: n.id, name: n.name, y: n.y, x: n.x }))
      }
    };
  } catch (error) {
    return {
      id: msg.id,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
