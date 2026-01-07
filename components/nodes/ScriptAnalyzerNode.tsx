
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import type { NodeContentProps } from '../../types';
import { SettingsPanel, CharactersPanel, InputScriptsPanel, OutputFramesPanel, AnalyzerUiState } from './script-analyzer';
import { useAppContext } from '../../contexts/Context';
import Tooltip from '../ui/Tooltip';
import { useLanguage } from '../../localization';
import CustomCheckbox from '../ui/CustomCheckbox';
import { SCRIPT_ANALYZER_INSTRUCTIONS } from '../../utils/prompts/scriptAnalyzer';

// Defined outside to prevent re-mounting and flickering during renders
const SearchTrigger: React.FC<{ id: string; onClick: (e: React.MouseEvent, id: string) => void }> = React.memo(({ id, onClick }) => (
    <button 
        onClick={(e) => { e.stopPropagation(); onClick(e, id); }}
        className="ml-auto p-0.5 text-gray-500 hover:text-emerald-400 opacity-50 hover:opacity-100 transition-all focus:outline-none"
        title="Locate in Stack"
    >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
    </button>
));

const ScriptAnalyzerNode: React.FC<NodeContentProps> = ({
    node, onValueChange, onAnalyzeScript, isAnalyzingScript, isStopping, onStopGeneration, t, getUpstreamTextValue, connections, connectedInputs, onApplyAliases, addToast, deselectAllNodes, inputData
}) => {
    const { language } = useLanguage();
    const [upstreamScriptData, setUpstreamScriptData] = useState<any>(null);
    const [collapsedInputScenes, setCollapsedInputScenes] = useState<Set<number>>(new Set());
    const [isSummaryCollapsed, setIsSummaryCollapsed] = useState(true); // Default to collapsed
    const [verticalDividerPos, setVerticalDividerPos] = useState(50);
    
    // Output state
    const [collapsedOutputScenes, setCollapsedOutputScenes] = useState<Set<number>>(new Set());
    const [collapsedFrames, setCollapsedFrames] = useState<Set<string>>(new Set());
    const [collapsedContexts, setCollapsedContexts] = useState<Set<number>>(new Set());
    const [selectedFrames, setSelectedFrames] = useState<Set<string>>(new Set());
    
    const [selectedCharacters, setSelectedCharacters] = useState<Set<string | number>>(new Set());
    const [collapsedCharacters, setCollapsedCharacters] = useState<Set<string | number>>(new Set());

    // Search Highlight State
    const [targetScrollId, setTargetScrollId] = useState<string | null>(null);
    const handleSearchClick = (e: React.MouseEvent, id: string) => setTargetScrollId(id);

    // Timers & Stats
    const [timers, setTimers] = useState<{ current: number; total: number; last: number }>({ current: 0, total: 0, last: 0 });

    const isLoading = isAnalyzingScript === node.id;
    const { viewTransform } = useAppContext();

    // Determine primary language button (defaults to RU if interface is English to avoid EN/EN duplicate)
    const primaryLang = language === 'en' ? 'ru' : language;

    const parsedValue = useMemo(() => {
        try {
            const parsed = JSON.parse(node.value || '{}');
            return {
                characters: Array.isArray(parsed.characters) ? parsed.characters : [],
                scenes: Array.isArray(parsed.scenes) ? parsed.scenes : [],
                // Settings
                targetLanguage: parsed.targetLanguage || language,
                model: parsed.model || 'gemini-3-pro-preview',
                startSceneNumber: parsed.startSceneNumber || null,
                endSceneNumber: parsed.endSceneNumber || null,
                framesPerScene: parsed.framesPerScene || null, // UNCOMMENTED
                minFrames: parsed.minFrames || null,
                maxFrames: parsed.maxFrames || null,
                
                hierarchyEnabled: parsed.hierarchyEnabled !== false,
                mandatoryBgEnabled: parsed.mandatoryBgEnabled !== false,
                statePersistenceEnabled: parsed.statePersistenceEnabled !== false,
                livingWorldEnabled: parsed.livingWorldEnabled !== false,
                extendedAnalysis: !!parsed.extendedAnalysis,
                microActionBreakdown: !!parsed.microActionBreakdown,
                batchProcessing: parsed.batchProcessing !== false,
                professionalStoryboard: parsed.professionalStoryboard !== false,
                cinematographyEnabled: parsed.cinematographyEnabled !== false,
                safeGeneration: !!parsed.safeGeneration,
                thinkingEnabled: !!parsed.thinkingEnabled,
                shotFilter: parsed.shotFilter || 'all',
                anthroEnabled: !!parsed.anthroEnabled,
                subscribeEnhancement: !!parsed.subscribeEnhancement,
                anatomicalStrictness: parsed.anatomicalStrictness !== false,
                propConsistency: parsed.propConsistency !== false, // New Default True
                
                visualStyle: parsed.visualStyle || '',
                autoIndexCharacters: parsed.autoIndexCharacters !== false,
                
                uiState: parsed.uiState || { isSettingsCollapsed: true, isCharStyleCollapsed: true }, // Default collapsed
                settingsPaneHeight: parsed.settingsPaneHeight || 380,
                characterPaneHeight: parsed.characterPaneHeight || 170,
                generationProgress: parsed.generationProgress || null,
            };
        } catch {
            return { 
                characters: [], scenes: [], targetLanguage: language, model: 'gemini-3-pro-preview', 
                uiState: { isSettingsCollapsed: true, isCharStyleCollapsed: true },
                settingsPaneHeight: 380, characterPaneHeight: 170, anatomicalStrictness: true, propConsistency: true,
                minFrames: null, maxFrames: null, framesPerScene: null
            };
        }
    }, [node.value, language]);

    // ... Destructure parsedValue ...
    const { 
        characters, scenes, targetLanguage, model, startSceneNumber, endSceneNumber,
        minFrames, maxFrames, framesPerScene, // ADDED DESTRUCTURE
        hierarchyEnabled, mandatoryBgEnabled, statePersistenceEnabled, livingWorldEnabled,
        extendedAnalysis, microActionBreakdown, batchProcessing, professionalStoryboard, cinematographyEnabled,
        safeGeneration, thinkingEnabled, shotFilter, anthroEnabled, subscribeEnhancement, anatomicalStrictness, propConsistency,
        visualStyle, autoIndexCharacters, uiState, settingsPaneHeight, characterPaneHeight, generationProgress
    } = parsedValue;

    // --- EFFECT: Collapse existing Output Scenes/Frames on Initial Mount ---
    useEffect(() => {
        if (scenes && scenes.length > 0) {
            const allSceneIndices = new Set<number>(scenes.map((_: any, i: number) => i));
            const allContextIndices = new Set<number>(scenes.map((_: any, i: number) => i));
            const allFrameIds = new Set<string>();
            scenes.forEach((s: any, sIdx: number) => {
                (s.frames || []).forEach((f: any) => allFrameIds.add(`${sIdx}-${f.frameNumber}`));
            });
            
            setCollapsedOutputScenes(allSceneIndices);
            setCollapsedContexts(allContextIndices);
            setCollapsedFrames(allFrameIds);
        }
        
        if (characters && characters.length > 0) {
             const allCharIds = new Set<string | number>(characters.map((c: any) => c.id || c.name));
             setCollapsedCharacters(allCharIds);
        }
    }, []); // Only run once on mount

    const handleValueUpdate = useCallback((updates: any) => {
        const newValue = { ...parsedValue, ...updates };
        onValueChange(node.id, JSON.stringify(newValue));
    }, [node.id, onValueChange, parsedValue]);

    const handleUiStateUpdate = useCallback((updates: Partial<AnalyzerUiState>) => {
        handleValueUpdate({ uiState: { ...uiState, ...updates } });
    }, [handleValueUpdate, uiState]);
    
    const handleVerticalDividerMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        const startX = e.clientX;
        const startPos = verticalDividerPos;
        const parent = (e.target as HTMLElement).parentElement;
        if (!parent) return;
        const totalWidth = parent.offsetWidth;
        const currentScale = viewTransform.scale;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const dx = (moveEvent.clientX - startX) / currentScale;
            const newPos = startPos + (dx / totalWidth) * 100;
            setVerticalDividerPos(Math.max(20, Math.min(80, newPos)));
        };
        const handleMouseUp = () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    // Smart Range Logic
    const handleStartSceneChange = (val: number) => {
        const newStart = Math.max(1, val);
        const updates: any = { startSceneNumber: newStart };
        // Smart Push: If start exceeds end, move end up
        if (endSceneNumber !== null && newStart > endSceneNumber) {
            updates.endSceneNumber = newStart;
        }
        handleValueUpdate(updates);
    };

    const handleEndSceneChange = (val: number | null) => {
        if (val === null) {
            handleValueUpdate({ endSceneNumber: null });
            return;
        }
        const newEnd = Math.max(1, val);
        const updates: any = { endSceneNumber: newEnd };
        
        // Smart Pull: If end drops below start, move start down
        // Treat null start as 1
        const currentStart = startSceneNumber || 1;
        if (newEnd < currentStart) {
            updates.startSceneNumber = newEnd;
        }
        handleValueUpdate(updates);
    };

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

    const totalFramesGenerated = useMemo(() => {
        return scenes.reduce((acc: number, scene: any) => acc + (scene.frames?.length || 0), 0);
    }, [scenes]);

    const currentRangeText = useMemo(() => {
        if (startSceneNumber || endSceneNumber) {
            return `${t('node.content.scene_plural')}: ${startSceneNumber || 1}-${endSceneNumber || 'End'}`;
        }
        return '';
    }, [startSceneNumber, endSceneNumber, t]);


    // Refresh Upstream - Strict Sync Logic
    const refreshUpstream = useCallback(() => {
         if (!connections || !getUpstreamTextValue) return;
         const inputConnection = connections.find(c => c.toNodeId === node.id);
         if (inputConnection) {
             const text = getUpstreamTextValue(inputConnection.fromNodeId, inputConnection.fromHandleId);
             try {
                 const parsed = JSON.parse(text);
                 setUpstreamScriptData({
                     summary: parsed.summary || '',
                     scenes: parsed.scenes || [],
                     generatedStyle: parsed.generatedStyle || parsed.visualStyle || ''
                 });

                 // Auto-collapse incoming scenes immediately
                 if (parsed.scenes && Array.isArray(parsed.scenes)) {
                     setCollapsedInputScenes(new Set(parsed.scenes.map((_: any, i: number) => i)));
                 }

                 // Gather new upstream characters
                 let upstreamChars: any[] = [];
                 if (Array.isArray(parsed.detailedCharacters)) upstreamChars = parsed.detailedCharacters;
                 else if (Array.isArray(parsed.characters)) upstreamChars = parsed.characters;
                 else if (parsed.name) upstreamChars = [parsed];

                 // Get current local characters
                 const currentLocalChars = parsedValue.characters || [];
                 
                 // Filter out ANY characters that were previously linked
                 // We keep only the "Manual" characters (those without isLinked: true)
                 const manualCharacters = currentLocalChars.filter((c: any) => !c.isLinked);

                 // Prepare new linked characters from upstream
                 const newLinkedCharacters = upstreamChars.map((upChar: any) => {
                     // Strip deprecated alias
                     const { alias, ...rest } = upChar;
                     return {
                         name: rest.name || 'Unknown',
                         id: rest.id || `linked-${inputConnection.fromNodeId}-${rest.index || rest.name || Math.random()}`,
                         index: rest.index, 
                         // Always sync content from upstream for consistency
                         imagePrompt: rest.prompt || rest.imagePrompt || '',
                         fullDescription: rest.fullDescription || rest.description || '',
                         isLinked: true
                     };
                 });

                 // Combine Manual + New Linked
                 let mergedChars = [...manualCharacters, ...newLinkedCharacters];

                 // CRITICAL: Strict Sort and Re-Index to Entity-N
                 mergedChars.sort((a, b) => {
                     const getNum = (str: string) => {
                         const match = (str || '').match(/(\d+)/);
                         return match ? parseInt(match[1], 10) : 99999;
                     };
                     
                     // Prioritize index but ignore prefix for sorting
                     const idxA = a.index || '';
                     const idxB = b.index || '';
                     
                     return getNum(idxA) - getNum(idxB);
                 });
                 
                 // Force strict Entity-N indexing
                 mergedChars = mergedChars.map((char, i) => ({
                    ...char,
                    index: `Entity-${i + 1}`
                 }));

                 // Only update if substantive change to avoid loop
                 if (JSON.stringify(mergedChars) !== JSON.stringify(currentLocalChars)) {
                    handleValueUpdate({ characters: mergedChars });
                 }

             } catch {
                 setUpstreamScriptData(null);
             }
         } else {
             setUpstreamScriptData(null);
             // If disconnected, remove all linked characters
             const currentLocalChars = parsedValue.characters || [];
             const manualCharacters = currentLocalChars.filter((c: any) => !c.isLinked);
             
             if (currentLocalChars.length !== manualCharacters.length) {
                 handleValueUpdate({ characters: manualCharacters });
             }
         }
    }, [connections, getUpstreamTextValue, node.id, parsedValue.characters, handleValueUpdate]);

    // Automatically trigger refresh when input data changes string value
    useEffect(() => { 
        const timer = setTimeout(() => {
            refreshUpstream(); 
        }, 100); // Small debounce to ensure upstream data has settled
        return () => clearTimeout(timer);
    }, [refreshUpstream, inputData]);

    const handleAnalyzeClick = () => {
        refreshUpstream(); // Trigger a data refresh first
        // Slight delay to allow state to settle
        setTimeout(() => onAnalyzeScript(node.id), 50);
    };

    // Range Handlers (Previous/Next +5 Logic)
    const handleRangeNext = () => {
        const currentStart = startSceneNumber || 1;
        const nextStart = Math.ceil(currentStart / 5) * 5 + 1;
        const nextEnd = nextStart + 4;
        handleValueUpdate({ startSceneNumber: nextStart, endSceneNumber: nextEnd });
    };

    const handleRangePrev = () => {
        const currentStart = startSceneNumber || 1;
        const prevStart = Math.max(1, Math.floor((currentStart - 1) / 5) * 5 - 4);
        const prevEnd = prevStart + 4;
        handleValueUpdate({ startSceneNumber: prevStart, endSceneNumber: prevEnd });
    };

    const handleClearRange = () => handleValueUpdate({ startSceneNumber: null, endSceneNumber: null });

    // Collapsing helpers
    const handleToggleAllInputScenes = useCallback(() => {
        if (!upstreamScriptData?.scenes) return;
        if (collapsedInputScenes.size === upstreamScriptData.scenes.length) {
            setCollapsedInputScenes(new Set());
        } else {
            setCollapsedInputScenes(new Set(upstreamScriptData.scenes.map((_: any, i: number) => i)));
        }
    }, [upstreamScriptData, collapsedInputScenes]);

    const handleToggleAllOutputScenes = useCallback(() => {
        if (collapsedOutputScenes.size === scenes.length) {
            // Expanding All Scenes
            setCollapsedOutputScenes(new Set());
            // Do not change frame collapse state
        } else {
            // Collapsing All Scenes
            setCollapsedOutputScenes(new Set(scenes.map((_: any, i: number) => i)));
            
            // Also Collapse All Frames and Contexts
            const allFrameIds = new Set<string>();
            const allContextIndices = new Set<number>();
            scenes.forEach((s: any, sIdx: number) => {
                allContextIndices.add(sIdx);
                (s.frames || []).forEach((f: any) => allFrameIds.add(`${sIdx}-${f.frameNumber}`));
            });
            setCollapsedFrames(allFrameIds);
            setCollapsedContexts(allContextIndices);
        }
    }, [scenes, collapsedOutputScenes]);

    const handleToggleAllFramesCollapse = useCallback(() => {
         const allFrameIds = scenes.flatMap((s: any, sIdx: number) => s.frames.map((f: any) => `${sIdx}-${f.frameNumber}`));
         const allContextIndices = scenes.map((_: any, i: number) => i);
         
         if (collapsedFrames.size === allFrameIds.length) {
             // Expand All
             setCollapsedFrames(new Set());
             setCollapsedContexts(new Set());
         } else {
             // Collapse All
             setCollapsedFrames(new Set(allFrameIds));
             setCollapsedContexts(new Set(allContextIndices));
         }
    }, [scenes, collapsedFrames]);

    const handleSceneContextChange = useCallback((sceneIndex: number, newValue: string) => {
        const newScenes = [...scenes];
        newScenes[sceneIndex] = { ...newScenes[sceneIndex], sceneContext: newValue };
        handleValueUpdate({ scenes: newScenes });
    }, [scenes, handleValueUpdate]);

    const handleFramePartChange = useCallback((sceneIndex: number, frameIndex: number, partKey: string, value: any) => {
        const newScenes = [...scenes];
        const scene = { ...newScenes[sceneIndex] };
        const frames = [...(scene.frames || [])];
        frames[frameIndex] = { ...frames[frameIndex], [partKey]: value };
        scene.frames = frames;
        newScenes[sceneIndex] = scene;
        handleValueUpdate({ scenes: newScenes });
    }, [scenes, handleValueUpdate]);

    const handleAddFrame = useCallback((sceneIndex: number, frameIndex?: number) => {
         const newScenes = [...scenes];
         const scene = { ...newScenes[sceneIndex] };
         const frames = [...(scene.frames || [])];
         const newFrame = {
             frameNumber: 0,
             characters: [],
             duration: 2,
             imagePrompt: '',
             environmentPrompt: '',
             videoPrompt: '',
             shotType: 'WS'
         };
         if (frameIndex !== undefined) frames.splice(frameIndex + 1, 0, newFrame);
         else frames.push(newFrame);
         
         scene.frames = frames.map((f: any, i: number) => ({...f, frameNumber: i + 1}));
         newScenes[sceneIndex] = scene;
         handleValueUpdate({ scenes: newScenes });
    }, [scenes, handleValueUpdate]);

    const handleAddOutputScene = useCallback(() => {
        const newScenes = [...scenes];
        const nextSceneNum = scenes.length + 1;
        newScenes.push({
            sceneNumber: nextSceneNum,
            title: `Scene ${nextSceneNum}`,
            description: '',
            frames: [],
            sceneContext: ''
        });
        handleValueUpdate({ scenes: newScenes });
    }, [scenes, handleValueUpdate]);

    const handleRenameOutputScene = useCallback((sceneIndex: number, newTitle: string) => {
        const newScenes = [...scenes];
        if (newScenes[sceneIndex]) {
            newScenes[sceneIndex] = { ...newScenes[sceneIndex], title: newTitle };
            handleValueUpdate({ scenes: newScenes });
        }
    }, [scenes, handleValueUpdate]);

    const handleReorderFrame = useCallback((sceneIndex: number, frameIndex: number, dir: 'up' | 'down') => {
        const newScenes = [...scenes];
        const scene = { ...newScenes[sceneIndex] };
        const frames = [...(scene.frames || [])];
        if (dir === 'up') {
            if (frameIndex <= 0) return;
            [frames[frameIndex], frames[frameIndex - 1]] = [frames[frameIndex - 1], frames[frameIndex]];
        } else {
            if (frameIndex >= frames.length - 1) return;
            [frames[frameIndex], frames[frameIndex + 1]] = [frames[frameIndex + 1], frames[frameIndex]];
        }
        scene.frames = frames.map((f: any, i: number) => ({...f, frameNumber: i + 1}));
        newScenes[sceneIndex] = scene;
        handleValueUpdate({ scenes: newScenes });
    }, [scenes, handleValueUpdate]);

    const handleDeleteFrame = useCallback((sceneIndex: number, frameIndex: number) => {
        const newScenes = [...scenes];
        const scene = { ...newScenes[sceneIndex] };
        const frames = (scene.frames || []).filter((_: any, i: number) => i !== frameIndex);
        scene.frames = frames.map((f: any, i: number) => ({...f, frameNumber: i + 1}));
        newScenes[sceneIndex] = scene;
        handleValueUpdate({ scenes: newScenes });
    }, [scenes, handleValueUpdate]);
    
    const handleDeleteScene = useCallback((sceneIndex: number) => {
        const newScenes = scenes.filter((_, i) => i !== sceneIndex);
        handleValueUpdate({ scenes: newScenes });
    }, [scenes, handleValueUpdate]);

    const handleCopy = useCallback((text: string) => {
        navigator.clipboard.writeText(text);
        addToast(t('toast.copied'), 'success');
    }, [addToast, t]);

    const handleFrameClick = useCallback((e: React.MouseEvent, frameUniqueId: string) => {
        e.stopPropagation();
        setSelectedFrames(prev => {
            const newSet = new Set(e.shiftKey ? prev : []);
            if (newSet.has(frameUniqueId)) newSet.delete(frameUniqueId);
            else newSet.add(frameUniqueId);
            return newSet;
        });
    }, []);
    
    const handleDeleteCharacter = useCallback((id: string | number) => {
        const newChars = characters.filter((c: any) => c.id !== id && c.index !== id);
        handleValueUpdate({ characters: newChars });
    }, [characters, handleValueUpdate]);

    return (
        <div className="flex flex-col h-full">
             <div className="flex flex-col gap-2 mb-2 flex-shrink-0">
                <div className="flex items-center space-x-2">
                     {/* Model Switcher */}
                    <div className="flex flex-shrink-0 gap-1 h-10 select-none bg-gray-900/50 rounded-lg p-0.5">
                        <Tooltip title={t('tooltip.model.flash')} position="top" className="h-full flex">
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
                        <Tooltip title={t('tooltip.model.pro')} position="top" className="h-full flex">
                            <button 
                                onClick={() => handleValueUpdate({ model: 'gemini-3-pro-preview' })} 
                                className={`px-3 h-full rounded-md text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center ${
                                    model === 'gemini-3-pro-preview' 
                                    ? 'bg-emerald-600 text-white shadow-sm' 
                                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                                }`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                   <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                </svg>
                                PRO
                            </button>
                        </Tooltip>
                    </div>

                    {/* Language Switcher */}
                    <div className="flex flex-shrink-0 gap-1 h-10 select-none bg-gray-900/50 rounded-lg p-0.5">
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
                        onClick={isLoading ? onStopGeneration : handleAnalyzeClick} 
                        disabled={isStopping} 
                        className={`flex-grow h-10 px-4 font-bold text-xs uppercase tracking-wide text-white rounded-lg transition-all duration-200 shadow-sm flex items-center justify-center ${
                            isStopping 
                            ? 'bg-yellow-600 hover:bg-yellow-500' 
                            : (isLoading 
                                ? 'bg-cyan-600 hover:bg-cyan-500' // Blue color during generation
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
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                        )}
                        {isStopping ? t('node.action.stopping') : (isLoading ? t('node.content.analyzing') : t('node.content.analyzeScript'))}
                    </button>
                </div>

                <div className="bg-gray-900/50 rounded-md flex-shrink-0 flex flex-col">
                     {/* Scene Range Controls with Smart Logic */}
                     <div className="p-2 border-b border-gray-800 flex items-center justify-start gap-4">
                        <div className="flex items-center space-x-1 text-xs text-gray-400">
                            <label className="whitespace-nowrap">{t('node.content.analyzeFromScene')}</label>
                            <div className="relative w-14 h-7">
                                <input 
                                    type="number" 
                                    min="1" 
                                    placeholder="1" 
                                    value={startSceneNumber || ''} 
                                    onChange={e => handleStartSceneChange(parseInt(e.target.value) || 1)} 
                                    className="w-full h-full pl-2 pr-4 bg-gray-800 text-white rounded-md text-center focus:ring-1 focus:ring-emerald-500 focus:outline-none appearance-none text-xs" 
                                    onMouseDown={e => e.stopPropagation()} 
                                />
                                <div className="absolute right-0 top-0 bottom-0 w-4 flex flex-col border-l border-gray-700">
                                    <button 
                                        onClick={() => handleStartSceneChange((startSceneNumber || 0) + 1)} 
                                        className="h-1/2 hover:bg-gray-700 text-gray-500 hover:text-white flex items-center justify-center rounded-tr-md focus:outline-none"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-2 w-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                                    </button>
                                    <button 
                                        onClick={() => handleStartSceneChange(Math.max(1, (startSceneNumber || 0) - 1))} 
                                        className="h-1/2 hover:bg-gray-700 text-gray-500 hover:text-white flex items-center justify-center rounded-br-md border-t border-gray-700 focus:outline-none"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-2 w-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                    </button>
                                </div>
                            </div>
                            <label className="whitespace-nowrap">{t('node.content.analyzeUpToScene')}</label>
                            <div className="relative w-16 h-7">
                                <input 
                                    type="number" 
                                    min="1" 
                                    placeholder={t('node.content.endPlaceholder')} 
                                    value={endSceneNumber || ''} 
                                    onChange={e => handleEndSceneChange(e.target.value ? parseInt(e.target.value) : null)} 
                                    className="w-full h-full pl-2 pr-4 bg-gray-800 text-white rounded-md text-center focus:ring-1 focus:ring-emerald-500 focus:outline-none appearance-none text-xs" 
                                    onMouseDown={e => e.stopPropagation()} 
                                />
                                <div className="absolute right-0 top-0 bottom-0 w-4 flex flex-col border-l border-gray-700">
                                    <button 
                                        onClick={() => handleEndSceneChange((endSceneNumber || (startSceneNumber || 1)) + 1)} 
                                        className="h-1/2 hover:bg-gray-700 text-gray-500 hover:text-white flex items-center justify-center rounded-tr-md focus:outline-none"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-2 w-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                                    </button>
                                    <button 
                                        onClick={() => handleEndSceneChange((endSceneNumber || (startSceneNumber || 1)) - 1)} 
                                        className="h-1/2 hover:bg-gray-700 text-gray-500 hover:text-white flex items-center justify-center rounded-br-md border-t border-gray-700 focus:outline-none"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-2 w-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                    </button>
                                </div>
                            </div>
                        </div>

                         <div className="flex items-center space-x-1">
                            <button onClick={handleRangePrev} className="p-1 text-gray-400 hover:text-white bg-gray-800 rounded hover:bg-gray-700" title="-5">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                            </button>
                            <button onClick={handleRangeNext} className="p-1 text-gray-400 hover:text-white bg-gray-800 rounded hover:bg-gray-700" title="+5">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                            </button>
                            <button onClick={handleClearRange} className="p-1 text-gray-400 hover:text-red-400 bg-gray-800 rounded hover:bg-gray-700 ml-1" title="Clear Range">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        
                        {/* Min / Max Frames Inputs */}
                        <div className="flex items-center space-x-1 text-xs text-gray-400 border-l border-gray-700 pl-4">
                            <label className="whitespace-nowrap font-bold text-emerald-500/80 uppercase tracking-tight">{t('node.content.framesPerScene')}</label>
                            <input 
                                type="number" 
                                min="1" 
                                placeholder={t('node.content.minFrames')} 
                                value={minFrames || ''} 
                                onChange={e => handleValueUpdate({ minFrames: e.target.value ? parseInt(e.target.value) : null })} 
                                className="w-10 p-1 bg-gray-800 text-white rounded-md text-center focus:ring-1 focus:ring-emerald-500 focus:outline-none appearance-none text-[10px]" 
                                onMouseDown={e => e.stopPropagation()} 
                                title="Minimum frames per scene"
                            />
                            <span className="text-gray-600">-</span>
                            <input 
                                type="number" 
                                min="1" 
                                placeholder={t('node.content.maxFrames')} 
                                value={maxFrames || ''} 
                                onChange={e => handleValueUpdate({ maxFrames: e.target.value ? parseInt(e.target.value) : null })} 
                                className="w-10 p-1 bg-gray-800 text-white rounded-md text-center focus:ring-1 focus:ring-emerald-500 focus:outline-none appearance-none text-[10px]" 
                                onMouseDown={e => e.stopPropagation()} 
                                title="Maximum frames per scene"
                            />
                        </div>
                    </div>
                    
                    <div className="px-2 pb-2 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-gray-800">
                        <div className="flex items-center gap-2 cursor-pointer group" onClick={(e) => { e.stopPropagation(); if (!isLoading) handleValueUpdate({ batchProcessing: !batchProcessing }); }}>
                            <CustomCheckbox
                                id={`batch-processing-${node.id}`}
                                checked={batchProcessing}
                                onChange={(checked) => handleValueUpdate({ batchProcessing: checked })}
                                disabled={isLoading}
                                className="h-3.5 w-3.5 pointer-events-none"
                            />
                            <label 
                                className="text-xs text-gray-400 cursor-pointer select-none font-medium group-hover:text-emerald-400 transition-colors" 
                                title={t('node.content.batchProcessingInfo')}
                            >
                                {t('node.content.batchProcessing')}
                            </label>
                            <SearchTrigger id={SCRIPT_ANALYZER_INSTRUCTIONS.BATCH_PROCESSING.id} onClick={handleSearchClick} />
                        </div>

                         <div className="flex items-center gap-2 cursor-pointer group" onClick={(e) => { e.stopPropagation(); if (!isLoading) handleValueUpdate({ thinkingEnabled: !thinkingEnabled }); }}>
                            <CustomCheckbox
                                id={`thinking-${node.id}`}
                                checked={thinkingEnabled}
                                onChange={(checked) => handleValueUpdate({ thinkingEnabled: checked })}
                                disabled={isLoading}
                                className="h-3.5 w-3.5 pointer-events-none"
                            />
                            <label className="text-xs text-gray-400 cursor-pointer select-none font-medium group-hover:text-cyan-400 transition-colors">
                                {t('node.content.thinkingEnabled')}
                            </label>
                            <SearchTrigger id="thinking_mode" onClick={handleSearchClick} />
                        </div>

                        <div 
                            className="flex items-center gap-2 cursor-pointer group"
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                if (!isLoading) handleValueUpdate({ shotFilter: shotFilter === 'wideOnly' ? 'all' : 'wideOnly' }); 
                            }}
                        >
                            <CustomCheckbox 
                                id={`shot-filter-wide-${node.id}`}
                                checked={shotFilter === 'wideOnly'}
                                onChange={(checked) => handleValueUpdate({ shotFilter: checked ? 'wideOnly' : 'all' })}
                                disabled={isLoading}
                                className="h-3.5 w-3.5 pointer-events-none"
                            />
                             <label 
                                className="text-xs text-gray-400 cursor-pointer select-none font-medium group-hover:text-cyan-400 transition-colors"
                            >
                                {t('node.content.shotFilter.wideOnly')}
                            </label>
                            <SearchTrigger id={SCRIPT_ANALYZER_INSTRUCTIONS.SHOT_FILTER_WIDE.id} onClick={handleSearchClick} />
                        </div>

                        <div className="flex items-center gap-2 cursor-pointer group" onClick={(e) => { e.stopPropagation(); if (!isLoading) handleValueUpdate({ extendedAnalysis: !extendedAnalysis }); }}>
                            <CustomCheckbox
                                id={`extended-analysis-${node.id}`}
                                checked={extendedAnalysis}
                                onChange={(checked) => handleValueUpdate({ extendedAnalysis: checked })}
                                disabled={isLoading}
                                className="h-3.5 w-3.5 pointer-events-none"
                            />
                            <label className="text-xs text-gray-400 cursor-pointer select-none font-medium group-hover:text-cyan-400 transition-colors">
                                {t('node.content.extendedAnalysis')}
                            </label>
                            <SearchTrigger id={SCRIPT_ANALYZER_INSTRUCTIONS.EXTENDED_VISUALS.id} onClick={handleSearchClick} />
                        </div>

                         <div className="flex items-center gap-2 cursor-pointer group" onClick={(e) => { e.stopPropagation(); if (!isLoading) handleValueUpdate({ microActionBreakdown: !microActionBreakdown }); }}>
                            <CustomCheckbox
                                id={`micro-action-${node.id}`}
                                checked={microActionBreakdown}
                                onChange={(checked) => handleValueUpdate({ microActionBreakdown: checked })}
                                disabled={isLoading}
                                className="h-3.5 w-3.5 pointer-events-none"
                            />
                            <label className="text-xs text-gray-400 cursor-pointer select-none font-medium group-hover:text-cyan-400 transition-colors">
                                {t('node.content.microActionBreakdown')}
                            </label>
                            <SearchTrigger id={SCRIPT_ANALYZER_INSTRUCTIONS.ACTION_PHASE_BREAKDOWN.id} onClick={handleSearchClick} />
                        </div>

                         <div className="flex items-center gap-2 cursor-pointer group" onClick={(e) => { e.stopPropagation(); if (!isLoading) handleValueUpdate({ livingWorldEnabled: !livingWorldEnabled }); }}>
                            <CustomCheckbox
                                id={`living-world-${node.id}`}
                                checked={livingWorldEnabled}
                                onChange={(checked) => handleValueUpdate({ livingWorldEnabled: checked })}
                                disabled={isLoading}
                                className="h-3.5 w-3.5 pointer-events-none"
                            />
                            <label className="text-xs text-gray-400 cursor-pointer select-none font-medium group-hover:text-emerald-400 transition-colors">
                                {t('instruction.rule_living_world')}
                            </label>
                            <SearchTrigger id={SCRIPT_ANALYZER_INSTRUCTIONS.LIVING_WORLD.id} onClick={handleSearchClick} />
                        </div>

                        <div className="flex items-center gap-2 cursor-pointer group" onClick={(e) => { e.stopPropagation(); if (!isLoading) handleValueUpdate({ anthroEnabled: !anthroEnabled }); }}>
                            <CustomCheckbox
                                id={`anthro-${node.id}`}
                                checked={anthroEnabled}
                                onChange={(checked) => handleValueUpdate({ anthroEnabled: checked })}
                                disabled={isLoading}
                                className="h-3.5 w-3.5 pointer-events-none"
                            />
                            <label className="text-xs text-gray-400 cursor-pointer select-none font-medium group-hover:text-cyan-400 transition-colors">
                                {t('node.content.anthroEnabled')}
                            </label>
                            <SearchTrigger id={SCRIPT_ANALYZER_INSTRUCTIONS.ANTHRO_LOGIC.id} onClick={handleSearchClick} />
                        </div>

                        <div className="flex items-center gap-2 cursor-pointer group" onClick={(e) => { e.stopPropagation(); if (!isLoading) handleValueUpdate({ subscribeEnhancement: !subscribeEnhancement }); }}>
                            <CustomCheckbox
                                id={`subscribe-${node.id}`}
                                checked={subscribeEnhancement}
                                onChange={(checked) => handleValueUpdate({ subscribeEnhancement: checked })}
                                disabled={isLoading}
                                className="h-3.5 w-3.5 pointer-events-none"
                            />
                            <label className="text-xs text-gray-400 cursor-pointer select-none font-medium group-hover:text-cyan-400 transition-colors">
                                {t('node.content.subscribeEnhancement')}
                            </label>
                            <SearchTrigger id={SCRIPT_ANALYZER_INSTRUCTIONS.SUBSCRIBE_LOGIC.id} onClick={handleSearchClick} />
                        </div>
                    </div>
                    
                    {/* STATS BAR */}
                    <div className="p-2 flex items-center justify-between text-xs border-t border-gray-800">
                        <div className="font-semibold text-emerald-400">
                             {t('node.content.frames_analyzed', { count: totalFramesGenerated })}
                        </div>
                        
                        <div className="flex items-center gap-4 text-gray-400">
                             {currentRangeText && (
                                <div className="text-gray-500 font-medium">
                                    {currentRangeText}
                                </div>
                             )}

                             {generationProgress && (
                                 <>
                                    {isLoading ? (
                                        <div className="text-yellow-400 animate-pulse font-mono">
                                            {t('node.content.status.batch', { current: generationProgress.current, total: generationProgress.total })}
                                        </div>
                                    ) : null}

                                    <div className="text-gray-400 font-mono text-[10px]">
                                        Время (сек): (пред: {timers.last}) / Тек: {timers.current} / Всего: {timers.total}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                     {/* Progress Bar */}
                     {(isLoading && generationProgress) && (
                        <div className="w-full h-1 bg-gray-800 rounded-b-md overflow-hidden border-t border-gray-800">
                            <div 
                                className="h-full bg-emerald-500 transition-all duration-300 ease-out" 
                                style={{ width: `${(generationProgress.current / Math.max(1, generationProgress.total)) * 100}%` }}
                            />
                        </div>
                     )}

                    <SettingsPanel
                        uiState={uiState}
                        onUpdateUiState={handleUiStateUpdate}
                        onUpdateValue={handleValueUpdate}
                        hierarchyEnabled={hierarchyEnabled}
                        mandatoryBgEnabled={mandatoryBgEnabled}
                        statePersistenceEnabled={statePersistenceEnabled}
                        livingWorldEnabled={livingWorldEnabled}
                        extendedAnalysis={extendedAnalysis}
                        microActionBreakdown={microActionBreakdown}
                        batchProcessing={batchProcessing}
                        professionalStoryboard={professionalStoryboard}
                        cinematographyEnabled={cinematographyEnabled}
                        safeGeneration={safeGeneration}
                        thinkingEnabled={thinkingEnabled}
                        shotFilter={shotFilter}
                        anthroEnabled={anthroEnabled}
                        subscribeEnhancement={subscribeEnhancement}
                        anatomicalStrictness={anatomicalStrictness}
                        propConsistency={propConsistency} // New Prop
                        t={t}
                        initialHeight={settingsPaneHeight || 380}
                        onHeightChange={(h) => handleValueUpdate({ settingsPaneHeight: h })}
                        scale={viewTransform.scale}
                        model={model}
                        targetLanguage={targetLanguage}
                        // Use minFrames/maxFrames here for display logic in brick
                        minFrames={minFrames}
                        maxFrames={maxFrames}
                        framesPerScene={framesPerScene} // ADDED PROP
                        targetScrollId={targetScrollId}
                        onSetTargetScrollId={setTargetScrollId}
                    />
                </div>
            </div>

            <CharactersPanel 
                uiState={uiState}
                initialHeight={characterPaneHeight || 170}
                onHeightChange={(h) => handleValueUpdate({ characterPaneHeight: h })}
                scale={viewTransform.scale}
                onUpdateUiState={handleUiStateUpdate}
                onUpdateValue={handleValueUpdate}
                onApplyAliases={onApplyAliases}
                nodeId={node.id}
                autoIndexCharacters={autoIndexCharacters}
                charactersToDisplay={characters}
                selectedCharacters={selectedCharacters}
                collapsedCharacters={collapsedCharacters}
                areAllCharactersCollapsed={characters.length > 0 && collapsedCharacters.size === characters.length}
                onToggleAllCharacters={() => {
                     if (collapsedCharacters.size === characters.length) setCollapsedCharacters(new Set());
                     else setCollapsedCharacters(new Set<string | number>(characters.map((c: any) => c.id || c.name)));
                }}
                handleCharacterClick={(e, id) => {
                     setSelectedCharacters(prev => {
                        const newSet = new Set(prev);
                        if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
                        return newSet;
                    });
                }}
                handleToggleCharacterCollapse={(id) => {
                    setCollapsedCharacters(prev => {
                        const newSet = new Set(prev);
                        if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
                        return newSet;
                    });
                }}
                updateCharacter={(id, field, value) => {
                     const newChars = characters.map((c: any) => (c.id === id || c.index === id) ? { ...c, [field]: value } : c);
                     handleValueUpdate({ characters: newChars });
                }}
                visualStyle={visualStyle}
                upstreamVisualStyle={upstreamScriptData?.generatedStyle || ''}
                deselectAllNodes={deselectAllNodes}
                t={t}
                onEmbedCharacter={(char) => {
                    // Logic to "Embed" - convert linked to manual by removing isLinked
                    // This creates a detached copy within the analyzer
                    const newChars = characters.map((c: any) => {
                        if (c.id === char.id || c.index === char.index) {
                             // Create new detached copy
                             const { isLinked, ...rest } = c;
                             return { ...rest, id: `detached-${Date.now()}-${c.id || Math.random()}` };
                        }
                        return c;
                    });
                    handleValueUpdate({ characters: newChars });
                }}
                onSyncCharacters={refreshUpstream}
                isSyncAvailable={true}
                onMoveCharacter={() => {}} 
                onClearCharacters={() => handleValueUpdate({ characters: [] })}
                onDeleteCharacter={handleDeleteCharacter}
            />
            
            <div className="flex-grow flex flex-row min-h-0 items-stretch bg-gray-900 rounded-b-md overflow-hidden border-t border-gray-600">
                <InputScriptsPanel 
                    width={`calc(${verticalDividerPos}% - 0.5rem)`} 
                    upstreamScriptData={upstreamScriptData}
                    collapsedInputScenes={collapsedInputScenes}
                    isSummaryCollapsed={isSummaryCollapsed}
                    onToggleInputSceneCollapse={(idx) => {
                        setCollapsedInputScenes(prev => {
                            const newSet = new Set(prev);
                            if (newSet.has(idx)) newSet.delete(idx); else newSet.add(idx);
                            return newSet;
                        });
                    }}
                    setIsSummaryCollapsed={setIsSummaryCollapsed}
                    t={t}
                    onToggleAllInputScenes={handleToggleAllInputScenes}
                    areAllInputScenesCollapsed={upstreamScriptData?.scenes?.length > 0 && collapsedInputScenes.size === upstreamScriptData.scenes.length}
                />
                
                <div 
                    onMouseDown={handleVerticalDividerMouseDown} 
                    className="w-2 mx-1 cursor-col-resize bg-gray-600 hover:bg-emerald-500 transition-colors flex-shrink-0 rounded-full" 
                />

                <OutputFramesPanel 
                     width={`calc(${100 - verticalDividerPos}% - 0.5rem)`} 
                     scenes={scenes}
                     characters={characters}
                     areAllOutputScenesCollapsed={scenes.length > 0 && collapsedOutputScenes.size === scenes.length}
                     areAllFramesCollapsed={scenes.length > 0 && collapsedFrames.size > 0} 
                     collapsedOutputScenes={collapsedOutputScenes}
                     collapsedFrames={collapsedFrames}
                     collapsedContexts={collapsedContexts}
                     selectedFrames={selectedFrames}
                     onToggleAllOutputScenes={handleToggleAllOutputScenes}
                     onToggleAllFramesCollapse={handleToggleAllFramesCollapse}
                     onToggleOutputSceneCollapse={(idx) => {
                         setCollapsedOutputScenes(prev => {
                            const newSet = new Set(prev);
                            if (newSet.has(idx)) newSet.delete(idx); else newSet.add(idx);
                            return newSet;
                        });
                     }}
                     onToggleSceneContextCollapse={(idx) => {
                          setCollapsedContexts(prev => {
                            const newSet = new Set(prev);
                            if (newSet.has(idx)) newSet.delete(idx); else newSet.add(idx);
                            return newSet;
                        });
                     }}
                     onToggleCollapse={(id) => {
                          setCollapsedFrames(prev => {
                            const newSet = new Set(prev);
                            if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
                            return newSet;
                        });
                     }}
                     onAddFrame={handleAddFrame}
                     onAddScene={handleAddOutputScene}
                     onRenameScene={handleRenameOutputScene}
                     onReorderFrame={handleReorderFrame}
                     onDeleteFrame={handleDeleteFrame}
                     onFramePartChange={handleFramePartChange}
                     onSceneContextChange={handleSceneContextChange}
                     onFrameClick={handleFrameClick}
                     onCopy={handleCopy}
                     handleTextFocus={deselectAllNodes}
                     t={t}
                     onDeleteScene={handleDeleteScene}
                />
            </div>
        </div>
    );
};

export default ScriptAnalyzerNode;
