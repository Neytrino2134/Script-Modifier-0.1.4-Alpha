
import React, { useCallback, useState, MutableRefObject } from 'react';
import { Node, Connection, NodeType } from '../types';
import { analyzeYouTubeStats, analyzePrompt, analyzeCharacter, analyzeScript } from '../services/geminiService';

export const useGeminiAnalysis = ({
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
    const [isAnalyzing, setIsAnalyzing] = useState<string | null>(null);
    const [isAnalyzingCharacter, setIsAnalyzingCharacter] = useState<string | null>(null);
    const [isAnalyzingScript, setIsAnalyzingScript] = useState<string | null>(null);
    const [isAnalyzingYouTubeStats, setIsAnalyzingYouTubeStats] = useState<string | null>(null);

    const handleAnalyzePrompt = useCallback(async (nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;
        
        const inputConnection = connections.find(c => c.toNodeId === nodeId);
        const inputText = inputConnection ? getUpstreamTextValue(inputConnection.fromNodeId, inputConnection.fromHandleId) : '';
        
        if (!inputText) {
            setError("No input text to analyze.");
            return;
        }

        setIsAnalyzing(nodeId);
        setError(null);
        try {
            const result = await analyzePrompt(inputText);
            setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, value: JSON.stringify(result) } : n));
        } catch (e: any) {
            setError(e.message || "Analysis failed");
        } finally {
            setIsAnalyzing(null);
        }
    }, [nodes, connections, getUpstreamTextValue, setNodes, setError]);

    const handleAnalyzeCharacter = useCallback(async (nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;

        const inputConnection = connections.find(c => c.toNodeId === nodeId);
        const inputText = inputConnection ? getUpstreamTextValue(inputConnection.fromNodeId, inputConnection.fromHandleId) : '';

        if (!inputText) {
             setError("No input text to analyze.");
             return;
        }

        setIsAnalyzingCharacter(nodeId);
        setError(null);
        try {
            const result = await analyzeCharacter(inputText);
            setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, value: JSON.stringify(result) } : n));
        } catch (e: any) {
            setError(e.message || "Character analysis failed");
        } finally {
            setIsAnalyzingCharacter(null);
        }
    }, [nodes, connections, getUpstreamTextValue, setNodes, setError]);

    const handleAnalyzeScript = useCallback(async (nodeId: string) => {
        executionStopRequested.current = false;
        
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;

        let parsedValue;
        try {
            parsedValue = JSON.parse(node.value || '{}');
        } catch {
            parsedValue = {};
        }

        const { 
            model = 'gemini-3-pro-preview', 
            targetLanguage = 'ru', 
            framesPerScene, // Legacy
            minFrames,      // New
            maxFrames,      // New
            hierarchyEnabled = true,
            mandatoryBgEnabled = true,
            statePersistenceEnabled = true,
            livingWorldEnabled = true,
            extendedAnalysis, 
            generateStartEndFrames, 
            professionalStoryboard = false,
            startSceneNumber, 
            endSceneNumber, 
            autoIndexCharacters = true, 
            batchProcessing = true 
        } = parsedValue;

        const inputConnections = connections.filter(c => c.toNodeId === nodeId);
        
        let summary = '';
        let scriptScenes: any[] = [];
        let inputCharacters: any[] = [];

        const sanitize = (char: any) => {
            const { image, imageBase64, imageSources, ...rest } = char;
            return rest;
        };

        for (const conn of inputConnections) {
            const text = getUpstreamTextValue(conn.fromNodeId, conn.fromHandleId);
            try {
                const parsed = JSON.parse(text);
                
                if (parsed.scenes) {
                    if (parsed.summary) summary = parsed.summary;
                    if (Array.isArray(parsed.scenes)) {
                        // FIX: Safely map scenes to ensure sceneNumber exists
                        scriptScenes = parsed.scenes.map((s: any, i: number) => ({
                            ...s,
                            sceneNumber: (typeof s.sceneNumber === 'number') ? s.sceneNumber : (i + 1)
                        }));
                    }
                    if (Array.isArray(parsed.detailedCharacters)) {
                        const cleanChars = parsed.detailedCharacters.map(sanitize);
                        inputCharacters = [...inputCharacters, ...cleanChars];
                    }
                }
                else if (parsed.name) {
                    inputCharacters.push(sanitize(parsed));
                } else if (Array.isArray(parsed.characters)) {
                     inputCharacters = [...inputCharacters, ...parsed.characters.map(sanitize)];
                }
            } catch {}
        }

        const uniqueChars = new Map();
        inputCharacters.forEach(c => {
            if (c.name) uniqueChars.set(c.name, c);
        });
        const characters = Array.from(uniqueChars.values());

        if (scriptScenes.length === 0) {
            setError("No scenes found to analyze. Please connect a Script Generator.");
            return;
        }

        const sceneTitles = new Map<number, string>();
        scriptScenes.forEach((s: any) => {
            if (typeof s.sceneNumber === 'number' && s.title) {
                sceneTitles.set(s.sceneNumber, s.title);
            }
        });

        const startNum = (startSceneNumber && startSceneNumber > 0) ? startSceneNumber : 1;
        const endNum = (endSceneNumber && endSceneNumber > 0) ? endSceneNumber : 999999;

        const scenesToAnalyze = scriptScenes.filter((s: any) => {
            const sNum = s.sceneNumber !== undefined ? s.sceneNumber : -1;
            return sNum >= startNum && sNum <= endNum;
        });

        if (scenesToAnalyze.length === 0) {
            setError(`No scenes found in the selected range (${startNum}-${endNum}). Check input scene numbers.`);
            return;
        }

        setIsAnalyzingScript(nodeId);
        setError(null);
        
        let totalScenesToProcess = scenesToAnalyze.length;
        const totalStartTime = Date.now();

        setNodes(prev => prev.map(n => {
            if (n.id === nodeId) {
                try {
                    const currentVal = JSON.parse(n.value || '{}');
                    return { ...n, value: JSON.stringify({ 
                        ...currentVal, 
                        generationProgress: { 
                            current: 0, 
                            total: totalScenesToProcess, 
                            totalStartTime,
                            currentItemStartTime: Date.now()
                        } 
                    }) };
                } catch { return n; }
            }
            return n;
        }));

        try {
            let accumulatedScenes = Array.isArray(parsedValue.scenes) ? [...parsedValue.scenes] : [];
            const mergedScenesMap = new Map(accumulatedScenes.map((s: any) => [s.sceneNumber, s]));

            const processAndMerge = (newScenesBatch: any[]) => {
                const enhancedAnalyzedScenes = newScenesBatch.map((s: any) => ({
                    ...s,
                    title: sceneTitles.get(s.sceneNumber) || s.title
                }));

                enhancedAnalyzedScenes.forEach((s: any) => mergedScenesMap.set(s.sceneNumber, s));
                
                let mergedScenes = Array.from(mergedScenesMap.values()).sort((a: any, b: any) => a.sceneNumber - b.sceneNumber);

                let globalFrameCounter = 0;
                let sequentialScenes = mergedScenes.map((s: any) => ({
                    ...s,
                    frames: (s.frames || []).map((frame: any) => {
                        globalFrameCounter++;
                        
                        // Sanitize duration to be a simple integer
                        let duration = 2; // Default
                        if (frame.duration !== undefined) {
                            if (typeof frame.duration === 'number') {
                                duration = Math.round(frame.duration);
                            } else if (typeof frame.duration === 'string') {
                                // Remove 's' and parse as float, then round
                                const parsed = parseFloat(frame.duration.replace(/s$/i, ''));
                                if (!isNaN(parsed)) {
                                    duration = Math.round(parsed);
                                }
                            }
                        }
                        
                        return { ...frame, frameNumber: globalFrameCounter, duration };
                    })
                }));

                if (autoIndexCharacters) {
                    const replacements = characters.map((char: any) => ({ from: char.originalName || char.name, to: char.alias }));
                    const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

                    const applyReplacements = (text: string | undefined): string => {
                        if (!text) return "";
                        let newText = text;
                        replacements.forEach(({ from, to }) => {
                            if (from && to) {
                                const escapedFrom = escapeRegExp(from);
                                const regex = new RegExp(`\\b${escapedFrom}\\b`, 'gi');
                                newText = newText.replace(regex, to);
                            }
                        });
                        return newText;
                    };

                    sequentialScenes = sequentialScenes.map((s: any) => ({
                        ...s,
                        frames: s.frames.map((frame: any) => ({
                            ...frame,
                            description: applyReplacements(frame.description),
                            imagePrompt: applyReplacements(frame.imagePrompt),
                            environmentPrompt: applyReplacements(frame.environmentPrompt),
                            videoPrompt: applyReplacements(frame.videoPrompt),
                        }))
                    }));
                }
                return sequentialScenes;
            };

            const analyzerOptions = { 
                framesPerScene, // Legacy/Fallback
                minFrames,
                maxFrames,
                extendedAnalysis, 
                generateStartEndFrames, 
                batchProcessing,
                professionalStoryboard,
                hierarchyEnabled,
                mandatoryBgEnabled,
                statePersistenceEnabled,
                livingWorldEnabled
            };

            if (batchProcessing) {
                if (executionStopRequested.current) throw new Error("Analysis stopped by user.");
                
                const rawAnalyzedScenes = await analyzeScript(
                    scenesToAnalyze,
                    characters,
                    summary,
                    targetLanguage,
                    analyzerOptions,
                    model
                );

                // Enforce correct scene numbers and PRESERVE upstream data (like characters list)
                const correctedScenes = Array.isArray(rawAnalyzedScenes) ? rawAnalyzedScenes.map((s: any, idx: number) => {
                    if (idx < scenesToAnalyze.length) {
                        const originalScene = scenesToAnalyze[idx];
                        return {
                            ...s,
                            sceneNumber: originalScene.sceneNumber,
                            // CRITICAL FIX: Preserve the characters array from the original scene if the AI didn't return it or modified it strangely
                            characters: s.characters || originalScene.characters || [] 
                        };
                    }
                    return s;
                }) : [];

                const finalScenes = processAndMerge(correctedScenes);

                setNodes(prev => prev.map(n => {
                    if (n.id === nodeId) {
                        try {
                            const currentVal = JSON.parse(n.value || '{}');
                            return { ...n, value: JSON.stringify({ 
                                ...currentVal, 
                                scenes: finalScenes,
                                // IMPORTANT: Removed character overwriting here to prevent duplicates
                                // characters: characters,
                                generationProgress: { 
                                    current: totalScenesToProcess,
                                    total: totalScenesToProcess, 
                                    totalStartTime,
                                    currentItemStartTime: Date.now() 
                                } 
                            }) };
                        } catch { return n; }
                    }
                    return n;
                }));

            } else {
                for (let i = 0; i < scenesToAnalyze.length; i++) {
                    if (executionStopRequested.current) throw new Error("Analysis stopped by user.");

                    const scene = scenesToAnalyze[i];
                    const sceneStartTime = Date.now();
                    
                    setNodes(prev => prev.map(n => {
                        if (n.id === nodeId) {
                            try {
                                const currentVal = JSON.parse(n.value || '{}');
                                const existingProgress = currentVal.generationProgress || { current: i, total: totalScenesToProcess, totalStartTime };
                                return { ...n, value: JSON.stringify({ 
                                    ...currentVal, 
                                    generationProgress: { 
                                        ...existingProgress, 
                                        current: i,
                                        currentItemStartTime: sceneStartTime
                                    } 
                                }) };
                            } catch { return n; }
                        }
                        return n;
                    }));

                    const rawAnalyzedScenes = await analyzeScript(
                        [scene],
                        characters,
                        summary,
                        targetLanguage,
                        analyzerOptions,
                        model
                    );

                    // Enforce correct scene number for single scene processing
                    const correctedScenes = Array.isArray(rawAnalyzedScenes) ? rawAnalyzedScenes.map((s: any) => ({
                        ...s,
                        sceneNumber: scene.sceneNumber,
                        // Preserve original character list if present
                        characters: s.characters || scene.characters || []
                    })) : [];

                    const finalScenes = processAndMerge(correctedScenes);

                    setNodes(prev => prev.map(n => {
                        if (n.id === nodeId) {
                            try {
                                const currentVal = JSON.parse(n.value || '{}');
                                return { ...n, value: JSON.stringify({ 
                                    ...currentVal, 
                                    scenes: finalScenes,
                                    // IMPORTANT: Removed character overwriting here to prevent duplicates
                                    // characters: characters,
                                    generationProgress: { 
                                        current: i + 1,
                                        total: totalScenesToProcess, 
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
            if (e.message !== "Analysis stopped by user.") {
                setError(e.message || "Script analysis failed.");
            }
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
            setIsAnalyzingScript(null);
        }
    }, [nodes, connections, getUpstreamTextValue, setNodes, setError, executionStopRequested]);

    const handleAnalyzeYouTubeStats = useCallback(async (nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;

        let parsedValue;
        try {
            parsedValue = JSON.parse(node.value || '{}');
        } catch {
            setError("Invalid node data.");
            return;
        }

        const activeChannelId = parsedValue.activeChannelId;
        const activeChannel = parsedValue.channels?.find((ch: any) => ch.id === activeChannelId) || parsedValue.channels?.[0];

        if (!activeChannel) {
            setError("No active channel found to analyze.");
            return;
        }

        const analysisData = {
            channels: [activeChannel].map((ch: any) => ({
                name: ch.name,
                description: ch.description,
                stats: ch.stats,
                goal: ch.goal,
                isMonetized: ch.isMonetized,
                currentSubscribers: ch.currentSubscribers,
                videos: ch.videos.map((v: any) => ({
                    uploadDate: v.uploadDate,
                    title: v.title,
                    views: v.views,
                    likes: v.likes,
                    isShort: v.isShort
                }))
            })) || [],
            goal: activeChannel.goal,
            isMonetized: activeChannel.isMonetized,
            currentSubscribers: activeChannel.currentSubscribers,
            contextPrompt: parsedValue.contextPrompt,
            currentDate: new Date().toLocaleString()
        };

        const targetLanguage = parsedValue.targetLanguage || 'ru';

        if (analysisData.channels.length === 0) {
            setError("No channel data available to analyze.");
            return;
        }

        setError(null);
        setIsAnalyzingYouTubeStats(nodeId);

        try {
            const result = await analyzeYouTubeStats(analysisData, targetLanguage);
            
            setNodes(prev => prev.map(n => {
                if (n.id === nodeId) {
                    const currentVal = JSON.parse(n.value || '{}');
                    return { 
                        ...n, 
                        value: JSON.stringify({ 
                            ...currentVal, 
                            aiAdvice: result.advice,
                            aiSuggestedGoal: result.suggestedGoal
                        }) 
                    };
                }
                return n;
            }));
        } catch (e: any) {
            setError(e.message || "An unknown error occurred during YouTube stats analysis.");
        } finally {
            setIsAnalyzingYouTubeStats(null);
        }
    }, [nodes, setNodes, setError, setIsAnalyzingYouTubeStats]);

    return {
        states: { isAnalyzing, isAnalyzingCharacter, isAnalyzingScript, isAnalyzingYouTubeStats },
        handleAnalyzeScript,
        handleAnalyzeYouTubeStats,
        handleAnalyzePrompt,
        handleAnalyzeCharacter,
        stop: () => {
            setIsAnalyzing(null);
            setIsAnalyzingCharacter(null);
            setIsAnalyzingScript(null);
            setIsAnalyzingYouTubeStats(null);
        }
    };
};
