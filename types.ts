
import React from 'react';

export enum NodeType {
  TEXT_INPUT = 'TEXT_INPUT',
  PROMPT_PROCESSOR = 'PROMPT_PROCESSOR',
  PROMPT_ANALYZER = 'PROMPT_ANALYZER',
  CHARACTER_ANALYZER = 'CHARACTER_ANALYZER',
  CHARACTER_GENERATOR = 'CHARACTER_GENERATOR',
  IMAGE_GENERATOR = 'IMAGE_GENERATOR',
  IMAGE_PREVIEW = 'IMAGE_PREVIEW',
  CHARACTER_CARD = 'CHARACTER_CARD',
  GEMINI_CHAT = 'GEMINI_CHAT',
  PROMPT_MODIFIER = 'PROMPT_MODIFIER',
  TRANSLATOR = 'TRANSLATOR',
  SCRIPT_GENERATOR = 'SCRIPT_GENERATOR',
  SCRIPT_ANALYZER = 'SCRIPT_ANALYZER',
  SCRIPT_PROMPT_MODIFIER = 'SCRIPT_PROMPT_MODIFIER',
  ERROR_ANALYZER = 'ERROR_ANALYZER',
  NOTE = 'NOTE',
  IDEA_GENERATOR = 'IDEA_GENERATOR',
  REROUTE_DOT = 'REROUTE_DOT',
  DATA_READER = 'DATA_READER',
  SPEECH_SYNTHESIZER = 'SPEECH_SYNTHESIZER',
  NARRATOR_TEXT_GENERATOR = 'NARRATOR_TEXT_GENERATOR',
  AUDIO_TRANSCRIBER = 'AUDIO_TRANSCRIBER',
  YOUTUBE_TITLE_GENERATOR = 'YOUTUBE_TITLE_GENERATOR',
  MUSIC_IDEA_GENERATOR = 'MUSIC_IDEA_GENERATOR',
  YOUTUBE_ANALYTICS = 'YOUTUBE_ANALYTICS',
  IMAGE_EDITOR = 'IMAGE_EDITOR', // Added for potential future use
}

export type Tool = 'edit' | 'cutter' | 'selection' | 'reroute' | 'zoom';
export type LineStyle = 'spaghetti' | 'orthogonal';

export interface Point {
  x: number;
  y: number;
}

export interface Node {
  id: string;
  type: NodeType;
  position: Point;
  title: string;
  value: string; // For text inputs, processed prompt, or JSON for analyzer
  width: number;
  height: number;
  isCollapsed?: boolean;
  areOutputHandlesHidden?: boolean;
}

export interface Connection {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  fromHandleId?: string;
  toHandleId?: string;
  fromPointOffset?: Point;
}

export interface Group {
  id: string;
  title: string;
  position: Point;
  width: number;
  height: number;
  nodeIds: string[];
}

export interface ConnectingInfo {
  fromNodeId: string;
  fromPoint: Point;
  fromHandleId?: string;
  fromType: 'text' | 'image' | null;
}

// New types for the Prompt Library
export enum LibraryItemType {
  FOLDER = 'FOLDER',
  PROMPT = 'PROMPT',
}

export enum CatalogItemType {
  FOLDER = 'FOLDER',
  GROUP = 'GROUP',
  CHARACTERS = 'CHARACTERS',
  SCRIPT = 'SCRIPT',
  ANALYSIS = 'ANALYSIS',
  FINAL_PROMPTS = 'FINAL_PROMPTS',
  YOUTUBE = 'YOUTUBE',
  MUSIC = 'MUSIC',
}

export interface CatalogItem {
  id: string;
  type: CatalogItemType;
  name: string;
  parentId: string | null;
  category?: string; // To distinguish folders between different tabs (groups, characters, etc.)
  nodes?: Node[]; // For GROUPS
  connections?: Connection[]; // For GROUPS
  data?: any; // For other types (Character arrays, Script scenes, etc.)
  driveFileId?: string; // ID файла в Google Drive для синхронизации
}

export interface LibraryItem {
  id: string;
  type: LibraryItemType;
  name: string;
  parentId: string | null;
  content?: string; // Only for prompts
}

// A subset of NodeViewProps that all content components will receive
export interface NodeContentProps {
  node: Node;
  onValueChange: (nodeId: string, value: string) => void;
  onEnhance: (nodeId: string) => void;
  isEnhancing: boolean;
  onAnalyze: (nodeId: string) => void;
  isAnalyzing: boolean;
  onAnalyzeCharacter: (nodeId: string) => void;
  isAnalyzingCharacter: boolean;
  onExecuteChain: (nodeId: string) => void;
  onExecuteFullChain?: (nodeId: string) => void;
  isExecutingChain: boolean;
  onStopGeneration: () => void;
  isStopping: boolean;
  onSendMessage: (nodeId: string) => void;
  isChatting: string | null;
  onTranslate: (nodeId: string) => void;
  isTranslating: string | null;
  onFixErrors: (nodeId: string) => void;
  isFixingErrors: string | null;
  onReadData: (nodeId: string) => void;
  isReadingData: string | null;
  connectedInputs?: Set<string | undefined>;
  libraryItems: LibraryItem[];
  t: (key: string, options?: { [key: string]: string | number }) => string;
  deselectAllNodes: () => void;
  onProcessChainForward: (nodeId: string) => void;
  onGenerateScript: (nodeId: string) => void;
  isGeneratingScript: string | null;
  onGenerateEntities: (nodeId: string) => void;
  isGeneratingEntities: string | null;
  onModifyScriptPart: (nodeId: string, partId: string, originalText: string, modificationPrompt: string) => Promise<void> | void;
  onModifyAnalyzerFramePart: (nodeId: string, frameNumber: number, partKey: string, modificationPrompt: string) => Promise<void> | void;
  isModifyingScriptPart: string | null;
  handleCursor: string;
  onOutputHandleMouseDown: (e: React.MouseEvent<HTMLDivElement>, nodeId: string, handleId?: string, isSubNode?: boolean, subNodePosition?: Point) => void;
  onOutputHandleTouchStart: (e: React.TouchEvent<HTMLDivElement>, nodeId: string, handleId?: string, isSubNode?: boolean, subNodePosition?: Point) => void;
  onAnalyzeScript: (nodeId: string) => void;
  isAnalyzingScript: string | null;
  onGenerateCharacters: (nodeId: string) => void;
  isGeneratingCharacters: string | null;
  onGenerateImage: (nodeId: string, characterId?: number | string) => void;
  isGeneratingImage: string | null;
  onGenerateCharacterImage: (nodeId: string, characterId: string) => void;
  isGeneratingCharacterImage: string | null;
  onApplyAliases: (nodeId: string) => void;
  onDetachCharacter: (characterData: any, generatorNode: Node) => void;
  clearSelectionsSignal: number;
  onModifyScriptPrompts: (nodeId: string) => void;
  isModifyingScriptPrompts: string | null;
  nodes?: Node[];
  connections?: Connection[];
  onRemoveConnection?: (connectionId: string) => void;
  getUpstreamTextValue?: (nodeId: string, handleId: string | undefined) => string;
  addToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  onGenerateSpeech: (nodeId: string) => void;
  isGeneratingSpeech: string | null;
  onGenerateIdeaCategories: (nodeId: string) => void;
  isGeneratingIdeaCategories: boolean;
  onCombineStoryIdea: (nodeId: string) => void;
  isCombiningStoryIdea: boolean;
  onGenerateNarratorText: (nodeId: string) => void;
  isGeneratingNarratorText: string | null;
  // Added onTranscribeAudio and isTranscribingAudio to support AudioTranscriberNode
  onTranscribeAudio: (nodeId: string) => void;
  isTranscribingAudio: boolean;
  onGenerateYouTubeTitles: (nodeId: string) => void;
  isGeneratingYouTubeTitles: boolean;
  onGenerateYouTubeChannelInfo: (nodeId: string) => void;
  isGeneratingYouTubeChannelInfo: boolean;
  onGenerateMusicIdeas: (nodeId: string) => void;
  isGeneratingMusicIdeas: boolean;
  onExtractTextFromImage: (nodeId: string) => void;
  isExtractingText: boolean;
  onAnalyzeYouTubeStats: (nodeId: string) => void;
  isAnalyzingYouTubeStats: boolean;
  saveDataToCatalog: (nodeId: string, type: CatalogItemType, name: string) => void;
  onRenameNode: (nodeId: string, currentTitle: string) => void;
  onImproveScriptConcept: (nodeId: string, currentConcept: string) => void;
  isImprovingScriptConcept: boolean;
  inputData: string;
  // Image handling props
  onSaveCharacterCard: (nodeId: string) => void;
  onLoadCharacterCard: (nodeId: string) => void;
  onSaveCharacterToCatalog: (nodeId: string) => void;
  setFullSizeImage: (nodeId: string, slotIndex: number, imageBase64: string) => void;
  getFullSizeImage: (nodeId: string, slotIndex: number) => string | null;
  setImageViewer: (data: { sources: {src: string, frameNumber: number, prompt?: string}[], initialIndex: number } | null) => void;
  onCopyImageToClipboard: (base64: string) => void;
  onDownloadImage: (base64: string, filename: string) => void;
  onUpdateCharacterDescription?: (nodeId: string, charIndex: number) => void;
  isUpdatingDescription?: string | null;
  onModifyCharacter?: (nodeId: string, charIndex: number, request: string) => void;
  isModifyingCharacter?: string | null;
  getUpstreamNodeValues?: (nodeId: string) => any[];
  onAddNode?: (type: NodeType, position: Point) => string;
  onDeleteNode?: (nodeId: string) => void;
}

export interface TabState {
  id: string;
  name: string;
  nodes: Node[];
  connections: Connection[];
  groups: Group[];
  viewTransform: { scale: number; translate: Point };
  nodeIdCounter: number;
}
