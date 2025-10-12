import { Command, CommandResponse } from '../types';

// 1. set-auto-layout: Apply auto layout to frame(s)
export async function handleSetAutoLayout(msg: Command): Promise<CommandResponse> {
  try {
    const { id, ids, ...layoutProps } = msg.payload;
    const nodeIds = id ? [id] : ids || [];

    if (nodeIds.length === 0) {
      return { id: msg.id, success: false, error: 'Node id or ids required' };
    }

    const updated: any[] = [];

    for (const nodeId of nodeIds) {
      const node = figma.getNodeById(nodeId);
      if (!node || node.type !== 'FRAME') {
        continue;
      }

      const frame = node as FrameNode;

      if (layoutProps.layoutMode !== undefined) frame.layoutMode = layoutProps.layoutMode;
      if (layoutProps.primaryAxisSizingMode !== undefined) frame.primaryAxisSizingMode = layoutProps.primaryAxisSizingMode;
      if (layoutProps.counterAxisSizingMode !== undefined) frame.counterAxisSizingMode = layoutProps.counterAxisSizingMode;
      if (layoutProps.primaryAxisAlignItems !== undefined) frame.primaryAxisAlignItems = layoutProps.primaryAxisAlignItems;
      if (layoutProps.counterAxisAlignItems !== undefined) frame.counterAxisAlignItems = layoutProps.counterAxisAlignItems;
      if (layoutProps.paddingLeft !== undefined) frame.paddingLeft = layoutProps.paddingLeft;
      if (layoutProps.paddingRight !== undefined) frame.paddingRight = layoutProps.paddingRight;
      if (layoutProps.paddingTop !== undefined) frame.paddingTop = layoutProps.paddingTop;
      if (layoutProps.paddingBottom !== undefined) frame.paddingBottom = layoutProps.paddingBottom;
      if (layoutProps.itemSpacing !== undefined) frame.itemSpacing = layoutProps.itemSpacing;
      if (layoutProps.layoutWrap !== undefined) frame.layoutWrap = layoutProps.layoutWrap;
      if (layoutProps.counterAxisSpacing !== undefined) frame.counterAxisSpacing = layoutProps.counterAxisSpacing;

      updated.push({ id: frame.id, name: frame.name });
    }

    return {
      id: msg.id,
      success: true,
      data: { updated, count: updated.length }
    };
  } catch (error) {
    return { id: msg.id, success: false, error: String(error) };
  }
}

// 2. set-fills: Update fills for node(s)
export async function handleSetFills(msg: Command): Promise<CommandResponse> {
  try {
    const { id, ids, fills } = msg.payload;
    const nodeIds = id ? [id] : ids || [];

    if (nodeIds.length === 0) {
      return { id: msg.id, success: false, error: 'Node id or ids required' };
    }

    if (!fills) {
      return { id: msg.id, success: false, error: 'Fills property required' };
    }

    const updated: any[] = [];

    for (const nodeId of nodeIds) {
      const node = figma.getNodeById(nodeId);
      if (!node || !('fills' in node)) {
        continue;
      }

      (node as GeometryMixin).fills = fills as Paint[];
      updated.push({ id: node.id, name: node.name });
    }

    return {
      id: msg.id,
      success: true,
      data: { updated, count: updated.length }
    };
  } catch (error) {
    return { id: msg.id, success: false, error: String(error) };
  }
}

// 3. set-effects: Update effects for node(s)
export async function handleSetEffects(msg: Command): Promise<CommandResponse> {
  try {
    const { id, ids, effects } = msg.payload;
    const nodeIds = id ? [id] : ids || [];

    if (nodeIds.length === 0) {
      return { id: msg.id, success: false, error: 'Node id or ids required' };
    }

    if (!effects) {
      return { id: msg.id, success: false, error: 'Effects property required' };
    }

    const updated: any[] = [];

    for (const nodeId of nodeIds) {
      const node = figma.getNodeById(nodeId);
      if (!node || !('effects' in node)) {
        continue;
      }

      (node as BlendMixin).effects = effects as Effect[];
      updated.push({ id: node.id, name: node.name });
    }

    return {
      id: msg.id,
      success: true,
      data: { updated, count: updated.length }
    };
  } catch (error) {
    return { id: msg.id, success: false, error: String(error) };
  }
}

// 4. set-constraints: Update constraints for node(s)
export async function handleSetConstraints(msg: Command): Promise<CommandResponse> {
  try {
    const { id, ids, constraints } = msg.payload;
    const nodeIds = id ? [id] : ids || [];

    if (nodeIds.length === 0) {
      return { id: msg.id, success: false, error: 'Node id or ids required' };
    }

    if (!constraints) {
      return { id: msg.id, success: false, error: 'Constraints property required' };
    }

    const updated: any[] = [];

    for (const nodeId of nodeIds) {
      const node = figma.getNodeById(nodeId);
      if (!node || !('constraints' in node)) {
        continue;
      }

      (node as ConstraintMixin).constraints = constraints as Constraints;
      updated.push({ id: node.id, name: node.name });
    }

    return {
      id: msg.id,
      success: true,
      data: { updated, count: updated.length }
    };
  } catch (error) {
    return { id: msg.id, success: false, error: String(error) };
  }
}
