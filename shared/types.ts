export type CommandType =
  | 'sync-variables'
  | 'sync-styles'
  | 'sync-components'
  | 'sync-layout'
  | 'read-variables'
  | 'read-styles'
  | 'read-components'
  | 'read-layout';

export interface Command {
  id: string;
  type: CommandType;
  payload: unknown;
}

export interface CommandResponse {
  id: string;
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface VariableMode {
  name: string;
}

export interface VariableValue {
  [modeName: string]: RGB | number | string | boolean;
}

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface RGBA extends RGB {
  a: number;
}

export interface Variable {
  name: string;
  type: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';
  values: VariableValue;
  description?: string;
  scopes?: VariableScope[];
}

export type VariableScope =
  | 'ALL_SCOPES'
  | 'ALL_FILLS'
  | 'FRAME_FILL'
  | 'SHAPE_FILL'
  | 'TEXT_FILL'
  | 'STROKE_COLOR'
  | 'EFFECT_COLOR'
  | 'WIDTH_HEIGHT'
  | 'GAP'
  | 'CORNER_RADIUS'
  | 'TEXT_CONTENT'
  | 'FONT_FAMILY'
  | 'FONT_STYLE'
  | 'FONT_WEIGHT'
  | 'FONT_SIZE'
  | 'LINE_HEIGHT'
  | 'LETTER_SPACING'
  | 'PARAGRAPH_SPACING'
  | 'PARAGRAPH_INDENT';

export interface VariableCollection {
  name: string;
  modes: VariableMode[];
  variables: Variable[];
  hiddenFromPublishing?: boolean;
}

export interface SyncVariablesPayload {
  collection: VariableCollection;
}

export interface PaintStyle {
  name: string;
  description?: string;
  paints: Paint[];
}

export interface Paint {
  type: 'SOLID' | 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'GRADIENT_ANGULAR' | 'GRADIENT_DIAMOND' | 'IMAGE';
  visible?: boolean;
  opacity?: number;
  color?: RGB;
  blendMode?: BlendMode;
}

export type BlendMode =
  | 'NORMAL'
  | 'DARKEN'
  | 'MULTIPLY'
  | 'LINEAR_BURN'
  | 'COLOR_BURN'
  | 'LIGHTEN'
  | 'SCREEN'
  | 'LINEAR_DODGE'
  | 'COLOR_DODGE'
  | 'OVERLAY'
  | 'SOFT_LIGHT'
  | 'HARD_LIGHT'
  | 'DIFFERENCE'
  | 'EXCLUSION'
  | 'HUE'
  | 'SATURATION'
  | 'COLOR'
  | 'LUMINOSITY';

export interface TextStyle {
  name: string;
  description?: string;
  fontSize?: number;
  fontName?: FontName;
  textDecoration?: 'NONE' | 'UNDERLINE' | 'STRIKETHROUGH';
  letterSpacing?: LetterSpacing;
  lineHeight?: LineHeight;
  paragraphIndent?: number;
  paragraphSpacing?: number;
  textCase?: 'ORIGINAL' | 'UPPER' | 'LOWER' | 'TITLE' | 'SMALL_CAPS' | 'SMALL_CAPS_FORCED';
}

export interface FontName {
  family: string;
  style: string;
}

export interface LetterSpacing {
  value: number;
  unit: 'PIXELS' | 'PERCENT';
}

export interface LineHeight {
  value: number;
  unit: 'PIXELS' | 'PERCENT' | 'AUTO';
}

export interface EffectStyle {
  name: string;
  description?: string;
  effects: Effect[];
}

export interface Effect {
  type: 'DROP_SHADOW' | 'INNER_SHADOW' | 'LAYER_BLUR' | 'BACKGROUND_BLUR';
  visible?: boolean;
  radius?: number;
  color?: RGBA;
  offset?: { x: number; y: number };
  spread?: number;
  blendMode?: BlendMode;
}

export interface GridStyle {
  name: string;
  description?: string;
  layoutGrids: LayoutGrid[];
}

export interface LayoutGrid {
  pattern: 'COLUMNS' | 'ROWS' | 'GRID';
  sectionSize?: number;
  visible?: boolean;
  color?: RGBA;
  alignment?: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH';
  gutterSize?: number;
  offset?: number;
  count?: number;
}

export interface SyncStylesPayload {
  paintStyles?: PaintStyle[];
  textStyles?: TextStyle[];
  effectStyles?: EffectStyle[];
  gridStyles?: GridStyle[];
}

export interface ReadVariablesResponse {
  collections: VariableCollection[];
}

export interface ReadStylesResponse {
  paintStyles: PaintStyle[];
  textStyles: TextStyle[];
  effectStyles: EffectStyle[];
  gridStyles: GridStyle[];
}
