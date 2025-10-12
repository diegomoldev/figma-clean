import { Command, CommandResponse } from '../types';

// 1. sync-component: Create or update component
export async function handleSyncComponent(msg: Command): Promise<CommandResponse> {
  try {
    const { id, name, sourceNodeId, ...props } = msg.payload;
    let component: ComponentNode;

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
      component = figma.getComponentByKey(componentKey);
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
    const components = figma.currentPage.findAll((n) => n.type === 'COMPONENT') as ComponentNode[];

    const serialized = components.map((comp) => ({
      id: comp.id,
      key: comp.key,
      name: comp.name,
      description: comp.description,
      x: comp.x,
      y: comp.y,
      width: comp.width,
      height: comp.height,
      fills: [...comp.fills],
      strokes: [...comp.strokes],
      cornerRadius: comp.cornerRadius,
      layoutMode: comp.layoutMode
    }));

    return {
      id: msg.id,
      success: true,
      data: { components: serialized, count: serialized.length }
    };
  } catch (error) {
    return { id: msg.id, success: false, error: String(error) };
  }
}
