
import { useState, useCallback, useRef } from 'react';
import { Node, NodeType, Point } from '../types';

export const getNodeDefaults = (type: NodeType, t: (key: string) => string) => {
    const widthMap: Record<string, number> = {
        [NodeType.SCRIPT_GENERATOR]: 680,
        [NodeType.SCRIPT_ANALYZER]: 680,
        [NodeType.SCRIPT_PROMPT_MODIFIER]: 680,
        [NodeType.CHARACTER_GENERATOR]: 460,
        [NodeType.CHARACTER_ANALYZER]: 460,
        [NodeType.CHARACTER_CARD]: 460,
        [NodeType.TEXT_INPUT]: 460,
        [NodeType.PROMPT_PROCESSOR]: 460,
        [NodeType.PROMPT_ANALYZER]: 460,
        [NodeType.IMAGE_GENERATOR]: 400,
        [NodeType.IMAGE_PREVIEW]: 300,
        [NodeType.GEMINI_CHAT]: 400,
        [NodeType.PROMPT_MODIFIER]: 460,
        [NodeType.TRANSLATOR]: 380,
        [NodeType.ERROR_ANALYZER]: 380,
        [NodeType.NOTE]: 440,
        [NodeType.DATA_READER]: 380,
        [NodeType.SPEECH_SYNTHESIZER]: 680,
        [NodeType.NARRATOR_TEXT_GENERATOR]: 680,
        [NodeType.IDEA_GENERATOR]: 680,
        [NodeType.AUDIO_TRANSCRIBER]: 400,
        [NodeType.YOUTUBE_TITLE_GENERATOR]: 680,
        [NodeType.MUSIC_IDEA_GENERATOR]: 680,
        [NodeType.YOUTUBE_ANALYTICS]: 1200,
        [NodeType.IMAGE_EDITOR]: 800,
        [NodeType.REROUTE_DOT]: 60,
    };

    const heightMap: Record<string, number> = {
        [NodeType.SCRIPT_GENERATOR]: 800,
        [NodeType.SCRIPT_ANALYZER]: 800,
        [NodeType.SCRIPT_PROMPT_MODIFIER]: 800,
        [NodeType.CHARACTER_GENERATOR]: 800,
        [NodeType.CHARACTER_ANALYZER]: 500,
        [NodeType.CHARACTER_CARD]: 1000,
        [NodeType.TEXT_INPUT]: 280,
        [NodeType.PROMPT_PROCESSOR]: 280,
        [NodeType.PROMPT_ANALYZER]: 1000,
        [NodeType.IMAGE_GENERATOR]: 520,
        [NodeType.IMAGE_PREVIEW]: 340,
        [NodeType.GEMINI_CHAT]: 640,
        [NodeType.PROMPT_MODIFIER]: 800,
        [NodeType.TRANSLATOR]: 640,
        [NodeType.ERROR_ANALYZER]: 280,
        [NodeType.NOTE]: 640,
        [NodeType.DATA_READER]: 280,
        [NodeType.SPEECH_SYNTHESIZER]: 800,
        [NodeType.NARRATOR_TEXT_GENERATOR]: 800,
        [NodeType.IDEA_GENERATOR]: 800,
        [NodeType.AUDIO_TRANSCRIBER]: 480,
        [NodeType.YOUTUBE_TITLE_GENERATOR]: 800,
        [NodeType.MUSIC_IDEA_GENERATOR]: 800,
        [NodeType.YOUTUBE_ANALYTICS]: 800,
        [NodeType.IMAGE_EDITOR]: 600,
        [NodeType.REROUTE_DOT]: 40,
    };

    let value = '';

    if (type === NodeType.MUSIC_IDEA_GENERATOR) {
        value = JSON.stringify({
            generateLyrics: true,
            verseCount: 2,
            idea: '',
            targetLanguages: { ru: true, en: false },
            generatedLyrics: {},
            generatedMusicPrompts: {},
            generatedTitles: {},
            model: 'gemini-3-flash-preview'
        });
    } else if (type === NodeType.YOUTUBE_TITLE_GENERATOR) {
        value = JSON.stringify({
            mode: 'title',
            idea: '',
            targetLanguages: { ru: true, en: false },
            generatedTitleOutputs: {},
            generatedChannelOutputs: {}
        });
    } else if (type === NodeType.YOUTUBE_ANALYTICS) {
        value = JSON.stringify({
            channels: [{ id: 'default', name: 'Main Channel', videos: [], stats: [] }],
            activeChannelId: 'default'
        });
    } else if (type === NodeType.SCRIPT_GENERATOR) {
        value = JSON.stringify({
            prompt: '',
            scenes: [],
            detailedCharacters: []
        });
    } else if (type === NodeType.PROMPT_MODIFIER) {
        value = JSON.stringify({
            messages: [],
            currentInput: '',
            mode: 'prompt'
        });
    }

    return {
        width: widthMap[type] || 200,
        height: heightMap[type] || 150,
        title: t(`node.title.${type.toLowerCase()}`),
        value
    };
};

export const useNodes = (initialNodes: Node[], initialCounter: number) => {
    const [nodes, setNodes] = useState<Node[]>(initialNodes);
    const nodeIdCounter = useRef(initialCounter);

    const handleAddNode = useCallback((type: NodeType, position: Point, t: (key: string) => string, value?: string, title?: string) => {
        nodeIdCounter.current += 1;
        const newNodeId = `node-${nodeIdCounter.current}-${Date.now()}`;
        const defaults = getNodeDefaults(type, t);

        const newNode: Node = {
            id: newNodeId,
            type,
            position,
            title: title || defaults.title,
            value: value || defaults.value,
            width: defaults.width,
            height: defaults.height,
        };

        setNodes((prev) => [...prev, newNode]);
        return newNodeId;
    }, []);

    const handleDeleteNode = useCallback((nodeId: string) => {
        setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    }, []);

    const handleValueChange = useCallback((nodeId: string, value: string) => {
        setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, value } : n)));
    }, []);

    const handleCopyNodeValue = useCallback(async (nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (node) {
            let textToCopy = node.value;

            // Special handling for clean data export on copy (matching file export structure)
            if (node.type === NodeType.SCRIPT_PROMPT_MODIFIER) {
                try {
                    const rawData = JSON.parse(node.value);
                    const cleanData = {
                        type: 'script-prompt-modifier-data',
                        finalPrompts: rawData.finalPrompts || [],
                        videoPrompts: rawData.videoPrompts || [],
                        sceneContexts: rawData.sceneContexts || {}, // Added to match save format
                        usedCharacters: rawData.usedCharacters || [],
                        // Logic to prioritize active style similar to handleDownloadJson
                        visualStyle: rawData.styleOverride || (rawData.generatedStyle) || (rawData.visualStyle) || '',
                        title: node.title
                    };
                    textToCopy = JSON.stringify(cleanData, null, 2);
                } catch (e) {
                    console.error("Failed to parse script prompt modifier data for copy", e);
                }
            } else if (node.type === NodeType.SCRIPT_GENERATOR) {
                try {
                    const rawData = JSON.parse(node.value);
                    const cleanData = {
                        type: 'script-generator-data',
                        scenes: rawData.scenes || [],
                        detailedCharacters: rawData.detailedCharacters || [],
                        prompt: rawData.prompt || '',
                        summary: rawData.summary || '',
                        generatedStyle: rawData.generatedStyle || '',
                        title: node.title
                    };
                    textToCopy = JSON.stringify(cleanData, null, 2);
                } catch (e) {
                    console.error("Failed to parse script generator data for copy", e);
                }
            } else if (node.type === NodeType.SCRIPT_ANALYZER) {
                try {
                    const rawData = JSON.parse(node.value);
                    const cleanData = {
                        type: 'script-analyzer-data',
                        scenes: rawData.scenes || [],
                        characters: rawData.characters || [],
                        visualStyle: rawData.visualStyle || rawData.generatedStyle || '',
                        title: node.title
                    };
                    textToCopy = JSON.stringify(cleanData, null, 2);
                } catch (e) {
                    console.error("Failed to parse script analyzer data for copy", e);
                }
            } else if (node.type === NodeType.CHARACTER_CARD) {
                try {
                    const rawData = JSON.parse(node.value);
                    const cleanData = Array.isArray(rawData) ? rawData.map((char: any) => {
                        const imageSources: Record<string, string | null> = {};
                        const ratios = ['1:1', '16:9', '9:16'];
                        const sourceObj = char.imageSources || char.thumbnails || {};

                        ratios.forEach(ratio => {
                            let src = sourceObj[ratio];
                            if (ratio === '1:1' && !src) src = char.image;
                            if (src) imageSources[ratio] = src.startsWith('data:image') ? src : `data:image/png;base64,${src}`;
                            else imageSources[ratio] = null;
                        });

                        return {
                            type: 'character-card',
                            nodeTitle: node.title,
                            name: char.name,
                            index: char.index,
                            image: imageSources['1:1'] || null,
                            selectedRatio: char.selectedRatio || '1:1',
                            prompt: char.prompt,
                            fullDescription: char.fullDescription,
                            imageSources: imageSources,
                            additionalPrompt: char.additionalPrompt,
                            targetLanguage: char.targetLanguage,
                            isOutput: char.isOutput,
                            isActive: char.isActive,
                            isDescriptionCollapsed: char.isDescriptionCollapsed,
                            isImageCollapsed: char.isImageCollapsed,
                            isPromptCollapsed: char.isPromptCollapsed
                        };
                    }) : [];
                    textToCopy = JSON.stringify(cleanData, null, 2);
                } catch (e) {
                    console.error("Failed to parse character card data for copy", e);
                }
            }

            await navigator.clipboard.writeText(textToCopy);
        }
    }, [nodes]);

    const handlePasteNodeValue = useCallback(async (nodeId: string) => {
        try {
            const text = await navigator.clipboard.readText();
            setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, value: text } : n));
        } catch (e) { console.error(e); }
    }, []);

    const handleToggleNodeCollapse = useCallback((nodeId: string) => {
        setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, isCollapsed: !n.isCollapsed } : n));
    }, []);

    const handleDuplicateNode = useCallback((nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return '';
        nodeIdCounter.current += 1;
        const newNodeId = `node-${nodeIdCounter.current}-${Date.now()}`;
        const newNode = {
            ...node,
            id: newNodeId,
            position: { x: node.position.x + 50, y: node.position.y + 50 }
        };
        setNodes(prev => [...prev, newNode]);
        return newNodeId;
    }, [nodes]);

    const handleDuplicateNodeEmpty = useCallback((nodeId: string, t: (key: string) => string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return '';
        nodeIdCounter.current += 1;
        const newNodeId = `node-${nodeIdCounter.current}-${Date.now()}`;
        const defaults = getNodeDefaults(node.type, t);
        const newNode = {
            ...node,
            id: newNodeId,
            position: { x: node.position.x + 50, y: node.position.y + 50 },
            value: defaults.value,
            title: node.title
        };
        setNodes(prev => [...prev, newNode]);
        return newNodeId;
    }, [nodes]);

    const handleToggleNodeOutputVisibility = useCallback((nodeId: string) => {
        setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, areOutputHandlesHidden: !n.areOutputHandlesHidden } : n));
    }, []);

    return {
        nodes,
        setNodes,
        nodeIdCounter,
        handleAddNode,
        handleDeleteNode,
        handleValueChange,
        handleCopyNodeValue,
        handlePasteNodeValue,
        handleToggleNodeCollapse,
        handleDuplicateNode,
        handleDuplicateNodeEmpty,
        handleToggleNodeOutputVisibility
    };
};
