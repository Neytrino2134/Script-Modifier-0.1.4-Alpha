import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import type { NodeContentProps } from '../../../types';
import { useAppContext } from '../../../contexts/Context';
import { PROMPT_MODIFIER_INSTRUCTIONS } from '../../../utils/prompts/promptModifier';
import { SettingsPanel } from './SettingsPanel';
import { CharactersStylePanel } from './CharactersStylePanel';
import { InputFramesPanel } from './InputFramesPanel';
import { OutputPromptsPanel } from './OutputPromptsPanel';
import { useLanguage } from '../../../localization';
import Tooltip from '../../ui/Tooltip';
import CustomCheckbox from '../../ui/CustomCheckbox';

const ScriptPromptModifierNode: React.FC<NodeContentProps> = ({
    node, onValueChange, onModifyScriptPrompts, isModifyingScriptPrompts, onExecuteFullChain, isExecutingChain, onStopGeneration, isStopping, t, getUpstreamTextValue, connections, connectedInputs, onApplyAliases, addToast, saveDataToCatalog, deselectAllNodes, inputData
}) => {
    const { language } = useLanguage();
    const { setConfirmInfo, viewTransform } = useAppContext();
    const isLoading = isModifyingScriptPrompts === node.id;
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [verticalDividerPos, setVerticalDividerPos] = useState(50);
    const nodeContentRef = React.useRef<HTMLDivElement>(null);
    const [upstreamAnalyzerData, setUpstreamAnalyzerData] = useState<null | { scenes: any[]; characters: any[]; visualStyle?: string; generatedStyle?: string; detailedCharacters?: any[]; }>(null);
    const [upstreamStyleValue, setUpstreamStyleValue] = useState('');
    const [collapsedPrompts, setCollapsedPrompts] = useState<Set<string>>(new Set());
    const [collapsedInputFrames, setCollapsedInputFrames] = useState<Set<string>>(new Set());
    const [collapsedOutputScenes, setCollapsedOutputScenes] = useState<Set<string>>(new Set()); 
    const [collapsedInputScenes, setCollapsedInputScenes] = useState<Set<number>>(new Set());
    const [collapsedInputContexts, setCollapsedInputContexts] = useState<Set<number>>(new Set());
    const [timers, setTimers] = useState<{ current: number; total: number; last: number }>({ current: 0, total: 0, last: 0 });
    
    // State for highlighting instruction bricks
    const [targetScrollId, setTargetScrollId] = useState<string | null>(null);
    
    const [localSettingsHeight, setLocalSettingsHeight] = useState<number>(200);

    const isStyleConnected = connectedInputs?.has('style');
    // Check if main data input is connected
    const isDataConnected = !!connections.find(c => c.toNodeId === node.id && (c.toHandleId === 'all-script-analyzer-data' || !c.toHandleId));

    // Determine primary language button (defaults to RU if interface is English to avoid EN/EN duplicate)
    const primaryLang = language === 'en' ? 'ru' : language;

    const parsedValue = useMemo(() => {
        try {
            const parsed = JSON.parse(node.value || '{}');

            let disabledIds = Array.isArray(parsed.disabledInstructionIds) ? [...parsed.disabledInstructionIds] : [];
            // Migration for older nodes or specific toggles being mapped to disabled IDs
            if (!Array.isArray(parsed.disabledInstructionIds)) {
                 if (parsed.processWholeScene === false) disabledIds.push(PROMPT_MODIFIER_INSTRUCTIONS.PROCESS_WHOLE_SCENE.id);
                 if (parsed.generateVideoPrompt === false) disabledIds.push(PROMPT_MODIFIER_INSTRUCTIONS.GENERATE_VIDEO_PROMPT.id);
                 if (parsed.breakIntoParagraphs === false) disabledIds.push(PROMPT_MODIFIER_INSTRUCTIONS.BREAK_PARAGRAPHS.id);
                 
                 if (!parsed.finalPrompts || parsed.finalPrompts.length === 0) {
                     if (!disabledIds.includes(PROMPT_MODIFIER_INSTRUCTIONS.BREAK_PARAGRAPHS.id)) {
                         disabledIds.push(PROMPT_MODIFIER_INSTRUCTIONS.BREAK_PARAGRAPHS.id);
                     }
                 }
                 disabledIds = [...new Set(disabledIds)];
            }
            
            // Migration for character description modes
            let charDescMode = parsed.charDescMode;
            if (!charDescMode) {
                if (parsed.includeFullCharDesc) charDescMode = 'full';
                else if (parsed.includeGeneralCharDesc === false) charDescMode = 'none'; // Explicitly disabled
                else charDescMode = 'general'; // Default fallback
            }

            return {
                finalPrompts: Array.isArray(parsed.finalPrompts) ? parsed.finalPrompts.sort((a: any, b: any) => a.frameNumber - b.frameNumber) : [],
                videoPrompts: Array.isArray(parsed.videoPrompts) ? parsed.videoPrompts.sort((a: any, b: any) => a.frameNumber - b.frameNumber) : [],
                usedCharacters: Array.isArray(parsed.usedCharacters) ? parsed.usedCharacters : [],
                targetLanguage: parsed.targetLanguage || language,
                startFrameNumber: parsed.startFrameNumber || null,
                endFrameNumber: parsed.endFrameNumber || null,
                startSceneNumber: parsed.startSceneNumber || null,
                endSceneNumber: parsed.endSceneNumber || null,
                generationProgress: parsed.generationProgress || null,
                styleOverride: parsed.styleOverride || '',
                characterPaneHeight: parsed.characterPaneHeight || 160,
                model: parsed.model || 'gemini-3-flash-preview',
                disabledInstructionIds: disabledIds,
                charDescMode: charDescMode || 'general',
                safeGeneration: !!parsed.safeGeneration,
                thinkingEnabled: !!parsed.thinkingEnabled, 
                propEnhancementEnabled: parsed.propEnhancementEnabled !== false, // Default true
                uiState: parsed.uiState || { isSettingsCollapsed: true, isCharStyleCollapsed: false },
                settingsPaneHeight: parsed.settingsPaneHeight || 200,
            };
        } catch {
            return { 
                finalPrompts: [], videoPrompts: [], usedCharacters: [], targetLanguage: language, startFrameNumber: null, endFrameNumber: null, startSceneNumber: null, endSceneNumber: null, generationProgress: null, styleOverride: '', characterPaneHeight: 160, model: 'gemini-3-flash-preview', 
                disabledInstructionIds: [PROMPT_MODIFIER_INSTRUCTIONS.BREAK_PARAGRAPHS.id, PROMPT_MODIFIER_INSTRUCTIONS.ANTHRO_REINFORCEMENT.id, PROMPT_MODIFIER_INSTRUCTIONS.SUBSCRIBE_REINFORCEMENT.id, PROMPT_MODIFIER_INSTRUCTIONS.VISUAL_SATURATION.id], // Disable new features by default
                charDescMode: 'general', safeGeneration: false, thinkingEnabled: false, propEnhancementEnabled: true, uiState: { isSettingsCollapsed: true, isCharStyleCollapsed: false }, settingsPaneHeight: 200 
            };
        }
    }, [node.value, language]);

    const { finalPrompts, videoPrompts, usedCharacters, targetLanguage, startFrameNumber, endFrameNumber, startSceneNumber, endSceneNumber, generationProgress, styleOverride, characterPaneHeight: savedPaneHeight, model, disabledInstructionIds, charDescMode, safeGeneration, thinkingEnabled, propEnhancementEnabled, uiState, settingsPaneHeight } = parsedValue;
    
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

    useEffect(() => {
        if (Math.abs((settingsPaneHeight || 200) - localSettingsHeight) > 1) {
            setLocalSettingsHeight(settingsPaneHeight || 200);
        }
    }, [settingsPaneHeight]);
    
    const isProcessWholeScene = !disabledInstructionIds.includes(PROMPT_MODIFIER_INSTRUCTIONS.PROCESS_WHOLE_SCENE.id);
    const isSaturationEnabled = !disabledInstructionIds.includes(PROMPT_MODIFIER_INSTRUCTIONS.VISUAL_SATURATION.id);

    const handleValueUpdate = useCallback((updates: Partial<typeof parsedValue>) => {
        const newValue = { ...parsedValue, ...updates };
        onValueChange(node.id, JSON.stringify(newValue));
    }, [node.id, onValueChange, parsedValue]);

    const handleUiStateUpdate = useCallback((updates: Partial<typeof uiState>) => {
        handleValueUpdate({ uiState: { ...uiState, ...updates } });
    }, [handleValueUpdate, uiState]);

    const handleCopy = useCallback((text: string) => {
        navigator.clipboard.writeText(text);
        addToast(t('toast.copied'), 'success');
    }, [addToast, t]);

    const handleDeletePrompt = useCallback((sceneNumber: number, frameNumber: number) => {
        const newFinalPrompts = finalPrompts.filter((p: any) => !(p.sceneNumber === sceneNumber && p.frameNumber === frameNumber));
        const newVideoPrompts = videoPrompts.filter((p: any) => !(p.sceneNumber === sceneNumber && p.frameNumber === frameNumber));
        handleValueUpdate({ finalPrompts: newFinalPrompts, videoPrompts: newVideoPrompts });
    }, [finalPrompts, videoPrompts, handleValueUpdate]);

    const handleDeleteScenePrompts = useCallback((sceneNumber: number) => {
        const newFinalPrompts = finalPrompts.filter((p: any) => p.sceneNumber !== sceneNumber);
        const newVideoPrompts = videoPrompts.filter((p: any) => p.sceneNumber !== sceneNumber);
        handleValueUpdate({ finalPrompts: newFinalPrompts, videoPrompts: newVideoPrompts });
    }, [finalPrompts, videoPrompts, handleValueUpdate]);

    const refreshUpstreamData = useCallback(async () => {
        setIsRefreshing(true);
        await new Promise(resolve => setTimeout(resolve, 50));
        let newAnalyzerData = null;
        let newStyleValue = '';
        try {
            if (!getUpstreamTextValue || !connections) {
                setUpstreamAnalyzerData(null);
                setUpstreamStyleValue('');
                return { analyzerData: null, styleVal: '' };
            }
            const analyzerConnection = connections.find(c => c.toNodeId === node.id && (c.toHandleId === 'all-script-analyzer-data' || !c.toHandleId));
            if (analyzerConnection) {
                const upstreamJSON = getUpstreamTextValue(analyzerConnection.fromNodeId, analyzerConnection.fromHandleId);
                if (upstreamJSON) {
                    try {
                        const parsed = JSON.parse(upstreamJSON);
                        const effectiveCharacters = Array.isArray(parsed.detailedCharacters) 
                            ? parsed.detailedCharacters 
                            : (Array.isArray(parsed.characters) ? parsed.characters : []);

                        // Sort characters to ensure consistent index order
                        const sortedCharacters = [...effectiveCharacters].sort((a, b) => {
                            const getNum = (str: string) => {
                                const match = (str || '').match(/(\d+)/);
                                return match ? parseInt(match[1], 10) : 99999;
                            };
                            const idxA = a.index || a.alias || '';
                            const idxB = b.index || b.alias || '';
                            return getNum(idxA) - getNum(idxB);
                        });

                        newAnalyzerData = {
                            scenes: Array.isArray(parsed.scenes) ? parsed.scenes : [],
                            characters: sortedCharacters,
                            // Prioritize generatedStyle (from Generator) over visualStyle (which might be Analyzer setting)
                            visualStyle: parsed.visualStyle || parsed.generatedStyle || '',
                            generatedStyle: parsed.generatedStyle,
                            detailedCharacters: parsed.detailedCharacters
                        };
                    } catch { }
                }
            }
            setUpstreamAnalyzerData(newAnalyzerData);
            if (newAnalyzerData?.scenes) {
                 const allKeys = new Set<string>();
                 const allSceneIndices = new Set<number>();
                 const allContextIndices = new Set<number>();
                 newAnalyzerData.scenes.forEach((scene: any, sIdx: number) => {
                    allSceneIndices.add(sIdx);
                    allContextIndices.add(sIdx);
                    (scene.frames || []).forEach((frame: any) => allKeys.add(`${sIdx}-${frame.frameNumber}`));
                 });
                 setCollapsedInputFrames(allKeys);
                 setCollapsedInputScenes(allSceneIndices);
                 setCollapsedInputContexts(allContextIndices);
            }
            const styleConnection = connections.find(c => c.toNodeId === node.id && c.toHandleId === 'style');
            if (styleConnection) {
                newStyleValue = getUpstreamTextValue(styleConnection.fromNodeId, styleConnection.fromHandleId);
            }
            setUpstreamStyleValue(newStyleValue);
        } finally {
            setIsRefreshing(false);
        }
        return { analyzerData: newAnalyzerData, styleVal: newStyleValue };
    }, [connections, getUpstreamTextValue, node.id]);

    useEffect(() => { refreshUpstreamData(); }, [connections, node.id, refreshUpstreamData, inputData]);

    useEffect(() => {
        // Prioritize the generator's style if available
        const analyzerStyle = upstreamAnalyzerData?.generatedStyle || upstreamAnalyzerData?.visualStyle || '';
        if (analyzerStyle && !styleOverride && !isStyleConnected) {
            handleValueUpdate({ styleOverride: analyzerStyle });
        }
    }, [upstreamAnalyzerData, styleOverride, isStyleConnected, handleValueUpdate]);

    useEffect(() => {
        if (upstreamAnalyzerData?.characters) {
            const newUsedChars = upstreamAnalyzerData.characters.map((c: any) => ({
                name: c.name,
                index: c.index || c.alias
            }));
            
            if (JSON.stringify(newUsedChars) !== JSON.stringify(usedCharacters)) {
                handleValueUpdate({ usedCharacters: newUsedChars });
            }
        } else if (!isDataConnected) {
            // Clear usedCharacters if disconnected
            if (usedCharacters.length > 0) {
                 handleValueUpdate({ usedCharacters: [] });
            }
        }
    }, [upstreamAnalyzerData, usedCharacters, handleValueUpdate, isDataConnected]);

    const prevIsModifying = useRef(isModifyingScriptPrompts);
    useEffect(() => {
        if (prevIsModifying.current && !isModifyingScriptPrompts) {
            const allKeys = new Set<string>();
            finalPrompts.forEach((p: any) => allKeys.add(`${p.sceneNumber}-${p.frameNumber}`));
            videoPrompts.forEach((p: any) => allKeys.add(`${p.sceneNumber}-${p.frameNumber}`));
            setCollapsedPrompts(allKeys);
        }
        prevIsModifying.current = isModifyingScriptPrompts;
    }, [isModifyingScriptPrompts, finalPrompts, videoPrompts]);

    const handleGenerateClick = async () => {
        await refreshUpstreamData();
        onModifyScriptPrompts(node.id);
    };
    
    const handleExecuteClick = () => {
         if (!onExecuteFullChain) return;
         setConfirmInfo({ title: t('dialog.executeChain.title'), message: t('dialog.executeChain.message'), onConfirm: () => onExecuteFullChain(node.id) });
    };

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
    
    const groupedPrompts = useMemo(() => {
        const groups: Record<string, { final: any, video: any }[]> = {};
        const sceneTitles: Record<string, string> = {};
        finalPrompts.forEach((p: any) => {
            const sceneNum = p.sceneNumber !== undefined ? p.sceneNumber : 0;
            const key = sceneNum.toString();
            if (!groups[key]) groups[key] = [];
            if (p.sceneTitle) sceneTitles[key] = p.sceneTitle;
            const videoP = videoPrompts.find((vp: any) => vp.frameNumber === p.frameNumber && vp.sceneNumber === sceneNum);
            groups[key].push({ final: p, video: videoP });
        });
        return Object.entries(groups).sort((a, b) => Number(a[0]) - Number(b[0])).map(([key, items]) => ({ sceneNum: key, title: sceneTitles[key], prompts: items }));
    }, [finalPrompts, videoPrompts]);

    const handleToggleOutputSceneCollapse = (key: string) => { setCollapsedOutputScenes(prev => { const n = new Set(prev); n.has(key)?n.delete(key):n.add(key); return n; }); };
    const handleToggleInputSceneCollapse = (idx: number) => { setCollapsedInputScenes(prev => { const n = new Set(prev); n.has(idx)?n.delete(idx):n.add(idx); return n; }); };
    const handleToggleInputFrameCollapse = (key: string) => { setCollapsedInputFrames(prev => { const n = new Set(prev); n.has(key)?n.delete(key):n.add(key); return n; }); };
    const handleToggleInputContextCollapse = (idx: number) => { setCollapsedInputContexts(prev => { const n = new Set(prev); n.has(idx)?n.delete(idx):n.add(idx); return n; }); };
    const handleTogglePromptCollapse = (id: string) => { setCollapsedPrompts(prev => { const n = new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; }); };

    const areAllInputScenesCollapsed = useMemo(() => {
        if (!upstreamAnalyzerData?.scenes || upstreamAnalyzerData.scenes.length === 0) return false;
        return upstreamAnalyzerData.scenes.every((_, idx) => collapsedInputScenes.has(idx));
    }, [upstreamAnalyzerData, collapsedInputScenes]);

    const handleToggleAllInputScenes = useCallback(() => {
        if (!upstreamAnalyzerData?.scenes) return;
        if (areAllInputScenesCollapsed) {
            setCollapsedInputScenes(new Set());
            setCollapsedInputFrames(new Set());
            setCollapsedInputContexts(new Set());
        } else {
            const allIndices = new Set<number>();
            const allFrameKeys = new Set<string>();
            upstreamAnalyzerData.scenes.forEach((scene: any, idx: number) => {
                allIndices.add(idx);
                (scene.frames || []).forEach((frame: any) => allFrameKeys.add(`${idx}-${frame.frameNumber}`));
            });
            setCollapsedInputScenes(allIndices);
            setCollapsedInputFrames(allFrameKeys);
            setCollapsedInputContexts(allIndices);
        }
    }, [upstreamAnalyzerData, areAllInputScenesCollapsed]);

    const areAllOutputScenesCollapsed = useMemo(() => {
        if (groupedPrompts.length === 0) return false;
        return groupedPrompts.every(g => collapsedOutputScenes.has(g.sceneNum));
    }, [groupedPrompts, collapsedOutputScenes]);

    const handleToggleAllOutputScenes = useCallback(() => {
        if (groupedPrompts.length === 0) return;
        if (areAllOutputScenesCollapsed) {
            setCollapsedOutputScenes(new Set());
            setCollapsedPrompts(new Set());
        } else {
            const allSceneKeys = new Set<string>();
            const allPromptKeys = new Set<string>();
            groupedPrompts.forEach(g => {
                allSceneKeys.add(g.sceneNum);
                g.prompts.forEach(item => {
                     const p = item.final || item.video;
                     allPromptKeys.add(`${p.sceneNumber}-${p.frameNumber}`);
                });
            });
            setCollapsedOutputScenes(allSceneKeys);
            setCollapsedPrompts(allPromptKeys);
        }
    }, [groupedPrompts, areAllOutputScenesCollapsed]);

    const areAllInputFramesCollapsed = useMemo(() => {
        if (!upstreamAnalyzerData?.scenes) return false;
        const allKeys: string[] = [];
        upstreamAnalyzerData.scenes.forEach((scene: any, sIdx: number) => {
            (scene.frames || []).forEach((frame: any) => allKeys.push(`${sIdx}-${frame.frameNumber}`));
        });
        if (allKeys.length === 0) return false;
        return allKeys.every(k => collapsedInputFrames.has(k));
    }, [upstreamAnalyzerData, collapsedInputFrames]);

    const handleToggleAllInputFrames = useCallback(() => {
        if (!upstreamAnalyzerData?.scenes) return;
        const allKeys = new Set<string>();
        const allContextKeys = new Set<number>();

        upstreamAnalyzerData.scenes.forEach((scene: any, sIdx: number) => {
            allContextKeys.add(sIdx);
            (scene.frames || []).forEach((frame: any) => allKeys.add(`${sIdx}-${frame.frameNumber}`));
        });

        if (areAllInputFramesCollapsed) {
             setCollapsedInputFrames(new Set());
             setCollapsedInputContexts(new Set());
        } else {
             setCollapsedInputFrames(allKeys);
             setCollapsedInputContexts(allContextKeys);
        }
    }, [upstreamAnalyzerData, areAllInputFramesCollapsed]);


    const areAllOutputPromptsCollapsed = useMemo(() => {
        if (groupedPrompts.length === 0) return false;
        const allKeys: string[] = [];
        groupedPrompts.forEach(g => {
            g.prompts.forEach(item => {
                 const p = item.final || item.video;
                 allKeys.push(`${p.sceneNumber}-${p.frameNumber}`);
            });
        });
        if (allKeys.length === 0) return false;
        return allKeys.every(k => collapsedPrompts.has(k));
    }, [groupedPrompts, collapsedPrompts]);

    const handleToggleAllOutputPrompts = useCallback(() => {
         if (groupedPrompts.length === 0) return;
         const allKeys = new Set<string>();
         groupedPrompts.forEach(g => {
            g.prompts.forEach(item => {
                 const p = item.final || item.video;
                 allKeys.add(`${p.sceneNumber}-${p.frameNumber}`);
            });
        });
        
        if (areAllOutputPromptsCollapsed) {
            setCollapsedPrompts(new Set());
        } else {
            setCollapsedPrompts(allKeys);
        }
    }, [groupedPrompts, areAllOutputPromptsCollapsed]);

    const handleDownloadJson = () => {
         const analyzerStyle = upstreamAnalyzerData?.generatedStyle || upstreamAnalyzerData?.visualStyle || '';
         const activeStyle = styleOverride || analyzerStyle || '';

         const dataToSave = { 
            type: 'script-prompt-modifier-data', 
            finalPrompts, 
            videoPrompts,
            usedCharacters,
            visualStyle: activeStyle, 
            title: node.title 
         };
         
         const dataStr = JSON.stringify(dataToSave, null, 2);
         const blob = new Blob([dataStr], { type: "application/json" });
         const url = URL.createObjectURL(blob);
         const a = document.createElement("a");
         
         const now = new Date();
         const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
         const filename = `final_prompts_${timestamp}.json`;
         
         a.href = url;
         a.download = filename;
         a.click();
         URL.revokeObjectURL(url);
         addToast(t('toast.savedToCatalog'), 'success');
    };

    const handleStartRangeChange = (val: number) => { 
        if (isProcessWholeScene) handleValueUpdate({ startSceneNumber: val });
        else handleValueUpdate({ startFrameNumber: val });
    };
    
    const handleEndRangeChange = (val: number) => { 
        if (isProcessWholeScene) handleValueUpdate({ endSceneNumber: val });
        else handleValueUpdate({ endFrameNumber: val });
    };
    
    const handleClearRange = () => handleValueUpdate({ startSceneNumber: null, endSceneNumber: null, startFrameNumber: null, endFrameNumber: null });

    const handleRangeNext = () => {
        const currentStart = (isProcessWholeScene ? startSceneNumber : startFrameNumber) || 1;
        const nextStart = Math.ceil(currentStart / 5) * 5 + 1;
        const nextEnd = nextStart + 4;
        
        if (isProcessWholeScene) handleValueUpdate({ startSceneNumber: nextStart, endSceneNumber: nextEnd });
        else handleValueUpdate({ startFrameNumber: nextStart, endFrameNumber: nextEnd });
    };

    const handleRangePrev = () => {
        const currentStart = (isProcessWholeScene ? startSceneNumber : startFrameNumber) || 1;
        const prevStart = Math.max(1, Math.floor((currentStart - 1) / 5) * 5 - 4);
        const prevEnd = prevStart + 4;
        
        if (isProcessWholeScene) handleValueUpdate({ startSceneNumber: prevStart, endSceneNumber: prevEnd });
        else handleValueUpdate({ startFrameNumber: prevStart, endFrameNumber: prevEnd });
    };

    const handleProcessWholeSceneChange = (checked: boolean) => {
        const id = PROMPT_MODIFIER_INSTRUCTIONS.PROCESS_WHOLE_SCENE.id;
        let newDisabledIds;
        if (checked) {
            newDisabledIds = disabledInstructionIds.filter((existingId: string) => existingId !== id);
        } else {
            newDisabledIds = [...disabledInstructionIds, id];
        }
        handleValueUpdate({ disabledInstructionIds: newDisabledIds });
    };

    const handleGenerateStyleChange = (checked: boolean) => {
        const id = PROMPT_MODIFIER_INSTRUCTIONS.VISUAL_SATURATION.id;
        let newDisabledIds;
        if (checked) {
             // Enable instruction -> Remove from disabled list
            newDisabledIds = disabledInstructionIds.filter((existingId: string) => existingId !== id);
        } else {
             // Disable instruction -> Add to disabled list
            newDisabledIds = [...disabledInstructionIds, id];
        }
        handleValueUpdate({ disabledInstructionIds: newDisabledIds });
    };

    const handlePropEnhancementChange = () => {
         onValueChange(node.id, JSON.stringify({ ...parsedValue, propEnhancementEnabled: !propEnhancementEnabled }));
    };

    const totalIncomingFrames = useMemo(() => {
        if (!upstreamAnalyzerData?.scenes) return 0;
        return upstreamAnalyzerData.scenes.reduce((acc: number, scene: any) => acc + (scene.frames?.length || 0), 0);
    }, [upstreamAnalyzerData]);
    
    const currentRangeText = useMemo(() => {
        const start = isProcessWholeScene ? startSceneNumber : startFrameNumber;
        const end = isProcessWholeScene ? endSceneNumber : endFrameNumber;
        const type = isProcessWholeScene ? t('node.content.scenes') : t('node.content.frame');
        
        if (start || end) {
            return `${type}: ${start || 1}-${end || 'End'}`;
        }
        return '';
    }, [isProcessWholeScene, startSceneNumber, endSceneNumber, startFrameNumber, endFrameNumber, t]);

    const characterMap = useMemo(() => {
        const map: Record<string, string> = {};
        const { characters: scriptCharacters = [] } = upstreamAnalyzerData || {};
        scriptCharacters.forEach((c: any) => {
            const desc = c.imagePrompt || c.prompt || c.fullDescription || '';
            if (c.alias) map[c.alias] = `${c.name} [Visual Profile: ${desc}]`;
            if (c.name) map[c.name] = `${c.name} [Visual Profile: ${desc}]`; 
        });
        return map;
    }, [upstreamAnalyzerData]);
    
    const displayCharacters = upstreamAnalyzerData?.characters || usedCharacters;
    const analyzerStyle = upstreamAnalyzerData?.visualStyle || upstreamAnalyzerData?.generatedStyle || '';

    // Search Trigger Helper
    const SearchTrigger = ({ id }: { id: string }) => (
        <button 
            onClick={(e) => { e.stopPropagation(); setTargetScrollId(id); }}
            className="ml-auto p-0.5 text-gray-500 hover:text-emerald-400 opacity-50 hover:opacity-100 transition-all focus:outline-none"
            title="Locate in Stack"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
        </button>
    );

    return (
        <div 
            ref={nodeContentRef} 
            className="flex flex-col h-full"
            onWheel={(e) => e.stopPropagation()}
        >
            <div className="flex flex-col gap-2 mb-2 flex-shrink-0">
                <div className="flex gap-2 items-center">
                    {/* Model Switcher */}
                     <div className="flex w-40 flex-shrink-0 gap-1 select-none bg-gray-900/50 rounded-lg p-0.5 h-10">
                        <Tooltip title={t('tooltip.model.flash')} position="top" className="h-full flex-1">
                            <button 
                                onClick={() => handleValueUpdate({ model: 'gemini-3-flash-preview' })}
                                className={`w-full h-full text-xs font-bold text-center transition-colors rounded-md flex items-center justify-center ${
                                    model === 'gemini-3-flash-preview' 
                                    ? 'bg-emerald-600 text-white shadow-sm' 
                                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                                }`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                                </svg>
                                Flash
                            </button>
                        </Tooltip>
                        <Tooltip title={t('tooltip.model.pro')} position="top" className="h-full flex-1">
                            <button 
                                onClick={() => handleValueUpdate({ model: 'gemini-3-pro-preview' })}
                                className={`w-full h-full text-xs font-bold text-center transition-colors rounded-md flex items-center justify-center ${
                                    model === 'gemini-3-pro-preview' 
                                    ? 'bg-emerald-600 text-white shadow-sm' 
                                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                                }`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                   <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                </svg>
                                Pro
                            </button>
                        </Tooltip>
                    </div>

                    {/* Language Switcher */}
                     <div className="flex flex-shrink-0 gap-1 h-10 select-none bg-gray-900/50 rounded-lg p-0.5">
                        <Tooltip title={t('tooltip.lang.ru')} position="top" className="h-full flex">
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
                        onClick={isLoading ? onStopGeneration : handleGenerateClick} 
                        disabled={isStopping || isExecutingChain} 
                        className={`flex-grow h-10 px-4 font-bold text-xs uppercase tracking-wide text-white rounded-lg transition-all duration-200 shadow-sm flex items-center justify-center ${
                            isStopping 
                            ? 'bg-yellow-600 hover:bg-yellow-500' 
                            : (isLoading 
                                ? 'bg-cyan-600 hover:bg-cyan-500' 
                                : 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-500')
                        }`}
                    >
                        {!isLoading && !isStopping && (
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        )}
                        {isLoading && (
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        )}
                        {isStopping ? t('node.action.stopping') : (isLoading ? t('node.content.analyzing') : t('node.content.generateFinalPrompts'))}
                    </button>
                     {onExecuteFullChain && (
                        <button onClick={isExecutingChain ? onStopGeneration : handleExecuteClick} disabled={isLoading || isStopping} className={`flex-shrink-0 w-10 h-10 p-2 font-bold text-white rounded-md transition-colors duration-200 flex items-center justify-center ${isStopping && isExecutingChain ? 'bg-yellow-600' : (isExecutingChain ? 'bg-red-600 hover:bg-red-700' : 'bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-500')}`} title={t('node.action.executeChainTitle')}>
                            {isStopping && isExecutingChain ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 animate-pulse" viewBox="0 0 20 20" fill="currentColor"><rect x="6" y="6" width="8" height="8" /></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            )}
                        </button>
                    )}
                </div>

                <div className="bg-gray-900/50 rounded-md flex-shrink-0 flex flex-col" onWheel={(e) => e.stopPropagation()}>
                    <div className="p-2 border-b border-gray-800 flex items-center justify-start gap-4">
                        <div className="flex items-center space-x-1 text-xs text-gray-400">
                            <label htmlFor={`start-range-${node.id}`} className="whitespace-nowrap">{isProcessWholeScene ? t('node.content.processFromScene') : t('node.content.processFromFrame')}</label>
                            <div className="relative w-14 h-7">
                                <input 
                                    id={`start-range-${node.id}`} 
                                    type="number" 
                                    min="1" 
                                    placeholder="1" 
                                    value={(isProcessWholeScene ? startSceneNumber : startFrameNumber) || ''} 
                                    onChange={e => handleStartRangeChange(e.target.value ? parseInt(e.target.value, 10) : 0)} 
                                    className="w-full h-full pl-2 pr-4 bg-gray-800 text-white rounded-md text-center focus:ring-1 focus:ring-emerald-500 focus:outline-none appearance-none text-xs" 
                                    onMouseDown={e => e.stopPropagation()}
                                />
                                <div className="absolute right-0 top-0 bottom-0 w-4 flex flex-col border-l border-gray-700">
                                    <button onClick={() => handleStartRangeChange(((isProcessWholeScene ? startSceneNumber : startFrameNumber) || 0) + 1)} className="h-1/2 hover:bg-gray-700 text-gray-500 hover:text-white flex items-center justify-center rounded-tr-md focus:outline-none"><svg xmlns="http://www.w3.org/2000/svg" className="h-2 w-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" /></svg></button>
                                    <button onClick={() => handleStartRangeChange(Math.max(1, ((isProcessWholeScene ? startSceneNumber : startFrameNumber) || 0) - 1))} className="h-1/2 hover:bg-gray-700 text-gray-500 hover:text-white flex items-center justify-center rounded-br-md border-t border-gray-700 focus:outline-none"><svg xmlns="http://www.w3.org/2000/svg" className="h-2 w-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>
                                </div>
                            </div>
                            <label htmlFor={`end-range-${node.id}`} className="whitespace-nowrap">{isProcessWholeScene ? t('node.content.analyzeUpToScene') : t('node.content.generateUpToFrame')}</label>
                            <div className="relative w-16 h-7">
                                <input 
                                    id={`end-range-${node.id}`} 
                                    type="number" 
                                    min="1" 
                                    placeholder={t('node.content.endPlaceholder')} 
                                    value={(isProcessWholeScene ? endSceneNumber : endFrameNumber) || ''} 
                                    onChange={e => handleEndRangeChange(e.target.value ? parseInt(e.target.value, 10) : 0)} 
                                    className="w-full h-full pl-2 pr-4 bg-gray-800 text-white rounded-md text-center focus:ring-1 focus:ring-emerald-500 focus:outline-none appearance-none text-xs" 
                                    onMouseDown={e => e.stopPropagation()}
                                />
                                <div className="absolute right-0 top-0 bottom-0 w-4 flex flex-col border-l border-gray-700">
                                    <button onClick={() => handleEndRangeChange(((isProcessWholeScene ? endSceneNumber : endFrameNumber) || 0) + 1)} className="h-1/2 hover:bg-gray-700 text-gray-500 hover:text-white flex items-center justify-center rounded-tr-md focus:outline-none"><svg xmlns="http://www.w3.org/2000/svg" className="h-2 w-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" /></svg></button>
                                    <button onClick={() => handleEndRangeChange(Math.max(1, ((isProcessWholeScene ? endSceneNumber : endFrameNumber) || 0) - 1))} className="h-1/2 hover:bg-gray-700 text-gray-500 hover:text-white flex items-center justify-center rounded-br-md border-t border-gray-700 focus:outline-none"><svg xmlns="http://www.w3.org/2000/svg" className="h-2 w-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>
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
                    </div>
                    
                    <div className="px-2 pb-2 flex items-center gap-4 border-b border-gray-800">
                         <div className="flex items-center gap-2"> 
                             <CustomCheckbox
                                id={`process-whole-scene-${node.id}`}
                                checked={isProcessWholeScene}
                                onChange={handleProcessWholeSceneChange}
                                disabled={isLoading}
                                className="h-3.5 w-3.5"
                            />
                            <label htmlFor={`process-whole-scene-${node.id}`} className="text-xs text-gray-400 cursor-pointer select-none font-medium hover:text-emerald-400 transition-colors" title={t('node.content.processWholeSceneInfo')}>
                                {t('node.content.processWholeScene')}
                            </label>
                            <SearchTrigger id={PROMPT_MODIFIER_INSTRUCTIONS.PROCESS_WHOLE_SCENE.id} />
                        </div>

                         <div className="flex items-center ml-2 border-l border-gray-700 pl-2 gap-2">
                             <CustomCheckbox
                                id={`generate-style-${node.id}`}
                                checked={!disabledInstructionIds.includes(PROMPT_MODIFIER_INSTRUCTIONS.VISUAL_SATURATION.id)}
                                onChange={handleGenerateStyleChange}
                                disabled={isLoading}
                                className="h-3.5 w-3.5"
                            />
                            <label htmlFor={`generate-style-${node.id}`} className="text-xs text-gray-400 cursor-pointer select-none font-medium hover:text-emerald-400 transition-colors">
                                {t('node.content.generateStyle')}
                            </label>
                            <SearchTrigger id={PROMPT_MODIFIER_INSTRUCTIONS.VISUAL_SATURATION.id} />
                        </div>
                    </div>

                    <div className="p-2 flex items-center justify-between text-xs">
                        <div className="font-semibold text-emerald-400">
                             {t('node.content.status.total', { generated: finalPrompts.length, total: totalIncomingFrames })}
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
                </div>

                <SettingsPanel 
                    uiState={uiState}
                    localSettingsHeight={localSettingsHeight}
                    setLocalSettingsHeight={setLocalSettingsHeight}
                    onUpdateUiState={handleUiStateUpdate}
                    onUpdateValue={handleValueUpdate}
                    disabledInstructionIds={disabledInstructionIds}
                    t={t}
                    targetLanguage={targetLanguage}
                    scale={viewTransform.scale}
                    maxHeight={node.height - 256} 
                    charDescMode={charDescMode}
                    safeGeneration={safeGeneration}
                    thinkingEnabled={thinkingEnabled}
                    model={model}
                    targetScrollId={targetScrollId}
                    onSetTargetScrollId={setTargetScrollId}
                    isProcessWholeScene={isProcessWholeScene}
                    onToggleProcessWholeScene={handleProcessWholeSceneChange}
                    isSaturationEnabled={isSaturationEnabled}
                    onToggleSaturation={handleGenerateStyleChange}
                    propEnhancementEnabled={propEnhancementEnabled}
                    onTogglePropEnhancement={handlePropEnhancementChange}
                />
            </div>

            <CharactersStylePanel 
                uiState={uiState}
                onUpdateUiState={handleUiStateUpdate}
                onUpdateValue={handleValueUpdate}
                upstreamAnalyzerData={upstreamAnalyzerData}
                isStyleConnected={!!isStyleConnected}
                isDataConnected={isDataConnected}
                upstreamStyleValue={isStyleConnected ? upstreamStyleValue : analyzerStyle}
                styleOverride={styleOverride}
                deselectAllNodes={deselectAllNodes}
                t={t}
                characters={displayCharacters}
                onRefresh={refreshUpstreamData}
            />
            
            <div className="flex-grow flex flex-row min-h-0 items-stretch bg-gray-900 rounded-b-md overflow-hidden border-t border-gray-600">
                 <InputFramesPanel 
                    verticalDividerPos={verticalDividerPos}
                    isProcessWholeScene={isProcessWholeScene}
                    upstreamAnalyzerData={upstreamAnalyzerData}
                    collapsedInputScenes={collapsedInputScenes}
                    collapsedInputFrames={collapsedInputFrames}
                    collapsedInputContexts={collapsedInputContexts}
                    onToggleInputSceneCollapse={handleToggleInputSceneCollapse}
                    onToggleInputFrameCollapse={handleToggleInputFrameCollapse}
                    onToggleInputContextCollapse={handleToggleInputContextCollapse}
                    onToggleAllInputScenes={handleToggleAllInputScenes}
                    onToggleAllInputFrames={handleToggleAllInputFrames}
                    areAllInputScenesCollapsed={areAllInputScenesCollapsed}
                    areAllInputFramesCollapsed={areAllInputFramesCollapsed}
                    t={t}
                 />

                 <div onMouseDown={handleVerticalDividerMouseDown} className="w-2 mx-1 cursor-col-resize bg-gray-600 hover:bg-emerald-500 transition-colors flex-shrink-0 rounded-full" />
                
                 <OutputPromptsPanel 
                    verticalDividerPos={verticalDividerPos}
                    groupedPrompts={groupedPrompts}
                    collapsedOutputScenes={collapsedOutputScenes}
                    collapsedPrompts={collapsedPrompts}
                    areAllOutputScenesCollapsed={areAllOutputScenesCollapsed}
                    areAllOutputPromptsCollapsed={areAllOutputPromptsCollapsed}
                    onToggleOutputSceneCollapse={handleToggleOutputSceneCollapse}
                    onTogglePromptCollapse={handleTogglePromptCollapse}
                    onToggleAllOutputScenes={handleToggleAllOutputScenes}
                    onToggleAllOutputPrompts={handleToggleAllOutputPrompts}
                    onDeletePrompt={handleDeletePrompt}
                    onDeleteScenePrompts={handleDeleteScenePrompts}
                    onDownloadJson={handleDownloadJson}
                    onCopy={handleCopy}
                    t={t}
                 />
            </div>
        </div>
    );
};

export default ScriptPromptModifierNode;