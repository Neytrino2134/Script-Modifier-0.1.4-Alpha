
import React, { useCallback, useRef } from 'react';
import { Node, Connection, Point, Group, NodeType } from '../types';
import { useLanguage } from '../localization';

interface CanvasState {
    type: 'script-modifier-canvas';
    nodes: Node[];
    connections: Connection[];
    groups: Group[];
    viewTransform: { scale: number; translate: Point };
    nodeIdCounter: number;
}

interface UseCanvasIOProps {
    nodes: Node[];
    connections: Connection[];
    groups: Group[];
    viewTransform: { scale: number; translate: Point };
    nodeIdCounter: React.MutableRefObject<number>;
    setNodes: (nodes: Node[]) => void;
    setConnections: (connections: Connection[]) => void;
    setGroups: (groups: Group[]) => void;
    setViewTransform: (transform: { scale: number; translate: Point }) => void;
    activeTabName: string;
    onLoadProject?: (data: any) => void;
    addToast: (message: string, type?: 'success' | 'info') => void;
    setGlobalError: (error: string | null) => void;
    onAddNode?: (type: NodeType, position: Point, value?: string, title?: string) => string;
    handleAddGroupFromTemplate?: (template: any, position: Point) => void;
}

export const useCanvasIO = ({
    nodes, connections, groups, viewTransform, nodeIdCounter,
    setNodes, setConnections, setGroups, setViewTransform,
    activeTabName, onLoadProject, addToast, setGlobalError,
    onAddNode, handleAddGroupFromTemplate
}: UseCanvasIOProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { t } = useLanguage();

    const handleSaveCanvas = useCallback(() => {
        try {
            const canvasState: CanvasState = {
                type: 'script-modifier-canvas',
                nodes,
                connections,
                groups,
                viewTransform,
                nodeIdCounter: nodeIdCounter.current,
            };
            const stateString = JSON.stringify(canvasState, null, 2);
            const blob = new Blob([stateString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');

            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            const dateTimeString = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
            
            const sanitizedTabName = activeTabName.replace(/ /g, '_').replace(/[^a-zA-Z0-9_.-]/g, '');

            a.href = url;
            // Changed extension from .json to .SMC (Script Modifier Canvas)
            a.download = `Script-Modifier-${sanitizedTabName}-${dateTimeString}.SMC`;
            a.click();
            URL.revokeObjectURL(url);
            a.remove();
            return null;
        } catch (err) {
            console.error("Failed to save canvas:", err);
            return "Could not save canvas state.";
        }
    }, [nodes, connections, groups, viewTransform, nodeIdCounter, activeTabName]);
    
    const handleLoadCanvas = useCallback(() => {
        fileInputRef.current?.click();
    }, []);
    
    const loadStateFromFileContent = useCallback((text: string) => {
        try {
            if (!text) throw new Error("File content is empty.");
            
            let loadedState: any;
            try {
                loadedState = JSON.parse(text);
            } catch (e) {
                throw new Error("Invalid JSON format.");
            }
            
            if (loadedState.type === 'prompt-modifier-canvas' || loadedState.type === 'prompt-modifier-project') {
                setGlobalError(t('error.promptModifierFile'));
                return;
            }

            // 1. Handle Project
            if (loadedState.type === 'script-modifier-project') {
                if (onLoadProject) {
                    onLoadProject(loadedState);
                    return;
                }
                return;
            }
            
            // 2. Handle Groups (New Type or Legacy)
            if (loadedState.type === 'scriptModifierGroup' || loadedState.type === 'group') {
                if (handleAddGroupFromTemplate) {
                    const centerView = {
                        x: (-viewTransform.translate.x + window.innerWidth / 2) / viewTransform.scale,
                        y: (-viewTransform.translate.y + window.innerHeight / 2) / viewTransform.scale,
                    };
                    handleAddGroupFromTemplate(loadedState, centerView);
                    addToast(t('toast.pasted'), 'success');
                    return;
                }
            }

            // 3. Handle Individual Nodes
            if (loadedState.type && onAddNode) {
                const centerView = {
                    x: (-viewTransform.translate.x + window.innerWidth / 2) / viewTransform.scale,
                    y: (-viewTransform.translate.y + window.innerHeight / 2) / viewTransform.scale,
                };
                let targetNodeType: NodeType | null = null;
                let initialValueObj: any = loadedState;

                switch (loadedState.type) {
                    case 'script-generator-data': targetNodeType = NodeType.SCRIPT_GENERATOR; initialValueObj = { scenes: loadedState.scenes }; break;
                    case 'script-analyzer-data': targetNodeType = NodeType.SCRIPT_ANALYZER; initialValueObj = { scenes: loadedState.scenes }; break;
                    case 'script-prompt-modifier-data': targetNodeType = NodeType.SCRIPT_PROMPT_MODIFIER; initialValueObj = { finalPrompts: loadedState.finalPrompts }; break;
                    case 'youtube-title-data': targetNodeType = NodeType.YOUTUBE_TITLE_GENERATOR; break;
                    case 'youtube-analytics-data': targetNodeType = NodeType.YOUTUBE_ANALYTICS; break;
                    case 'music-idea-data': targetNodeType = NodeType.MUSIC_IDEA_GENERATOR; break;
                    case 'character-generator-data': targetNodeType = NodeType.CHARACTER_GENERATOR; initialValueObj = { characters: loadedState.characters }; break;
                    case 'character-card': targetNodeType = NodeType.CHARACTER_CARD; break;
                }

                if (targetNodeType) {
                    onAddNode(targetNodeType, centerView, JSON.stringify(initialValueObj), loadedState.title);
                    addToast(t('toast.pasted'), 'success');
                    return;
                }
            }
            
            // 4. Handle Canvas State (Legacy or current)
            const isValidCanvas = loadedState.type === 'script-modifier-canvas';
            const isLegacyStructure = !loadedState.type && Array.isArray(loadedState.nodes) && Array.isArray(loadedState.connections);

            if (!isValidCanvas && !isLegacyStructure) {
                throw new Error(t('error.invalidFileType'));
            }

            if (Array.isArray(loadedState.nodes) && Array.isArray(loadedState.connections) && loadedState.viewTransform?.scale && loadedState.viewTransform?.translate && typeof loadedState.nodeIdCounter === 'number') {
                setNodes(loadedState.nodes);
                const connectionsWithIds = loadedState.connections.map((c: any, i: number) => ({
                    ...c,
                    id: c.id || `loaded-conn-${Date.now()}-${i}`
                }));
                setConnections(connectionsWithIds);
                setGroups(loadedState.groups || []);
                setViewTransform(loadedState.viewTransform);
                nodeIdCounter.current = loadedState.nodeIdCounter;
                addToast(t('toast.canvasLoaded'), 'success');
            } else {
                throw new Error(t('error.invalidFileType'));
            }
        } catch (err: any) {
            if (err.message === t('error.invalidFileType') || err.message === t('error.promptModifierFile')) {
                 setGlobalError(err.message);
            } else {
                 setGlobalError(`${t('error.fileReadError')}: ${err.message}`);
            }
        }
    }, [nodeIdCounter, setConnections, setGroups, setNodes, setViewTransform, onLoadProject, addToast, setGlobalError, t, handleAddGroupFromTemplate, viewTransform, onAddNode]);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            if (text) {
                loadStateFromFileContent(text);
            }
            if (e.target) e.target.value = ''; // Reset file input
        };
        reader.readAsText(file);
    }, [loadStateFromFileContent]);

    return {
        fileInputRef,
        handleSaveCanvas,
        handleLoadCanvas,
        handleFileChange,
        loadStateFromFileContent,
    };
};
