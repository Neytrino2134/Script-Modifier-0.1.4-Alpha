
import { Node, NodeType } from '../types';

export const HEADER_HEIGHT = 40;
export const CONTENT_PADDING = 12;
export const NODE_WIDTH_STEP = 460;

export const RATIO_INDICES: Record<string, number> = { '1:1': 1, '16:9': 2, '9:16': 3 };

export const getOutputHandleType = (node: Node, handleId?: string): 'text' | 'image' | null => {
    switch (node.type) {
        case NodeType.TEXT_INPUT:
        case NodeType.PROMPT_PROCESSOR:
        case NodeType.TRANSLATOR:
        case NodeType.PROMPT_ANALYZER:
        case NodeType.CHARACTER_ANALYZER:
        case NodeType.CHARACTER_GENERATOR:
        case NodeType.SCRIPT_GENERATOR:
        case NodeType.SCRIPT_ANALYZER:
        case NodeType.SCRIPT_PROMPT_MODIFIER:
        case NodeType.ERROR_ANALYZER:
        case NodeType.CHARACTER_CARD:
        case NodeType.NARRATOR_TEXT_GENERATOR:
        case NodeType.IDEA_GENERATOR:
        case NodeType.AUDIO_TRANSCRIBER:
        case NodeType.YOUTUBE_TITLE_GENERATOR:
        case NodeType.MUSIC_IDEA_GENERATOR:
        case NodeType.YOUTUBE_ANALYTICS:
            return 'text';
        case NodeType.IMAGE_GENERATOR:
            return 'image';
        case NodeType.REROUTE_DOT:
            try {
                const parsed = JSON.parse(node.value || '{}');
                return parsed.type || null;
            } catch {
                return null;
            }
        default: return null;
    }
};

export const getInputHandleType = (node: Node, handleId?: string): 'text' | 'image' | null => {
    switch (node.type) {
        case NodeType.PROMPT_PROCESSOR:
        case NodeType.TRANSLATOR:
        case NodeType.PROMPT_ANALYZER:
        case NodeType.CHARACTER_ANALYZER:
        case NodeType.CHARACTER_GENERATOR:
        case NodeType.IMAGE_GENERATOR:
        case NodeType.SCRIPT_GENERATOR:
        case NodeType.SCRIPT_ANALYZER:
        case NodeType.SCRIPT_PROMPT_MODIFIER:
        case NodeType.ERROR_ANALYZER:
        case NodeType.DATA_READER:
        case NodeType.SPEECH_SYNTHESIZER:
        case NodeType.NARRATOR_TEXT_GENERATOR:
        case NodeType.YOUTUBE_TITLE_GENERATOR:
        case NodeType.MUSIC_IDEA_GENERATOR:
        case NodeType.YOUTUBE_ANALYTICS:
            return 'text';
        case NodeType.IMAGE_PREVIEW:
            return 'image';
        case NodeType.REROUTE_DOT: return null; // Accepts any, handled by connection logic
        default: return null;
    }
};