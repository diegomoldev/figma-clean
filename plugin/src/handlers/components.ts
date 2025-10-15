import { Command, CommandResponse } from '../types';

import { getComponentByKey } from './nodes/helpers';

// 1. sync-component: Create or update component
export async function handleSyncComponent(msg: Command): Promise<CommandResponse> {
  try {
    const { id, name, sourceNodeId, ...props } = msg.payload;
    let component: ComponentNode | null = null;

    if (id) {
      const node = figma.getNodeById(id);
      if (node && node.type === 'COMPONENT') {
        component = node as ComponentNode;
      } else {
        return { id: msg.id, success: false, error: `Component with id '${id}' not found` };
      }
    } else if (sourceNodeId) {
      const sourceNode = figma.getNodeById(sourceNodeId);
      if (!sourceNode) {
        return { id: msg.id, success: false, error: `Source node with id '${sourceNodeId}' not found` };
      }
      component = figma.createComponentFromNode(sourceNode as SceneNode);
      if (name) component.name = name;
    } else if (name) {
      const existing = figma.currentPage.findOne((n) => n.type === 'COMPONENT' && n.name === name);
      if (existing) {
        component = existing as ComponentNode;
      } else {
        component = figma.createComponent();
        component.name = name;
        figma.currentPage.appendChild(component);
      }
    } else {
      component = figma.createComponent();
      figma.currentPage.appendChild(component);
    }

    if (props.description !== undefined) component.description = props.description;
    if (props.x !== undefined) component.x = props.x;
    if (props.y !== undefined) component.y = props.y;
    if (props.width !== undefined && props.height !== undefined) {
      component.resize(props.width, props.height);
    }
    if (props.fills !== undefined) component.fills = props.fills as Paint[];
    if (props.strokes !== undefined) component.strokes = props.strokes as Paint[];
    if (props.cornerRadius !== undefined) component.cornerRadius = props.cornerRadius;
    if (props.layoutMode !== undefined) component.layoutMode = props.layoutMode;
    if (props.paddingLeft !== undefined) component.paddingLeft = props.paddingLeft;
    if (props.paddingRight !== undefined) component.paddingRight = props.paddingRight;
    if (props.paddingTop !== undefined) component.paddingTop = props.paddingTop;
    if (props.paddingBottom !== undefined) component.paddingBottom = props.paddingBottom;
    if (props.itemSpacing !== undefined) component.itemSpacing = props.itemSpacing;

    return {
      id: msg.id,
      success: true,
      data: {
        componentId: component.id,
        name: component.name,
        key: component.key,
        type: component.type
      }
    };
  } catch (error) {
    return { id: msg.id, success: false, error: String(error) };
  }
}

// 2. sync-instance: Create instance from component
export async function handleSyncInstance(msg: Command): Promise<CommandResponse> {
  try {
    const { componentId, componentName, componentKey, ...props } = msg.payload;
    let component: ComponentNode | null = null;

    if (componentId) {
      const node = figma.getNodeById(componentId);
      if (node && node.type === 'COMPONENT') {
        component = node as ComponentNode;
      }
    } else if (componentName) {
      const found = figma.currentPage.findOne((n) => n.type === 'COMPONENT' && n.name === componentName);
      if (found) component = found as ComponentNode;
    } else if (componentKey) {
      component = getComponentByKey(componentKey);
    }

    if (!component) {
      return { id: msg.id, success: false, error: 'Component not found' };
    }

    const instance = component.createInstance();

    if (props.name !== undefined) instance.name = props.name;
    if (props.x !== undefined) instance.x = props.x;
    if (props.y !== undefined) instance.y = props.y;
    if (props.width !== undefined && props.height !== undefined) {
      instance.resize(props.width, props.height);
    }

    if (props.parent) {
      const parentNode = figma.getNodeById(props.parent);
      if (parentNode && 'appendChild' in parentNode) {
        (parentNode as FrameNode).appendChild(instance);
      }
    } else {
      figma.currentPage.appendChild(instance);
    }

    return {
      id: msg.id,
      success: true,
      data: {
        instanceId: instance.id,
        name: instance.name,
        componentId: component.id,
        type: instance.type
      }
    };
  } catch (error) {
    return { id: msg.id, success: false, error: String(error) };
  }
}

// 3. read-components: Read all local components
export async function handleReadComponents(msg: Command): Promise<CommandResponse> {
  try {
    const { responseMode = 'full' } = msg.payload || {};
    const components = figma.currentPage.findAll((n) => n.type === 'COMPONENT') as ComponentNode[];

    let data: any;

    switch (responseMode) {
      case 'ids-only':
        data = {
          ids: components.map(c => c.id),
          keys: components.map(c => c.key),
          count: components.length
        };
        break;

      case 'minimal':
        data = {
          components: components.map(c => ({
            id: c.id,
            key: c.key,
            name: c.name,
            type: c.type,
            width: c.width,
            height: c.height
          })),
          count: components.length
        };
        break;

      case 'full':
      default:
        data = {
          components: components.map((comp) => ({
            id: comp.id,
            key: comp.key,
            name: comp.name,
            description: comp.description,
            x: comp.x,
            y: comp.y,
            width: comp.width,
            height: comp.height,
            fills: [...(comp.fills as Paint[])],
            strokes: [...(comp.strokes as Paint[])],
            cornerRadius: comp.cornerRadius,
            layoutMode: comp.layoutMode
          })),
          count: components.length
        };
        break;
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

// 4. create-from-svg: Create node from SVG string
export async function handleCreateFromSvg(msg: Command): Promise<CommandResponse> {
  try {
    const { svg, name, x, y, parent } = msg.payload;

    if (!svg) {
      return { id: msg.id, success: false, error: 'SVG string is required' };
    }

    const node = figma.createNodeFromSvg(svg);

    if (name) node.name = name;
    if (x !== undefined) node.x = x;
    if (y !== undefined) node.y = y;

    if (parent) {
      const parentNode = figma.getNodeById(parent);
      if (parentNode && 'appendChild' in parentNode) {
        (parentNode as FrameNode).appendChild(node);
      }
    } else {
      figma.currentPage.appendChild(node);
    }

    return {
      id: msg.id,
      success: true,
      data: {
        nodeId: node.id,
        name: node.name,
        type: node.type,
        width: node.width,
        height: node.height
      }
    };
  } catch (error) {
    return { id: msg.id, success: false, error: String(error) };
  }
}

// 5. create-component-set: Create component set with variants
export async function handleCreateComponentSet(msg: Command): Promise<CommandResponse> {
  try {
    const { name, x, y, variants } = msg.payload;

    if (!variants || !Array.isArray(variants) || variants.length === 0) {
      return { id: msg.id, success: false, error: 'Variants array is required' };
    }

    const components: ComponentNode[] = [];
    const spacing = 100;
    let currentX = x || 0;
    const currentY = y || 0;

    for (const variant of variants) {
      const { name: variantName, svg, properties } = variant;

      let component: ComponentNode;

      if (svg) {
        const svgNode = figma.createNodeFromSvg(svg);
        component = figma.createComponentFromNode(svgNode);
        svgNode.remove();
      } else {
        component = figma.createComponent();
        component.resize(24, 24);
      }

      component.name = variantName || 'Component';
      component.x = currentX;
      component.y = currentY;

      if (properties) {
        for (const [key, value] of Object.entries(properties)) {
          try {
            component.addComponentProperty(key, 'VARIANT', value as string);
          } catch (e) {
            console.error(`Failed to add property ${key}:`, e);
          }
        }
      }

      figma.currentPage.appendChild(component);
      components.push(component);
      currentX += component.width + spacing;
    }

    const componentSet = figma.combineAsVariants(components, figma.currentPage);

    if (name) {
      componentSet.name = name;
    }

    return {
      id: msg.id,
      success: true,
      data: {
        componentSetId: componentSet.id,
        name: componentSet.name,
        componentCount: components.length,
        components: components.map(c => ({
          id: c.id,
          name: c.name,
          key: c.key
        }))
      }
    };
  } catch (error) {
    return { id: msg.id, success: false, error: String(error) };
  }
}

// 6. add-component-property: Add property to component
export async function handleAddComponentProperty(msg: Command): Promise<CommandResponse> {
  try {
    const { componentId, propertyName, propertyType, defaultValue, variantOptions } = msg.payload;

    if (!componentId) {
      return { id: msg.id, success: false, error: 'componentId is required' };
    }

    const node = figma.getNodeById(componentId);
    if (!node || node.type !== 'COMPONENT') {
      return { id: msg.id, success: false, error: 'Component not found' };
    }

    const component = node as ComponentNode;

    component.addComponentProperty(propertyName, propertyType || 'VARIANT', defaultValue || '');

    return {
      id: msg.id,
      success: true,
      data: {
        componentId: component.id,
        propertyName,
        properties: component.componentPropertyDefinitions
      }
    };
  } catch (error) {
    return { id: msg.id, success: false, error: String(error) };
  }
}

// 7. convert-to-component: Convert node to component
export async function handleConvertToComponent(msg: Command): Promise<CommandResponse> {
  try {
    const { nodeId, name } = msg.payload;

    if (!nodeId) {
      return { id: msg.id, success: false, error: 'nodeId is required' };
    }

    const node = figma.getNodeById(nodeId);
    if (!node || !('type' in node)) {
      return { id: msg.id, success: false, error: 'Node not found' };
    }

    const component = figma.createComponentFromNode(node as SceneNode);

    if (name) {
      component.name = name;
    }

    return {
      id: msg.id,
      success: true,
      data: {
        componentId: component.id,
        name: component.name,
        key: component.key,
        type: component.type
      }
    };
  } catch (error) {
    return { id: msg.id, success: false, error: String(error) };
  }
}

// 8. rename-component-property: Rename variant property in component set
export async function handleRenameComponentProperty(msg: Command): Promise<CommandResponse> {
  try {
    const { componentSetId, oldName, newName } = msg.payload;

    if (!componentSetId || !oldName || !newName) {
      return { id: msg.id, success: false, error: 'componentSetId, oldName, and newName are required' };
    }

    const node = figma.getNodeById(componentSetId);
    if (!node || node.type !== 'COMPONENT_SET') {
      return { id: msg.id, success: false, error: 'Component set not found' };
    }

    const componentSet = node as ComponentSetNode;

    const updatedPropertyName = componentSet.editComponentProperty(oldName, { name: newName });

    return {
      id: msg.id,
      success: true,
      data: {
        componentSetId: componentSet.id,
        oldPropertyName: oldName,
        newPropertyName: updatedPropertyName
      }
    };
  } catch (error) {
    return { id: msg.id, success: false, error: String(error) };
  }
}

// 9. add-variants-to-set: Add placeholder variants to existing component set
export async function handleAddVariantsToSet(msg: Command): Promise<CommandResponse> {
  try {
    const { componentSetId, count, variantNames } = msg.payload;

    if (!componentSetId) {
      return { id: msg.id, success: false, error: 'componentSetId is required' };
    }

    const node = figma.getNodeById(componentSetId);
    if (!node || node.type !== 'COMPONENT_SET') {
      return { id: msg.id, success: false, error: 'Component set not found' };
    }

    const componentSet = node as ComponentSetNode;

    if (componentSet.children.length === 0) {
      return { id: msg.id, success: false, error: 'Component set has no children to clone' };
    }

    const variantCount = count || 5;
    const baseComponent = componentSet.children[0] as ComponentNode;
    const newComponents: ComponentNode[] = [];

    for (let i = 0; i < variantCount; i++) {
      const clonedComponent = baseComponent.clone();

      if (variantNames && variantNames[i]) {
        clonedComponent.name = variantNames[i];
      } else {
        clonedComponent.name = `Variant${componentSet.children.length + i + 1}`;
      }

      componentSet.appendChild(clonedComponent);
      newComponents.push(clonedComponent);
    }

    return {
      id: msg.id,
      success: true,
      data: {
        componentSetId: componentSet.id,
        componentSetName: componentSet.name,
        addedCount: newComponents.length,
        totalVariants: componentSet.children.length,
        newVariants: newComponents.map(c => ({
          id: c.id,
          name: c.name,
          key: c.key
        }))
      }
    };
  } catch (error) {
    return { id: msg.id, success: false, error: String(error) };
  }
}

// 10. replace-component-content: Replace component children with SVG
export async function handleReplaceComponentContent(msg: Command): Promise<CommandResponse> {
  try {
    const { componentId, svg, targetSize, convertToStroke, strokeWidth } = msg.payload;

    if (!componentId || !svg) {
      return { id: msg.id, success: false, error: 'componentId and svg are required' };
    }

    const node = figma.getNodeById(componentId);
    if (!node || node.type !== 'COMPONENT') {
      return { id: msg.id, success: false, error: 'Component not found' };
    }

    const component = node as ComponentNode;
    const size = targetSize || 40;

    const svgNode = figma.createNodeFromSvg(svg);

    const originalWidth = svgNode.width;
    const originalHeight = svgNode.height;
    const scale = Math.min(size / originalWidth, size / originalHeight);

    svgNode.resize(originalWidth * scale, originalHeight * scale);

    svgNode.x = (size - svgNode.width) / 2;
    svgNode.y = (size - svgNode.height) / 2;

    function convertNodeToStroke(node: SceneNode, width: number) {
      if (node.type === 'VECTOR' || node.type === 'RECTANGLE' || node.type === 'ELLIPSE' || node.type === 'POLYGON' || node.type === 'STAR' || node.type === 'LINE') {
        node.fills = [];
        node.strokes = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
        node.strokeWeight = width;
        node.strokeAlign = 'CENTER';
      }
      if ('children' in node) {
        for (const child of node.children) {
          convertNodeToStroke(child, width);
        }
      }
    }

    if (convertToStroke) {
      const width = strokeWidth || 1.5;
      convertNodeToStroke(svgNode, width);
    }

    if (component.children.length > 0) {
      const firstChild = component.children[0];
      if (firstChild.type === 'FRAME' || firstChild.type === 'COMPONENT') {
        while (firstChild.children.length > 0) {
          firstChild.children[0].remove();
        }

        for (const child of svgNode.children) {
          const clonedChild = child.clone();
          firstChild.appendChild(clonedChild);
        }

        svgNode.remove();

        return {
          id: msg.id,
          success: true,
          data: {
            componentId: component.id,
            name: component.name,
            wrapperId: firstChild.id,
            childCount: firstChild.children.length
          }
        };
      }
    }

    while (component.children.length > 0) {
      component.children[0].remove();
    }

    const wrapper = figma.createFrame();
    wrapper.name = 'icon-wrapper';
    wrapper.resize(size, size);
    wrapper.fills = [];
    wrapper.clipsContent = false;

    for (const child of svgNode.children) {
      const clonedChild = child.clone();
      wrapper.appendChild(clonedChild);
    }

    component.appendChild(wrapper);
    svgNode.remove();

    component.resize(size, size);

    return {
      id: msg.id,
      success: true,
      data: {
        componentId: component.id,
        name: component.name,
        wrapperId: wrapper.id,
        childCount: wrapper.children.length
      }
    };
  } catch (error) {
    return { id: msg.id, success: false, error: String(error) };
  }
}
