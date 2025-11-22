
export enum ItemType {
  TEXT = 'TEXT',
  QR = 'QR',
  IMAGE = 'IMAGE'
}

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number; // mm
  height: number; // mm
}

export interface CanvasItem {
  id: string;
  type: ItemType;
  content: string; // Text content, QR data, or Base64 Image
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string; // 'normal' | 'italic'
  textDecoration?: string; // 'none' | 'underline'
  color?: string;
  textAlign?: 'left' | 'center' | 'right';
}

export interface TemplateField {
  name: string;
  label: string;
  targetItemId: string;
}

export interface LabelTemplate {
  id: string;
  name: string;
  folderId: string | null; // null means "All" or "Root" technically, but we usually force a folder
  width: number; // mm
  height: number; // mm
  items: CanvasItem[];
  createdAt: number;
  role?: 'draft' | 'filled';
  fields?: TemplateField[];
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null; // For nested folders
}

export interface PrintConfig {
  copies: number;
  pageWidth: number; // mm (e.g., 210 for A4)
  pageHeight: number; // mm (e.g., 297 for A4)
  marginTop: number; // mm
  marginLeft: number; // mm
  gapX: number; // mm
  gapY: number; // mm
}

export const MM_TO_PX = 3.78; // Approximation: 1mm ~= 3.78px at 96 DPI
