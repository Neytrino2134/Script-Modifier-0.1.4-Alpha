
import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import type { NodeContentProps } from '../../types';
import { SettingsPanel, ScenesPanel, CharactersPanel, GeneratorUiState } from './script-generator';
import Tooltip from '../ui/Tooltip';
import { useAppContext } from '../../contexts/Context';
import { ActionButton } from '../ActionButton';
import { useLanguage } from '../../localization';
import { CHAR_GEN_INSTRUCTIONS } from '../../utils/prompts/scriptGenerator';

const ScriptGeneratorNode: React.FC<NodeContentProps> = ({
    node, onValueChange, onGenerateScript, isGeneratingScript, isStopping, onStopGeneration, t, deselectAllNodes, connectedInputs, onModifyScriptPart, isModifyingScriptPart, onDetachCharacter, addToast, inputData,
    onImproveScriptConcept, isImprovingScriptConcept, connections, getUpstreamTextValue, onRemoveConnection
}) => {
    const { viewTransform } = useAppContext();
    const { language } = useLanguage();
    const isLoading = isGeneratingScript === node.id;
    const isPromptConnected = connectedInputs?.has('prompt') || connectedInputs?.has(undefined);
    const isCharactersInputConnected = connectedInputs?.has('characters');

    // Determine primary language button (defaults to RU if interface is English to avoid EN/EN duplicate)
    const primaryLang = language === 'en' ? 'ru' : language;

    const [selectedScenes, setSelectedScenes] = useState<Set<number>>(new Set());
    const [selectedCharacters, setSelectedCharacters] = useState<Set<string>>(new Set());
    const [linkedCharactersCount, setLinkedCharactersCount] = useState(0);
    const [linkedCharacters, setLinkedCharacters] = useState<any[]>([]);

    // Timers & Stats
    const [timers, setTimers] = useState<{ current: number; total: number; last: number }>({ current: 0, total: 0, last: 0 });

    const parsedValue = useMemo(() => {
        try {
            const parsed = JSON.parse(node.value || '{}');
            
            const defaultUiState = { 
                isSettingsCollapsed: true, 
                isSummaryCollapsed: true, 
                isStyleCollapsed: true, 
                isCharactersSectionCollapsed: true, 
                isScenesSectionCollapsed: false,
                collapsedCharacters: [],
                collapsedScenes: []
            };

            return {
                prompt: parsed.prompt || '',
                targetLanguage: parsed.targetLanguage || 'ru',
                characterType: parsed.characterType || 'simple',
                useExistingCharacters: !!parsed.useExistingCharacters,
                narratorEnabled: !!parsed.narratorEnabled,
                narratorMode: parsed.narratorMode || 'normal',
                summary: parsed.summary || '',
                detailedCharacters: Array.isArray(parsed.detailedCharacters) ? parsed.detailedCharacters : [],
                scenes: Array.isArray(parsed.scenes) ? parsed.scenes : [],
                
                // Settings
                isAdvancedMode: !!parsed.isAdvancedMode,
                numberOfScenes: parsed.numberOfScenes || null,
                isDetailedPlot: !!parsed.isDetailedPlot,
                genre: parsed.genre || 'general',
                genre2: parsed.genre2 || 'general',
                noCharacters: !!parsed.noCharacters,
                model: parsed.model || 'gemini-3-pro-preview',
                includeSubscribeScene: !!parsed.includeSubscribeScene,
                visualStyle: parsed.visualStyle || 'none',
                customVisualStyle: parsed.customVisualStyle || '',
                generatedStyle: parsed.generatedStyle || '', 
                
                createSecondaryChars: parsed.createSecondaryChars !== false,
                createKeyItems: parsed.createKeyItems !== false,
                safeGeneration: !!parsed.safeGeneration,
                thinkingEnabled: !!parsed.thinkingEnabled,
                scenelessMode: !!parsed.scenelessMode,
                simpleActions: !!parsed.simpleActions,
                commercialSafe: !!parsed.commercialSafe,
                smartConceptEnabled: !!parsed.smartConceptEnabled, // Default false
                atmosphericEntryEnabled: parsed.atmosphericEntryEnabled !== false, // Default true for legacy compatibility
                
                generationProgress: parsed.generationProgress || null,

                uiState: { ...defaultUiState, ...(parsed.uiState || {}) },
            };
        } catch {
            return { 
                prompt: '', targetLanguage: 'ru', detailedCharacters: [], scenes: [], 
                uiState: { 
                    isSettingsCollapsed: true, 
                    isSummaryCollapsed: true, 
                    isStyleCollapsed: true, 
                    isCharactersSectionCollapsed: true, 
                    isScenesSectionCollapsed: false,
                    collapsedCharacters: [],
                    collapsedScenes: []
                }, 
                model: 'gemini-3-pro-preview', summary: '', generatedStyle: '',
                commercialSafe: false, smartConceptEnabled: false, atmosphericEntryEnabled: true, generationProgress: null
            };
        }
    }, [node.value]);

    const { 
        prompt, targetLanguage, characterType, useExistingCharacters, narratorEnabled, narratorMode,
        summary, detailedCharacters, scenes, isAdvancedMode, numberOfScenes, isDetailedPlot,
        genre, genre2, noCharacters, model, includeSubscribeScene, visualStyle, customVisualStyle, generatedStyle,
        createSecondaryChars, createKeyItems, safeGeneration, thinkingEnabled, scenelessMode, simpleActions, commercialSafe, smartConceptEnabled,
        atmosphericEntryEnabled,
        uiState, generationProgress
    } = parsedValue;

    // Timer Effect
    useEffect(() => {
        let interval: number;
        if (generationProgress) {
            if (generationProgress.endTime) {
                 setTimers({
                    current: 0,
                    total: Math.floor((generationProgress.endTime - generationProgress.totalStartTime) / 1000),
                    last: generationProgress.lastItemDuration || 0
                });
            } else if (isLoading) {
                 interval = window.setInterval(() => {
                    const now = Date.now();
                    setTimers({
                        current: Math.floor((now - (generationProgress.currentItemStartTime || now)) / 1000),
                        total: Math.floor((now - (generationProgress.totalStartTime || now)) / 1000),
                        last: generationProgress.lastItemDuration || 0
                    });
                }, 100);
            }
        } else {
            setTimers({ current: 0, total: 0, last: 0 });
        }
        return () => clearInterval(interval);
    }, [isLoading, generationProgress]);

    // Get Upstream Prompt for Display
    const promptConnection = useMemo(() => 
        connections?.find(c => c.toNodeId === node.id && (c.toHandleId === 'prompt' || c.toHandleId === undefined)),
    [connections, node.id]);

    const upstreamPrompt = useMemo(() => {
        if (!promptConnection || !getUpstreamTextValue) return '';
        return getUpstreamTextValue(promptConnection.fromNodeId, promptConnection.fromHandleId);
    }, [promptConnection, getUpstreamTextValue, inputData]);

    const displayPrompt = isPromptConnected ? upstreamPrompt : prompt;

    const handleValueUpdate = useCallback((updates: any) => {
        const newValue = { ...parsedValue, ...updates };
        onValueChange(node.id, JSON.stringify(newValue));
    }, [node.id, onValueChange, parsedValue]);

    // Force collapse all scenes and characters on initial load (if not already set)
    useEffect(() => {
        let updates: any = {};
        let changed = false;

        // Auto-collapse scenes on load
        if (scenes.length > 0) {
             const allSceneIndices = scenes.map((_: any, i: number) => i);
             const currentCollapsed = uiState.collapsedScenes || [];
             if (currentCollapsed.length !== allSceneIndices.length) {
                 updates.uiState = { ...uiState, collapsedScenes: allSceneIndices };
                 changed = true;
             }
        }

        // Auto-collapse characters on load
        if (detailedCharacters.length > 0) {
            const allCharIds = detailedCharacters.map((c: any) => c.id);
            const currentCollapsed = uiState.collapsedCharacters || [];
            
            // Check if we need to update collapse state
            const allCollapsed = allCharIds.every((id: string) => currentCollapsed.includes(id));
            if (!allCollapsed) {
                 updates.uiState = { 
                     ...(updates.uiState || uiState), 
                     collapsedCharacters: allCharIds 
                 };
                 changed = true;
            }
        }

        if (changed) {
            handleValueUpdate(updates);
        }
    }, []); // Run once on mount


    // Propagate changes from upstream (like Character Cards) to downstream nodes (like Script Analyzer)
    useEffect(() => {
        if (inputData && useExistingCharacters) {
             const timer = setTimeout(() => {
                 handleValueUpdate({ _upstreamSync: Date.now() });
             }, 800); // Debounce to prevent rapid updates during typing
             return () => clearTimeout(timer);
        }
    }, [inputData, useExistingCharacters]);

    const handleUiStateUpdate = useCallback((updates: Partial<GeneratorUiState>) => {
        handleValueUpdate({ uiState: { ...uiState, ...updates } });
    }, [handleValueUpdate, uiState]);

    const handleStartGeneration = () => {
         onGenerateScript(node.id);
    };

    const handleImproveClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        
        // 1. Get the text to improve (upstream or local)
        const textToImprove = displayPrompt;

        if (!textToImprove.trim()) {
            if (addToast) addToast("No concept to improve.", "info");
            return;
        }

        // 2. If connected, remove the connection
        if (isPromptConnected && promptConnection && onRemoveConnection) {
            onRemoveConnection(promptConnection.id);
        }

        // 3. Call improve API - this will result in the node's local 'prompt' value being updated
        if (onImproveScriptConcept) {
            onImproveScriptConcept(node.id, textToImprove);
        }
    };
    
    // --- Manual Editing Functions ---

    const handleAddCharacter = useCallback(() => {
        const newId = `char-${Date.now()}`;
        
        // Calculate max number for "New Entity N" considering both local and linked characters
        let maxNameNum = 0;
        const nameRegex = /^New Entity\s*(\d*)$/i;
        
        const allChars = [...linkedCharacters, ...(detailedCharacters || [])];
        
        allChars.forEach(c => {
            const match = (c.name || '').match(nameRegex);
            if (match) {
                const num = match[1] ? parseInt(match[1], 10) : 1;
                if (num > maxNameNum) maxNameNum = num;
            }
        });
        
        const nextName = `New Entity ${maxNameNum + 1}`;
        
        // Calculate the next logical index based on total characters (Entity-N)
        const nextIndex = allChars.length + 1;
        
        const newChar = {
            id: newId,
            name: nextName,
            index: `Entity-${nextIndex}`,
            fullDescription: '',
            prompt: '',
            originalName: nextName
        };
        const newCharacters = [...(detailedCharacters || []), newChar];
        
        // Auto-expand the character section
        const newUiState = { ...uiState, isCharactersSectionCollapsed: false };
        
        handleValueUpdate({ detailedCharacters: newCharacters, uiState: newUiState });
    }, [detailedCharacters, linkedCharacters, handleValueUpdate, uiState]);

    const handleAddScene = useCallback(() => {
        const nextNum = (scenes?.length || 0) + 1;
        const newScene = {
            sceneNumber: nextNum,
            title: `Scene ${nextNum}`,
            description: '',
            narratorText: '',
            recommendedFrames: 6
        };
        const newScenes = [...(scenes || []), newScene];
        
        // Auto-expand the scenes section
        const newUiState = { ...uiState, isScenesSectionCollapsed: false };

        handleValueUpdate({ scenes: newScenes, uiState: newUiState });
    }, [scenes, handleValueUpdate, uiState]);

    const handleAddSceneAfter = useCallback((index: number) => {
        const newScenes = [...(scenes || [])];
        const newScene = {
            sceneNumber: 0, 
            title: `New Scene`,
            description: '',
            narratorText: '',
            recommendedFrames: 6
        };
        newScenes.splice(index + 1, 0, newScene);
        
        const reindexed = newScenes.map((s, i) => ({
            ...s,
            sceneNumber: i + 1,
            title: (s.title === 'New Scene' || s.title.match(/^Scene \d+$/)) ? `Scene ${i + 1}` : s.title
        }));
        
        // Auto-expand the scenes section (just in case)
        const newUiState = { ...uiState, isScenesSectionCollapsed: false };

        handleValueUpdate({ scenes: reindexed, uiState: newUiState });
    }, [scenes, handleValueUpdate, uiState]);

    const handleMoveScene = useCallback((index: number, direction: 'up' | 'down') => {
        if (!scenes || scenes.length < 2) return;
        const newScenes = [...scenes];

        if (direction === 'up') {
            if (index === 0) return;
            [newScenes[index], newScenes[index - 1]] = [newScenes[index - 1], newScenes[index]];
        } else {
            if (index === newScenes.length - 1) return;
            [newScenes[index], newScenes[index + 1]] = [newScenes[index + 1], newScenes[index]];
        }
        
        const reindexed = newScenes.map((s, i) => ({
            ...s,
            sceneNumber: i + 1
        }));
        handleValueUpdate({ scenes: reindexed });
    }, [scenes, handleValueUpdate]);

    const handleMoveCharacter = useCallback((index: number, direction: 'up' | 'down' | 'top' | 'bottom') => {
        if (!detailedCharacters || detailedCharacters.length < 2) return;
        
        let newChars = [...detailedCharacters];
        const charToMove = newChars[index];
        newChars.splice(index, 1);
        
        if (direction === 'top') {
            newChars.unshift(charToMove);
        } else if (direction === 'bottom') {
            newChars.push(charToMove);
        } else if (direction === 'up') {
            newChars.splice(Math.max(0, index - 1), 0, charToMove);
        } else if (direction === 'down') {
             newChars.splice(Math.min(newChars.length, index + 1), 0, charToMove);
        }
        
        handleValueUpdate({ detailedCharacters: newChars });
    }, [detailedCharacters, handleValueUpdate]);

    // --- End Manual Editing Functions ---
    
    // Calculate linked characters from input connections AND Sync Local Indexing
    useEffect(() => {
        if (!connections || !getUpstreamTextValue) {
            setLinkedCharacters([]);
            setLinkedCharactersCount(0);
            return;
        }

        const inputConns = connections.filter(c => c.toNodeId === node.id && c.toHandleId === 'characters');
        const incomingChars: any[] = [];
        
        // 1. Gather all incoming characters
        inputConns.forEach(conn => {
            const val = getUpstreamTextValue(conn.fromNodeId, conn.fromHandleId);
            try {
                const parsed = JSON.parse(val || '{}');
                // Helper to add isLinked flag and ensure ID
                const processChar = (c: any) => ({
                    ...c,
                    isLinked: true,
                    // Use upstream ID if available, or generate a stable-ish one based on node+index
                    id: c.id || `linked-${conn.fromNodeId}-${c.index || c.name || Math.random()}`
                });

                if (Array.isArray(parsed)) {
                     parsed.forEach(c => incomingChars.push(processChar(c)));
                } else if (parsed.characters && Array.isArray(parsed.characters)) {
                     parsed.characters.forEach((c: any) => incomingChars.push(processChar(c)));
                } else if (parsed.name) {
                     incomingChars.push(processChar(parsed));
                }
            } catch {}
        });

        // --- AUTOMATIC CONFIGURATION UPDATE ---
        // If characters are connected, force 'Use Existing Characters' ON and 'No Characters' OFF
        if (inputConns.length > 0) {
            let updates: any = {};
            if (!useExistingCharacters) updates.useExistingCharacters = true;
            if (noCharacters) updates.noCharacters = false;
            
            if (Object.keys(updates).length > 0) {
                // We use a timeout to avoid update loops during render cycle
                setTimeout(() => handleValueUpdate(updates), 0);
            }
        }

        // --- STRICT SEQUENTIAL INDEXING (ENTITY-N) ---
        // We re-index ALL characters (linked first, then local) to ensure 1, 2, 3, ... N order
        
        // 1. Prepare linked characters with forced indices 1..K
        const reindexedLinkedChars = incomingChars.map((char, i) => {
            const { alias, ...rest } = char; // STRICTLY REMOVE ALIAS
            return {
                ...rest,
                index: `Entity-${i + 1}`
            };
        });
        
        // 2. Prepare local characters with indices K+1..N
        const startLocalIndex = reindexedLinkedChars.length + 1;
        const currentLocals = detailedCharacters || [];
        let needsUpdate = false;
        
        const reindexedLocalChars = currentLocals.map((char: any, i: number) => {
            const targetIndex = startLocalIndex + i;
            const expectedIndexStr = `Entity-${targetIndex}`;
            
            // Also strip alias from local state if present
            const { alias, ...cleanChar } = char;
            
            if (cleanChar.index !== expectedIndexStr || alias) {
                needsUpdate = true;
                return { ...cleanChar, index: expectedIndexStr };
            }
            return cleanChar;
        });

        // 3. Update state
        if (needsUpdate) {
            // Use timeout to break render cycle if invoked during render
             setTimeout(() => handleValueUpdate({ detailedCharacters: reindexedLocalChars }), 0);
        }

        setLinkedCharacters(prev => {
             if (JSON.stringify(prev) === JSON.stringify(reindexedLinkedChars)) return prev;
             return reindexedLinkedChars;
        });
        setLinkedCharactersCount(reindexedLinkedChars.length);

    }, [connections, getUpstreamTextValue, node.id, inputData, detailedCharacters, handleValueUpdate, useExistingCharacters, noCharacters]);

    const handleEmbedCharacter = useCallback((char: any) => {
         const newChar = { 
             ...char, 
             isLinked: false, 
             id: `char-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
         };
         // Index will be fixed by the useEffect above
         handleValueUpdate({ detailedCharacters: [...detailedCharacters, newChar] });
    }, [detailedCharacters, handleValueUpdate]);

    const combinedCharacters = useMemo(() => {
        // Enforce visual order based on the new strict indexing
        const all = [...linkedCharacters, ...detailedCharacters];
        return all.sort((a, b) => {
            const numA = parseInt(a.index.replace(/\D/g, '')) || 999;
            const numB = parseInt(b.index.replace(/\D/g, '')) || 999;
            return numA - numB;
        });
    }, [linkedCharacters, detailedCharacters]);

    return (
        <div className="flex flex-col h-full">
            <div className="flex flex-col gap-2 mb-2 flex-shrink-0">
                <div className="flex justify-between items-center px-1">
                    <label className="text-xs font-medium text-gray-400">{t('node.content.scriptPromptPlaceholder')}</label>
                    <div className="flex items-center space-x-1">
                         <ActionButton 
                            title={t('node.action.improveConcept')} 
                            tooltipPosition="left"
                            onClick={handleImproveClick}
                            disabled={!displayPrompt.trim() || !!isImprovingScriptConcept}
                        >
                            {isImprovingScriptConcept ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            )}
                        </ActionButton>
                        <ActionButton 
                            title={t('node.action.clear')} 
                            tooltipPosition="left"
                            onClick={(e) => { e.stopPropagation(); handleValueUpdate({ prompt: '' }); }}
                            disabled={isPromptConnected || !prompt}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </ActionButton>
                    </div>
                </div>

                 <textarea
                    value={displayPrompt}
                    onChange={(e) => handleValueUpdate({ prompt: e.target.value })}
                    placeholder={isPromptConnected ? t('node.content.connectedPlaceholder') : t('node.content.scriptPromptPlaceholder')}
                    disabled={isPromptConnected || isLoading}
                    className={`w-full p-2 bg-gray-700 border border-gray-600 rounded-md resize-y min-h-[80px] max-h-[200px] focus:border-emerald-500 focus:ring-0 focus:outline-none disabled:bg-gray-800 disabled:text-gray-500 custom-scrollbar overflow-y-scroll ${isPromptConnected ? 'text-gray-300 italic' : ''}`}
                    rows={2}
                    onWheel={e => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onFocus={deselectAllNodes}
                />

                <div className="flex items-center space-x-2">
                    {/* Model Switcher & Lang & Generate Button */}
                    <div className="flex flex-shrink-0 gap-1 h-10 select-none bg-gray-900/50 rounded-lg p-0.5 items-center">
                         <Tooltip title={t('tooltip.model.flash')} position="top" className="h-full flex-1">
                            <button
                                onClick={() => handleValueUpdate({ model: 'gemini-3-flash-preview' })}
                                className={`px-3 h-full rounded-md text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center ${
                                    model === 'gemini-3-flash-preview' 
                                    ? 'bg-emerald-600 text-white shadow-sm' 
                                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                                }`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                                </svg>
                                FLASH
                            </button>
                        </Tooltip>
                        <Tooltip title={t('tooltip.model.pro')} position="top" className="h-full flex-1">
                            <button
                                onClick={() => handleValueUpdate({ model: 'gemini-3-pro-preview' })}
                                className={`px-3 h-full rounded-md text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center ${
                                    model === 'gemini-3-pro-preview' 
                                    ? 'bg-emerald-600 text-white shadow-sm' 
                                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                                }`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                   <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                </svg>
                                PRO
                            </button>
                        </Tooltip>
                    </div>

                     {/* Language Switcher */}
                     <div className="flex flex-shrink-0 gap-1 h-10 select-none bg-gray-900/50 rounded-lg p-0.5 items-center">
                        <Tooltip title={t(`tooltip.lang.${primaryLang}`)} position="top" className="h-full flex">
                            <button 
                                onClick={() => handleValueUpdate({ targetLanguage: primaryLang })} 
                                className={`px-3 h-full rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                                    targetLanguage === primaryLang 
                                    ? 'bg-emerald-600 text-white shadow-sm' 
                                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                                }`}
                            >
                                {primaryLang.toUpperCase()}
                            </button>
                        </Tooltip>
                        <Tooltip title={t('tooltip.lang.en')} position="top" className="h-full flex">
                            <button 
                                onClick={() => handleValueUpdate({ targetLanguage: 'en' })} 
                                className={`px-3 h-full rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                                    targetLanguage === 'en' 
                                    ? 'bg-emerald-600 text-white shadow-sm' 
                                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                                }`}
                            >
                                EN
                            </button>
                        </Tooltip>
                    </div>

                    <button
                        onClick={isLoading ? onStopGeneration : handleStartGeneration}
                        disabled={isStopping || (!isLoading && !isPromptConnected && !prompt.trim() && (!useExistingCharacters))}
                        className={`flex-grow h-10 px-4 font-bold text-xs uppercase tracking-wide text-white rounded-lg transition-all duration-200 shadow-sm flex items-center justify-center ${
                            isStopping 
                            ? 'bg-yellow-600 hover:bg-yellow-500' 
                            : (isLoading 
                                ? 'bg-cyan-600 hover:bg-cyan-500' 
                                : 'bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed')
                        }`}
                    >
                        {isLoading ? (
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                               <path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                            </svg>
                        )}
                        {isStopping ? t('node.action.stopping') : (isLoading ? t('node.content.generating') : t('node.content.generateScript'))}
                    </button>
                </div>
                
                {/* Stats Bar */}
                <div className="p-2 flex items-center justify-between text-xs border border-gray-700 bg-gray-900/50 rounded-md">
                    <div className="font-semibold text-emerald-400">
                         {t('node.content.scenes_generated', { count: scenes.length })}
                    </div>
                    
                    <div className="flex items-center gap-4 text-gray-400">
                         {generationProgress && (
                             <>
                                {isLoading ? (
                                    <div className="text-yellow-400 animate-pulse font-mono">
                                        {t('node.content.status.generating')}
                                    </div>
                                ) : null}

                                <div className="text-gray-400 font-mono text-[10px]">
                                    Time (sec): (prev: {timers.last}) / Cur: {timers.current} / Total: {timers.total}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                 {/* Progress Bar */}
                 {(isLoading && generationProgress) && (
                    <div className="w-full h-1 bg-gray-800 rounded-b-md overflow-hidden border-t border-gray-800 -mt-2">
                        {/* Just a simple indeterminate or slow progress if no total known for script gen */}
                        <div 
                            className="h-full bg-emerald-500 animate-pulse w-full"
                        />
                    </div>
                 )}
            </div>

            <SettingsPanel 
                uiState={uiState}
                onUpdateUiState={handleUiStateUpdate}
                onUpdateValue={handleValueUpdate}
                nodeId={node.id}
                t={t}
                deselectAllNodes={deselectAllNodes}
                numberOfScenes={numberOfScenes}
                visualStyle={visualStyle}
                customVisualStyle={customVisualStyle}
                genre={genre}
                genre2={genre2}
                characterType={characterType}
                narratorMode={narratorMode}
                narratorEnabled={narratorEnabled}
                noCharacters={noCharacters}
                useExistingCharacters={useExistingCharacters}
                isCharactersInputConnected={!!isCharactersInputConnected}
                linkedCharactersCount={linkedCharactersCount}
                createSecondaryChars={createSecondaryChars}
                createKeyItems={createKeyItems}
                isDetailedPlot={isDetailedPlot}
                includeSubscribeScene={includeSubscribeScene}
                model={model}
                isLoading={isLoading}
                targetLanguage={targetLanguage}
                prompt={prompt}
                allCharacters={detailedCharacters}
                estimateFrames={true}
                safeGeneration={safeGeneration}
                thinkingEnabled={thinkingEnabled}
                scenelessMode={scenelessMode}
                simpleActions={simpleActions}
                commercialSafe={commercialSafe}
                smartConceptEnabled={smartConceptEnabled}
                atmosphericEntryEnabled={atmosphericEntryEnabled}
            />

            {/* Scrollable Container for Results */}
            {/* Visual separator from parameters */}
            <div className="my-2 border-b border-gray-700/50"></div>
            
            <div 
                className="flex-grow overflow-y-auto min-h-0 custom-scrollbar p-1 flex flex-col gap-1 bg-gray-900/30 border border-gray-700/50 rounded-md"
                onWheel={(e) => e.stopPropagation()}
                style={{ scrollbarGutter: 'stable' }}
            >
                {/* Generated Style Output */}
                <div className="flex-shrink-0 mb-1 bg-gray-900 rounded-md border border-gray-700 hover:border-emerald-500 overflow-hidden flex flex-col transition-all duration-200">
                    <div 
                        className="flex justify-between items-center p-2 bg-gray-800/50 cursor-pointer select-none hover:bg-gray-700/50 transition-colors"
                        onClick={() => handleUiStateUpdate({ isStyleCollapsed: !uiState.isStyleCollapsed })}
                    >
                        <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                            </svg>
                            <h3 className="font-bold text-emerald-400 select-none transition-colors uppercase text-xs tracking-wider">{t('node.content.style')}</h3>
                        </div>
                        <div className="flex items-center space-x-1">
                             <ActionButton tooltipPosition="left" title={t('node.action.copy')} onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(generatedStyle); }}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                             </ActionButton>
                             <ActionButton tooltipPosition="left" title={t('node.action.clear')} onClick={(e) => { e.stopPropagation(); handleValueUpdate({ generatedStyle: '' }); }}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                             </ActionButton>
                            <div className="pl-1 border-l border-gray-700 ml-1">
                                <ActionButton title={uiState.isStyleCollapsed ? t('node.action.expand') : t('node.action.collapse')} onClick={(e) => { e.stopPropagation(); handleUiStateUpdate({ isStyleCollapsed: !uiState.isStyleCollapsed }); }} tooltipPosition="left">
                                    {uiState.isStyleCollapsed ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                                    )}
                                </ActionButton>
                            </div>
                        </div>
                    </div>
                    {!uiState.isStyleCollapsed && (
                        <div className="p-2">
                            <textarea 
                                value={generatedStyle} 
                                onChange={(e) => handleValueUpdate({ generatedStyle: e.target.value })}
                                placeholder={t('node.content.stylePromptPlaceholder')}
                                className="w-full text-xs p-2 bg-gray-900 border-none rounded-md resize-y min-h-[60px] focus:outline-none focus:border-emerald-500 focus:ring-0 custom-scrollbar text-gray-300"
                            />
                        </div>
                    )}
                </div>

                {/* Summary Output */}
                <div className="flex-shrink-0 mb-1 bg-gray-900 rounded-md border border-gray-700 hover:border-emerald-500 overflow-hidden flex flex-col transition-all duration-200">
                    <div 
                        className="flex justify-between items-center p-2 bg-gray-800/50 cursor-pointer select-none hover:bg-gray-700/50 transition-colors"
                        onClick={() => handleUiStateUpdate({ isSummaryCollapsed: !uiState.isSummaryCollapsed })}
                    >
                        <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <h3 className="font-bold text-emerald-400 select-none transition-colors uppercase text-xs tracking-wider">{t('node.content.summary')}</h3>
                        </div>
                        <div className="flex items-center space-x-1">
                             <ActionButton tooltipPosition="left" title={t('node.action.copy')} onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(summary); }}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            </ActionButton>
                             <ActionButton tooltipPosition="left" title={t('node.action.clear')} onClick={(e) => { e.stopPropagation(); handleValueUpdate({ summary: '' }); }}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                             </ActionButton>
                            <div className="pl-1 border-l border-gray-700 ml-1">
                                <ActionButton title={uiState.isSummaryCollapsed ? t('node.action.expand') : t('node.action.collapse')} onClick={(e) => { e.stopPropagation(); handleUiStateUpdate({ isSummaryCollapsed: !uiState.isSummaryCollapsed }); }} tooltipPosition="left">
                                    {uiState.isSummaryCollapsed ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                                    )}
                                </ActionButton>
                            </div>
                        </div>
                    </div>
                    {!uiState.isSummaryCollapsed && (
                        <div className="p-2">
                            <textarea 
                                value={summary} 
                                onChange={(e) => handleValueUpdate({ summary: e.target.value })}
                                placeholder="..."
                                className="w-full text-sm p-2 bg-gray-900 border-none rounded-md resize-y min-h-[60px] focus:outline-none focus:border-emerald-500 focus:ring-0 custom-scrollbar text-gray-300"
                            />
                        </div>
                    )}
                </div>

                <CharactersPanel 
                    uiState={uiState}
                    onUpdateUiState={handleUiStateUpdate} 
                    onUpdateValue={handleValueUpdate} 
                    allCharacters={combinedCharacters}
                    selectedCharacters={selectedCharacters}
                    collapsedCharacters={uiState.collapsedCharacters || []}
                    isCharactersSectionCollapsed={!!uiState.isCharactersSectionCollapsed}
                    areAllCharactersCollapsed={combinedCharacters.length > 0 && (uiState.collapsedCharacters?.length === combinedCharacters.length)}
                    t={t}
                    onAddCharacter={handleAddCharacter}
                    handleToggleAllCharacters={() => {
                        if (uiState.collapsedCharacters?.length === combinedCharacters.length) handleValueUpdate({ uiState: { ...uiState, collapsedCharacters: [] }});
                        else handleValueUpdate({ uiState: { ...uiState, collapsedCharacters: combinedCharacters.map((c: any) => c.id) }});
                    }}
                    handleCharacterClick={(e, id) => {
                        setSelectedCharacters(prev => {
                            const newSet = new Set(prev);
                            if (newSet.has(String(id))) newSet.delete(String(id)); else newSet.add(String(id));
                            return newSet;
                        });
                    }}
                    handleToggleCharacterCollapse={(id) => {
                        const current = uiState.collapsedCharacters || [];
                        const next = current.includes(String(id)) ? current.filter(x => x !== String(id)) : [...current, String(id)];
                        handleUiStateUpdate({ collapsedCharacters: next });
                    }}
                    updateCharacter={(id, field, value) => {
                        const newChars = detailedCharacters.map((c: any) => c.id === id ? { ...c, [field]: value } : c);
                        handleValueUpdate({ detailedCharacters: newChars });
                    }}
                    deleteCharacter={(id) => {
                        const newChars = detailedCharacters.filter((c: any) => c.id !== id);
                        handleValueUpdate({ detailedCharacters: newChars });
                    }}
                    onDetachCharacter={(char) => onDetachCharacter(char, node)}
                    handleEmbedCharacter={handleEmbedCharacter}
                    deselectAllNodes={deselectAllNodes}
                    onSyncCharacters={undefined}
                    isSyncAvailable={false}
                    onMoveCharacter={handleMoveCharacter}
                    onClearCharacters={() => handleValueUpdate({ detailedCharacters: [] })}
                />

                <ScenesPanel
                    isScenesSectionCollapsed={!!uiState.isScenesSectionCollapsed}
                    areAllScenesCollapsed={scenes.length > 0 && (uiState.collapsedScenes?.length === scenes.length)}
                    scenes={scenes}
                    selectedScenes={selectedScenes}
                    collapsedScenes={uiState.collapsedScenes || []}
                    narratorEnabled={narratorEnabled}
                    isModifyingScriptPart={isModifyingScriptPart}
                    nodeId={node.id}
                    t={t}
                    handleUiStateUpdate={handleUiStateUpdate}
                    addScene={handleAddScene}
                    handleToggleAllScenes={() => {
                        if (uiState.collapsedScenes?.length === scenes.length) handleValueUpdate({ uiState: { ...uiState, collapsedScenes: [] }});
                        else handleValueUpdate({ uiState: { ...uiState, collapsedScenes: scenes.map((_, i) => i) }});
                    }}
                    handleSceneClick={() => {}}
                    handleToggleSceneCollapse={(index) => {
                        const current = uiState.collapsedScenes || [];
                        const next = current.includes(index) ? current.filter(x => x !== index) : [...current, index];
                        handleValueUpdate({ uiState: { ...uiState, collapsedScenes: next }});
                    }}
                    updateScene={(index, field, value) => {
                        const newScenes = [...scenes];
                        newScenes[index] = { ...newScenes[index], [field]: value };
                        handleValueUpdate({ scenes: newScenes });
                    }}
                    deleteScene={(index) => {
                        const newScenes = scenes.filter((_, i) => i !== index);
                        handleValueUpdate({ scenes: newScenes });
                    }}
                    addSceneAfter={handleAddSceneAfter} 
                    moveScene={handleMoveScene}
                    onModifyScriptPart={(partId, original, modPrompt) => onModifyScriptPart(node.id, partId, original, modPrompt)}
                    deselectAllNodes={deselectAllNodes}
                    onClearScenes={() => handleValueUpdate({ scenes: [] })}
                />
            </div>
        </div>
    );
};

export default ScriptGeneratorNode;
