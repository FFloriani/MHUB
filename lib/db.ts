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

export class StudyDatabase extends Dexie {
    files!: Table<LocalFile>;
    playerSettings!: Table<PlayerSetting>;
    annotations!: Table<Annotation>;

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
    }
}

export const db = new StudyDatabase();
