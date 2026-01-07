
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Node, Connection, NodeType } from '../types';
import { supportedLanguages, LanguageCode } from '../localization';
import { enhancePrompt, translateText, modifyScriptPart, fixTextErrors, modifyScriptPrompt, modifyScriptSceneBatch } from '../services/geminiService';
import { PROMPT_MODIFIER_INSTRUCTIONS } from '../utils/promptInstructions';

// Helper to extract [Character-N] tags from generated text
const extractCharacterTags = (text: string): string[] => {
    if (!text) return [];
    const regex = /\[Character-(\d+)\]/g;
    const indices = new Set<string>();
    let match;
    while ((match = regex.exec(text)) !== null) {
        indices.add(`Character-${match[1]}`);
    }
    return Array.from(indices);
};

// Helper to sort Character-N strings numerically
const sortCharIndices = (list: string[]) => {
    return list.sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, '') || '0', 10);
        const numB = parseInt(b.replace(/\D/g, '') || '0', 10);
        return numA - numB;
    });
};

export const useGeminiModification = ({
    nodes,
    connections,
    setNodes,
    getUpstreamTextValue,
    setError,
    executionStopRequested
}: {
    nodes: Node[];
    connections: Connection[];
    setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
    getUpstreamTextValue: (nodeId: string, handleId: string | undefined, visited?: Set<string>) => string;
    setError: (error: string | null) => void;
    executionStopRequested: React.MutableRefObject<boolean>;
}) => {
    const [isEnhancing, setIsEnhancing] = useState<string | null>(null);
    const [isTranslating, setIsTranslating] = useState<string | null>(null);
    const [isModifyingScriptPart, setIsModifyingScriptPart] = useState<string | null>(null);
    const [isFixingErrors, setIsFixingErrors] = useState<string | null>(null);
    const [isModifyingScriptPrompts, setIsModifyingScriptPrompts] = useState<string | null>(null);

    const handleEnhance = useCallback(async (processorNodeId: string) => {
        const inputConnections = connections.filter(c => c.toNodeId === processorNodeId);
        const inputTexts = inputConnections.map(conn => getUpstreamTextValue(conn.fromNodeId, conn.fromHandleId));

        setError(null);
        setIsEnhancing(processorNodeId);
        try {
            const enhanced = await enhancePrompt(inputTexts);
            setNodes(prev => prev.map(n => n.id === processorNodeId ? { ...n, value: enhanced } : n));
        } catch (e: any) {
            setError(e.message || "An unknown error occurred.");
            throw e;
        } finally {
            setIsEnhancing(null);
        }
    }, [connections, setNodes, getUpstreamTextValue, setError, setIsEnhancing]);

    const handleTranslate = useCallback(async (nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;
        
        setIsTranslating(nodeId);
        setError(null);
        try {
            let parsed;
            try { parsed = JSON.parse(node.value || '{}'); } catch { parsed = {}; }
            
            let { inputText = '', targetLanguage = 'en' } = parsed;

            const inputConnection = connections.find(c => c.toNodeId === nodeId);
            if (inputConnection) {
                inputText = getUpstreamTextValue(inputConnection.fromNodeId, inputConnection.fromHandleId);
            }
            
            if (!inputText.trim()) {
                throw new Error("No text to translate.");
            }
            
            const langName = supportedLanguages.find(l => l.code === targetLanguage)?.name || 'English';
            
            const translatedText = await translateText(inputText, langName);

            setNodes(prev => prev.map(n => {
                if (n.id === nodeId) {
                    const newParsedValue = { ...parsed, inputText, translatedText };
                    return { ...n, value: JSON.stringify(newParsedValue) };
                }
                return n;
            }));

        } catch (e: any) {
            setError(e.message || "An unknown error occurred during translation.");
        } finally {
            setIsTranslating(null);
        }
    }, [connections, setNodes, getUpstreamTextValue, nodes, setError, setIsTranslating]);

    const handleModifyScriptPart = useCallback(async (nodeId: string, partId: string, originalText: string, modificationPrompt: string) => {
        const loadingStateId = `${nodeId}/${partId}`;
        setIsModifyingScriptPart(loadingStateId);
        setError(null);
        try {
            const modifiedText = await modifyScriptPart(originalText, modificationPrompt);

            setNodes(prev => prev.map(n => {
                if (n.id === nodeId) {
                    try {
                        const parsed = JSON.parse(n.value || '{}');
                        let updated = false;

                        if (partId === 'summary') {
                            parsed.summary = modifiedText;
                            updated = true;
                        } else if (partId.startsWith('character-')) {
                            const charId = partId.substring('character-'.length);
                            const character = parsed.detailedCharacters?.find((c: any) => c.id === charId);
                            if (character) {
                                character.fullDescription = modifiedText;
                                updated = true;
                            }
                        } else if (partId.startsWith('scene-')) {
                            const parts = partId.split('-');
                            const sceneIndex = parseInt(parts[1], 10);
                            const field = parts[2]; // 'description' or 'narratorText'
                            const scene = parsed.scenes?.[sceneIndex];
                            if (scene) {
                                if (field === 'narratorText') {
                                    scene.narratorText = modifiedText;
                                } else { // default to description
                                    scene.description = modifiedText;
                                }
                                updated = true;
                            }
                        }
                        
                        return updated ? { ...n, value: JSON.stringify(parsed) } : n;
                    } catch {
                        return n;
                    }
                }
                return n;
            }));
        } catch (e: any) {
            setError(e.message || "An unknown error occurred during modification.");
        } finally {
            setIsModifyingScriptPart(null);
        }
    }, [setNodes, setError, setIsModifyingScriptPart]);
    
    const handleModifyAnalyzerFramePart = useCallback(async (nodeId: string, frameNumber: number, partKey: string, modificationPrompt: string) => {
        if (!modificationPrompt.trim()) return;

        const loadingStateId = `${nodeId}/frame-${frameNumber}/${partKey}`;
        setIsModifyingScriptPart(loadingStateId);
        setError(null);
        try {
            const node = nodes.find(n => n.id === nodeId);
            if (!node) throw new Error("Node not found");
            const parsed = JSON.parse(node.value || '{}');
            const allFrames = (parsed.scenes || []).flatMap((s: any) => s.frames);
            const frame = allFrames.find((f: any) => f.frameNumber === frameNumber);

            if (!frame || !frame[partKey]) throw new Error("Frame or part not found");

            const originalText = frame[partKey];
            const modifiedText = await modifyScriptPart(originalText, modificationPrompt);
            
            setNodes(prev => prev.map(n => {
                if (n.id === nodeId) {
                    try {
                        const currentParsed = JSON.parse(n.value || '{}');
                        const newScenes = currentParsed.scenes.map((s: any) => ({
                            ...s,
                            frames: s.frames.map((f: any) => {
                                if (f.frameNumber === frameNumber) {
                                    return { ...f, [partKey]: modifiedText };
                                }
                                return f;
                            })
                        }));
                        return { ...n, value: JSON.stringify({ ...currentParsed, scenes: newScenes }) };
                    } catch {
                        return n;
                    }
                }
                return n;
            }));
        } catch (e: any) {
            setError(e.message || "An unknown error occurred during modification.");
        } finally {
            setIsModifyingScriptPart(null);
        }
    }, [nodes, setNodes, setError, setIsModifyingScriptPart]);

    const handleFixErrors = useCallback(async (nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;
        
        const inputConnection = connections.find(c => c.toNodeId === nodeId);
        let textToFix = node.value;
        if (inputConnection) {
            textToFix = getUpstreamTextValue(inputConnection.fromNodeId, inputConnection.fromHandleId);
        }

        if (!textToFix.trim()) {
            setError("No text to fix.");
            return;
        }

        setIsFixingErrors(nodeId);
        setError(null);
        try {
            const correctedText = await fixTextErrors(textToFix);
            setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, value: correctedText } : n));
        } catch (e: any) {
            setError(e.message || "An unknown error occurred while fixing errors.");
        } finally {
            setIsFixingErrors(null);
        }
    }, [nodes, connections, getUpstreamTextValue, setNodes, setError, setIsFixingErrors]);

    const handleModifyScriptPrompts = useCallback(async (nodeId: string) => {
        executionStopRequested.current = false;

        const finalizerNode = nodes.find(n => n.id === nodeId);
        if (!finalizerNode) return;
        
        if (isModifyingScriptPrompts === nodeId) return;
    
        const inputConnection = connections.find(c => c.toNodeId === nodeId && (c.toHandleId === 'all-script-analyzer-data' || !c.toHandleId));
        if (!inputConnection) {
            setError("Please connect a Script Analyzer node to the 'Data from analyzer' input.");
            return;
        }
    
        const upstreamValue = getUpstreamTextValue(inputConnection.fromNodeId, inputConnection.fromHandleId);
        if (!upstreamValue || upstreamValue.trim() === '' || upstreamValue.trim() === '{}') {
            setError("Upstream script analysis data is empty.");
            return;
        }
    
        let analysisData, finalizerConfig;
        try {
            analysisData = JSON.parse(upstreamValue);
            finalizerConfig = JSON.parse(finalizerNode.value || '{}');
        } catch (e) {
            setError("Failed to parse node data. Ensure it's valid JSON.");
            return;
        }
    
        const { characters = [], scenes = [] } = analysisData;
        const { 
            targetLanguage = 'en', 
            startFrameNumber = null, 
            endFrameNumber = null, 
            startSceneNumber = null, 
            endSceneNumber = null, 
            styleOverride: styleOverrideFromNodeValue, 
            model = 'gemini-2.5-pro',   
            disabledInstructionIds = [],
            includeGeneralCharDesc = false,
            includeFullCharDesc = false,
            safeGeneration = false,
            thinkingEnabled = false,
            charDescMode: configCharDescMode,
            sceneContexts = {} // Local scene contexts (Master Environment Prompts)
        } = finalizerConfig;
        
        let charDescMode: 'none' | 'general' | 'full' = configCharDescMode;
        if (!charDescMode) {
             if (includeFullCharDesc) charDescMode = 'full';
             else if (includeGeneralCharDesc === false) charDescMode = 'none';
             else charDescMode = 'general';
        }

        const allInstructionKeys = Object.keys(PROMPT_MODIFIER_INSTRUCTIONS) as (keyof typeof PROMPT_MODIFIER_INSTRUCTIONS)[];
        const activeInstructionIds = allInstructionKeys
            .map(key => PROMPT_MODIFIER_INSTRUCTIONS[key].id)
            .filter(id => !disabledInstructionIds.includes(id));
            
        const processWholeScene = activeInstructionIds.includes(PROMPT_MODIFIER_INSTRUCTIONS.PROCESS_WHOLE_SCENE.id);
        const generateVideoPrompt = activeInstructionIds.includes(PROMPT_MODIFIER_INSTRUCTIONS.GENERATE_VIDEO_PROMPT.id);
        
        const styleConnection = connections.find(c => c.toNodeId === nodeId && c.toHandleId === 'style');
        let finalStyleOverride = styleOverrideFromNodeValue;
        
        if (styleConnection) {
            finalStyleOverride = getUpstreamTextValue(styleConnection.fromNodeId, styleConnection.fromHandleId);
        } else if (!finalStyleOverride) {
            finalStyleOverride = analysisData.visualStyle || analysisData.generatedStyle || '';
        }

        // BUILD ROBUST CHARACTER MAP
        // Priority: 1. Index (Character-1), 2. Alias (Legacy), 3. Name
        const characterMap: Record<string, string> = {};
        characters.forEach((c: any) => {
            const visualPrompt = c.imagePrompt || c.prompt || c.fullDescription || '';
            
            // Map by Index (Preferred)
            if (c.index) characterMap[c.index] = `${c.name} [Visual Profile: ${visualPrompt}]`;
            
            // Map by Alias (Legacy)
            if (c.alias) characterMap[c.alias] = `${c.name} [Visual Profile: ${visualPrompt}]`;
            
            // Map by Name (Fallback)
            if (c.name) characterMap[c.name] = `${c.name} [Visual Profile: ${visualPrompt}]`; 
        });

        let scenesToProcess: any[] = [];

        // Prepare scenes with correct context (Local > Upstream)
        const effectiveScenes = scenes.map((s: any) => ({
            ...s,
            // Prefer local context if available and not empty, otherwise use upstream context
            sceneContext: (sceneContexts[s.sceneNumber] && sceneContexts[s.sceneNumber].trim()) 
                ? sceneContexts[s.sceneNumber] 
                : (s.sceneContext || '')
        }));

        if (processWholeScene) {
             scenesToProcess = effectiveScenes.filter((scene: any) => {
                const sNum = scene.sceneNumber;
                const startOk = !startSceneNumber || sNum >= startSceneNumber;
                const endOk = !endSceneNumber || sNum <= endSceneNumber;
                return startOk && endOk;
             }).map((scene: any) => ({
                 ...scene,
                 framesToProcess: scene.frames || []
             }));
        } else {
            scenesToProcess = effectiveScenes.map((scene: any) => {
                const validFrames = (scene.frames || []).filter((f: any) => {
                    const startOk = !startFrameNumber || f.frameNumber >= startFrameNumber;
                    const endOk = !endFrameNumber || f.frameNumber <= endFrameNumber;
                    return startOk && endOk;
                });
                return { 
                    ...scene, 
                    framesToProcess: validFrames 
                };
            }).filter((s: any) => s.framesToProcess.length > 0);
        }

        if (scenesToProcess.length === 0) {
            setError(processWholeScene ? "No scenes found in the specified range." : "No frames to process within the specified range.");
            return;
        }
    
        setError(null);
        setIsModifyingScriptPrompts(nodeId);
        
        let framesProcessedCount = 0;
        let totalFrames = 0;
        scenesToProcess.forEach((s: any) => totalFrames += s.framesToProcess.length);
        const totalStartTime = Date.now();

        setNodes(prev => prev.map(n => {
            if (n.id === nodeId) {
                try {
                    const currentVal = JSON.parse(n.value || '{}');
                    return { ...n, value: JSON.stringify({ 
                        ...currentVal, 
                        generationProgress: { 
                            current: 0, 
                            total: totalFrames, 
                            totalStartTime,
                            currentItemStartTime: Date.now()
                        } 
                    }) };
                } catch { return n; }
            }
            return n;
        }));

        try {
            if (processWholeScene) {
                for (const scene of scenesToProcess) {
                    if (executionStopRequested.current) throw new Error("Chain execution stopped.");

                    const sceneStartTime = Date.now();
                    setNodes(prev => prev.map(n => {
                        if (n.id === nodeId) {
                            try {
                                const currentVal = JSON.parse(n.value || '{}');
                                const existingProgress = currentVal.generationProgress || { current: framesProcessedCount, total: totalFrames, totalStartTime };
                                return { ...n, value: JSON.stringify({ 
                                    ...currentVal, 
                                    generationProgress: { 
                                        ...existingProgress, 
                                        currentItemStartTime: sceneStartTime
                                    } 
                                }) };
                            } catch { return n; }
                        }
                        return n;
                    }));

                    try {
                        const context = scene.sceneContext || ''; 
                        
                        const batchResults = await modifyScriptSceneBatch(
                            context,
                            scene.framesToProcess,
                            characterMap,
                            targetLanguage,
                            finalStyleOverride,
                            model,
                            activeInstructionIds,
                            { charDescMode, safeGeneration, thinkingEnabled }
                        );

                        const sceneFinalPrompts: any[] = [];
                        const sceneVideoPrompts: any[] = [];

                        if (Array.isArray(batchResults) && batchResults.length === scene.framesToProcess.length) {
                            batchResults.forEach((resultItem: any, idx: number) => {
                                const frame = scene.framesToProcess[idx];
                                
                                // Base characters derived from input frame data (Analyzer)
                                const characterAliasesInFrame = (frame.characters || [])
                                    .map((aliasOrName: string) => {
                                        const char = characters.find((c: any) => c.index === aliasOrName || c.alias === aliasOrName);
                                        if (!char) {
                                             const charByName = characters.find((c: any) => c.name === aliasOrName);
                                             return charByName ? (charByName.index || charByName.alias) : aliasOrName;
                                        }
                                        return char.index || char.alias;
                                    });

                                let promptText = '';
                                let vidPromptText = '';
                                
                                if (typeof resultItem === 'string') {
                                    promptText = resultItem;
                                } else if (resultItem && typeof resultItem === 'object') {
                                    promptText = resultItem.imagePrompt || '';
                                    vidPromptText = resultItem.videoPrompt || '';
                                }

                                // EXTRACT CHARACTERS FROM GENERATED PROMPTS
                                // If the model mentioned [Character-1] in the text, it must be in the array, even if the Analyzer missed it.
                                const textDerivedChars = extractCharacterTags(promptText);
                                const videoDerivedChars = extractCharacterTags(vidPromptText);
                                
                                // Merge and Sort Characters
                                const mergedCharacters = sortCharIndices(Array.from(new Set([
                                    ...characterAliasesInFrame, 
                                    ...textDerivedChars, 
                                    ...videoDerivedChars
                                ])));

                                sceneFinalPrompts.push({
                                    frameNumber: frame.frameNumber, 
                                    sceneNumber: scene.sceneNumber,
                                    sceneTitle: scene.title,
                                    characters: mergedCharacters, // Use merged list
                                    duration: frame.duration, 
                                    prompt: promptText,
                                    shotType: frame.shotType
                                });

                                if (generateVideoPrompt && vidPromptText) {
                                    sceneVideoPrompts.push({
                                        frameNumber: frame.frameNumber,
                                        sceneNumber: scene.sceneNumber,
                                        sceneTitle: scene.title,
                                        videoPrompt: vidPromptText,
                                        shotType: frame.shotType
                                    });
                                }
                            });

                            framesProcessedCount += scene.framesToProcess.length;
                            setNodes(prev => prev.map(n => {
                                if (n.id === nodeId) {
                                    try {
                                        const currentVal = JSON.parse(n.value || '{}');
                                        
                                        let finalPrompts = [...(currentVal.finalPrompts || [])];
                                        const getPromptKey = (p: any) => `${p.sceneNumber}-${p.frameNumber}`;
                                        const newPromptsMap = new Map(sceneFinalPrompts.map(p => [getPromptKey(p), p]));
                                        
                                        finalPrompts = finalPrompts.map(p => {
                                            const key = getPromptKey(p);
                                            return newPromptsMap.has(key) ? newPromptsMap.get(key) : p;
                                        });
                                        
                                        sceneFinalPrompts.forEach(p => {
                                            if (!finalPrompts.some(existing => existing.frameNumber === p.frameNumber && existing.sceneNumber === p.sceneNumber)) {
                                                finalPrompts.push(p);
                                            }
                                        });
                                        finalPrompts.sort((a: any, b: any) => {
                                            if (a.sceneNumber !== b.sceneNumber) return (a.sceneNumber || 0) - (b.sceneNumber || 0);
                                            return a.frameNumber - b.frameNumber;
                                        });
                                        
                                        let videoPromptsToSet = [...(currentVal.videoPrompts || [])];
                                        const newVideoMap = new Map(sceneVideoPrompts.map(p => [getPromptKey(p), p]));
                                        videoPromptsToSet = videoPromptsToSet.map(p => {
                                             const key = getPromptKey(p);
                                             return newVideoMap.has(key) ? newVideoMap.get(key) : p;
                                        });
                                        sceneVideoPrompts.forEach(p => {
                                             if (!videoPromptsToSet.some(existing => existing.frameNumber === p.frameNumber && existing.sceneNumber === p.sceneNumber)) {
                                                 videoPromptsToSet.push(p);
                                             }
                                        });
                                        videoPromptsToSet.sort((a: any, b: any) => {
                                            if (a.sceneNumber !== b.sceneNumber) return (a.sceneNumber || 0) - (b.sceneNumber || 0);
                                            return a.frameNumber - b.frameNumber;
                                        });

                                        return { ...n, value: JSON.stringify({ 
                                            ...currentVal, 
                                            finalPrompts, 
                                            videoPrompts: videoPromptsToSet, 
                                            generationProgress: { 
                                                current: framesProcessedCount, 
                                                total: totalFrames,
                                                totalStartTime,
                                                currentItemStartTime: Date.now()
                                            } 
                                        }) };
                                    } catch { return n; }
                                }
                                return n;
                            }));

                        } else {
                            framesProcessedCount += scene.framesToProcess.length;
                            setError(`Warning: Batch result mismatch for Scene ${scene.sceneNumber}`);
                        }
                    } catch (sceneError: any) {
                        setError(`Error in Scene ${scene.sceneNumber}: ${sceneError.message}`);
                        framesProcessedCount += scene.framesToProcess.length;
                         setNodes(prev => prev.map(n => {
                             if (n.id === nodeId) {
                                 try {
                                     const currentVal = JSON.parse(n.value || '{}');
                                     return { ...n, value: JSON.stringify({ 
                                         ...currentVal, 
                                         generationProgress: { 
                                             current: framesProcessedCount, 
                                             total: totalFrames, 
                                             totalStartTime,
                                             currentItemStartTime: Date.now()
                                         } 
                                     }) };
                                 } catch { return n; }
                             }
                             return n;
                         }));
                    }
                }
            } 
            else {
                for (const scene of scenesToProcess) {
                    for (const frame of scene.framesToProcess) {
                        if (executionStopRequested.current) throw new Error("Chain execution stopped.");
                        
                        const frameStartTime = Date.now();
                        setNodes(prev => prev.map(n => {
                            if (n.id === nodeId) {
                                try {
                                    const currentVal = JSON.parse(n.value || '{}');
                                    const existingProgress = currentVal.generationProgress || { current: framesProcessedCount, total: totalFrames, totalStartTime };
                                    return { ...n, value: JSON.stringify({ 
                                        ...currentVal, 
                                        generationProgress: { 
                                            ...existingProgress, 
                                            currentItemStartTime: frameStartTime
                                        } 
                                    }) };
                                } catch { return n; }
                            }
                            return n;
                        }));

                        try {
                            const basePrompt = frame.imagePrompt || '';
                            const environmentPrompt = frame.environmentPrompt || ''; 
                            
                            const characterPromptsInFrame = (frame.characters || [])
                                .map((alias: string) => {
                                    if (characterMap[alias]) {
                                        return `[${alias}]: ${characterMap[alias]}`;
                                    }
                                    const char = characters.find((c: any) => c.name === alias);
                                    if (char) {
                                         const visualPrompt = char.imagePrompt || char.prompt || '';
                                         return `[${alias}]: ${char.name} [Visual Profile: ${visualPrompt}]`;
                                    }
                                    return null;
                                })
                                .filter(Boolean);

                            const characterAliasesInFrame = (frame.characters || [])
                                .map((aliasOrName: string) => {
                                    const char = characters.find((c: any) => c.index === aliasOrName || c.alias === aliasOrName);
                                    if (!char) {
                                         const charByName = characters.find((c: any) => c.name === aliasOrName);
                                         return charByName ? (charByName.index || charByName.alias) : aliasOrName;
                                    }
                                    return char.index || char.alias;
                                });
                            
                            const result = await modifyScriptPrompt(
                                basePrompt, 
                                environmentPrompt, 
                                characterPromptsInFrame, 
                                targetLanguage, 
                                finalStyleOverride, 
                                scene.sceneContext || '',
                                characterMap, 
                                frame.characters || [], 
                                activeInstructionIds,
                                { charDescMode, safeGeneration, thinkingEnabled }
                            );

                            let finalPrompt = '';
                            let finalVideoPrompt = '';

                            if (typeof result === 'string') {
                                finalPrompt = result;
                            } else {
                                finalPrompt = result.imagePrompt;
                                finalVideoPrompt = result.videoPrompt;
                            }

                            // EXTRACT CHARACTERS FROM GENERATED PROMPTS (Single Frame)
                            const textDerivedChars = extractCharacterTags(finalPrompt);
                            const videoDerivedChars = extractCharacterTags(finalVideoPrompt);
                            const mergedCharacters = sortCharIndices(Array.from(new Set([
                                ...characterAliasesInFrame, 
                                ...textDerivedChars, 
                                ...videoDerivedChars
                            ])));
                            
                            const newFinalPromptObj = { 
                                frameNumber: frame.frameNumber, 
                                sceneNumber: scene.sceneNumber,
                                sceneTitle: scene.title,
                                characters: mergedCharacters, // Use merged list
                                duration: frame.duration, 
                                prompt: finalPrompt,
                                shotType: frame.shotType
                            };
                            
                            let newVideoPromptObj = null;
                            if (generateVideoPrompt && finalVideoPrompt) {
                                 newVideoPromptObj = {
                                     frameNumber: frame.frameNumber,
                                     sceneNumber: scene.sceneNumber,
                                     sceneTitle: scene.title,
                                     videoPrompt: finalVideoPrompt,
                                     shotType: frame.shotType
                                 };
                            }

                            framesProcessedCount++;
                            
                            setNodes(prev => prev.map(n => {
                                if (n.id === nodeId) {
                                    try {
                                        const currentVal = JSON.parse(n.value || '{}');
                                        
                                        let finalPrompts = [...(currentVal.finalPrompts || [])];
                                        const existingIndex = finalPrompts.findIndex(p => p.frameNumber === frame.frameNumber && p.sceneNumber === scene.sceneNumber);
                                        if (existingIndex !== -1) finalPrompts[existingIndex] = newFinalPromptObj;
                                        else finalPrompts.push(newFinalPromptObj);
                                        finalPrompts.sort((a: any, b: any) => {
                                            if (a.sceneNumber !== b.sceneNumber) return (a.sceneNumber || 0) - (b.sceneNumber || 0);
                                            return a.frameNumber - b.frameNumber;
                                        });

                                        let videoPrompts = [...(currentVal.videoPrompts || [])];
                                        if (newVideoPromptObj) {
                                             const existingVidIndex = videoPrompts.findIndex(p => p.frameNumber === frame.frameNumber && p.sceneNumber === scene.sceneNumber);
                                             if (existingVidIndex !== -1) videoPrompts[existingVidIndex] = newVideoPromptObj;
                                             else videoPrompts.push(newVideoPromptObj);
                                             videoPrompts.sort((a: any, b: any) => {
                                                if (a.sceneNumber !== b.sceneNumber) return (a.sceneNumber || 0) - (b.sceneNumber || 0);
                                                return a.frameNumber - b.frameNumber;
                                            });
                                        }

                                        return { ...n, value: JSON.stringify({ 
                                            ...currentVal, 
                                            finalPrompts, 
                                            videoPrompts, 
                                            generationProgress: { 
                                                current: framesProcessedCount, 
                                                total: totalFrames, 
                                                totalStartTime,
                                                currentItemStartTime: Date.now()
                                            } 
                                        }) };
                                    } catch { return n; }
                                }
                                return n;
                            }));

                        } catch (frameError: any) {
                             framesProcessedCount++;
                        }
                    }
                }
            }
            
            setNodes(prev => prev.map(n => {
                if (n.id === nodeId) {
                    try {
                        const currentVal = JSON.parse(n.value || '{}');
                        const progress = currentVal.generationProgress;
                        if (progress) {
                            return { ...n, value: JSON.stringify({
                                ...currentVal,
                                generationProgress: { ...progress, endTime: Date.now() }
                            }) };
                        }
                        return n;
                    } catch { return n; }
                }
                return n;
            }));

        } catch (e: any) {
             setNodes(prev => prev.map(n => {
                if (n.id === nodeId) {
                    try {
                        const currentVal = JSON.parse(n.value || '{}');
                        const updated = { ...currentVal };
                        delete updated.generationProgress;
                        return { ...n, value: JSON.stringify(updated) };
                    } catch { return n; }
                }
                return n;
            }));
        } finally {
            setIsModifyingScriptPrompts(null);
        }
    }, [connections, getUpstreamTextValue, setNodes, nodes, setError, setIsModifyingScriptPrompts, executionStopRequested, isModifyingScriptPrompts]);

    return {
        states: {
            isEnhancing,
            isTranslating,
            isModifyingScriptPart,
            isFixingErrors,
            isModifyingScriptPrompts,
        },
        handleEnhance,
        handleTranslate,
        handleModifyScriptPart,
        handleModifyAnalyzerFramePart,
        handleFixErrors,
        handleModifyScriptPrompts,
        stop: () => {
            setIsEnhancing(null);
            setIsTranslating(null);
            setIsModifyingScriptPart(null);
            setIsFixingErrors(null);
            setIsModifyingScriptPrompts(null);
        }
    };
}
