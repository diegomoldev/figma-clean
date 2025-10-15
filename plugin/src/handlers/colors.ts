import { Command, CommandResponse } from '../types';

interface ColorInfo {
  r: number;
  g: number;
  b: number;
  a?: number;
}

interface NodeColorReference {
  nodeId: string;
  nodeName: string;
  property: 'fills' | 'strokes' | 'text-range';
  index: number;
  color: ColorInfo;
  rangeStart?: number;
  rangeEnd?: number;
}

/**
 * Scan all nodes recursively and collect all solid colors with their node references
 */
function scanColors(node: SceneNode, colorRefs: NodeColorReference[]) {
  // Scan regular fills
  if ('fills' in node && node.fills !== figma.mixed && Array.isArray(node.fills)) {
    node.fills.forEach((fill, index) => {
      if (fill.type === 'SOLID' && fill.visible !== false && fill.color) {
        // Check if color is actually readable (not a broken variable binding)
        if (fill.color.r !== undefined && fill.color.g !== undefined && fill.color.b !== undefined) {
          colorRefs.push({
            nodeId: node.id,
            nodeName: node.name,
            property: 'fills',
            index,
            color: { r: fill.color.r, g: fill.color.g, b: fill.color.b, a: fill.opacity }
          });
        }
      }
    });
  }

  // Scan text node character-level fills
  if (node.type === 'TEXT' && node.fills === figma.mixed) {
    const textNode = node as TextNode;
    const segments = textNode.getStyledTextSegments(['fills']);

    segments.forEach((segment) => {
      if (Array.isArray(segment.fills)) {
        segment.fills.forEach((fill, fillIndex) => {
          if (fill.type === 'SOLID' && fill.visible !== false && fill.color) {
            if (fill.color.r !== undefined && fill.color.g !== undefined && fill.color.b !== undefined) {
              colorRefs.push({
                nodeId: node.id,
                nodeName: node.name,
                property: 'text-range',
                index: fillIndex,
                color: { r: fill.color.r, g: fill.color.g, b: fill.color.b, a: fill.opacity },
                rangeStart: segment.start,
                rangeEnd: segment.end
              });
            }
          }
        });
      }
    });
  }

  // Scan strokes
  if ('strokes' in node && Array.isArray(node.strokes)) {
    node.strokes.forEach((stroke, index) => {
      if (stroke.type === 'SOLID' && stroke.visible !== false && stroke.color) {
        // Check if color is actually readable (not a broken variable binding)
        if (stroke.color.r !== undefined && stroke.color.g !== undefined && stroke.color.b !== undefined) {
          colorRefs.push({
            nodeId: node.id,
            nodeName: node.name,
            property: 'strokes',
            index,
            color: { r: stroke.color.r, g: stroke.color.g, b: stroke.color.b, a: stroke.opacity }
          });
        }
      }
    });
  }

  if ('children' in node) {
    for (const child of node.children) {
      scanColors(child, colorRefs);
    }
  }
}

/**
 * Find all solid colors in selected nodes or specified node IDs
 */
export async function handleFindAllColors(msg: Command): Promise<CommandResponse> {
  try {
    const { nodeIds } = msg.payload as { nodeIds?: string[] };

    // Determine nodes to scan
    let nodesToScan: SceneNode[] = [];
    if (nodeIds && nodeIds.length > 0) {
      const nodes = nodeIds
        .map(id => figma.getNodeById(id))
        .filter((n): n is SceneNode => n !== null && ('children' in n || 'fills' in n));
      nodesToScan = nodes;
    } else if (figma.currentPage.selection.length > 0) {
      nodesToScan = [...figma.currentPage.selection];
    } else {
      return {
        id: msg.id,
        success: false,
        error: 'No nodes specified and no selection found'
      };
    }

    // Scan all colors
    const colorRefs: NodeColorReference[] = [];
    for (const node of nodesToScan) {
      scanColors(node, colorRefs);
    }

    // Group by unique colors
    const colorGroups = new Map<string, NodeColorReference[]>();
    for (const ref of colorRefs) {
      const key = `${ref.color.r.toFixed(4)},${ref.color.g.toFixed(4)},${ref.color.b.toFixed(4)}`;
      if (!colorGroups.has(key)) {
        colorGroups.set(key, []);
      }
      colorGroups.get(key)!.push(ref);
    }

    // Convert to array format
    const uniqueColors = Array.from(colorGroups.entries()).map(([colorKey, refs]) => ({
      color: refs[0].color,
      count: refs.length,
      nodes: refs.map(r => {
        const nodeRef: any = {
          nodeId: r.nodeId,
          nodeName: r.nodeName,
          property: r.property,
          index: r.index
        };
        if (r.rangeStart !== undefined) nodeRef.rangeStart = r.rangeStart;
        if (r.rangeEnd !== undefined) nodeRef.rangeEnd = r.rangeEnd;
        return nodeRef;
      })
    }));

    return {
      id: msg.id,
      success: true,
      data: {
        totalColors: uniqueColors.length,
        totalReferences: colorRefs.length,
        colors: uniqueColors
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

/**
 * Calculate color distance using Euclidean distance in RGB space
 */
function colorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  return Math.sqrt(
    Math.pow(r1 - r2, 2) +
    Math.pow(g1 - g2, 2) +
    Math.pow(b1 - b2, 2)
  );
}

/**
 * Replace colors in batch with variable references
 * Payload format:
 * {
 *   replacements: [
 *     {
 *       nodeId: string,
 *       property: 'fills' | 'strokes',
 *       index: number,
 *       variableId: string (optional - if provided, use this variable)
 *       variableName: string (optional - if provided, look up by name)
 *       color: {r, g, b} (optional - if provided, find closest grey)
 *     }
 *   ],
 *   collectionName: string (default: 'Swatch'),
 *   greyPrefix: string (default: 'grey-')
 * }
 */
export async function handleReplaceColorsBatch(msg: Command): Promise<CommandResponse> {
  try {
    const {
      replacements,
      collectionName = 'Swatch',
      greyPrefix = 'grey-',
      autoMapToGreys = false
    } = msg.payload as {
      replacements: Array<{
        nodeId: string;
        property: 'fills' | 'strokes' | 'text-range';
        index: number;
        variableId?: string;
        variableName?: string;
        color?: ColorInfo;
        rangeStart?: number;
        rangeEnd?: number;
      }>;
      collectionName?: string;
      greyPrefix?: string;
      autoMapToGreys?: boolean;
    };

    if (!replacements || replacements.length === 0) {
      return {
        id: msg.id,
        success: false,
        error: 'No replacements specified'
      };
    }

    // Get collection and variables
    const collections = figma.variables.getLocalVariableCollections();
    const collection = collections.find(c => c.name === collectionName);

    if (!collection) {
      return {
        id: msg.id,
        success: false,
        error: `Collection '${collectionName}' not found`
      };
    }

    // Build grey variables list for auto-mapping
    const greyVariables: Array<{ id: string; name: string; r: number; g: number; b: number }> = [];
    if (autoMapToGreys) {
      for (const varId of collection.variableIds) {
        const variable = figma.variables.getVariableById(varId);
        if (variable && variable.name.startsWith(greyPrefix) && variable.resolvedType === 'COLOR') {
          const value = variable.valuesByMode[collection.modes[0].modeId];
          if (typeof value === 'object' && 'r' in value) {
            greyVariables.push({
              id: variable.id,
              name: variable.name,
              r: value.r,
              g: value.g,
              b: value.b
            });
          }
        }
      }
    }

    // Process each replacement
    let successCount = 0;
    const errors: string[] = [];

    for (const replacement of replacements) {
      try {
        const node = figma.getNodeById(replacement.nodeId);
        if (!node) {
          errors.push(`Node ${replacement.nodeId} not found`);
          continue;
        }

        // Determine which variable to use
        let variableId = replacement.variableId;

        if (!variableId && replacement.variableName) {
          // Look up by name
          const variable = Array.from(collection.variableIds)
            .map(id => figma.variables.getVariableById(id))
            .find(v => v && v.name === replacement.variableName);

          if (variable) {
            variableId = variable.id;
          }
        }

        if (!variableId && replacement.color && autoMapToGreys) {
          // Find closest grey
          let closestGrey = greyVariables[0];
          let minDistance = colorDistance(
            replacement.color.r, replacement.color.g, replacement.color.b,
            closestGrey.r, closestGrey.g, closestGrey.b
          );

          for (const grey of greyVariables) {
            const distance = colorDistance(
              replacement.color.r, replacement.color.g, replacement.color.b,
              grey.r, grey.g, grey.b
            );
            if (distance < minDistance) {
              minDistance = distance;
              closestGrey = grey;
            }
          }

          variableId = closestGrey.id;
        }

        if (!variableId) {
          errors.push(`No variable ID found for node ${replacement.nodeId}`);
          continue;
        }

        const variable = figma.variables.getVariableById(variableId);
        if (!variable) {
          errors.push(`Variable ${variableId} not found`);
          continue;
        }

        // Apply the variable binding using setBoundVariableForPaint
        // First unbind any existing variable binding, then bind to new variable
        if (replacement.property === 'fills' && 'fills' in node) {
          // Step 1: Unbind the variable to break the link with missing variables
          try {
            (node as any).setBoundVariable('fills', null);
          } catch (e) {
            // Ignore error if there was no binding
          }

          // Step 2: Get the fills and prepare new paint
          const fills = (node as any).fills;
          if (fills !== figma.mixed && Array.isArray(fills) && fills.length > 0) {
            // Create a new solid paint to bind the variable to
            const color = replacement.color || { r: 0.5, g: 0.5, b: 0.5 };
            const newPaint: SolidPaint = {
              type: 'SOLID',
              color: { r: color.r, g: color.g, b: color.b },
              opacity: fills[replacement.index]?.opacity || 1,
              visible: fills[replacement.index]?.visible !== false
            };
            const boundPaint = figma.variables.setBoundVariableForPaint(newPaint, 'color', variable);

            // Replace the fill at the specified index
            const newFills = [...fills];
            newFills[replacement.index] = boundPaint;
            (node as any).fills = newFills;
            successCount++;
          }
        } else if (replacement.property === 'strokes' && 'strokes' in node) {
          // Step 1: Unbind the variable to break the link with missing variables
          try {
            (node as any).setBoundVariable('strokes', null);
          } catch (e) {
            // Ignore error if there was no binding
          }

          // Step 2: Get the strokes and prepare new paint
          const strokes = (node as any).strokes;
          if (Array.isArray(strokes) && strokes.length > 0) {
            // Create a new solid paint to bind the variable to
            const color = replacement.color || { r: 0.5, g: 0.5, b: 0.5 };
            const newPaint: SolidPaint = {
              type: 'SOLID',
              color: { r: color.r, g: color.g, b: color.b },
              opacity: strokes[replacement.index]?.opacity || 1,
              visible: strokes[replacement.index]?.visible !== false
            };
            const boundPaint = figma.variables.setBoundVariableForPaint(newPaint, 'color', variable);

            // Replace the stroke at the specified index
            const newStrokes = [...strokes];
            newStrokes[replacement.index] = boundPaint;
            (node as any).strokes = newStrokes;
            successCount++;
          }
        } else if (replacement.property === 'text-range' && node.type === 'TEXT') {
          // Handle text node with character-level formatting
          const textNode = node as TextNode;

          if (replacement.rangeStart === undefined || replacement.rangeEnd === undefined) {
            errors.push(`Node ${replacement.nodeId}: text-range requires rangeStart and rangeEnd`);
            continue;
          }

          // Load all fonts used in the character range
          const fontNames = textNode.getRangeAllFontNames(replacement.rangeStart, replacement.rangeEnd);
          await Promise.all(fontNames.map(font => figma.loadFontAsync(font)));

          // Get current fills for this range
          const currentFills = textNode.getRangeFills(replacement.rangeStart, replacement.rangeEnd);

          if (currentFills !== figma.mixed && Array.isArray(currentFills)) {
            // Create new paint with variable binding
            const color = replacement.color || { r: 0.5, g: 0.5, b: 0.5 };
            const newPaint: SolidPaint = {
              type: 'SOLID',
              color: { r: color.r, g: color.g, b: color.b },
              opacity: currentFills[replacement.index]?.opacity || 1,
              visible: currentFills[replacement.index]?.visible !== false
            };
            const boundPaint = figma.variables.setBoundVariableForPaint(newPaint, 'color', variable);

            // Replace the fill at the specified index for this range
            const newFills = [...currentFills];
            newFills[replacement.index] = boundPaint;
            textNode.setRangeFills(replacement.rangeStart, replacement.rangeEnd, newFills);
            successCount++;
          }
        }
      } catch (error) {
        errors.push(`Error replacing node ${replacement.nodeId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      id: msg.id,
      success: true,
      data: {
        totalReplacements: replacements.length,
        successCount,
        errorCount: errors.length,
        errors: errors.length > 0 ? errors : undefined
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
