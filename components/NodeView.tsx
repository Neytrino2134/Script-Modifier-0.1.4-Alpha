
import React, { useMemo } from 'react';
import type { Node, Tool, ConnectingInfo, LibraryItem, Point, Connection, CatalogItemType } from '../types';
import { NodeType } from '../types';
import { useLanguage } from '../localization';
import {
  NoteNode,
  RerouteDotNode,
  TextInputNode,
  TranslatorNode,
  GeminiChatNode,
  PromptAnalyzerNode,
  CharacterAnalyzerNode,
  PromptProcessorNode,
  ScriptGeneratorNode,
  ErrorAnalyzerNode,
  ScriptAnalyzerNode,
  CharacterGeneratorNode,
  ScriptPromptModifierNode,
  ImageGeneratorNode,
  ImagePreviewNode,
  CharacterCardNode,
  DataReaderNode,
  SpeechSynthesizerNode,
  IdeaGeneratorNode,
  NarratorTextGeneratorNode,
  AudioTranscriberNode,
  YouTubeTitleGeneratorNode,
  MusicIdeaGeneratorNode,
  YouTubeAnalyticsNode,
} from './nodes';
import NodeHeader from './NodeHeader';
import NodeResizer from './NodeResizer';
import { InputHandles, OutputHandles } from './handles';
import { getInputHandleType } from '../utils/nodeUtils';


interface NodeViewProps {
  node: Node;
  nodes: Node[];
  connections: Connection[];
  removeConnectionById: (connectionId: string) => void;
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>, nodeId: string) => void;
  onTouchStart: (e: React.TouchEvent<HTMLDivElement>, nodeId: string) => void;
  onResizeMouseDown: (e: React.MouseEvent<HTMLDivElement>, nodeId: string) => void;
  onResizeTouchStart: (e: React.TouchEvent<HTMLDivElement>, nodeId: string) => void;
  onValueChange: (nodeId: string, value: string) => void;
  onEnhance: (nodeId: string) => void;
  isEnhancing: string | null;
  onAnalyze: (nodeId: string) => void;
  isAnalyzing: string | null;
  onAnalyzeCharacter: (nodeId: string) => void;
  isAnalyzingCharacter: string | null;
  onExecuteChain: (nodeId: string) => void;
  onExecuteFullChain: (nodeId: string) => void;
  isExecutingChain: boolean;
  isExecuting: boolean;
  onStopGeneration: () => void;
  stoppingNodes: Set<string>;
  activeTool: Tool;
  onOutputHandleMouseDown: (e: React.MouseEvent<HTMLDivElement>, nodeId: string, handleId?: string, isSubNode?: boolean, subNodePosition?: Point) => void;
  onOutputHandleTouchStart: (e: React.TouchEvent<HTMLDivElement>, nodeId: string, handleId?: string, isSubNode?: boolean, subNodePosition?: Point) => void;
  onNodeClick: (nodeId: string) => void;
  isHovered: boolean;
  isSelected: boolean;
  isGrouped: boolean;
  onNodeMouseEnter: (nodeId: string) => void;
  onNodeMouseLeave: () => void;
  onDeleteNode: (nodeId: string) => void;
  onCutConnections: (nodeId: string) => void;
  onCopyNodeValue: (nodeId: string) => void;
  onPasteNodeValue: (nodeId: string) => Promise<void>;
  onDuplicateNode: (nodeId: string) => void;
  onDuplicateNodeEmpty: (nodeId: string) => void;
  onNodeDoubleClick: (nodeId: string) => void;
  onSendMessage: (nodeId: string) => void;
  isChatting: string | null;
  onTranslate: (nodeId: string) => void;
  isTranslating: string | null;
  onFixErrors: (nodeId: string) => void;
  isFixingErrors: string | null;
  onReadData: (nodeId: string) => void;
  isReadingData: string | null;
  onGenerateScript: (nodeId: string) => void;
  isGeneratingScript: string | null;
  onGenerateEntities: (nodeId: string) => void;
  isGeneratingEntities: string | null;
  onModifyScriptPart: (nodeId: string, partId: string, originalText: string, modificationPrompt: string) => Promise<void> | void;
  onModifyAnalyzerFramePart: (nodeId: string, frameNumber: number, partKey: string, modificationPrompt: string) => Promise<void> | void;
  isModifyingScriptPart: string | null;
  onAnalyzeScript: (nodeId: string) => void;
  isAnalyzingScript: string | null;
  onGenerateCharacters: (nodeId: string) => void;
  isGeneratingCharacters: string | null;
  onGenerateImage: (nodeId: string, characterId?: number | string) => void;
  isGeneratingImage: string | null;
  onGenerateCharacterImage: (nodeId: string, characterId: string) => void;
  isGeneratingCharacterImage: string | null;
  onModifyScriptPrompts: (nodeId: string) => void;
  isModifyingScriptPrompts: string | null;
  onApplyAliases: (nodeId: string) => void;
  onDetachCharacter: (characterData: any, generatorNode: Node) => void;
  connectingInfo: ConnectingInfo | null;
  connectionTarget: { nodeId: string; handleId?: string | undefined; } | null;
  libraryItems: LibraryItem[];
  deselectAllNodes: () => void;
  isDragOverTarget?: boolean;
  onAddNodeFromMenu?: (type: NodeType) => void;
  onProcessChainForward: (nodeId: string) => void;
  connectedInputs?: Set<string | undefined>;
  lastAddedNodeId?: string | null;
  clearSelectionsSignal: number;
  getUpstreamTextValue: (nodeId: string, handleId: string | undefined) => string;
  addToast: (message: string, type?: 'success' | 'info') => void;
  onGenerateSpeech: (nodeId: string) => void;
  isGeneratingSpeech: string | null;
  onGenerateIdeaCategories: (nodeId: string) => void;
  isGeneratingIdeaCategories: string | null;
  onCombineStoryIdea: (nodeId: string) => void;
  isCombiningStoryIdea: string | null;
  onGenerateNarratorText: (nodeId: string) => void;
  isGeneratingNarratorText: string | null;
  onTranscribeAudio: (nodeId: string) => void;
  isTranscribingAudio: string | null;
  onGenerateYouTubeTitles: (nodeId: string) => void;
  isGeneratingYouTubeTitles: string | null;
  onGenerateYouTubeChannelInfo: (nodeId: string) => void;
  isGeneratingYouTubeChannelInfo: string | null;
  onGenerateMusicIdeas: (nodeId: string) => void;
  isGeneratingMusicIdeas: string | null;
  onExtractTextFromImage: (nodeId: string) => void;
  isExtractingText: string | null;
  onAnalyzeYouTubeStats: (nodeId: string) => void;
  isAnalyzingYouTubeStats: string | null;
  saveDataToCatalog: (nodeId: string, type: CatalogItemType, name: string) => void;
  onRenameNode: (nodeId: string, currentTitle: string) => void;
  onImproveScriptConcept: (nodeId: string, currentConcept: string) => void;
  isImprovingScriptConcept: string | null;
  inputData: string; // Reactive data
  // Image handling props
  onSaveCharacterCard: (nodeId: string) => void;
  onLoadCharacterCard: (nodeId: string) => void;
  onSaveCharacterToCatalog: (nodeId: string) => void;
  setFullSizeImage: (nodeId: string, slotIndex: number, imageBase64: string) => void;
  getFullSizeImage: (nodeId: string, slotIndex: number) => string | null;
  setImageViewer: (data: { sources: {src: string, frameNumber: number}[], initialIndex: number } | null) => void;
  onCopyImageToClipboard: (base64: string) => void;
  onDownloadImage: (base64: string, filename: string) => void;
  onUpdateCharacterDescription?: (nodeId: string, charIndex: number) => void;
  isUpdatingDescription?: string | null;
  onModifyCharacter?: (nodeId: string, charIndex: number, request: string) => void;
  isModifyingCharacter?: string | null;
  getUpstreamNodeValues?: (nodeId: string) => any[];
  onAddNode?: (type: NodeType, position: Point) => string;
  onDownloadChat: (nodeId: string) => void;
}


const HEADER_HEIGHT = 40;

const NodeView: React.FC<NodeViewProps> = (props) => {
  const { 
    node, onMouseDown, onTouchStart, onResizeMouseDown, onResizeTouchStart, activeTool, 
    onOutputHandleMouseDown, onOutputHandleTouchStart, onNodeClick, isHovered, isSelected, isGrouped,
    onNodeMouseEnter, onNodeMouseLeave, onDeleteNode, onCutConnections, onCopyNodeValue, 
    onPasteNodeValue, onValueChange, onReadData, connectingInfo, connectionTarget, 
    lastAddedNodeId, isExecuting, isDragOverTarget, addToast, onDuplicateNode,
    onNodeDoubleClick, onDuplicateNodeEmpty, onRenameNode, inputData,
    onSaveCharacterCard, onLoadCharacterCard, onSaveCharacterToCatalog, setFullSizeImage, getFullSizeImage,
    setImageViewer, onCopyImageToClipboard, onDownloadImage, onUpdateCharacterDescription, isUpdatingDescription,
    onModifyCharacter, isModifyingCharacter, getUpstreamNodeValues, onAddNode, onDownloadChat
  } = props;
  const { t } = useLanguage();
  const isRerouteDot = node.type === NodeType.REROUTE_DOT;
  
  const rerouteType = useMemo(() => {
    if (!isRerouteDot) return null;
    try {
        const parsed = JSON.parse(node.value || '{}');
        return parsed.type || null;
    } catch {
        return null;
    }
  }, [isRerouteDot, node.value]);

  const minSize = useMemo(() => {
    switch (node.type) {
        case NodeType.TEXT_INPUT: return { minWidth: 460, minHeight: 280 };
        case NodeType.PROMPT_PROCESSOR: return { minWidth: 460, minHeight: 280 };
        case NodeType.PROMPT_ANALYZER: return { minWidth: 460, minHeight: 1000 };
        case NodeType.CHARACTER_ANALYZER: return { minWidth: 460, minHeight: 500 };
        case NodeType.CHARACTER_GENERATOR: return { minWidth: 680, minHeight: 800 };
        case NodeType.IMAGE_GENERATOR: return { minWidth: 400, minHeight: 520 };
        case NodeType.IMAGE_PREVIEW: return { minWidth: 300, minHeight: 400 };
        case NodeType.CHARACTER_CARD: return { minWidth: 460, minHeight: 1000 };
        case NodeType.GEMINI_CHAT: return { minWidth: 400, minHeight: 640 };
        case NodeType.TRANSLATOR: return { minWidth: 380, minHeight: 640 };
        case NodeType.SCRIPT_GENERATOR: return { minWidth: 680, minHeight: 800 };
        case NodeType.SCRIPT_ANALYZER: return { minWidth: 680, minHeight: 800 };
        case NodeType.SCRIPT_PROMPT_MODIFIER: return { minWidth: 680, minHeight: 800 };
        case NodeType.ERROR_ANALYZER: return { minWidth: 380, minHeight: 280 };
        case NodeType.DATA_READER: return { minWidth: 380, minHeight: 280 };
        case NodeType.NOTE: return { minWidth: 440, minHeight: 640 };
        case NodeType.SPEECH_SYNTHESIZER: return { minWidth: 680, minHeight: 800 };
        case NodeType.NARRATOR_TEXT_GENERATOR: return { minWidth: 680, minHeight: 800 };
        case NodeType.IDEA_GENERATOR: return { minWidth: 680, minHeight: 800 };
        case NodeType.AUDIO_TRANSCRIBER: return { minWidth: 400, minHeight: 480 };
        case NodeType.YOUTUBE_TITLE_GENERATOR: return { minWidth: 680, minHeight: 800 };
        case NodeType.MUSIC_IDEA_GENERATOR: return { minWidth: 680, minHeight: 800 };
        case NodeType.YOUTUBE_ANALYTICS: return { minWidth: 1200, minHeight: 800 };
        case NodeType.REROUTE_DOT: return { minWidth: 60, minHeight: 40 };
        default: return { minWidth: 200, minHeight: 150 };
    }
  }, [node.type]);

  const handleDragMouseDown = (e: React.MouseEvent<HTMLDivElement>) => onMouseDown(e, node.id);
  const handleDragTouchStart = (e: React.TouchEvent<HTMLDivElement>) => onTouchStart(e, node.id);
  
  const handleNodeClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool === 'cutter') { e.stopPropagation(); e.preventDefault(); onNodeClick(node.id); }
  };

  const handleCursor = activeTool === 'edit' ? 'crosshair' : 'inherit';
  
  const renderContent = () => {
    const contentProps = { 
        ...props, 
        nodes: props.nodes,
        connections: props.connections,
        t, 
        handleCursor,
        isEnhancing: props.isEnhancing === node.id,
        isAnalyzing: props.isAnalyzing === node.id,
        isAnalyzingCharacter: props.isAnalyzingCharacter === node.id,
        isStopping: props.stoppingNodes.has(node.id),
        onRemoveConnection: props.removeConnectionById,
        getUpstreamTextValue: props.getUpstreamTextValue,
        addToast: props.addToast,
        isGeneratingIdeaCategories: props.isGeneratingIdeaCategories === node.id,
        isCombiningStoryIdea: props.isCombiningStoryIdea === node.id,
        isTranscribingAudio: props.isTranscribingAudio === node.id,
        isGeneratingYouTubeTitles: props.isGeneratingYouTubeTitles === node.id,
        isGeneratingYouTubeChannelInfo: props.isGeneratingYouTubeChannelInfo === node.id,
        isGeneratingMusicIdeas: props.isGeneratingMusicIdeas === node.id,
        isExtractingText: props.isExtractingText === node.id,
        isAnalyzingYouTubeStats: props.isAnalyzingYouTubeStats === node.id,
        isImprovingScriptConcept: props.isImprovingScriptConcept === node.id,
        // Ensure isGeneratingEntities remains a string | null matching NodeContentProps
        isGeneratingEntities: props.isGeneratingEntities === node.id ? props.isGeneratingEntities : null,
        inputData: inputData,
        // Pass Image props down
        onSaveCharacterCard,
        onLoadCharacterCard,
        onSaveCharacterToCatalog,
        setFullSizeImage,
        getFullSizeImage,
        setImageViewer,
        onCopyImageToClipboard,
        onDownloadImage,
        onUpdateCharacterDescription,
        isUpdatingDescription: props.isUpdatingDescription === node.id ? props.isUpdatingDescription : null,
        onModifyCharacter,
        isModifyingCharacter: props.isModifyingCharacter === node.id ? props.isModifyingCharacter : null,
        getUpstreamNodeValues,
        onAddNode,
        onDeleteNode
    };
    switch (node.type) {
        case NodeType.REROUTE_DOT: return <RerouteDotNode {...contentProps} />;
        case NodeType.NOTE: return <NoteNode {...contentProps} />;
        case NodeType.TRANSLATOR: return <TranslatorNode {...contentProps} />;
        case NodeType.GEMINI_CHAT: return <GeminiChatNode {...contentProps} />;
        case NodeType.SCRIPT_GENERATOR: return <ScriptGeneratorNode {...contentProps} />;
        case NodeType.SCRIPT_ANALYZER: return <ScriptAnalyzerNode {...contentProps} />;
        case NodeType.SCRIPT_PROMPT_MODIFIER: return <ScriptPromptModifierNode {...contentProps} />;
        case NodeType.CHARACTER_GENERATOR: return <CharacterGeneratorNode {...contentProps} />;
        case NodeType.CHARACTER_CARD: return <CharacterCardNode {...contentProps} />;
        case NodeType.IMAGE_GENERATOR: return <ImageGeneratorNode {...contentProps} />;
        case NodeType.IMAGE_PREVIEW: return <ImagePreviewNode {...contentProps} />;
        case NodeType.ERROR_ANALYZER: return <ErrorAnalyzerNode {...contentProps} />;
        case NodeType.DATA_READER: return <DataReaderNode {...contentProps} />;
        case NodeType.SPEECH_SYNTHESIZER: return <SpeechSynthesizerNode {...contentProps} />;
        case NodeType.NARRATOR_TEXT_GENERATOR: return <NarratorTextGeneratorNode {...contentProps} />;
        case NodeType.IDEA_GENERATOR: return <IdeaGeneratorNode {...contentProps} />;
        case NodeType.AUDIO_TRANSCRIBER: return <AudioTranscriberNode {...contentProps} />;
        case NodeType.YOUTUBE_TITLE_GENERATOR: return <YouTubeTitleGeneratorNode {...contentProps} />;
        case NodeType.MUSIC_IDEA_GENERATOR: return <MusicIdeaGeneratorNode {...contentProps} />;
        case NodeType.YOUTUBE_ANALYTICS: return <YouTubeAnalyticsNode {...contentProps} />;
        case NodeType.TEXT_INPUT: return <TextInputNode {...contentProps} />;
        case NodeType.PROMPT_ANALYZER: return <PromptAnalyzerNode {...contentProps} />;
        case NodeType.CHARACTER_ANALYZER: return <CharacterAnalyzerNode {...contentProps} />;
        case NodeType.PROMPT_PROCESSOR: return <PromptProcessorNode {...contentProps} />;
        default: return null;
    }
  };
  
  const isConnectionTarget = connectionTarget?.nodeId === node.id;
  let borderColorClass = 'border-gray-700';

    if (isDragOverTarget) {
      borderColorClass = 'border-emerald-400';
    } else if (isConnectionTarget) {
      borderColorClass = 'border-green-400';
    } else if (isExecuting) {
      borderColorClass = 'border-yellow-500';
    } else if (isSelected) {
      borderColorClass = 'border-emerald-400';
    } else if (isRerouteDot) {
      if (rerouteType === 'text') borderColorClass = 'border-emerald-500';
      else if (rerouteType === 'image') borderColorClass = 'border-cyan-500';
    }

  const nodeCursor = activeTool === 'cutter' ? `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="%23ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18"></path><path d="M6 6l12 12"></path></svg>') 12 12, auto` : 'default';
  const bgClass = isRerouteDot 
    ? (rerouteType === 'text' ? 'bg-emerald-900/30' : rerouteType === 'image' ? 'bg-cyan-900/30' : 'bg-gray-600')
    : (node.type === NodeType.NOTE ? 'bg-gray-900/70 backdrop-blur-sm' : 'bg-gray-800');
    
  const getHandleColor = (type: 'text' | 'image' | null, handleId?: string): string => {
    let finalType = type;
    if (isRerouteDot) finalType = rerouteType;
    let color: string;
    if (finalType === 'text') color = 'bg-emerald-400';
    else if (finalType === 'image') color = 'bg-cyan-400';
    else color = 'bg-gray-400';

    if (!connectingInfo || (!isHovered && !isRerouteDot)) return color;
    if (isConnectionTarget) {
        if (node.type === NodeType.REROUTE_DOT) return 'bg-green-500';
        if (connectingInfo!.fromType === getInputHandleType(node, handleId)) return 'bg-green-500';
    }
    if (isHovered) return 'bg-red-500 cursor-not-allowed';
    return color;
  };

  const isNewlyAdded = node.id === lastAddedNodeId;
  const nodeBaseClasses = "absolute flex flex-col transition-colors duration-200 pointer-events-auto";
  const nodeShapeClasses = "rounded-lg";

  const contentPaddingClass = 'p-3';

  // Determine Z-Index
  // Selected nodes are highest (50).
  // Free nodes are middle (20).
  // Grouped nodes are lower (6), just above Group Background (5).
  // Note: Dragging items are usually handled by the container (1000), but basic z-index is here.
  const zIndex = isSelected ? 50 : (isGrouped ? 6 : 20);

  return (
    <div
      className={`${nodeBaseClasses} ${bgClass} ${nodeShapeClasses} ${isNewlyAdded ? 'node-newly-added' : ''} ${isRerouteDot ? 'cursor-move' : ''}`}
      style={{
        // Using raw coordinates (no rounding) to prevent jitter during zoom/pan
        // Added backface-visibility to help with rendering edge cases
        transform: `translate3d(${node.position.x}px, ${node.position.y}px, 0)`,
        width: node.width, height: node.isCollapsed ? `${HEADER_HEIGHT}px` : node.height,
        minWidth: isRerouteDot ? undefined : `${minSize.minWidth}px`, minHeight: node.isCollapsed ? `${HEADER_HEIGHT}px` : (isRerouteDot ? undefined : `${minSize.minHeight}px`),
        zIndex: zIndex, 
        cursor: nodeCursor,
        backfaceVisibility: 'hidden',
      }}
      onClick={handleNodeClick} onMouseEnter={() => onNodeMouseEnter(node.id)} onMouseLeave={onNodeMouseLeave} onMouseDown={isRerouteDot ? handleDragMouseDown : undefined} onTouchStart={isRerouteDot ? handleDragTouchStart : undefined}
      onContextMenu={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <div
        className={`absolute inset-0 border-2 ${borderColorClass} rounded-lg pointer-events-none`}
        style={{ zIndex: 12 }}
      />
      <NodeHeader 
        node={node}
        t={t}
        addToast={addToast}
        onMouseDown={handleDragMouseDown}
        onTouchStart={handleDragTouchStart}
        onNodeDoubleClick={onNodeDoubleClick}
        onValueChange={onValueChange}
        onReadData={onReadData}
        onPasteNodeValue={onPasteNodeValue}
        onCopyNodeValue={onCopyNodeValue}
        onCutConnections={onCutConnections}
        onDeleteNode={onDeleteNode}
        onDuplicateNode={onDuplicateNode}
        onDuplicateNodeEmpty={onDuplicateNodeEmpty}
        onRenameNode={onRenameNode}
        onDownloadChat={onDownloadChat}
      />
      {!isRerouteDot && !node.isCollapsed && <div className={`${contentPaddingClass} flex-grow min-h-0`}>{renderContent()}</div>}
      
      <InputHandles node={node} getHandleColor={getHandleColor} handleCursor={handleCursor} t={t} isHovered={isHovered} isCollapsed={node.isCollapsed} />
      <OutputHandles 
        node={node} 
        getHandleColor={getHandleColor} 
        handleCursor={handleCursor} 
        t={t} 
        isHovered={isHovered} 
        isCollapsed={node.isCollapsed}
        onOutputHandleMouseDown={onOutputHandleMouseDown}
        onOutputHandleTouchStart={onOutputHandleTouchStart}
      />
      
      {!isRerouteDot && !node.isCollapsed && <NodeResizer onResizeMouseDown={(e) => onResizeMouseDown(e, node.id)} onResizeTouchStart={(e) => onResizeTouchStart(e, node.id)} />}
    </div>
  );
};

// Custom comparison to avoid re-rendering all nodes when one node moves.
function arePropsEqual(prev: NodeViewProps, next: NodeViewProps) {
    if (prev.node !== next.node) return false; // Position, size, or internal data changed
    if (prev.isSelected !== next.isSelected) return false;
    if (prev.isGrouped !== next.isGrouped) return false; // Check group status
    if (prev.isHovered !== next.isHovered) return false;
    if (prev.isExecuting !== next.isExecuting) return false;
    if (prev.isEnhancing !== next.isEnhancing) return false;
    if (prev.isAnalyzing !== next.isAnalyzing) return false;
    if (prev.isAnalyzingCharacter !== next.isAnalyzingCharacter) return false;
    if (prev.isExecutingChain !== next.isExecutingChain) return false;
    if (prev.isChatting !== next.isChatting) return false;
    if (prev.isTranslating !== next.isTranslating) return false;
    if (prev.isFixingErrors !== next.isFixingErrors) return false;
    if (prev.isReadingData !== next.isReadingData) return false;
    if (prev.isGeneratingScript !== next.isGeneratingScript) return false;
    if (prev.isGeneratingEntities !== next.isGeneratingEntities) return false;
    if (prev.isModifyingScriptPart !== next.isModifyingScriptPart) return false;
    if (prev.isAnalyzingScript !== next.isAnalyzingScript) return false;
    if (prev.isGeneratingCharacters !== next.isGeneratingCharacters) return false;
    if (prev.isGeneratingImage !== next.isGeneratingImage) return false;
    if (prev.isGeneratingCharacterImage !== next.isGeneratingCharacterImage) return false;
    if (prev.isModifyingScriptPrompts !== next.isModifyingScriptPrompts) return false;
    if (prev.isGeneratingSpeech !== next.isGeneratingSpeech) return false;
    if (prev.isGeneratingIdeaCategories !== next.isGeneratingIdeaCategories) return false;
    if (prev.isCombiningStoryIdea !== next.isCombiningStoryIdea) return false;
    if (prev.isGeneratingNarratorText !== next.isGeneratingNarratorText) return false;
    if (prev.isTranscribingAudio !== next.isTranscribingAudio) return false;
    if (prev.isGeneratingYouTubeTitles !== next.isGeneratingYouTubeTitles) return false;
    if (prev.isGeneratingYouTubeChannelInfo !== next.isGeneratingYouTubeChannelInfo) return false;
    if (prev.isGeneratingMusicIdeas !== next.isGeneratingMusicIdeas) return false;
    if (prev.isExtractingText !== next.isExtractingText) return false;
    if (prev.isAnalyzingYouTubeStats !== next.isAnalyzingYouTubeStats) return false;
    if (prev.isImprovingScriptConcept !== next.isImprovingScriptConcept) return false;
    if (prev.isUpdatingDescription !== next.isUpdatingDescription) return false;
    if (prev.isModifyingCharacter !== next.isModifyingCharacter) return false;
    
    // Critical Change: Re-render if upstream input data changes
    if (prev.inputData !== next.inputData) return false;
    
    if (prev.activeTool !== next.activeTool) return false;
    if (prev.connections !== next.connections) return false;
    if (prev.connectionTarget !== next.connectionTarget) return false;
    if (prev.isDragOverTarget !== next.isDragOverTarget) return false;
    if (prev.connectingInfo !== next.connectingInfo) return false;
    if (prev.lastAddedNodeId !== next.lastAddedNodeId) return false;
    if (prev.clearSelectionsSignal !== next.clearSelectionsSignal) return false;

    return true;
}

export default React.memo(NodeView, arePropsEqual);
