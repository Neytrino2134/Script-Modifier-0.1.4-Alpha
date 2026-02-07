
export interface TranscriptionSegment {
    startTime: string;
    endTime: string;
    text: string;
}

export interface TranscriberData {
    audioBase64: string | null;
    mimeType: string | null;
    transcription: string;
    segments: TranscriptionSegment[];
    fileName: string | null;
    model?: string; // Added model field
}

export interface Mp3File {
    file: File;
    name: string;
    tags: {
        title: string;
        artist: string;
        album: string;
        year: string;
        genre: string;
        prompt: string;
        trackNumber: string;
        cover?: {
            data: ArrayBuffer;
            mimeType: string;
        };
    };
    id: string;
    isChecked?: boolean;
    isDuplicate?: boolean;
    fingerprint?: string;
}
