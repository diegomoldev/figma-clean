import { Command, CommandResponse } from '../types';

export async function handleSyncStyles(msg: Command): Promise<CommandResponse> {
  const payload = msg.payload;

  if (payload.paintStyles) {
    for (const styleData of payload.paintStyles) {
      let style = figma.getLocalPaintStyles().find((s) => s.name === styleData.name);
      if (!style) {
        style = figma.createPaintStyle();
        style.name = styleData.name;
      }
      if (styleData.description) {
        style.description = styleData.description;
      }
      style.paints = styleData.paints as Paint[];
    }
  }

  if (payload.textStyles) {
    for (const styleData of payload.textStyles) {
      let style = figma.getLocalTextStyles().find((s) => s.name === styleData.name);
      if (!style) {
        style = figma.createTextStyle();
        style.name = styleData.name;
      }
      if (styleData.description) {
        style.description = styleData.description;
      }
      if (styleData.fontSize !== undefined) {
        style.fontSize = styleData.fontSize;
      }
      if (styleData.fontName) {
        await figma.loadFontAsync(styleData.fontName as FontName);
        style.fontName = styleData.fontName as FontName;
      }
      if (styleData.textDecoration) {
        style.textDecoration = styleData.textDecoration;
      }
      if (styleData.letterSpacing) {
        style.letterSpacing = styleData.letterSpacing as LetterSpacing;
      }
      if (styleData.lineHeight) {
        style.lineHeight = styleData.lineHeight as LineHeight;
      }
      if (styleData.paragraphIndent !== undefined) {
        style.paragraphIndent = styleData.paragraphIndent;
      }
      if (styleData.paragraphSpacing !== undefined) {
        style.paragraphSpacing = styleData.paragraphSpacing;
      }
      if (styleData.textCase) {
        style.textCase = styleData.textCase;
      }
    }
  }

  if (payload.effectStyles) {
    for (const styleData of payload.effectStyles) {
      let style = figma.getLocalEffectStyles().find((s) => s.name === styleData.name);
      if (!style) {
        style = figma.createEffectStyle();
        style.name = styleData.name;
      }
      if (styleData.description) {
        style.description = styleData.description;
      }
      style.effects = styleData.effects as Effect[];
    }
  }

  if (payload.gridStyles) {
    for (const styleData of payload.gridStyles) {
      let style = figma.getLocalGridStyles().find((s) => s.name === styleData.name);
      if (!style) {
        style = figma.createGridStyle();
        style.name = styleData.name;
      }
      if (styleData.description) {
        style.description = styleData.description;
      }
      style.layoutGrids = styleData.layoutGrids as LayoutGrid[];
    }
  }

  return {
    id: msg.id,
    success: true,
  };
}

export async function handleReadStyles(msg: Command): Promise<CommandResponse> {
  const { responseMode = 'full' } = msg.payload || {};

  const paintStyles = figma.getLocalPaintStyles();
  const textStyles = figma.getLocalTextStyles();
  const effectStyles = figma.getLocalEffectStyles();
  const gridStyles = figma.getLocalGridStyles();

  let data: any;

  switch (responseMode) {
    case 'ids-only':
      data = {
        paintStyleKeys: paintStyles.map(s => s.key),
        textStyleKeys: textStyles.map(s => s.key),
        effectStyleKeys: effectStyles.map(s => s.key),
        gridStyleKeys: gridStyles.map(s => s.key),
        counts: {
          paintStyles: paintStyles.length,
          textStyles: textStyles.length,
          effectStyles: effectStyles.length,
          gridStyles: gridStyles.length,
          total: paintStyles.length + textStyles.length + effectStyles.length + gridStyles.length
        }
      };
      break;

    case 'minimal':
      data = {
        paintStyles: paintStyles.map(s => ({ key: s.key, name: s.name, type: 'PAINT' })),
        textStyles: textStyles.map(s => ({ key: s.key, name: s.name, type: 'TEXT' })),
        effectStyles: effectStyles.map(s => ({ key: s.key, name: s.name, type: 'EFFECT' })),
        gridStyles: gridStyles.map(s => ({ key: s.key, name: s.name, type: 'GRID' })),
        counts: {
          paintStyles: paintStyles.length,
          textStyles: textStyles.length,
          effectStyles: effectStyles.length,
          gridStyles: gridStyles.length,
          total: paintStyles.length + textStyles.length + effectStyles.length + gridStyles.length
        }
      };
      break;

    case 'full':
    default:
      data = {
        paintStyles: paintStyles.map((s) => ({
          key: s.key,
          name: s.name,
          description: s.description,
          paints: [...s.paints],
        })),
        textStyles: textStyles.map((s) => ({
          key: s.key,
          name: s.name,
          description: s.description,
          fontSize: s.fontSize,
          fontName: s.fontName,
          textDecoration: s.textDecoration,
          letterSpacing: s.letterSpacing,
          lineHeight: s.lineHeight.unit === 'AUTO' ? { value: 0, unit: 'AUTO' as const } : s.lineHeight,
          paragraphIndent: s.paragraphIndent,
          paragraphSpacing: s.paragraphSpacing,
          textCase: s.textCase,
        })),
        effectStyles: effectStyles.map((s) => ({
          key: s.key,
          name: s.name,
          description: s.description,
          effects: [...s.effects],
        })),
        gridStyles: gridStyles.map((s) => ({
          key: s.key,
          name: s.name,
          description: s.description,
          layoutGrids: [...s.layoutGrids],
        })),
      };
      break;
  }

  return {
    id: msg.id,
    success: true,
    data,
  };
}
