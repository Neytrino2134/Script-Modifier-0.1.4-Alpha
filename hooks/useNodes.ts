
import { useState, useCallback, useRef } from 'react';
import { Node, NodeType, Point } from '../types';

export const getNodeDefaults = (type: NodeType, t: (key: string) => string) => {
    const widthMap: Record<string, number> = {
        [NodeType.SCRIPT_GENERATOR]: 680,
        [NodeType.SCRIPT_ANALYZER]: 680,
        [NodeType.SCRIPT_PROMPT_MODIFIER]: 680,
        [NodeType.CHARACTER_GENERATOR]: 680,
        [NodeType.CHARACTER_ANALYZER]: 460,
        [NodeType.CHARACTER_CARD]: 460,
        [NodeType.TEXT_INPUT]: 460,
        [NodeType.PROMPT_PROCESSOR]: 460,
        [NodeType.PROMPT_ANALYZER]: 460,
        [NodeType.IMAGE_GENERATOR]: 400,
        [NodeType.IMAGE_PREVIEW]: 300,
        [NodeType.GEMINI_CHAT]: 400,
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
        [NodeType.YOUTUBE_ANALYTICS]: 680,
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
    
    const handleCopyNodeValue = useCallback((nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (node) {
             navigator.clipboard.writeText(node.value);
        }
    }, [nodes]);

    const handlePasteNodeValue = useCallback(async (nodeId: string) => {
         try {
            const text = await navigator.clipboard.readText();
            setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, value: text } : n));
         } catch(e) { console.error(e); }
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
