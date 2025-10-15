import { Command, CommandResponse } from '../types';

/**
 * Find all nodes in the entire document that have specific hex colors
 * and replace them with the closest neutral variable
 */
export async function handleReplaceAllColors(msg: Command): Promise<CommandResponse> {
  try {
    const { collectionName = 'Swatch', greyPrefix = 'neutral-' } = msg.payload as {
      collectionName?: string;
      greyPrefix?: string;
    };

    // Get the neutral variables
    const collections = figma.variables.getLocalVariableCollections();
    const collection = collections.find(c => c.name === collectionName);

    if (!collection) {
      return {
        id: msg.id,
        success: false,
        error: `Collection '${collectionName}' not found`
      };
    }

    const greyVariables: Array<{ id: string; name: string; r: number; g: number; b: number }> = [];
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

    if (greyVariables.length === 0) {
      return {
        id: msg.id,
        success: false,
        error: `No variables found with prefix '${greyPrefix}'`
      };
    }

    // Find all nodes with fills or strokes in the entire document
    const nodesToUpdate: Array<{ node: SceneNode; type: 'fill' | 'stroke'; color: RGB }> = [];

    figma.root.findAll(node => {
      if ('fills' in node && node.fills !== figma.mixed && Array.isArray(node.fills)) {
        for (const fill of node.fills) {
          if (fill.type === 'SOLID' && fill.visible !== false && fill.color) {
            // Check if it has a bound variable already
            const hasBoundVar = 'boundVariables' in fill && fill.boundVariables && 'color' in fill.boundVariables;
            if (!hasBoundVar) {
              nodesToUpdate.push({
                node: node as SceneNode,
                type: 'fill',
                color: fill.color
              });
              return true; // Found what we're looking for
            }
          }
        }
      }

      if ('strokes' in node && Array.isArray(node.strokes)) {
        for (const stroke of node.strokes) {
          if (stroke.type === 'SOLID' && stroke.visible !== false && stroke.color) {
            const hasBoundVar = 'boundVariables' in stroke && stroke.boundVariables && 'color' in stroke.boundVariables;
            if (!hasBoundVar) {
              nodesToUpdate.push({
                node: node as SceneNode,
                type: 'stroke',
                color: stroke.color
              });
              return true;
            }
          }
        }
      }

      return false;
    });

    // Now replace each color with the closest neutral
    let successCount = 0;
    const errors: string[] = [];

    for (const item of nodesToUpdate) {
      try {
        // Find closest grey
        let closestGrey = greyVariables[0];
        let minDistance = Math.sqrt(
          Math.pow(item.color.r - closestGrey.r, 2) +
          Math.pow(item.color.g - closestGrey.g, 2) +
          Math.pow(item.color.b - closestGrey.b, 2)
        );

        for (const grey of greyVariables) {
          const distance = Math.sqrt(
            Math.pow(item.color.r - grey.r, 2) +
            Math.pow(item.color.g - grey.g, 2) +
            Math.pow(item.color.b - grey.b, 2)
          );
          if (distance < minDistance) {
            minDistance = distance;
            closestGrey = grey;
          }
        }

        const variable = figma.variables.getVariableById(closestGrey.id);
        if (!variable) continue;

        // Unbind any existing broken variable binding
        try {
          if (item.type === 'fill') {
            (item.node as any).setBoundVariable('fills', null);
          } else {
            (item.node as any).setBoundVariable('strokes', null);
          }
        } catch (e) {
          // Ignore
        }

        // Create new paint and bind variable
        if (item.type === 'fill' && 'fills' in item.node) {
          const fills = (item.node as any).fills;
          if (fills !== figma.mixed && Array.isArray(fills) && fills.length > 0) {
            const newPaint: SolidPaint = {
              type: 'SOLID',
              color: { r: item.color.r, g: item.color.g, b: item.color.b },
              opacity: fills[0]?.opacity || 1,
              visible: fills[0]?.visible !== false
            };
            const boundPaint = figma.variables.setBoundVariableForPaint(newPaint, 'color', variable);
            (item.node as any).fills = [boundPaint];
            successCount++;
          }
        } else if (item.type === 'stroke' && 'strokes' in item.node) {
          const strokes = (item.node as any).strokes;
          if (Array.isArray(strokes) && strokes.length > 0) {
            const newPaint: SolidPaint = {
              type: 'SOLID',
              color: { r: item.color.r, g: item.color.g, b: item.color.b },
              opacity: strokes[0]?.opacity || 1,
              visible: strokes[0]?.visible !== false
            };
            const boundPaint = figma.variables.setBoundVariableForPaint(newPaint, 'color', variable);
            (item.node as any).strokes = [boundPaint];
            successCount++;
          }
        }
      } catch (error) {
        errors.push(`Error updating node ${item.node.id}: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }

    return {
      id: msg.id,
      success: true,
      data: {
        totalNodes: nodesToUpdate.length,
        successCount,
        errorCount: errors.length,
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined
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
