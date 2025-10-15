import { Command, CommandResponse } from '../../types';

export async function handleReadTextContent(msg: Command): Promise<CommandResponse> {
  try {
    const { nodeId, includeHidden } = msg.payload || {};

    // Get the starting node (current page if not specified)
    let startNode: BaseNode;
    if (nodeId) {
      const node = figma.getNodeById(nodeId);
      if (!node) {
        return {
          id: msg.id,
          success: false,
          error: `Node with id ${nodeId} not found`
        };
      }
      startNode = node;
    } else {
      startNode = figma.currentPage;
    }

    const textNodes: any[] = [];

    // Recursive function to find all text nodes
    function findTextNodes(node: BaseNode) {
      // Skip hidden nodes unless includeHidden is true
      if ('visible' in node && !node.visible && !includeHidden) {
        return;
      }

      if (node.type === 'TEXT') {
        const textNode = node as TextNode;

        // Get fill colors
        let fillInfo = 'single';
        let fillColors: any[] = [];

        if (textNode.fills !== figma.mixed) {
          const fills = textNode.fills as Paint[];
          fillColors = fills.map(fill => {
            if (fill.type === 'SOLID') {
              return {
                type: 'SOLID',
                color: fill.color,
                opacity: fill.opacity || 1
              };
            }
            return { type: fill.type };
          });
        } else {
          fillInfo = 'mixed';
        }

        // Get font info
        let fontInfo: any = 'single';
        if (textNode.fontName === figma.mixed) {
          fontInfo = 'mixed';
        } else {
          fontInfo = textNode.fontName;
        }

        // Get font size
        let fontSize: any = textNode.fontSize;
        if (fontSize === figma.mixed) {
          fontSize = 'mixed';
        }

        textNodes.push({
          id: textNode.id,
          name: textNode.name,
          characters: textNode.characters,
          y: textNode.y,
          x: textNode.x,
          fontSize: fontSize,
          fontName: fontInfo,
          fills: fillInfo,
          fillColors: fillColors,
          hasMixedFills: fillInfo === 'mixed',
          hasMixedFonts: fontInfo === 'mixed',
          characterCount: textNode.characters.length,
          parent: textNode.parent ? {
            id: textNode.parent.id,
            name: textNode.parent.name,
            type: textNode.parent.type
          } : null
        });
      }

      // Recurse into children if the node has them
      if ('children' in node) {
        for (const child of node.children) {
          findTextNodes(child);
        }
      }
    }

    findTextNodes(startNode);

    // Sort by Y position (top to bottom)
    textNodes.sort((a, b) => {
      if (Math.abs(a.y - b.y) < 1) {
        return a.x - b.x;
      }
      return a.y - b.y;
    });

    return {
      id: msg.id,
      success: true,
      data: {
        count: textNodes.length,
        textNodes: textNodes
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
