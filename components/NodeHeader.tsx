
import React from 'react';
import type { Node } from '../types';
import { NodeType, CatalogItemType } from '../types';
import { ActionButton } from './ActionButton';
import { useAppContext } from '../contexts/Context';
import Tooltip from './ui/Tooltip';
import { NODE_WIDTH_STEP } from '../utils/nodeUtils';

interface NodeHeaderProps {
    node: Node;
    t: (key: string, options?: { [key: string]: string | number }) => string;
    addToast: (message: string, type?: 'success' | 'info') => void;
    onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
    onTouchStart: (e: React.TouchEvent<HTMLDivElement>) => void;
    onNodeDoubleClick: (nodeId: string) => void;
    onValueChange: (nodeId: string, value: string) => void;
    onReadData: (nodeId: string) => void;
    onPasteNodeValue: (nodeId: string) => Promise<void>;
    onReadDataTrigger?: (nodeId: string) => void;
    onCopyNodeValue: (nodeId: string) => void;
    onAddNodeFromMenu?: (type: NodeType) => void;
    onCutConnections: (nodeId: string) => void;
    onDeleteNode: (nodeId: string) => void;
    onDuplicateNode: (nodeId: string) => void;
    onDuplicateNodeEmpty: (nodeId: string) => void;
    onRenameNode: (nodeId: string, currentTitle: string) => void;
}

const HEADER_HEIGHT = 40;

const NodeHeader: React.FC<NodeHeaderProps> = ({
    node, t, addToast, onMouseDown, onTouchStart, onNodeDoubleClick,
    onValueChange, onReadData, onPasteNodeValue, onCopyNodeValue, onCutConnections, onDeleteNode, onDuplicateNode, onDuplicateNodeEmpty, onRenameNode
}) => {
    const { saveDataToCatalog, handleToggleNodeOutputVisibility, setNodes } = useAppContext();
    const isRerouteDot = node.type === NodeType.REROUTE_DOT;

    const helpTexts: Record<NodeType, string> = {
        [NodeType.TEXT_INPUT]: t('node.help.text_input'),
        [NodeType.PROMPT_PROCESSOR]: t('node.help.prompt_processor'),
        [NodeType.PROMPT_ANALYZER]: t('node.help.prompt_analyzer'),
        [NodeType.CHARACTER_ANALYZER]: t('node.help.character_analyzer'),
        [NodeType.CHARACTER_GENERATOR]: t('node.help.character_generator'),
        [NodeType.IMAGE_GENERATOR]: t('node.help.image_generator'),
        [NodeType.IMAGE_PREVIEW]: t('node.help.image_preview'),
        [NodeType.CHARACTER_CARD]: t('node.help.character_card'),
        [NodeType.GEMINI_CHAT]: t('node.help.gemini_chat'),
        [NodeType.TRANSLATOR]: t('node.help.translator'),
        [NodeType.SCRIPT_GENERATOR]: t('node.help.script_generator'),
        [NodeType.SCRIPT_ANALYZER]: t('node.help.script_analyzer'),
        [NodeType.SCRIPT_PROMPT_MODIFIER]: t('node.help.script_prompt_modifier'),
        [NodeType.ERROR_ANALYZER]: t('node.help.error_analyzer'),
        [NodeType.NOTE]: t('node.help.note'),
        [NodeType.REROUTE_DOT]: t('node.help.reroute_dot'),
        [NodeType.DATA_READER]: t('node.help.data_reader'),
        [NodeType.SPEECH_SYNTHESIZER]: t('node.help.speech_synthesizer'),
        [NodeType.IDEA_GENERATOR]: t('node.help.idea_generator'),
        [NodeType.NARRATOR_TEXT_GENERATOR]: t('node.help.narrator_text_generator'),
        [NodeType.AUDIO_TRANSCRIBER]: t('node.help.audio_transcriber'),
        [NodeType.YOUTUBE_TITLE_GENERATOR]: t('node.help.youtube_title_generator'),
        [NodeType.MUSIC_IDEA_GENERATOR]: t('node.help.music_idea_generator'),
        [NodeType.YOUTUBE_ANALYTICS]: t('node.help.youtube_analytics'),
        [NodeType.IMAGE_EDITOR]: t('node.help.image_editor'),
    };
    
    const handleClear = () => {
        let currentValue = {};
        try {
            currentValue = JSON.parse(node.value || '{}');
        } catch {}

        let newValue: any;
        switch (node.type) {
            case NodeType.PROMPT_ANALYZER:
                newValue = { ...currentValue, environment: '', characters: [], action: '', style: '' };
                break;
            case NodeType.CHARACTER_ANALYZER:
                newValue = { ...currentValue, character: '', clothing: '' };
                break;
            case NodeType.CHARACTER_GENERATOR:
                newValue = { ...currentValue, prompt: '', characters: [], error: null };
                break;
            case NodeType.CHARACTER_CARD:
                // Reset to single empty card
                newValue = [{ 
                    id: `char-card-${Date.now()}`,
                    name: '', index: 'Entity-1', imageSources: {}, prompt: '', fullDescription: '',
                    selectedRatio: '1:1'
                }];
                break;
            case NodeType.GEMINI_CHAT:
                newValue = { messages: [], currentInput: '' };
                break;
            case NodeType.SCRIPT_GENERATOR:
                // Preserve settings, clear only content and the prompt
                newValue = { ...currentValue, prompt: '', summary: '', detailedCharacters: [], scenes: [], generatedStyle: '' };
                break;
            case NodeType.SCRIPT_ANALYZER:
                // Clear characters, scenes, and styles. Preserve options like model/language
                newValue = { ...currentValue, characters: [], scenes: [], visualStyle: '', generatedStyle: '', detailedCharacters: [] };
                break;
            case NodeType.SCRIPT_PROMPT_MODIFIER:
                // Explicitly clear usedCharacters, styleOverride, and sceneContexts as well
                newValue = { ...currentValue, finalPrompts: [], videoPrompts: [], generationProgress: null, usedCharacters: [], styleOverride: '', sceneContexts: {} };
                break;
            case NodeType.NARRATOR_TEXT_GENERATOR:
                newValue = { ...currentValue, prompt: '', generatedTexts: { ru: '', en: '' } };
                break;
            case NodeType.SPEECH_SYNTHESIZER:
                newValue = { ...currentValue, audioFiles: [] };
                break;
            case NodeType.IDEA_GENERATOR:
                newValue = { ...currentValue, theme: '', stage: 'initial', categories: null, selection: { action: null, place: null, obstacle: null }, generatedIdea: '' };
                break;
            case NodeType.YOUTUBE_ANALYTICS:
                newValue = { ...currentValue, channels: [{ id: 'default', name: 'Main Channel', videos: [], stats: [] }], activeChannelId: 'default', aiAdvice: '' };
                break;
            case NodeType.MUSIC_IDEA_GENERATOR:
                newValue = { ...currentValue, idea: '', generatedLyrics: {}, generatedMusicPrompts: {}, generatedTitles: {} };
                break;
            case NodeType.TEXT_INPUT:
            case NodeType.NOTE:
            case NodeType.ERROR_ANALYZER:
                onValueChange(node.id, '');
                addToast(t('toast.cleared'));
                if (onReadData) onReadData(node.id);
                return;
            default:
                onValueChange(node.id, JSON.stringify({}));
                addToast(t('toast.cleared'));
                if (onReadData) onReadData(node.id);
                return;
        }
        onValueChange(node.id, JSON.stringify(newValue));
        addToast(t('toast.cleared'));
        
        if (onReadData) {
            setTimeout(() => onReadData(node.id), 50);
        }
    };

    const handleAddCharacterCard = () => {
        try {
            let cards = JSON.parse(node.value || '[]');
            if (!Array.isArray(cards)) {
                 if (Object.keys(cards).length > 0) cards = [cards]; // Handle legacy single object
                 else cards = [];
            }

            let maxNameNum = 0;
            const nameRegex = /^New Entity\s*(\d*)$/i;
            cards.forEach((c: any) => {
                const match = (c.name || '').match(nameRegex);
                if (match) {
                    const num = match[1] ? parseInt(match[1], 10) : 1;
                    if (num > maxNameNum) maxNameNum = num;
                }
            });
            const nextName = `New Entity ${maxNameNum + 1}`;
            
            // Calculate next index based on Entity-N
            let maxIndexNum = 0;
            const indexRegex = /^(?:Entity|Character)-(\d+)$/i;
            cards.forEach((c: any) => {
                 const match = (c.index || '').match(indexRegex);
                 if (match) {
                     const num = parseInt(match[1], 10);
                     if (num > maxIndexNum) maxIndexNum = num;
                 }
            });
            const nextIndex = `Entity-${maxIndexNum + 1}`;

            const newCard = {
                id: `char-card-${Date.now()}`,
                name: nextName,
                index: nextIndex,
                image: null,
                imageSources: {},
                thumbnails: { '1:1': null, '16:9': null, '9:16': null }, 
                selectedRatio: '1:1', 
                prompt: '', 
                fullDescription: '',
                targetLanguage: 'en',
                isOutput: false,
                isDescriptionCollapsed: false,
                isImageCollapsed: false,
                additionalPrompt: "Full body character concept on a gray background"
            };

            const newCards = [...cards, newCard];
            onValueChange(node.id, JSON.stringify(newCards));
            
            setNodes(prev => prev.map(n => 
                n.id === node.id 
                ? { ...n, width: Math.max(460, newCards.length * NODE_WIDTH_STEP) } 
                : n
            ));
        } catch (e) {
            console.error("Failed to add character card:", e);
        }
    };

    const getCatalogType = (): CatalogItemType | null => {
        switch (node.type) {
            case NodeType.CHARACTER_GENERATOR: return CatalogItemType.CHARACTERS;
            case NodeType.CHARACTER_CARD: return CatalogItemType.CHARACTERS; 
            case NodeType.SCRIPT_GENERATOR: return CatalogItemType.SCRIPT;
            case NodeType.SCRIPT_ANALYZER: return CatalogItemType.ANALYSIS;
            case NodeType.SCRIPT_PROMPT_MODIFIER: return CatalogItemType.FINAL_PROMPTS;
            case NodeType.YOUTUBE_TITLE_GENERATOR: return CatalogItemType.YOUTUBE;
            case NodeType.YOUTUBE_ANALYTICS: return CatalogItemType.YOUTUBE; 
            case NodeType.MUSIC_IDEA_GENERATOR: return CatalogItemType.MUSIC;
            default: return null;
        }
    };

    const catalogType = getCatalogType();

    const handleSaveToCatalog = () => {
        if (!saveDataToCatalog || !catalogType) return;

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        
        const timestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        const autoName = `${node.title} (${timestamp})`;
        
        saveDataToCatalog(node.id, catalogType, autoName);
    };

    const headerBgClass = isRerouteDot ? 'bg-transparent' : (node.type === NodeType.NOTE ? 'bg-transparent border-b border-gray-700/50' : 'bg-gray-700');

    return (
        <div 
            className={`${headerBgClass} node-header text-white font-bold p-2 ${!isRerouteDot ? (node.isCollapsed ? 'rounded-lg' : 'rounded-t-lg') : ''} flex justify-between items-center ${!isRerouteDot ? 'cursor-move' : ''} flex-shrink-0`}
            onMouseDown={!isRerouteDot ? onMouseDown : undefined}
            onTouchStart={!isRerouteDot ? onTouchStart : undefined}
            onDoubleClick={(e) => { e.stopPropagation(); onNodeDoubleClick(node.id); }}
            style={{ height: isRerouteDot ? '100%' : `${HEADER_HEIGHT}px`, zIndex: 10 }}
        >
            {isRerouteDot ? (
                <div className="w-full h-full flex justify-center items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
                </div>
            ) : (
                <>
                    <div className="flex items-center space-x-1 min-w-0">
                        <ActionButton title={node.isCollapsed ? t('node.action.expand') : t('node.action.collapse')} onClick={() => onNodeDoubleClick(node.id)}>
                            {node.isCollapsed ? (<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>) : (<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>)}
                        </ActionButton>
                        <span className="truncate pr-2">{node.title}</span>
                    </div>
                    <div className="flex items-center space-x-1 flex-shrink-0">
                        {node.type === NodeType.SCRIPT_PROMPT_MODIFIER && (
                            <ActionButton 
                                title={node.areOutputHandlesHidden ? "Show Outputs" : "Hide Outputs"} 
                                onClick={() => handleToggleNodeOutputVisibility(node.id)}
                            >
                                {node.areOutputHandlesHidden ? (
                                    // Eye Off (Hidden state -> click to show)
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                    </svg>
                                ) : (
                                     // Eye Open (Visible state -> click to hide)
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                )}
                            </ActionButton>
                        )}
                    
                        <Tooltip 
                            title={helpTexts[node.type as keyof typeof helpTexts] || 'No help available.'} 
                            position="top" 
                            contentClassName="w-56 whitespace-normal text-left leading-relaxed"
                        >
                            <button 
                                onMouseDown={(e) => e.stopPropagation()} 
                                className="p-1 text-gray-400 rounded hover:bg-gray-600 hover:text-white transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-emerald-500" 
                                aria-label={t('node.action.help')}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </button>
                        </Tooltip>
                        
                        <ActionButton title={t('node.action.rename')} onClick={() => onRenameNode(node.id, node.title)}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </ActionButton>
                        
                        {node.type === NodeType.CHARACTER_CARD && (
                            <ActionButton title={t('node.action.addCharacter')} onClick={handleAddCharacterCard}>
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                            </ActionButton>
                        )}

                        {catalogType && (
                            <ActionButton title={t('group.saveToCatalog')} onClick={handleSaveToCatalog}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1-4l-3 3-3-3m3 3V3" />
                                </svg>
                            </ActionButton>
                        )}
                        {(node.type === NodeType.SCRIPT_GENERATOR || node.type === NodeType.SCRIPT_ANALYZER || node.type === NodeType.SCRIPT_PROMPT_MODIFIER || node.type === NodeType.YOUTUBE_ANALYTICS || node.type === NodeType.YOUTUBE_TITLE_GENERATOR || node.type === NodeType.CHARACTER_CARD || node.type === NodeType.MUSIC_IDEA_GENERATOR) && (
                            <ActionButton title={t('catalog.card.save')} onClick={() => {
                                try {
                                    const rawData = JSON.parse(node.value || '{}');
                                    let typeString = '';
                                    let filename = 'data.json';
                                    let dataToSave: any = rawData;

                                    const now = new Date();
                                    const year = now.getFullYear();
                                    const month = String(now.getMonth() + 1).padStart(2, '0');
                                    const day = String(now.getDate()).padStart(2, '0');
                                    const hours = String(now.getHours()).padStart(2, '0');
                                    const minutes = String(now.getMinutes()).padStart(2, '0');
                                    const seconds = String(now.getSeconds()).padStart(2, '0');
                                    const timestamp = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;

                                    if (node.type === NodeType.SCRIPT_GENERATOR) {
                                        typeString = 'script-generator-data';
                                        filename = `script_generated_${timestamp}.json`;
                                    } else if (node.type === NodeType.SCRIPT_ANALYZER) {
                                        typeString = 'script-analyzer-data';
                                        filename = `script_analysis_${timestamp}.json`;
                                    } else if (node.type === NodeType.SCRIPT_PROMPT_MODIFIER) {
                                        typeString = 'script-prompt-modifier-data';
                                        filename = `final_prompts_${timestamp}.json`;
                                        // Ensure sceneContexts are saved
                                        dataToSave = {
                                            finalPrompts: rawData.finalPrompts || [],
                                            videoPrompts: rawData.videoPrompts || [],
                                            usedCharacters: rawData.usedCharacters || [],
                                            sceneContexts: rawData.sceneContexts || {},
                                            visualStyle: rawData.styleOverride || ''
                                        };
                                    } else if (node.type === NodeType.YOUTUBE_ANALYTICS) {
                                        typeString = 'youtube-analytics-data';
                                        filename = `youtube_analytics_${timestamp}.json`;
                                    } else if (node.type === NodeType.YOUTUBE_TITLE_GENERATOR) {
                                        typeString = 'youtube-title-data';
                                        filename = `youtube_titles_${timestamp}.json`;
                                    } else if (node.type === NodeType.MUSIC_IDEA_GENERATOR) {
                                        typeString = 'music-idea-data';
                                        filename = `music_ideas_${timestamp}.json`;
                                    } else if (node.type === NodeType.CHARACTER_CARD) {
                                        typeString = 'character-card';
                                        // Handle array of characters
                                        const cards = Array.isArray(rawData) ? rawData : [rawData];
                                        const count = cards.length;
                                        
                                        const charName = count === 1 ? (cards[0].name || 'Entity') : 'Entity_Collection';
                                        const cleanName = charName.replace(/[^a-z0-9а-яё\s-_]/gi, '').trim();
                                        filename = `${cleanName.replace(/\s+/g, '_')}_${timestamp}.json`;
                                        
                                        // Process images for all cards
                                        const exportCards = cards.map((card: any) => {
                                            const exportImageSources: Record<string, string | null> = {};
                                            const ratios = ['1:1', '16:9', '9:16'];
                                            
                                            // Check both imageSources and thumbnails which might be used internally
                                            const sourceObj = card.thumbnails || card.imageSources || {};

                                            ratios.forEach(r => {
                                                let val = sourceObj[r];
                                                
                                                // Fallback for 1:1 if not found in map but present in base field
                                                if (r === '1:1' && !val) {
                                                    val = card.image || card.imageBase64;
                                                }

                                                if (val) {
                                                    exportImageSources[r] = val.startsWith('data:image') ? val : `data:image/png;base64,${val}`;
                                                } else {
                                                    exportImageSources[r] = null;
                                                }
                                            });

                                            let mainImage = exportImageSources['1:1'] || null;
                                            
                                            // Ensure we have at least one main image if 1:1 failed above but exists in root
                                            if (!mainImage && (card.image || card.imageBase64)) {
                                                 const raw = card.image || card.imageBase64;
                                                 mainImage = raw.startsWith('data:image') ? raw : `data:image/png;base64,${raw}`;
                                                 if (!exportImageSources['1:1']) exportImageSources['1:1'] = mainImage;
                                            }
                                            
                                            return {
                                                type: typeString,
                                                id: card.id || `char-card-${Date.now()}-${Math.random()}`,
                                                name: card.name,
                                                index: card.index || card.alias || 'Entity-1',
                                                image: mainImage,
                                                selectedRatio: card.selectedRatio || '1:1',
                                                prompt: card.prompt || '',
                                                fullDescription: card.fullDescription || '',
                                                nodeTitle: node.title,
                                                imageSources: exportImageSources, // Save FULL structure
                                                additionalPrompt: card.additionalPrompt,
                                                targetLanguage: card.targetLanguage,
                                                isOutput: card.isOutput
                                            };
                                        });
                                        
                                        dataToSave = exportCards;
                                    }

                                    const dataWithMeta = node.type === NodeType.CHARACTER_CARD ? dataToSave : {
                                        type: typeString,
                                        title: node.title,
                                        ...dataToSave
                                    };

                                    const dataStr = JSON.stringify(dataWithMeta, null, 2);
                                    const blob = new Blob([dataStr], { type: "application/json" });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement("a");
                                    a.href = url;
                                    a.download = filename;
                                    a.click();
                                    URL.revokeObjectURL(url);
                                } catch (e) { console.error("Failed to download data:", e); }
                            }}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            </ActionButton>
                        )}
                        
                        {(node.type === NodeType.TEXT_INPUT || node.type === NodeType.NOTE || node.type === NodeType.CHARACTER_CARD) && (
                            <ActionButton title={t('node.action.paste')} onClick={() => { onPasteNodeValue(node.id); addToast(t('toast.pasted')); }}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                            </ActionButton>
                        )}
                        
                        <ActionButton title={t('node.action.copy')} onClick={() => { onCopyNodeValue(node.id); addToast(t('toast.copied')); }}>
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        </ActionButton>

                        {(node.type === NodeType.PROMPT_ANALYZER || node.type === NodeType.CHARACTER_ANALYZER || node.type === NodeType.SCRIPT_GENERATOR || node.type === NodeType.SCRIPT_ANALYZER || node.type === NodeType.CHARACTER_GENERATOR || node.type === NodeType.SCRIPT_PROMPT_MODIFIER || node.type === NodeType.CHARACTER_CARD || node.type === NodeType.TEXT_INPUT || node.type === NodeType.NOTE || node.type === NodeType.ERROR_ANALYZER || node.type === NodeType.NARRATOR_TEXT_GENERATOR || node.type === NodeType.SPEECH_SYNTHESIZER || node.type === NodeType.IDEA_GENERATOR || node.type === NodeType.YOUTUBE_ANALYTICS || node.type === NodeType.YOUTUBE_TITLE_GENERATOR || node.type === NodeType.MUSIC_IDEA_GENERATOR || node.type === NodeType.GEMINI_CHAT) && (<ActionButton title={t('node.action.clear')} onClick={handleClear}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></ActionButton>)}

                        <ActionButton title={t('node.action.duplicateWithContent')} onClick={() => onDuplicateNode(node.id)}>
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </ActionButton>
                        <ActionButton title={t('node.action.duplicateEmpty')} onClick={() => onDuplicateNodeEmpty(node.id)}>
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V7.414a1 1 0 00-.293-.707l-4.414-4.414A1 1 0 0013.586 2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                        </ActionButton>
                        {(node.type !== NodeType.NOTE && node.type !== NodeType.IMAGE_PREVIEW) && (<ActionButton title={t('node.action.cutConnections')} onClick={() => { onCutConnections(node.id); addToast(t('toast.connectionsCut')); }}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121M12 12L4.5 4.5" /><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l.707-.707M19.5 4.5l-.707.707" /></svg></ActionButton>)}
                        <ActionButton title={t('node.action.close')} onClick={() => { onDeleteNode(node.id); }}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></ActionButton>
                    </div>
                </>
            )}
        </div>
    );
};

export default NodeHeader;
