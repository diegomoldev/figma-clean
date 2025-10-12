import { Command, CommandResponse } from '../types';

// export-image: Export a node as PNG image
export async function handleExportImage(msg: Command): Promise<CommandResponse> {
  try {
    const { nodeId, name, scale = 2, format = 'PNG' } = msg.payload;

    if (!nodeId && !name) {
      return { id: msg.id, success: false, error: 'Either nodeId or name is required' };
    }

    let node: SceneNode | null = null;

    if (nodeId) {
      const found = figma.getNodeById(nodeId);
      if (!found || !('exportAsync' in found)) {
        return { id: msg.id, success: false, error: `Node with id '${nodeId}' not found or cannot be exported` };
      }
      node = found as SceneNode;
    } else if (name) {
      const found = figma.currentPage.findOne((n) => n.name === name);
      if (!found || !('exportAsync' in found)) {
        return { id: msg.id, success: false, error: `Node with name '${name}' not found or cannot be exported` };
      }
      node = found as SceneNode;
    }

    if (!node) {
      return { id: msg.id, success: false, error: 'Node not found' };
    }

    // Export as PNG
    const bytes = await node.exportAsync({
      format: format as 'PNG' | 'JPG' | 'SVG' | 'PDF',
      constraint: { type: 'SCALE', value: scale }
    });

    // Convert Uint8Array to base64
    const base64 = figma.base64Encode(bytes);

    return {
      id: msg.id,
      success: true,
      data: {
        nodeId: node.id,
        name: node.name,
        format,
        scale,
        width: 'width' in node ? node.width : 0,
        height: 'height' in node ? node.height : 0,
        base64,
        size: bytes.length
      }
    };
  } catch (error) {
    return { id: msg.id, success: false, error: String(error) };
  }
}
