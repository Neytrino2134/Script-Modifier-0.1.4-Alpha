
import React, { useState, useCallback, useRef } from 'react';
import { Node, Connection, NodeType } from '../types';
import { 
    generateScript, 
    generateScriptEntities,
    generateCharacters, 
    generateImage, 
    generateSpeech, 
    generateNarratorText, 
    transcribeAudio, 
    generateYouTubeTitles, 
    generateYouTubeChannelInfo, 
    generateMusicIdeas,
    extractTextFromImage,
    generateIdeaCategories,
    combineStoryIdea
} from '../services/geminiService';

export const useGeminiGeneration = ({
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
    const [isGeneratingScript, setIsGeneratingScript] = useState<string | null>(null);
    const [isGeneratingEntities, setIsGeneratingEntities] = useState<string | null>(null);
    const [isGeneratingCharacters, setIsGeneratingCharacters] = useState<string | null>(null);
    const [isGeneratingImage, setIsGeneratingImage] = useState<string | null>(null);
    const [isGeneratingCharacterImage, setIsGeneratingCharacterImage] = useState<string | null>(null);
    const [isGeneratingSpeech, setIsGeneratingSpeech] = useState<string | null>(null);
    const [isGeneratingNarratorText, setIsGeneratingNarratorText] = useState<string | null>(null);
    const [isTranscribingAudio, setIsTranscribingAudio] = useState<string | null>(null);
    const [isGeneratingYouTubeTitles, setIsGeneratingYouTubeTitles] = useState<string | null>(null);
    const [isGeneratingYouTubeChannelInfo, setIsGeneratingYouTubeChannelInfo] = useState<string | null>(null);
    const [isGeneratingMusicIdeas, setIsGeneratingMusicIdeas] = useState<string | null>(null);
    const [isExtractingText, setIsExtractingText] = useState<string | null>(null);
    const [isGeneratingIdeaCategories, setIsGeneratingIdeaCategories] = useState<string | null>(null);
    const [isCombiningStoryIdea, setIsCombiningStoryIdea] = useState<string | null>(null);

    const handleGenerateEntities = useCallback(async (nodeId: string) => {
        executionStopRequested.current = false;
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;

        let parsedValue;
        try { parsedValue = JSON.parse(node.value || '{}'); } catch { parsedValue = {}; }

        const {
            prompt, targetLanguage, characterType,
            model, visualStyle, customVisualStyle, createSecondaryChars,
            createKeyItems, thinkingEnabled,
            useExistingCharacters, detailedCharacters
        } = parsedValue;

        const inputConnection = connections.find(c => c.toNodeId === nodeId && (c.toHandleId === 'prompt' || c.toHandleId === undefined));
        const finalPrompt = inputConnection ? getUpstreamTextValue(inputConnection.fromNodeId, inputConnection.fromHandleId) : prompt;

        // Gather upstream characters if useExistingCharacters is true (manual + linked are usually merged in node state)
        // Here we just use what is in state, which is correct
        
        if (!finalPrompt.trim() && (!detailedCharacters || detailedCharacters.length === 0)) {
            setError("No prompt or existing characters provided.");
            return;
        }

        setIsGeneratingEntities(nodeId);
        setError(null);

        try {
            const result = await generateScriptEntities(
                finalPrompt,
                targetLanguage,
                characterType,
                detailedCharacters,
                parsedValue,
                model,
                visualStyle,
                customVisualStyle,
                createSecondaryChars,
                createKeyItems,
                thinkingEnabled
            );

            if (executionStopRequested.current) throw new Error("Generation stopped.");

            // Post-process new entities: Assign IDs and Indices
            let newEntities = result.detailedCharacters || [];
            
            // Calculate starting index
            const currentMaxIndex = detailedCharacters.reduce((max: number, c: any) => {
                const match = (c.index || '').match(/(\d+)/);
                const num = match ? parseInt(match[1], 10) : 0;
                return Math.max(max, num);
            }, 0);

            newEntities = newEntities.map((c: any, index: number) => ({
                ...c,
                id: `gen-ent-${Date.now()}-${index}`,
                index: `Entity-${currentMaxIndex + index + 1}`
            }));

            // Merge with existing characters
            const updatedDetailedCharacters = [...(detailedCharacters || []), ...newEntities];
            
            // Expand UI to show characters
            const newUiState = { 
                ...(parsedValue.uiState || {}), 
                isCharactersSectionCollapsed: false 
            };

            setNodes(prev => prev.map(n => {
                if (n.id === nodeId) {
                    return { 
                        ...n, 
                        value: JSON.stringify({ 
                            ...parsedValue, 
                            detailedCharacters: updatedDetailedCharacters,
                            uiState: newUiState
                        }) 
                    };
                }
                return n;
            }));

        } catch (e: any) {
            setError(e.message || "Entity generation failed.");
        } finally {
             setIsGeneratingEntities(null);
        }

    }, [nodes, connections, getUpstreamTextValue, setNodes, setError, executionStopRequested]);

    const handleGenerateScript = useCallback(async (nodeId: string) => {
        executionStopRequested.current = false;
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;

        let parsedValue;
        try { parsedValue = JSON.parse(node.value || '{}'); } catch { parsedValue = {}; }

        const {
            prompt, targetLanguage, characterType, narratorEnabled, narratorMode,
            model, visualStyle, customVisualStyle, 
            thinkingEnabled, scenelessMode, simpleActions,
            commercialSafe, smartConceptEnabled, atmosphericEntryEnabled,
            useExistingCharacters, detailedCharacters
        } = parsedValue;

        const inputConnection = connections.find(c => c.toNodeId === nodeId && (c.toHandleId === 'prompt' || c.toHandleId === undefined));
        const finalPrompt = inputConnection ? getUpstreamTextValue(inputConnection.fromNodeId, inputConnection.fromHandleId) : prompt;

        if (!finalPrompt.trim() && (!detailedCharacters || detailedCharacters.length === 0)) {
            setError("No prompt or existing characters provided.");
            return;
        }

        setIsGeneratingScript(nodeId);
        setError(null);

        // Progress indication
        const startTime = Date.now();
        setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, value: JSON.stringify({ ...parsedValue, generationProgress: { current: 0, total: 1, totalStartTime: startTime, currentItemStartTime: startTime } }) } : n));

        try {
            const script = await generateScript(
                finalPrompt,
                targetLanguage,
                characterType,
                narratorEnabled,
                narratorMode,
                detailedCharacters, // STRICTLY PASS EXISTING CHARACTERS
                parsedValue,
                model,
                visualStyle,
                customVisualStyle,
                thinkingEnabled,
                scenelessMode,
                simpleActions,
                commercialSafe,
                smartConceptEnabled,
                atmosphericEntryEnabled
            );

            if (executionStopRequested.current) throw new Error("Generation stopped.");

            // FIX: Map the AI's generated style description to 'generatedStyle'.
            // The AI might return it in 'generatedStyle' (per new prompt) or 'visualStyle' (legacy/default field).
            // We force it into 'generatedStyle' in our state so the UI text area shows it.
            // We RESTORE 'visualStyle' from parsedValue so the dropdown selection isn't overwritten.
            const aiGeneratedDescription = script.generatedStyle || script.visualStyle || '';

            const finalScriptData = {
                ...script,
                generatedStyle: aiGeneratedDescription,
                visualStyle: parsedValue.visualStyle, // Restore dropdown value
                detailedCharacters: detailedCharacters // Preserve existing characters
            };

            setNodes(prev => prev.map(n => {
                if (n.id === nodeId) {
                    const current = JSON.parse(n.value || '{}');
                    return { 
                        ...n, 
                        value: JSON.stringify({ 
                            ...current, 
                            ...finalScriptData,
                            generationProgress: { ...current.generationProgress, endTime: Date.now(), current: 1 } 
                        }) 
                    };
                }
                return n;
            }));
        } catch (e: any) {
            setError(e.message || "Script generation failed.");
        } finally {
            setIsGeneratingScript(null);
        }
    }, [nodes, connections, getUpstreamTextValue, setNodes, setError, executionStopRequested]);

    const handleGenerateCharacters = useCallback(async (nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;
        let parsedValue;
        try { parsedValue = JSON.parse(node.value || '{}'); } catch { parsedValue = {}; }
        
        const { prompt, numberOfCharacters, targetLanguage, characterType, style, customStyle } = parsedValue;
        
        const inputConnection = connections.find(c => c.toNodeId === nodeId);
        const finalPrompt = inputConnection ? getUpstreamTextValue(inputConnection.fromNodeId, inputConnection.fromHandleId) : prompt;

        if (!finalPrompt.trim()) {
            setError("No prompt provided.");
            return;
        }

        setIsGeneratingCharacters(nodeId);
        setError(null);

        try {
            const characters = await generateCharacters(finalPrompt, numberOfCharacters, targetLanguage, characterType, style, customStyle);
            setNodes(prev => prev.map(n => {
                if (n.id === nodeId) {
                    const current = JSON.parse(n.value || '{}');
                    return { ...n, value: JSON.stringify({ ...current, characters }) };
                }
                return n;
            }));
        } catch (e: any) {
             setError(e.message || "Character generation failed.");
        } finally {
            setIsGeneratingCharacters(null);
        }
    }, [nodes, connections, getUpstreamTextValue, setNodes, setError]);

    const handleGenerateImage = useCallback(async (nodeId: string, characterId?: string | number) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;

        let parsedValue;
        try { parsedValue = JSON.parse(node.value || '{}'); } catch { parsedValue = {}; }

        let prompt = '';
        if (node.type === NodeType.IMAGE_GENERATOR) {
            const inputConnection = connections.find(c => c.toNodeId === nodeId);
            prompt = inputConnection ? getUpstreamTextValue(inputConnection.fromNodeId, inputConnection.fromHandleId) : parsedValue.prompt;
        } else if (node.type === NodeType.CHARACTER_GENERATOR && characterId !== undefined) {
            const char = parsedValue.characters.find((c: any) => c.id === characterId);
            prompt = char ? char.prompt : '';
        } else if (node.type === NodeType.CHARACTER_CARD && characterId !== undefined) {
             const charData = Array.isArray(parsedValue) ? parsedValue[characterId as number] : parsedValue;
             prompt = charData.prompt;
             if (charData.additionalPrompt && charData.additionalPrompt.trim()) {
                 prompt = `${prompt}, ${charData.additionalPrompt}`;
             }
        }

        if (!prompt) {
            setError("No prompt found.");
            return;
        }

        const loadingKey = characterId !== undefined ? `${nodeId}-${characterId}` : nodeId;
        if (characterId !== undefined) setIsGeneratingCharacterImage(loadingKey);
        else setIsGeneratingImage(nodeId);
        
        setError(null);

        try {
             // For Character Card, use selectedRatio if available, default to 1:1
             let ratio = '1:1';
             if (node.type === NodeType.CHARACTER_CARD && characterId !== undefined) {
                 const charData = Array.isArray(parsedValue) ? parsedValue[characterId as number] : parsedValue;
                 ratio = charData.selectedRatio || '1:1';
             }

            const imageBase64 = await generateImage(prompt, ratio);

            setNodes(prev => prev.map(n => {
                if (n.id === nodeId) {
                    const current = JSON.parse(n.value || '{}');
                    if (node.type === NodeType.IMAGE_GENERATOR) {
                        return { ...n, value: JSON.stringify({ ...current, imageBase64 }) };
                    } else if (node.type === NodeType.CHARACTER_GENERATOR) {
                        const newChars = current.characters.map((c: any) => c.id === characterId ? { ...c, imageBase64 } : c);
                        return { ...n, value: JSON.stringify({ ...current, characters: newChars }) };
                    } else if (node.type === NodeType.CHARACTER_CARD) {
                        const newCards = [...(Array.isArray(current) ? current : [current])];
                        const idx = characterId as number;
                        if(newCards[idx]) {
                             const card = newCards[idx];
                             const newSources = { ...card.imageSources, [ratio]: imageBase64 };
                             const newThumbnails = { ...card.thumbnails, [ratio]: imageBase64 }; // Should ideally be a thumbnail, but base64 works
                             newCards[idx] = { ...card, image: imageBase64, imageSources: newSources, thumbnails: newThumbnails };
                        }
                        return { ...n, value: JSON.stringify(newCards) };
                    }
                }
                return n;
            }));
        } catch (e: any) {
            setError(e.message || "Image generation failed.");
        } finally {
            if (characterId !== undefined) setIsGeneratingCharacterImage(null);
            else setIsGeneratingImage(null);
        }
    }, [nodes, connections, getUpstreamTextValue, setNodes, setError]);

    // Alias for consistency
    const handleGenerateCharacterImage = (nodeId: string, characterId: string) => handleGenerateImage(nodeId, characterId);

    const handleGenerateSpeech = useCallback(async (nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;

        let parsedValue;
        try { parsedValue = JSON.parse(node.value || '{}'); } catch { parsedValue = {}; }
        const { voice, intonation, audioFiles, mode, isMultiSpeaker, speaker1Name, speaker1Voice, speaker2Name, speaker2Voice } = parsedValue;

        // Input logic handled by useGeminiConversation's handleReadData or direct prop usually,
        // but for generation we grab current state inputText
        let inputText = parsedValue.inputText; 
        
        if (!inputText || (Array.isArray(inputText) && inputText.length === 0)) {
            setError("No text to synthesize.");
            return;
        }

        setIsGeneratingSpeech(nodeId);
        setError(null);

        try {
            const newAudioFiles = [...audioFiles];
            const multiSpeakerConfig = isMultiSpeaker ? {
                speakers: [
                    { name: speaker1Name, voice: speaker1Voice },
                    { name: speaker2Name, voice: speaker2Voice }
                ]
            } : undefined;
            const targetVoice = isMultiSpeaker ? 'multi' : voice; // Passed to service logic

            if (mode === 'scene' && Array.isArray(inputText)) {
                for (const scene of inputText) {
                    if (scene.text) {
                        const audioData = await generateSpeech(scene.text, targetVoice, intonation, multiSpeakerConfig);
                        if (audioData) {
                             newAudioFiles.push({
                                id: `scene-${scene.sceneNumber}-${Date.now()}`,
                                title: `Scene ${scene.sceneNumber}`,
                                text: scene.text,
                                audioData,
                                voiceName: isMultiSpeaker ? 'Multi' : voice,
                                intonation
                            });
                        }
                    }
                }
            } else {
                const text = typeof inputText === 'string' ? inputText : '';
                const audioData = await generateSpeech(text, targetVoice, intonation, multiSpeakerConfig);
                 if (audioData) {
                     newAudioFiles.push({
                        id: `simple-${Date.now()}`,
                        title: 'Generated Audio',
                        text: text.substring(0, 50) + '...',
                        audioData,
                        voiceName: isMultiSpeaker ? 'Multi' : voice,
                        intonation
                    });
                }
            }

            setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, value: JSON.stringify({ ...parsedValue, audioFiles: newAudioFiles }) } : n));

        } catch (e: any) {
            setError(e.message || "Speech generation failed.");
        } finally {
            setIsGeneratingSpeech(null);
        }
    }, [nodes, setNodes, setError]);

    const handleGenerateNarratorText = useCallback(async (nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;
        let parsedValue;
        try { parsedValue = JSON.parse(node.value || '{}'); } catch { parsedValue = {}; }
        const { prompt, role, targetLanguages, generateSSML } = parsedValue;
        
        if (!prompt) { setError("No prompt provided."); return; }

        setIsGeneratingNarratorText(nodeId);
        setError(null);
        try {
             // Only generate for selected languages
             const languagesToGen = Object.keys(targetLanguages).filter(k => targetLanguages[k]);
             const result = await generateNarratorText(prompt, role, languagesToGen, generateSSML);
             
             setNodes(prev => prev.map(n => {
                 if (n.id === nodeId) {
                     const current = JSON.parse(n.value || '{}');
                     return { ...n, value: JSON.stringify({ ...current, generatedTexts: result }) };
                 }
                 return n;
             }));
        } catch (e: any) {
            setError(e.message || "Narrator text generation failed.");
        } finally {
            setIsGeneratingNarratorText(null);
        }
    }, [nodes, setNodes, setError]);

    const handleTranscribeAudio = useCallback(async (nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;
        let parsedValue;
        try { parsedValue = JSON.parse(node.value || '{}'); } catch { parsedValue = {}; }
        const { audioBase64, mimeType } = parsedValue;

        if (!audioBase64) { setError("No audio loaded."); return; }

        setIsTranscribingAudio(nodeId);
        setError(null);
        try {
            const rawSegmentsString = await transcribeAudio(audioBase64, mimeType || 'audio/mp3');
            // Parse result to set plain text as well
            let segments = [];
            try { segments = JSON.parse(rawSegmentsString); } catch {}
            const plainText = segments.map((s: any) => s.text).join(' ');

            setNodes(prev => prev.map(n => n.id === nodeId ? { 
                ...n, 
                value: JSON.stringify({ ...parsedValue, transcription: plainText, segments }) 
            } : n));
        } catch (e: any) {
            setError(e.message || "Transcription failed.");
        } finally {
            setIsTranscribingAudio(null);
        }
    }, [nodes, setNodes, setError]);

    const handleGenerateYouTubeTitles = useCallback(async (nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;
        let parsedValue;
        try { parsedValue = JSON.parse(node.value || '{}'); } catch { parsedValue = {}; }
        const { idea, targetLanguages, includeHashtags, generateThumbnail } = parsedValue;
        
        const inputConnection = connections.find(c => c.toNodeId === nodeId);
        const finalIdea = inputConnection ? getUpstreamTextValue(inputConnection.fromNodeId, inputConnection.fromHandleId) : idea;

        if (!finalIdea) { setError("No idea provided."); return; }

        setIsGeneratingYouTubeTitles(nodeId);
        setError(null);
        try {
            const selectedLangs = Object.keys(targetLanguages).filter(k => targetLanguages[k]);
            const result = await generateYouTubeTitles(
                finalIdea, 
                selectedLangs,
                { includeHashtags, generateThumbnail }
            );
            setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, value: JSON.stringify({ ...parsedValue, generatedTitleOutputs: result }) } : n));
        } catch (e: any) {
            setError(e.message || "Title generation failed.");
        } finally {
            setIsGeneratingYouTubeTitles(null);
        }
    }, [nodes, connections, getUpstreamTextValue, setNodes, setError]);

    const handleGenerateYouTubeChannelInfo = useCallback(async (nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;
        let parsedValue;
        try { parsedValue = JSON.parse(node.value || '{}'); } catch { parsedValue = {}; }
        const { idea, targetLanguages } = parsedValue;
        
        const inputConnection = connections.find(c => c.toNodeId === nodeId);
        const finalIdea = inputConnection ? getUpstreamTextValue(inputConnection.fromNodeId, inputConnection.fromHandleId) : idea;

        if (!finalIdea) { setError("No theme provided."); return; }

        setIsGeneratingYouTubeChannelInfo(nodeId);
        setError(null);
        try {
             const selectedLangs = Object.keys(targetLanguages).filter(k => targetLanguages[k]);
             const result = await generateYouTubeChannelInfo(finalIdea, selectedLangs);
             setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, value: JSON.stringify({ ...parsedValue, generatedChannelOutputs: result }) } : n));
        } catch (e: any) {
            setError(e.message || "Channel info generation failed.");
        } finally {
            setIsGeneratingYouTubeChannelInfo(null);
        }
    }, [nodes, connections, getUpstreamTextValue, setNodes, setError]);

    const handleGenerateMusicIdeas = useCallback(async (nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;
    
        let parsedValue;
        try { parsedValue = JSON.parse(node.value || '{}'); } catch { setError("Invalid node data."); return; }
    
        const { idea, targetLanguages, generateLyrics, verseCount, model } = parsedValue;
        const inputConnection = connections.find(c => c.toNodeId === nodeId);
        const finalIdea = inputConnection ? getUpstreamTextValue(inputConnection.fromNodeId, inputConnection.fromHandleId) : idea;
    
        const selectedLangs = Object.values(targetLanguages).some(v => v);
        if (!selectedLangs) { setError("Please select at least one language."); return; }
        if (!finalIdea || !finalIdea.trim()) { setError("Please provide an idea."); return; }
    
        setError(null);
        setIsGeneratingMusicIdeas(nodeId);
        try {
            const result = await generateMusicIdeas(finalIdea, targetLanguages, generateLyrics, verseCount || 2, model);

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
        try { parsedValue = JSON.parse(node.value || '{}'); } catch { parsedValue = {}; }
        const { imageBase64 } = parsedValue;
        
        if (!imageBase64) { setError("No image loaded."); return; }

        setIsExtractingText(nodeId);
        setError(null);
        try {
            const text = await extractTextFromImage(imageBase64);
            setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, value: JSON.stringify({ ...parsedValue, extractedText: text }) } : n));
        } catch (e: any) {
             setError(e.message || "Text extraction failed.");
        } finally {
            setIsExtractingText(null);
        }
    }, [nodes, setNodes, setError]);

    const handleGenerateIdeaCategories = useCallback(async (nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;
        let parsedValue;
        try { parsedValue = JSON.parse(node.value || '{}'); } catch { parsedValue = {}; }
        const { targetLanguage, format, theme } = parsedValue;

        setIsGeneratingIdeaCategories(nodeId);
        setError(null);
        try {
            const categories = await generateIdeaCategories(targetLanguage, format, theme);
            setNodes(prev => prev.map(n => n.id === nodeId ? { 
                ...n, 
                value: JSON.stringify({ ...parsedValue, categories, stage: 'selection', selection: { action: null, place: null, obstacle: null } }) 
            } : n));
        } catch (e: any) {
            setError(e.message || "Category generation failed.");
        } finally {
            setIsGeneratingIdeaCategories(null);
        }
    }, [nodes, setNodes, setError]);

    const handleCombineStoryIdea = useCallback(async (nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;
        let parsedValue;
        try { parsedValue = JSON.parse(node.value || '{}'); } catch { parsedValue = {}; }
        const { selection, targetLanguage } = parsedValue;
        
        if (!selection.action || !selection.place || !selection.obstacle) {
             setError("Please select all three categories.");
             return;
        }

        setIsCombiningStoryIdea(nodeId);
        setError(null);
        try {
            const idea = await combineStoryIdea(selection.action, selection.place, selection.obstacle, targetLanguage);
            setNodes(prev => prev.map(n => n.id === nodeId ? { 
                ...n, 
                value: JSON.stringify({ ...parsedValue, generatedIdea: idea }) 
            } : n));
        } catch (e: any) {
            setError(e.message || "Idea generation failed.");
        } finally {
             setIsCombiningStoryIdea(null);
        }
    }, [nodes, setNodes, setError]);

    const stop = useCallback(() => {
        setIsGeneratingScript(null);
        setIsGeneratingEntities(null);
        setIsGeneratingCharacters(null);
        setIsGeneratingImage(null);
        setIsGeneratingCharacterImage(null);
        setIsGeneratingSpeech(null);
        setIsGeneratingNarratorText(null);
        setIsTranscribingAudio(null);
        setIsGeneratingYouTubeTitles(null);
        setIsGeneratingYouTubeChannelInfo(null);
        setIsGeneratingMusicIdeas(null);
        setIsExtractingText(null);
        setIsGeneratingIdeaCategories(null);
        setIsCombiningStoryIdea(null);
    }, []);

    return {
        handleGenerateScript,
        handleGenerateEntities,
        handleGenerateCharacters,
        handleGenerateImage,
        handleGenerateCharacterImage: (nodeId: string, characterId: string) => handleGenerateImage(nodeId, characterId),
        handleGenerateSpeech,
        handleGenerateNarratorText,
        handleTranscribeAudio,
        handleGenerateYouTubeTitles,
        handleGenerateYouTubeChannelInfo,
        handleGenerateMusicIdeas,
        handleExtractTextFromImage,
        handleGenerateIdeaCategories,
        handleCombineStoryIdea,
        stop,
        states: {
             isGeneratingScript,
             isGeneratingEntities,
             isGeneratingCharacters,
             isGeneratingImage,
             isGeneratingCharacterImage,
             isGeneratingSpeech,
             isGeneratingNarratorText,
             isTranscribingAudio,
             isGeneratingYouTubeTitles,
             isGeneratingYouTubeChannelInfo,
             isGeneratingMusicIdeas,
             isExtractingText,
             isGeneratingIdeaCategories,
             isCombiningStoryIdea
        }
    };
};
