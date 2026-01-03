import Dexie, { type Table } from 'dexie';

export interface LocalFile {
    id?: number;
    subjectId: string; // Link to Supabase Subject ID
    file: Blob;
    name: string;
    type: string;
    size: number;
    lastReadPage: number;
    coverImage?: string; // DataURL or Blob
    createdAt: Date;
}

export interface PlayerSetting {
    subjectId: string; // Key
    lastPlayedLink?: string;
    volume: number;
}

export interface Annotation {
    id?: number;
    fileId: number; // Referência ao LocalFile.id
    page_number: number;
    quote: string;
    note: string;
    color: string;
    rects: Array<{ top: number; left: number; width: number; height: number }>;
    createdAt: Date;
}

export type ToolType = 'hand' | 'pen' | 'highlighter' | 'eraser'

export interface Stroke {
    id: string;                      // UUID
    tool: ToolType;
    color: string;                   // Hex color
    lineWidth: number;
    opacity: number;
    points: Array<{ x: number; y: number; pressure?: number }>;
    timestamp: Date;
}

export interface Shape {
    id: string;
    type: 'rectangle' | 'circle' | 'arrow' | 'line';
    color: string;
    lineWidth: number;
    fill?: string;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    timestamp: Date;
}

export interface TextBox {
    id: string;
    content: string;
    x: number;
    y: number;
    width: number;
    fontSize: number;
    fontFamily: string;
    color: string;
    backgroundColor?: string;
    timestamp: Date;
}

export interface PageAnnotations {
    id?: number;
    fileId: number;                  // Referência ao arquivo PDF
    pageNumber: number;              // Número da página
    strokes: Stroke[];               // Todos os traços desta página
    shapes: Shape[];                 // Todas as formas
    textBoxes: TextBox[];            // Todas as caixas de texto
    lastModified: Date;
}

export class StudyDatabase extends Dexie {
    files!: Table<LocalFile>;
    playerSettings!: Table<PlayerSetting>;
    annotations!: Table<Annotation>;
    pageAnnotations!: Table<PageAnnotations>;

    constructor() {
        super('MHubStudyDB');
        // Versão 1: Inicial
        this.version(1).stores({
            files: '++id, subjectId, name',
            playerSettings: 'subjectId'
        });

        // Versão 2: Adiciona Annotations
        this.version(2).stores({
            files: '++id, subjectId, name',
            playerSettings: 'subjectId',
            annotations: '++id, fileId, page_number' // Índices
        });

        // Versão 3: Adiciona Canvas Overlay Annotations
        this.version(3).stores({
            files: '++id, subjectId, name',
            playerSettings: 'subjectId',
            annotations: '++id, fileId, page_number',
            pageAnnotations: '++id, fileId, pageNumber'
        });
    }
}

export const db = new StudyDatabase();
