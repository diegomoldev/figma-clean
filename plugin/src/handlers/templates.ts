import { Command, CommandResponse } from '../types';

// Helper to create a button component/frame
async function createButtonTemplate(props: any): Promise<FrameNode> {
  const button = figma.createFrame();
  button.name = props.name || 'Button';

  button.layoutMode = 'HORIZONTAL';
  button.primaryAxisAlignItems = 'CENTER';
  button.counterAxisAlignItems = 'CENTER';
  button.paddingLeft = props.paddingX || 24;
  button.paddingRight = props.paddingX || 24;
  button.paddingTop = props.paddingY || 12;
  button.paddingBottom = props.paddingY || 12;
  button.itemSpacing = 8;
  button.cornerRadius = props.cornerRadius || 8;

  button.fills = props.fills || [{ type: 'SOLID', color: { r: 0.2, g: 0.4, b: 0.8 } }] as Paint[];

  if (props.text) {
    const text = figma.createText();
    await figma.loadFontAsync(props.fontName || { family: 'Inter', style: 'Medium' });
    text.characters = props.text;
    text.fontSize = props.fontSize || 14;
    text.fontName = props.fontName || { family: 'Inter', style: 'Medium' };
    text.fills = props.textFills || [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }] as Paint[];
    button.appendChild(text);
  }

  if (props.x !== undefined) button.x = props.x;
  if (props.y !== undefined) button.y = props.y;

  return button;
}

// Helper to create a card component/frame
async function createCardTemplate(props: any): Promise<FrameNode> {
  const card = figma.createFrame();
  card.name = props.name || 'Card';

  card.layoutMode = 'VERTICAL';
  card.primaryAxisSizingMode = 'AUTO';
  card.counterAxisSizingMode = 'FIXED';
  card.resize(props.width || 320, props.height || 400);
  card.paddingLeft = props.padding || 24;
  card.paddingRight = props.padding || 24;
  card.paddingTop = props.padding || 24;
  card.paddingBottom = props.padding || 24;
  card.itemSpacing = props.itemSpacing || 16;
  card.cornerRadius = props.cornerRadius || 12;

  card.fills = props.fills || [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }] as Paint[];
  card.strokes = props.strokes || [{ type: 'SOLID', color: { r: 0.89, g: 0.89, b: 0.91 } }] as Paint[];
  card.strokeWeight = 1;

  card.effects = props.effects || [{
    type: 'DROP_SHADOW',
    color: { r: 0, g: 0, b: 0, a: 0.1 },
    offset: { x: 0, y: 4 },
    radius: 12,
    visible: true,
    blendMode: 'NORMAL'
  }] as Effect[];

  if (props.title) {
    const title = figma.createText();
    await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });
    title.characters = props.title;
    title.fontSize = 20;
    title.fontName = { family: 'Inter', style: 'Bold' };
    title.fills = [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 } }] as Paint[];
    card.appendChild(title);
  }

  if (props.description) {
    const desc = figma.createText();
    await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
    desc.characters = props.description;
    desc.fontSize = 14;
    desc.fontName = { family: 'Inter', style: 'Regular' };
    desc.fills = [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }] as Paint[];
    desc.layoutGrow = 1;
    card.appendChild(desc);
  }

  if (props.x !== undefined) card.x = props.x;
  if (props.y !== undefined) card.y = props.y;

  return card;
}

// 1. create-page-structure: Create full page hierarchy
export async function handleCreatePageStructure(msg: Command): Promise<CommandResponse> {
  try {
    const { name, structure } = msg.payload;

    const page = figma.createFrame();
    page.name = name || 'Page';
    page.layoutMode = 'VERTICAL';
    page.primaryAxisSizingMode = 'AUTO';
    page.counterAxisSizingMode = 'FIXED';
    page.resize(1440, 3000);
    page.fills = [{ type: 'SOLID', color: { r: 0.98, g: 0.98, b: 0.98 } }] as Paint[];

    if (structure && structure.sections) {
      for (const section of structure.sections) {
        const sectionFrame = figma.createFrame();
        sectionFrame.name = section.name || 'Section';
        sectionFrame.layoutMode = section.layoutMode || 'VERTICAL';
        sectionFrame.resize(1440, section.height || 600);
        sectionFrame.paddingLeft = section.padding || 80;
        sectionFrame.paddingRight = section.padding || 80;
        sectionFrame.paddingTop = section.padding || 80;
        sectionFrame.paddingBottom = section.padding || 80;
        sectionFrame.itemSpacing = section.itemSpacing || 40;
        sectionFrame.fills = section.fills || [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }] as Paint[];

        if (section.title) {
          const title = figma.createText();
          await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });
          title.characters = section.title;
          title.fontSize = 48;
          title.fontName = { family: 'Inter', style: 'Bold' };
          title.fills = [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 } }] as Paint[];
          sectionFrame.appendChild(title);
        }

        if (section.subtitle) {
          const subtitle = figma.createText();
          await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
          subtitle.characters = section.subtitle;
          subtitle.fontSize = 18;
          subtitle.fontName = { family: 'Inter', style: 'Regular' };
          subtitle.fills = [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }] as Paint[];
          sectionFrame.appendChild(subtitle);
        }

        page.appendChild(sectionFrame);
      }
    }

    figma.currentPage.appendChild(page);

    return {
      id: msg.id,
      success: true,
      data: { pageId: page.id, name: page.name, type: page.type }
    };
  } catch (error) {
    return { id: msg.id, success: false, error: String(error) };
  }
}

// 2. create-button: Create pre-configured button
export async function handleCreateButton(msg: Command): Promise<CommandResponse> {
  try {
    const button = await createButtonTemplate(msg.payload);

    if (msg.payload.parent) {
      const parent = figma.getNodeById(msg.payload.parent);
      if (parent && 'appendChild' in parent) {
        (parent as FrameNode).appendChild(button);
      } else {
        figma.currentPage.appendChild(button);
      }
    } else {
      figma.currentPage.appendChild(button);
    }

    return {
      id: msg.id,
      success: true,
      data: { buttonId: button.id, name: button.name, type: button.type }
    };
  } catch (error) {
    return { id: msg.id, success: false, error: String(error) };
  }
}

// 3. create-card: Create pre-configured card
export async function handleCreateCard(msg: Command): Promise<CommandResponse> {
  try {
    const card = await createCardTemplate(msg.payload);

    if (msg.payload.parent) {
      const parent = figma.getNodeById(msg.payload.parent);
      if (parent && 'appendChild' in parent) {
        (parent as FrameNode).appendChild(card);
      } else {
        figma.currentPage.appendChild(card);
      }
    } else {
      figma.currentPage.appendChild(card);
    }

    return {
      id: msg.id,
      success: true,
      data: { cardId: card.id, name: card.name, type: card.type }
    };
  } catch (error) {
    return { id: msg.id, success: false, error: String(error) };
  }
}
