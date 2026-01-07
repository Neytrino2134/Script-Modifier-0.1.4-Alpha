
import React, { useCallback, useState } from 'react';
import { Node, NodeType, Connection } from '../types';
import { useLanguage } from '../localization';
import { generateCharacters, generateImage, generateScript, generateSpeech, generateIdeaCategories, combineStoryIdea, generateNarratorText, transcribeAudio, generateYouTubeTitles, generateYouTubeChannelInfo, generateMusicIdeas, extractTextFromImage, improveScriptConcept } from '../services/geminiService';

export const useGeminiGeneration = ({
    nodes, connections, setNodes, getUpstreamTextValue, setError, executionStopRequested
}: {
    nodes: Node[];
    connections: Connection[];
    setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
    getUpstreamTextValue: (nodeId: string, handleId: string | undefined, visited?: Set<string>) => string;
    setError: (error: string | null) => void;
    executionStopRequested: React.MutableRefObject<boolean>;
}) => {
    const { t } = useLanguage();
    const [isGeneratingCharacters, setIsGeneratingCharacters] = useState<string | null>(null);
    const [isGeneratingImage, setIsGeneratingImage] = useState<string | null>(null);
    const [isGeneratingCharacterImage, setIsGeneratingCharacterImage] = useState<string | null>(null);
    const [isGeneratingScript, setIsGeneratingScript] = useState<string | null>(null);
    const [isGeneratingSpeech, setIsGeneratingSpeech] = useState<string | null>(null);
    const [isGeneratingIdeaCategories, setIsGeneratingIdeaCategories] = useState<string | null>(null);
    const [isCombiningStoryIdea, setIsCombiningStoryIdea] = useState<string | null>(null);
    const [isGeneratingNarratorText, setIsGeneratingNarratorText] = useState<string | null>(null);
    const [isTranscribingAudio, setIsTranscribingAudio] = useState<string | null>(null);
    const [isGeneratingYouTubeTitles, setIsGeneratingYouTubeTitles] = useState<string | null>(null);
    const [isGeneratingYouTubeChannelInfo, setIsGeneratingYouTubeChannelInfo] = useState<string | null>(null);
    const [isGeneratingMusicIdeas, setIsGeneratingMusicIdeas] = useState<string | null>(null);
    const [isExtractingText, setIsExtractingText] = useState<string | null>(null);
    const [isImprovingScriptConcept, setIsImprovingScriptConcept] = useState<string | null>(null);

    const handleGenerateCharacters = useCallback(async (nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;
    
        let parsedValue;
        try {
            parsedValue = JSON.parse(node.value || '{}');
        } catch {
            parsedValue = { prompt: '', numberOfCharacters: 1, characters: [], targetLanguage: 'ru', characterType: 'simple', style: 'simple', customStyle: '' };
        }
    
        const { prompt, numberOfCharacters = 1, targetLanguage = 'ru', characterType = 'simple', style = 'simple', customStyle = '' } = parsedValue;
        const inputConnection = connections.find(c => c.toNodeId === nodeId);
        const finalPrompt = inputConnection ? getUpstreamTextValue(inputConnection.fromNodeId, inputConnection.fromHandleId) : prompt;
    
        if (!finalPrompt || !finalPrompt.trim()) {
            setError("Please enter a prompt for character generation.");
            return;
        }
    
        setError(null);
        setIsGeneratingCharacters(nodeId);

        setNodes(prev => prev.map(n => {
            if (n.id === nodeId) {
                let parsed; try { parsed = JSON.parse(n.value || '{}'); } catch {}
                if (parsed.error) { delete parsed.error; return { ...n, value: JSON.stringify(parsed) }; }
            }
            return n;
        }));

        try {
            const result = await generateCharacters(finalPrompt, numberOfCharacters, targetLanguage, characterType, style, customStyle);
            const existingCharacters = parsedValue.characters || [];
            let maxIndex = 0;
            
            // Analyze existing indices to continue numbering correctly
            existingCharacters.forEach((char: any) => {
                const idxStr = char.index || char.alias || '';
                // Support both legacy Character-N and new Entity-N for continuity
                if (idxStr) {
                    const match = idxStr.match(/(?:Entity|Character)-(\d+)/i);
                    if (match && match[1]) {
                        const index = parseInt(match[1], 10);
                        if (!isNaN(index) && index > maxIndex) { maxIndex = index; }
                    }
                }
            });
            
            const enhancedCharacters = result.map((char, index) => ({
                ...char, 
                id: `char-${Date.now()}-${index}`, 
                originalName: char.name, 
                index: `Entity-${maxIndex + index + 1}`, // Always generate Entity-N
                imageBase64: null
            }));
            
            const updatedValue = { ...parsedValue, prompt: finalPrompt, characters: [...enhancedCharacters, ...existingCharacters] };
            setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, value: JSON.stringify(updatedValue) } : n));
        } catch (e: any) {
            const errorMessage = e.message || "An unknown error occurred.";
            if (errorMessage.includes("safety settings")) {
                const softErrorMessage = "Generation failed: The prompt may have been blocked due to safety settings. Please adjust your prompt and try again.";
                setNodes(prev => prev.map(n => {
                    if (n.id === nodeId) {
                        let parsed; try { parsed = JSON.parse(n.value || '{}'); } catch { parsed = {}; }
                        const updatedValue = { ...parsed, error: softErrorMessage };
                        return { ...n, value: JSON.stringify(updatedValue) };
                    }
                    return n;
                }));
            } else {
                setError(errorMessage);
            }
        } finally {
            setIsGeneratingCharacters(null);
        }
    }, [connections, setNodes, getUpstreamTextValue, nodes, setError, setIsGeneratingCharacters]);

    const handleGenerateImage = useCallback(async (nodeId: string, characterId?: number | string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;
    
        let parsedValue;
        try { parsedValue = JSON.parse(node.value || '{}'); } 
        catch { parsedValue = { prompt: '', imageBase64: '' }; }
    
        let finalPrompt = '';
        let targetIndex = -1;
        let selectedRatio = '1:1';
        let loadingId = nodeId;

        if (node.type === NodeType.CHARACTER_CARD) {
            // Handle Character Card Logic (Array of cards)
            let cards = Array.isArray(parsedValue) ? parsedValue : [parsedValue];
            targetIndex = typeof characterId === 'number' ? characterId : 0;
            
            const card = cards[targetIndex];
            if (card) {
                const mainPrompt = card.prompt || '';
                const suffix = card.additionalPrompt || '';
                finalPrompt = `${mainPrompt} ${suffix}`.trim();
                selectedRatio = card.selectedRatio || '1:1';
            }
            loadingId = `${nodeId}-${targetIndex}`;
        } else {
            // Handle Image Generator Logic (Single object)
            const { prompt } = parsedValue;
            const inputConnection = connections.find(c => c.toNodeId === nodeId);
            finalPrompt = inputConnection ? getUpstreamTextValue(inputConnection.fromNodeId, inputConnection.fromHandleId) : prompt;
            selectedRatio = '1:1'; // Image Generator defaults to 1:1
        }
    
        if (!finalPrompt || !finalPrompt.trim()) { 
            setError("Please enter a prompt for image generation."); 
            return; 
        }
        
        setError(null);
        setIsGeneratingImage(loadingId);

        try {
            const result = await generateImage(finalPrompt, selectedRatio);
            
            if (node.type === NodeType.CHARACTER_CARD) {
                let cards = Array.isArray(parsedValue) ? [...parsedValue] : [parsedValue];
                if (cards[targetIndex]) {
                     const currentSources = cards[targetIndex].imageSources || {};
                     cards[targetIndex] = {
                         ...cards[targetIndex],
                         imageSources: {
                             ...currentSources,
                             [selectedRatio]: result
                         },
                         // Clear legacy fields to prefer imageSources
                         image: null, 
                         imageBase64: null 
                     };
                }
                setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, value: JSON.stringify(cards) } : n));
            } else {
                let updatedValue = { ...parsedValue, prompt: finalPrompt, imageBase64: result };
                setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, value: JSON.stringify(updatedValue) } : n));
            }
        } catch (e: any) {
            setError(e.message || "An unknown error occurred during image generation.");
        } finally {
            setIsGeneratingImage(null);
        }
    }, [connections, setNodes, getUpstreamTextValue, nodes, setError, setIsGeneratingImage]);

    const handleGenerateCharacterImage = useCallback(async (nodeId: string, characterId: string) => {
        const loadingId = `${nodeId}-${characterId}`;
        setIsGeneratingCharacterImage(loadingId);
        setError(null);
        try {
            const node = nodes.find(n => n.id === nodeId);
            if (!node || node.type !== NodeType.CHARACTER_GENERATOR) throw new Error("Character generator node not found");

            const parsed = JSON.parse(node.value || '{}');
            const character = parsed.characters?.find((c: any) => c.id === characterId);
            if (!character || !character.prompt) throw new Error("Character or prompt not found");

            const imageBase64 = await generateImage(character.prompt, '1:1');
            const updatedCharacters = parsed.characters.map((c: any) => c.id === characterId ? { ...c, imageBase64 } : c);
            setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, value: JSON.stringify({ ...parsed, characters: updatedCharacters }) } : n));
        } catch (e: any) {
            setError(e.message || "An unknown error occurred during character image generation.");
        } finally {
            setIsGeneratingCharacterImage(null);
        }
     }, [nodes, setNodes, setError, setIsGeneratingCharacterImage]);

     const handleGenerateScript = useCallback(async (nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;
    
        let parsedValue;
        try { 
            parsedValue = JSON.parse(node.value || '{}'); 
        } catch { 
            parsedValue = { 
                prompt: '', targetLanguage: 'ru', characterType: 'simple', 
                useExistingCharacters: false, narratorEnabled: false, narratorMode: 'normal', 
                detailedCharacters: [], isAdvancedMode: false, numberOfScenes: null, 
                isDetailedPlot: false, genre: 'general', noCharacters: false, genre2: 'general',
                model: 'gemini-3-pro-preview', includeSubscribeScene: false,
                visualStyle: 'none', customVisualStyle: '', generatedStyle: '', uiState: {}, createSecondaryChars: true, createKeyItems: true,
                scenelessMode: false, smartConceptEnabled: true
            }; 
        }
    
        const { 
            prompt, targetLanguage = 'ru', characterType = 'simple', 
            useExistingCharacters = false, narratorEnabled = false, narratorMode = 'normal', 
            detailedCharacters = [], isAdvancedMode, numberOfScenes, isDetailedPlot, genre,
            noCharacters, genre2, model = 'gemini-3-pro-preview', includeSubscribeScene,
            visualStyle = 'none', customVisualStyle = '', generatedStyle = '', uiState,
            // Fallback for migration: use createKeyItem if secondary/items flags undefined
            createSecondaryChars = (parsedValue.createKeyItem !== false),
            createKeyItems = true,
            safeGeneration, thinkingEnabled, scenelessMode, simpleActions, commercialSafe, 
            smartConceptEnabled = true,
            atmosphericEntryEnabled = true,
            generationProgress
        } = parsedValue;

        const advancedOptions = { isAdvancedMode, numberOfScenes, isDetailedPlot, genre, noCharacters, genre2, includeSubscribeScene, safeGeneration, estimateFrames: true };
        
        let finalPrompt = prompt;
        let existingCharactersForApi: { name: string; fullDescription: string; index?: string; }[] | undefined = undefined;
        let allOriginalCharacters: any[] = [];
    
        const inputConnections = connections.filter(c => c.toNodeId === nodeId);
        const promptConnection = inputConnections.find(c => c.toHandleId === 'prompt' || c.toHandleId === undefined);
        
        if (promptConnection) { finalPrompt = getUpstreamTextValue(promptConnection.fromNodeId, promptConnection.fromHandleId); }
    
        const normalize = (s: string) => s ? s.trim().toLowerCase() : '';

        if (useExistingCharacters && !noCharacters) {
            const characterConnections = inputConnections.filter(c => c.toHandleId === 'characters');
            const linkedCharacters: any[] = [];
            for (const conn of characterConnections) {
                const upstreamValue = getUpstreamTextValue(conn.fromNodeId, conn.fromHandleId);
                try {
                    const charData = JSON.parse(upstreamValue || '{}');
                    
                    let charsToAdd: any[] = [];
                    
                    if (Array.isArray(charData)) {
                        // Handle array directly (e.g. from Character Card 'all-characters')
                        charsToAdd = charData;
                    } else if (charData.characters && Array.isArray(charData.characters)) {
                        // Handle wrapped characters array
                        charsToAdd = charData.characters;
                    } else if (charData.name) {
                        // Handle single character object
                        charsToAdd = [charData];
                    }

                    charsToAdd.forEach((c: any) => {
                        const { image, imageBase64, imageSources, ...cleanChar } = c;
                        linkedCharacters.push({ ...cleanChar, isLinked: true });
                    });

                } catch (e) { console.warn("Could not parse character data from upstream node", e); }
            }
            
            const uniqueCharacters = new Map<string, any>();
            
            // PRIORITIZE INDEX for uniqueness to handle "Guard 1", "Guard 2" scenarios correctly
            const getKey = (c: any) => c.index || c.alias || normalize(c.name);

            linkedCharacters.forEach(char => { 
                const key = getKey(char);
                if (key && !uniqueCharacters.has(key)) uniqueCharacters.set(key, char); 
            });
            
            detailedCharacters.forEach((char: any) => { 
                const key = getKey(char);
                if (key && !uniqueCharacters.has(key)) {
                    const { image, imageBase64, imageSources, ...cleanChar } = char;
                    uniqueCharacters.set(key, { ...cleanChar, isLinked: false }); 
                }
            });
            allOriginalCharacters = Array.from(uniqueCharacters.values());
    
            existingCharactersForApi = allOriginalCharacters.map(c => ({ 
                name: c.name, 
                fullDescription: c.fullDescription || 'No description provided.',
                index: c.index || c.alias 
            }));
        } 
    
        if ((!finalPrompt || !finalPrompt.trim()) && (!useExistingCharacters || (existingCharactersForApi && existingCharactersForApi.length === 0))) {
            setError("Please enter a prompt for script generation or connect character cards.");
            return;
        }
    
        setError(null);
        setIsGeneratingScript(nodeId);
        try {
            const result = await generateScript(
                finalPrompt, 
                targetLanguage, 
                characterType, 
                narratorEnabled, 
                narratorMode, 
                existingCharactersForApi, 
                advancedOptions,
                model,
                visualStyle,
                customVisualStyle,
                createSecondaryChars,
                createKeyItems,
                thinkingEnabled,
                scenelessMode,
                simpleActions,
                commercialSafe,
                smartConceptEnabled,
                atmosphericEntryEnabled
            );
            
            const scenesArray = Array.isArray(result.scenes) ? result.scenes : [];
            const scenesWithNumbers = scenesArray.map((s: any, index: number) => ({ 
                ...s, 
                sceneNumber: index + 1 
            }));

            let charactersToStoreInState;
            const detailedCharactersArray = Array.isArray(result.detailedCharacters) ? result.detailedCharacters : [];

            if (useExistingCharacters && !noCharacters) {
                const finalAllCharacters = allOriginalCharacters.map(originalChar => {
                    // MATCHING LOGIC: PRIORITIZE INDEX
                    // 1. Try match by Index (Entity-N)
                    let apiResultForChar = detailedCharactersArray.find((apiChar: any) => 
                        (apiChar.index && originalChar.index && apiChar.index === originalChar.index)
                    );

                    // 2. Fallback to Name match if Index match failed
                    if (!apiResultForChar) {
                        apiResultForChar = detailedCharactersArray.find((apiChar: any) => normalize(apiChar.name) === normalize(originalChar.name));
                    }

                    const { image, imageBase64, imageSources, ...cleanOriginal } = originalChar;
                    return {
                        ...apiResultForChar,
                        ...cleanOriginal,
                        // If API returned a new prompt, use it. Otherwise keep original.
                        prompt: apiResultForChar?.prompt || cleanOriginal.prompt || '',
                        // Ensure we keep the correct index if API messed it up or omitted it
                        index: originalChar.index || originalChar.alias
                    };
                });
                
                // Exclude characters that are linked from upstream to avoid duplication in local state
                const localCharactersOnly = finalAllCharacters.filter(c => !c.isLinked);

                // Find completely new characters generated by AI (secondary chars)
                const newItems = detailedCharactersArray.filter((apiChar: any) => {
                    // Check if this API char was already matched to an original char
                    const matchedByIndex = allOriginalCharacters.some(orig => (apiChar.index && orig.index && apiChar.index === orig.index));
                    const matchedByName = allOriginalCharacters.some(orig => normalize(orig.name) === normalize(apiChar.name));
                    return !matchedByIndex && !matchedByName;
                });
                
                charactersToStoreInState = [
                    ...localCharactersOnly, 
                    ...newItems.map((char: any, index: number) => ({
                        ...char, 
                        id: `char-${Date.now()}-${index}`, 
                        originalName: char.name, 
                        // Assign next available index using Entity-N
                        index: char.index || `Entity-${allOriginalCharacters.length + index + 1}` 
                    }))
                ];
            } else {
                charactersToStoreInState = detailedCharactersArray.map((char: any, index: number) => ({
                    ...char, 
                    id: `char-${Date.now()}-${index}`, 
                    originalName: char.name, 
                    index: char.index || `Entity-${index + 1}` 
                }));
            }

            const collapsedScenes = scenesWithNumbers.map((_: any, i: number) => i);
            const collapsedCharacters = charactersToStoreInState.map((c: any) => c.id);

            const updatedValue = { 
                ...parsedValue, 
                prompt: finalPrompt, 
                summary: result.summary || '', 
                detailedCharacters: charactersToStoreInState, 
                scenes: scenesWithNumbers,
                generatedStyle: result.visualStyle || '',
                uiState: { 
                    ...uiState, 
                    collapsedScenes,
                    collapsedCharacters,
                    isSettingsCollapsed: true, 
                    isCharactersSectionCollapsed: false, 
                    isScenesSectionCollapsed: false 
                }
            };
            setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, value: JSON.stringify(updatedValue) } : n));
        } catch (e: any) {
            setError(e.message || "An unknown error occurred during script generation.");
        } finally {
            setIsGeneratingScript(null);
        }
    }, [connections, setNodes, getUpstreamTextValue, nodes, setError, setIsGeneratingScript]);

    const handleImproveScriptConcept = useCallback(async (nodeId: string, currentConcept: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;
        
        if (!currentConcept || !currentConcept.trim()) {
            setError("Concept is empty.");
            return;
        }

        let parsedValue;
        try { parsedValue = JSON.parse(node.value || '{}'); } catch { parsedValue = {}; }
        const targetLanguage = parsedValue.targetLanguage || 'ru';

        setError(null);
        setIsImprovingScriptConcept(nodeId);
        
        try {
            const improvedText = await improveScriptConcept(currentConcept, targetLanguage);
            
            setNodes(prev => prev.map(n => {
                if (n.id === nodeId) {
                    let currentVal; try { currentVal = JSON.parse(n.value); } catch { currentVal = {}; }
                    const updatedValue = { ...currentVal, prompt: improvedText };
                    return { ...n, value: JSON.stringify(updatedValue) };
                }
                return n;
            }));
        } catch (e: any) {
            setError(e.message || "Failed to improve concept.");
        } finally {
            setIsImprovingScriptConcept(null);
        }
    }, [nodes, setNodes, setError]);

    const handleGenerateSpeech = useCallback(async (nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;

        let parsedValue;
        try { parsedValue = JSON.parse(node.value || '{}'); } 
        catch { parsedValue = { inputText: '', voice: 'Zephyr', audioFiles: [], startSceneNumber: null, endSceneNumber: null, intonation: 'standard', mode: 'simple', isMultiSpeaker: false, speaker1Name: 'Man', speaker1Voice: 'Zephyr', speaker2Name: 'Woman', speaker2Voice: 'Kore' }; }

        const { voice, audioFiles: existingAudioFiles = [], startSceneNumber, endSceneNumber, intonation, mode, isMultiSpeaker, speaker1Name, speaker1Voice, speaker2Name, speaker2Voice } = parsedValue;
        let { inputText } = parsedValue;

        setError(null);
        setIsGeneratingSpeech(nodeId);
        executionStopRequested.current = false;

        try {
            const multiSpeakerConfig = isMultiSpeaker && speaker1Name && speaker1Voice && speaker2Name && speaker2Voice
                ? { speakers: [{ name: speaker1Name, voice: speaker1Voice }, { name: speaker2Name, voice: speaker2Voice }] }
                : undefined;

            if (mode === 'scene') {
                let allTextsToSynthesize: { sceneNumber: number; text: string }[] = [];
                if (Array.isArray(inputText)) {
                    allTextsToSynthesize = inputText.filter((item: any): item is { sceneNumber: number; text: string } => item && typeof item.sceneNumber === 'number' && typeof item.text === 'string');
                }
                
                if (allTextsToSynthesize.length === 0) {
                    throw new Error("No scene text to synthesize. Connect a Script Generator's 'All Narrator Data' output and click Refresh Data.");
                }

                const textsToSynthesize = allTextsToSynthesize.filter(scene => {
                    const startOk = !startSceneNumber || scene.sceneNumber >= startSceneNumber;
                    const endOk = !endSceneNumber || scene.sceneNumber <= endSceneNumber;
                    return startOk && endOk;
                });

                if (textsToSynthesize.length === 0) {
                    throw new Error("No scenes to generate in the selected range.");
                }
                
                const audioFilesMap = new Map((Array.isArray(existingAudioFiles) ? existingAudioFiles : []).map((file: any) => [file.id, file]));

                for (const scene of textsToSynthesize) {
                    if (executionStopRequested.current) throw new Error("Speech generation stopped.");

                    const result = await generateSpeech(scene.text, voice, intonation, multiSpeakerConfig);
                    const fileVoiceName = multiSpeakerConfig ? 'Multi-speaker' : voice;
                    const fileIntonation = multiSpeakerConfig ? `${speaker1Name} & ${speaker2Name}` : intonation;

                    const fileId = `scene-${scene.sceneNumber}`;
                    const newFile = {
                        id: fileId,
                        title: `${t('node.content.scene')} ${scene.sceneNumber}`,
                        sceneNumber: scene.sceneNumber,
                        text: scene.text,
                        audioData: result,
                        voiceName: fileVoiceName,
                        intonation: fileIntonation,
                    };
                    audioFilesMap.set(fileId, newFile);

                    const updatedAudioFiles = Array.from(audioFilesMap.values()).sort((a,b) => b.sceneNumber - a.sceneNumber);

                    setNodes(prev => prev.map(n => {
                        if (n.id === nodeId) {
                            let currentVal; try { currentVal = JSON.parse(n.value); } catch { currentVal = {}; }
                            const updatedValue = { ...currentVal, audioFiles: updatedAudioFiles };
                            return { ...n, value: JSON.stringify(updatedValue) };
                        }
                        return n;
                    }));
                }
            } else { 
                const inputConnection = connections.find(c => c.toNodeId === nodeId);
                if (inputConnection) {
                    inputText = getUpstreamTextValue(inputConnection.fromNodeId, inputConnection.fromHandleId);
                }

                const textToSynthesize = (typeof inputText === 'string' && inputText.trim()) ? inputText : null;
                if (!textToSynthesize) {
                    throw new Error("No text to synthesize. Enter text in the input area or connect a node.");
                }
                
                let maxIndex = 0;
                existingAudioFiles.forEach((file: any) => {
                    if (file.id && String(file.id).startsWith('simple-')) {
                        const index = parseInt(String(file.id).split('-')[1], 10);
                        if (!isNaN(index) && index > maxIndex) { maxIndex = index; }
                    }
                });
                const newIndex = maxIndex + 1;

                if (executionStopRequested.current) throw new Error("Speech generation stopped.");
                
                const result = await generateSpeech(textToSynthesize, voice, intonation, multiSpeakerConfig);
                const fileVoiceName = multiSpeakerConfig ? 'Multi-speaker' : voice;
                const fileIntonation = multiSpeakerConfig ? `${speaker1Name} & ${speaker2Name}` : intonation;

                const fileId = `simple-${newIndex}`;
                const newFile = {
                    id: fileId,
                    title: `${t('node.content.generatedAudio')} ${newIndex}`,
                    sceneNumber: newIndex, 
                    text: textToSynthesize,
                    audioData: result,
                    voiceName: fileVoiceName,
                    intonation: fileIntonation,
                };
                const updatedAudioFiles = [newFile, ...existingAudioFiles];
                setNodes(prev => prev.map(n => {
                    if (n.id === nodeId) {
                        let currentVal; try { currentVal = JSON.parse(n.value); } catch { currentVal = {}; }
                        const updatedValue = { ...currentVal, audioFiles: updatedAudioFiles };
                        return { ...n, value: JSON.stringify(updatedValue) };
                    }
                    return n;
                }));
            }
        } catch (e: any) {
            setError(e.message || "An unknown error occurred during speech generation.");
        } finally {
            setIsGeneratingSpeech(null);
        }
    }, [nodes, connections, getUpstreamTextValue, setError, setNodes, setIsGeneratingSpeech, executionStopRequested, t]);


    const handleGenerateIdeaCategories = useCallback(async (nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;
        
        setError(null);
        setIsGeneratingIdeaCategories(nodeId);
        try {
            let parsedValue = { targetLanguage: 'ru', format: 'childrens', theme: '' };
            try { 
                const p = JSON.parse(node.value || '{}');
                parsedValue = { ...parsedValue, ...p };
            } catch {}

            const categories = await generateIdeaCategories(parsedValue.targetLanguage, parsedValue.format, parsedValue.theme);
            
            setNodes(prev => prev.map(n => {
                if (n.id === nodeId) {
                    let currentVal = {};
                    try { currentVal = JSON.parse(n.value || '{}'); } catch {}
                    const updatedValue = { ...currentVal, categories, stage: 'selection' };
                    return { ...n, value: JSON.stringify(updatedValue) };
                }
                return n;
            }));
        } catch (e: any) {
            setError(e.message || "An unknown error occurred while generating idea categories.");
        } finally {
            setIsGeneratingIdeaCategories(null);
        }
    }, [nodes, setNodes, setError]);

    const handleCombineStoryIdea = useCallback(async (nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;
        
        let parsedValue;
        try { parsedValue = JSON.parse(node.value || '{}'); } catch { return; }
        
        const { selection, targetLanguage } = parsedValue;
        if (!selection || !selection.action || !selection.place || !selection.obstacle) {
            setError("Please select one of each category to generate an idea.");
            return;
        }

        setError(null);
        setIsCombiningStoryIdea(nodeId);
        try {
            const idea = await combineStoryIdea(selection.action, selection.place, selection.obstacle, targetLanguage);
            setNodes(prev => prev.map(n => {
                if (n.id === nodeId) {
                    let currentVal = {};
                    try { currentVal = JSON.parse(n.value || '{}'); } catch {}
                    const updatedValue = { ...currentVal, generatedIdea: idea };
                    return { ...n, value: JSON.stringify(updatedValue) };
                }
                return n;
            }));
        } catch (e: any) {
            setError(e.message || "An unknown error occurred while combining story idea.");
        } finally {
            setIsCombiningStoryIdea(null);
        }
    }, [nodes, setNodes, setError]);

    const handleGenerateNarratorText = useCallback(async (nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;
    
        let parsedValue;
        try {
            parsedValue = JSON.parse(node.value || '{}');
        } catch {
            setError("Invalid node data.");
            return;
        }
        
        const { prompt = '', role = 'narrator', targetLanguages = { ru: true }, generateSSML = false } = parsedValue;
        const inputConnection = connections.find(c => c.toNodeId === nodeId);
        const finalPrompt = inputConnection ? getUpstreamTextValue(inputConnection.fromNodeId, inputConnection.fromHandleId) : prompt;
    
        const selectedLangs = Object.values(targetLanguages).some(v => v);
        if (!selectedLangs) {
            setError("Please select at least one language.");
            return;
        }
        if (!finalPrompt || !finalPrompt.trim()) {
            setError("Please provide a prompt.");
            return;
        }
    
        setError(null);
        setIsGeneratingNarratorText(nodeId);
        try {
            const result = await generateNarratorText(finalPrompt, role, targetLanguages, generateSSML);
            const updatedValue = { ...parsedValue, prompt: finalPrompt, generatedTexts: result };
            delete (updatedValue as any).generatedText; 
            
            setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, value: JSON.stringify(updatedValue) } : n));
        } catch (e: any) {
            setError(e.message || "An unknown error occurred during text generation.");
        } finally {
            setIsGeneratingNarratorText(null);
        }
    }, [nodes, connections, getUpstreamTextValue, setNodes, setError, setIsGeneratingNarratorText]);

    const handleTranscribeAudio = useCallback(async (nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;

        let parsedValue;
        try {
            parsedValue = JSON.parse(node.value || '{}');
        } catch {
            setError("Invalid audio transcriber node data.");
            return;
        }

        const { audioBase64, mimeType } = parsedValue;

        if (!audioBase64 || !mimeType) {
            setError("No audio file has been uploaded to transcribe.");
            return;
        }

        setError(null);
        setIsTranscribingAudio(nodeId);
        try {
            const transcription = await transcribeAudio(audioBase64, mimeType);

            setNodes(prev => prev.map(n => {
                if (n.id === nodeId) {
                    const currentVal = JSON.parse(n.value || '{}');
                    const updatedValue = { ...currentVal, transcription };
                    return { ...n, value: JSON.stringify(updatedValue) };
                }
                return n;
            }));
        } catch (e: any) {
            setError(e.message || "An unknown error occurred during audio transcription.");
        } finally {
            setIsTranscribingAudio(null);
        }
    }, [nodes, setNodes, setError]);

    const handleGenerateYouTubeTitles = useCallback(async (nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;
    
        let parsedValue;
        try { parsedValue = JSON.parse(node.value || '{}'); } catch { setError("Invalid node data."); return; }
    
        const { idea, targetLanguages } = parsedValue;
        const inputConnection = connections.find(c => c.toNodeId === nodeId);
        const finalIdea = inputConnection ? getUpstreamTextValue(inputConnection.fromNodeId, inputConnection.fromHandleId) : idea;
    
        const selectedLangs = Object.values(targetLanguages).some(v => v);
        if (!selectedLangs) { setError("Please select at least one language."); return; }
        if (!finalIdea || !finalIdea.trim()) { setError("Please provide an idea."); return; }
    
        setError(null);
        setIsGeneratingYouTubeTitles(nodeId);
        try {
            const result = await generateYouTubeTitles(finalIdea, targetLanguages);
            const updatedValue = { ...parsedValue, idea: finalIdea, generatedTitleOutputs: result };
            setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, value: JSON.stringify(updatedValue) } : n));
        } catch (e: any) {
            setError(e.message || "An unknown error occurred.");
        } finally {
            setIsGeneratingYouTubeTitles(null);
        }
    }, [nodes, connections, getUpstreamTextValue, setNodes, setError, setIsGeneratingYouTubeTitles]);
    
    const handleGenerateYouTubeChannelInfo = useCallback(async (nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;
    
        let parsedValue;
        try { parsedValue = JSON.parse(node.value || '{}'); } catch { setError("Invalid node data."); return; }
    
        const { idea, targetLanguages } = parsedValue;
        const inputConnection = connections.find(c => c.toNodeId === nodeId);
        const finalIdea = inputConnection ? getUpstreamTextValue(inputConnection.fromNodeId, inputConnection.fromHandleId) : idea;
    
        const selectedLangs = Object.values(targetLanguages).some(v => v);
        if (!selectedLangs) { setError("Please select at least one language."); return; }
        if (!finalIdea || !finalIdea.trim()) { setError("Please provide an idea."); return; }
    
        setError(null);
        setIsGeneratingYouTubeChannelInfo(nodeId);
        try {
            const result = await generateYouTubeChannelInfo(finalIdea, targetLanguages);
            const updatedValue = { ...parsedValue, idea: finalIdea, generatedChannelOutputs: result };
            setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, value: JSON.stringify(updatedValue) } : n));
        } catch (e: any) {
            setError(e.message || "An unknown error occurred.");
        } finally {
            setIsGeneratingYouTubeChannelInfo(null);
        }
    }, [nodes, connections, getUpstreamTextValue, setNodes, setError, setIsGeneratingYouTubeChannelInfo]);

    const handleGenerateMusicIdeas = useCallback(async (nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;
    
        let parsedValue;
        try { parsedValue = JSON.parse(node.value || '{}'); } catch { setError("Invalid node data."); return; }
    
        const { idea, targetLanguages, generateLyrics, model } = parsedValue;
        const inputConnection = connections.find(c => c.toNodeId === nodeId);
        const finalIdea = inputConnection ? getUpstreamTextValue(inputConnection.fromNodeId, inputConnection.fromHandleId) : idea;
    
        const selectedLangs = Object.values(targetLanguages).some(v => v);
        if (!selectedLangs) { setError("Please select at least one language."); return; }
        if (!finalIdea || !finalIdea.trim()) { setError("Please provide an idea."); return; }
    
        setError(null);
        setIsGeneratingMusicIdeas(nodeId);
        try {
            const result = await generateMusicIdeas(finalIdea, targetLanguages, generateLyrics, model);

            const generatedLyrics: { [lang: string]: string } = {};
            const generatedMusicPrompts: { [lang: string]: string } = {};
            const generatedTitles: { [lang: string]: string } = {};
    
            for (const lang in result) {
                if (result[lang].lyrics) {
                    generatedLyrics[lang] = result[lang].lyrics;
                }
                if (result[lang].music_prompt) {
                    generatedMusicPrompts[lang] = result[lang].music_prompt;
                }
                if (result[lang].song_title) {
                    generatedTitles[lang] = result[lang].song_title;
                }
            }

            const updatedValue = { 
                ...parsedValue, 
                idea: finalIdea, 
                generatedLyrics,
                generatedMusicPrompts,
                generatedTitles,
            };
            setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, value: JSON.stringify(updatedValue) } : n));
        } catch (e: any) {
            setError(e.message || "An unknown error occurred.");
        } finally {
            setIsGeneratingMusicIdeas(null);
        }
    }, [nodes, connections, getUpstreamTextValue, setNodes, setError, setIsGeneratingMusicIdeas]);

    const handleExtractTextFromImage = useCallback(async (nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;

        let parsedValue;
        try { parsedValue = JSON.parse(node.value || '{}'); } 
        catch { parsedValue = { imageBase64: null }; }

        const { imageBase64 } = parsedValue;

        if (!imageBase64) {
            setError("No image loaded to extract text from.");
            return;
        }

        setError(null);
        setIsExtractingText(nodeId);
        try {
            const extractedText = await extractTextFromImage(imageBase64);
            const updatedValue = { ...parsedValue, extractedText };
            setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, value: JSON.stringify(updatedValue) } : n));
        } catch (e: any) {
            setError(e.message || "An unknown error occurred during text extraction.");
        } finally {
            setIsExtractingText(null);
        }
    }, [nodes, setNodes, setError]);

    return {
        states: {
            isGeneratingCharacters,
            isGeneratingImage,
            isGeneratingCharacterImage,
            isGeneratingScript,
            isGeneratingSpeech,
            isGeneratingIdeaCategories,
            isCombiningStoryIdea,
            isGeneratingNarratorText,
            isTranscribingAudio,
            isGeneratingYouTubeTitles,
            isGeneratingYouTubeChannelInfo,
            isGeneratingMusicIdeas,
            isExtractingText,
            isImprovingScriptConcept,
        },
        handleGenerateCharacters,
        handleGenerateImage,
        handleGenerateCharacterImage,
        handleGenerateScript,
        handleGenerateSpeech,
        handleGenerateIdeaCategories,
        handleCombineStoryIdea,
        handleGenerateNarratorText,
        handleTranscribeAudio,
        handleGenerateYouTubeTitles,
        handleGenerateYouTubeChannelInfo,
        handleGenerateMusicIdeas,
        handleExtractTextFromImage,
        handleImproveScriptConcept,
        stop: () => {
            setIsGeneratingCharacters(null);
            setIsGeneratingImage(null);
            setIsGeneratingCharacterImage(null);
            setIsGeneratingScript(null);
            setIsGeneratingSpeech(null);
            setIsGeneratingIdeaCategories(null);
            setIsCombiningStoryIdea(null);
            setIsGeneratingNarratorText(null);
            setIsTranscribingAudio(null);
            setIsGeneratingYouTubeTitles(null);
            setIsGeneratingYouTubeChannelInfo(null);
            setIsGeneratingMusicIdeas(null);
            setIsExtractingText(null);
            setIsImprovingScriptConcept(null);
        },
    };
};
