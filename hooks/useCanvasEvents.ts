
import React, { useEffect, useState, useCallback } from 'react';
import { Node, NodeType, Point, CatalogItem, Tool, LineStyle } from '../types';

const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            // remove the header, e.g. "data:image/png;base64,"
            resolve(base64String.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

export const useCanvasEvents = ({
    isQuickSearchOpen, handleToggleCatalog, openQuickSearchMenu, openQuickAddMenu, clientPointerPosition,
    clientPointerPositionRef,
    onAddNode, handleCloseAddNodeMenus, loadStateFromFileContent, activeTool, setActiveTool,
    isSnapToGrid, setIsSnapToGrid, lineStyle, setLineStyle, selectedNodeIds,
    copyNodeValue, geminiContext,
    addCharacterCardFromFile, addImagePreviewNodeFromFile, viewTransform, nodes,
    handlePasteFromClipboard,
    handleAddGroupFromTemplate,
    catalogItems,
    handleToggleNodeCollapse,
    handleNodeDoubleClick,
    deleteNodeAndConnections,
    setSelectedNodeIds,
    handleGroupSelection,
    handleDuplicateNode,
    handleDuplicateNodeEmpty,
    t,
    contextMenuSlots,
    handleValueChange,
    handleSaveProject,
    handleLoadProject,
    addToast
}: {
    isQuickSearchOpen: boolean;
    handleToggleCatalog: () => void;
    openQuickSearchMenu: (position: Point) => void;
    openQuickAddMenu: (position: Point) => void;
    clientPointerPosition: Point;
    clientPointerPositionRef: React.RefObject<Point>;
    onAddNode: (type: NodeType, position: Point, value?: string, title?: string) => string;
    handleCloseAddNodeMenus: () => void;
    loadStateFromFileContent: (text: string) => void;
    activeTool: Tool;
    setActiveTool: (tool: Tool) => void;
    isSnapToGrid: boolean;
    setIsSnapToGrid: (value: React.SetStateAction<boolean>) => void;
    lineStyle: LineStyle;
    setLineStyle: (value: React.SetStateAction<LineStyle>) => void;
    selectedNodeIds: string[];
    copyNodeValue: (nodeId: string) => void;
    geminiContext: any;
    addCharacterCardFromFile: (data: any, position: Point) => void;
    addImagePreviewNodeFromFile: (file: File, position: Point) => void;
    viewTransform: { scale: number; translate: Point };
    nodes: Node[];
    handlePasteFromClipboard: () => Promise<void>;
    handleAddGroupFromTemplate: (template: any, position: Point) => void;
    catalogItems: CatalogItem[];
    handleToggleNodeCollapse: (nodeId: string) => void;
    handleNodeDoubleClick: (nodeId: string) => void;
    deleteNodeAndConnections: (nodeId: string) => void;
    setSelectedNodeIds: (ids: string[]) => void;
    handleGroupSelection: () => void;
    handleDuplicateNode: (nodeId: string) => string;
    handleDuplicateNodeEmpty: (nodeId: string) => string;
    t: (key: string, options?: { [key: string]: string | number; }) => string;
    contextMenuSlots: (NodeType | null)[];
    handleValueChange: (nodeId: string, value: string) => void;
    handleSaveProject: () => void;
    handleLoadProject: (projectData: any) => void;
    addToast: (message: string, type?: 'success' | 'info', position?: Point) => void;
}) => {
    const [isDraggingOverCanvas, setIsDraggingOverCanvas] = useState(false);
    
    const addNodeAndCloseMenus = useCallback((type: NodeType) => {
      const currentPointerPos = clientPointerPositionRef.current;
      if (!currentPointerPos) return;
      const canvasPosition = {
        x: (currentPointerPos.x - viewTransform.translate.x) / viewTransform.scale,
        y: (currentPointerPos.y - viewTransform.translate.y) / viewTransform.scale,
      };
      onAddNode(type, canvasPosition, undefined);
      handleCloseAddNodeMenus();
    }, [clientPointerPositionRef, onAddNode, handleCloseAddNodeMenus, viewTransform]);

    const handleCanvasDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        openQuickAddMenu({x: e.clientX, y: e.clientY});
      }
    };

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        const types = Array.from(e.dataTransfer.types);
        if (types.includes('Files') || types.includes('application/prompt-modifier-drag-item')) {
            setIsDraggingOverCanvas(true);
        }
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOverCanvas(false);
    }, []);

    const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOverCanvas(false);
        const dropPosition = {
            x: (e.clientX - viewTransform.translate.x) / viewTransform.scale,
            y: (e.clientY - viewTransform.translate.y) / viewTransform.scale,
        };

        const dragItemData = e.dataTransfer.getData('application/prompt-modifier-drag-item');
        if (dragItemData) {
            try {
                const { type, itemId } = JSON.parse(dragItemData);
                const item = catalogItems.find((i: CatalogItem) => i.id === itemId);
                
                if (!item) return;

                // --- Catalog Group Drop ---
                if (type === 'catalog-group') {
                    if (item.nodes && item.connections) {
                        handleAddGroupFromTemplate({ name: item.name, nodes: item.nodes, connections: item.connections }, dropPosition);
                    }
                    return;
                }

                // --- Data Item Drop (Characters, Scripts, etc.) ---
                const data = item.data;
                if (!data) return;

                let targetNodeType: NodeType | null = null;
                let initialValueObj: any = data; // Default to passing data as is (if it's the full object)
                let itemTitle: string | undefined = undefined;
                
                // Check if title is preserved in the data
                if (data.title) {
                    itemTitle = data.title;
                }

                // Check for specific types in the data wrapper first
                if (data.type === 'script-generator-data') {
                    targetNodeType = NodeType.SCRIPT_GENERATOR;
                    initialValueObj = { scenes: data.scenes }; // Extract content if wrapped
                } else if (data.type === 'script-analyzer-data') {
                    targetNodeType = NodeType.SCRIPT_ANALYZER;
                    initialValueObj = { scenes: data.scenes };
                } else if (data.type === 'script-prompt-modifier-data') {
                    targetNodeType = NodeType.SCRIPT_PROMPT_MODIFIER;
                    // Extract both prompts and contexts
                    initialValueObj = { 
                        finalPrompts: data.finalPrompts,
                        sceneContexts: data.sceneContexts || {} 
                    };
                } else if (data.type === 'youtube-title-data') {
                    targetNodeType = NodeType.YOUTUBE_TITLE_GENERATOR;
                    initialValueObj = data; // Already correct structure
                } else if (data.type === 'youtube-analytics-data') {
                    targetNodeType = NodeType.YOUTUBE_ANALYTICS;
                    initialValueObj = data; // Already correct structure
                } else if (data.type === 'music-idea-data') {
                    targetNodeType = NodeType.MUSIC_IDEA_GENERATOR;
                    initialValueObj = data;
                } else if (data.type === 'character-generator-data') {
                    targetNodeType = NodeType.CHARACTER_GENERATOR;
                    initialValueObj = { characters: data.characters };
                } else if (data.type === 'character-card') {
                    targetNodeType = NodeType.CHARACTER_CARD;
                    
                    // Normalize dropped data: ID generation and alias->index migration
                    initialValueObj = {
                         ...data,
                         id: data.id || `char-card-${Date.now()}`,
                         index: data.index || data.alias || 'Character-1'
                    };
                    delete initialValueObj.alias; // clean up

                    // For character cards, title might be under nodeTitle or name if title isn't set
                    if (!itemTitle) itemTitle = data.nodeTitle || data.name;
                } else {
                    // Fallback for legacy data (arrays) based on dragged item type
                    switch (type) {
                        case 'catalog-data-characters': 
                            targetNodeType = NodeType.CHARACTER_GENERATOR; 
                            // Check if array or single card
                            if (Array.isArray(data)) {
                                initialValueObj = { characters: data };
                            } else if (data.name) {
                                targetNodeType = NodeType.CHARACTER_CARD;
                                initialValueObj = {
                                    ...data,
                                    id: data.id || `char-card-${Date.now()}`,
                                    index: data.index || data.alias || 'Character-1'
                                };
                                delete initialValueObj.alias;
                            }
                            break;
                        case 'catalog-data-script': 
                            targetNodeType = NodeType.SCRIPT_GENERATOR; 
                            initialValueObj = { scenes: data };
                            break;
                        case 'catalog-data-analysis': 
                            targetNodeType = NodeType.SCRIPT_ANALYZER; 
                            initialValueObj = { scenes: data }; 
                            break;
                        case 'catalog-data-final_prompts': 
                            targetNodeType = NodeType.SCRIPT_PROMPT_MODIFIER; 
                            initialValueObj = { finalPrompts: data };
                            break;
                        case 'catalog-data-youtube': 
                            // Ambiguous legacy type, assume title generator if not specified
                            targetNodeType = NodeType.YOUTUBE_TITLE_GENERATOR; 
                            initialValueObj = data;
                            break;
                        case 'catalog-data-music':
                            targetNodeType = NodeType.MUSIC_IDEA_GENERATOR;
                            initialValueObj = data;
                            break;
                    }
                }

                if (targetNodeType) {
                    onAddNode(targetNodeType, dropPosition, JSON.stringify(initialValueObj), itemTitle);
                }

            } catch (err) {
                console.error("Failed to handle catalog drop:", err);
            }
        }

        const file = e.dataTransfer.files?.[0];
        if (file) {
            if (file.type.startsWith('image/') && !file.name.endsWith('.json')) {
                const imageDropPosition = { ...dropPosition, x: dropPosition.x - 150, y: dropPosition.y - 170 };
                addImagePreviewNodeFromFile(file, imageDropPosition);
                return;
            }

            if (file.type.startsWith('audio/') || file.type.startsWith('video/')) {
                 const reader = new FileReader();
                 reader.onload = (event) => {
                     const base64String = (event.target?.result as string).split(',')[1];
                     const newNodeValue = JSON.stringify({
                         audioBase64: base64String,
                         mimeType: file.type,
                         fileName: file.name,
                         transcription: '',
                         segments: [],
                     });
                     onAddNode(NodeType.AUDIO_TRANSCRIBER, dropPosition, newNodeValue);
                 };
                 reader.onerror = () => {
                     addToast(t('error.fileReadError'), 'info');
                 };
                 reader.readAsDataURL(file);
                 return;
            }
            
            // Allow .json, .SMC, .SMP and .CHAR files
            if (file.type === 'application/json' || file.name.endsWith('.json') || file.name.endsWith('.SMC') || file.name.endsWith('.SMP') || file.name.endsWith('.CHAR')) {
                const text = await file.text();
                
                let data;
                try {
                    data = JSON.parse(text);
                } catch (err) {
                    geminiContext.setError(`Error loading file: Invalid JSON format.`);
                    return;
                }

                if (data && (data.type === 'prompt-modifier-canvas' || data.type === 'prompt-modifier-project')) {
                    geminiContext.setError(t('error.promptModifierFile'));
                    return;
                }

                // Handle Project Load on Drop
                if (data && data.type === 'script-modifier-project') {
                    handleLoadProject(data);
                    return;
                }

                if (data && (data.type === 'group' || data.type === 'scriptModifierGroup')) {
                    handleAddGroupFromTemplate(data, dropPosition);
                    return;
                }

                if (data && (data.type === 'character-card' || (Array.isArray(data) && data.length > 0 && data[0].type === 'character-card'))) {
                    const charDropPosition = { ...dropPosition, x: dropPosition.x - 220, y: dropPosition.y - 400 };
                    addCharacterCardFromFile(data, charDropPosition);
                    return;
                }

                // Handle new file types
                if (data && data.type) {
                    let targetNodeType: NodeType | null = null;
                    let initialValueObj: any = data;
                    const itemTitle = data.title;

                    switch (data.type) {
                        case 'script-generator-data':
                            targetNodeType = NodeType.SCRIPT_GENERATOR;
                            initialValueObj = { scenes: data.scenes };
                            break;
                        case 'script-analyzer-data':
                            targetNodeType = NodeType.SCRIPT_ANALYZER;
                            initialValueObj = { scenes: data.scenes };
                            break;
                        case 'script-prompt-modifier-data':
                            targetNodeType = NodeType.SCRIPT_PROMPT_MODIFIER;
                            initialValueObj = { 
                                finalPrompts: data.finalPrompts,
                                sceneContexts: data.sceneContexts || {} // Extract contexts
                            };
                            break;
                        case 'youtube-title-data':
                            targetNodeType = NodeType.YOUTUBE_TITLE_GENERATOR;
                            break;
                        case 'youtube-analytics-data':
                            targetNodeType = NodeType.YOUTUBE_ANALYTICS;
                            break;
                        case 'music-idea-data':
                            targetNodeType = NodeType.MUSIC_IDEA_GENERATOR;
                            break;
                        case 'character-generator-data':
                            targetNodeType = NodeType.CHARACTER_GENERATOR;
                            initialValueObj = { characters: data.characters };
                            break;
                    }

                    if (targetNodeType) {
                        onAddNode(targetNodeType, dropPosition, JSON.stringify(initialValueObj), itemTitle);
                        return;
                    }
                }
                
                try {
                    loadStateFromFileContent(text);
                } catch (err: any) {
                    // loadStateFromFileContent handles error display now via setGlobalError in useCanvasIO
                }
            }
        }
    }, [loadStateFromFileContent, geminiContext, addCharacterCardFromFile, viewTransform, addImagePreviewNodeFromFile, handleAddGroupFromTemplate, catalogItems, onAddNode, handleLoadProject, t]);

    useEffect(() => {
        const handlePaste = async (event: ClipboardEvent) => {
            const target = event.target as HTMLElement;
            const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
            if (isTyping) return;
            
            event.preventDefault();

            // Try to intercept Character Card Array paste
            const clipboardText = event.clipboardData?.getData('text');
            if (clipboardText) {
                try {
                    const parsed = JSON.parse(clipboardText);
                    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].type === 'character-card') {
                        const currentPointerPos = clientPointerPositionRef.current;
                        if (currentPointerPos) {
                            const pastePosition = {
                                x: (currentPointerPos.x - viewTransform.translate.x) / viewTransform.scale,
                                y: (currentPointerPos.y - viewTransform.translate.y) / viewTransform.scale,
                            };
                            addCharacterCardFromFile(parsed, pastePosition);
                            addToast(t('toast.pasted'), 'success', currentPointerPos);
                            return;
                        }
                    }
                } catch (e) {
                    // Not valid JSON or not array of cards, proceed to default handler
                }
            }
            
            await handlePasteFromClipboard();
        };
    
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [handlePasteFromClipboard, addCharacterCardFromFile, viewTransform, clientPointerPositionRef, t, addToast]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
            if (e.code === 'Escape' && isTyping) (document.activeElement as HTMLElement)?.blur();
            
            // Handle Shortcuts that involve Control/Meta (Save, Load, Copy, Duplicate)
            if (e.ctrlKey || e.metaKey) {
                if (e.code === 'KeyC' && !isTyping && selectedNodeIds.length > 0) {
                    e.preventDefault();
                    const lastSelectedNodeId = selectedNodeIds[selectedNodeIds.length - 1];
                    copyNodeValue(lastSelectedNodeId);
                    addToast(t('toast.copied'), 'success', clientPointerPositionRef.current);
                    return;
                }
                if (e.code === 'KeyD' && !isTyping && selectedNodeIds.length > 0) {
                    e.preventDefault();
                    const newSelectedIds: string[] = [];
                    selectedNodeIds.forEach(id => {
                        const newId = handleDuplicateNode(id);
                        if (newId) newSelectedIds.push(newId);
                    });
                    setSelectedNodeIds(newSelectedIds);
                    return;
                }
                if (e.code === 'KeyA') {
                    if (isTyping) return;
                    e.preventDefault();
                    const allNodeIds = nodes.map((n: Node) => n.id);
                    setSelectedNodeIds(allNodeIds);
                    return;
                }
                // Ctrl+C for Character Card is special
                if (e.shiftKey && e.code === 'KeyC') {
                    e.preventDefault();
                    addNodeAndCloseMenus(NodeType.CHARACTER_CARD);
                    return;
                }
                // Save Project hotkey
                if (e.shiftKey && e.code === 'KeyS' && !isTyping) {
                    e.preventDefault();
                    handleSaveProject();
                    return;
                }
            }

            // F key for Search Menu
            if (e.code === 'KeyF' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && !isTyping) {
                e.preventDefault();
                openQuickSearchMenu(clientPointerPositionRef.current);
                return;
            }

            // Space key for Quick Add
            if (e.code === 'Space' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.isComposing && !isTyping) {
                e.preventDefault();
                openQuickAddMenu(clientPointerPositionRef.current);
                return;
            }

            if (isTyping) return;
            if (e.repeat) return;

            // Check for slot shortcuts 1-8
            if (e.key >= '1' && e.key <= '8' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
                const slotIndex = parseInt(e.key) - 1;
                if (contextMenuSlots && contextMenuSlots[slotIndex]) {
                     e.preventDefault();
                     addNodeAndCloseMenus(contextMenuSlots[slotIndex] as NodeType);
                     return;
                }
            }

            if (e.code === 'KeyD' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
                if (selectedNodeIds.length > 0) {
                    e.preventDefault();
                    const newSelectedIds: string[] = [];
                    selectedNodeIds.forEach(id => {
                        const newId = handleDuplicateNodeEmpty(id);
                        if (newId) newSelectedIds.push(newId);
                    });
                    setSelectedNodeIds(newSelectedIds);
                }
                return;
            }

            if (e.altKey && e.code === 'KeyA') {
                e.preventDefault();
                setSelectedNodeIds([]);
                return;
            }
            
            if (e.shiftKey && e.code === 'KeyE') { e.preventDefault(); setLineStyle(prev => prev === 'orthogonal' ? 'spaghetti' : 'orthogonal'); return; }
            if (e.shiftKey && e.code === 'KeyW') { e.preventDefault(); setIsSnapToGrid(prev => !prev); return; }
            if ((e.code === 'Delete' || e.code === 'KeyX') && selectedNodeIds.length > 0) { 
                e.preventDefault(); 
                selectedNodeIds.forEach(id => deleteNodeAndConnections(id)); 
                setSelectedNodeIds([]); 
                return; 
            }
            if (e.code === 'KeyG' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) { e.preventDefault(); handleGroupSelection(); return; }
            if (e.code === 'KeyH' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) { e.preventDefault(); selectedNodeIds.forEach(handleToggleNodeCollapse); return; }
            
            const code = e.code;
            switch (code) {
                case 'KeyV': case 'KeyC': case 'KeyS': case 'KeyR':
                    if (!e.shiftKey && !e.ctrlKey && !e.altKey) {
                        e.preventDefault();
                        if (code === 'KeyV') setActiveTool('edit');
                        if (code === 'KeyC') setActiveTool('cutter');
                        if (code === 'KeyS') setActiveTool('selection');
                        if (code === 'KeyR') setActiveTool('reroute');
                    }
                    break;
            }

            let nodeTypeToAdd: NodeType | null = null;
            if (e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
                 switch (code) { 
                    case 'KeyA': nodeTypeToAdd = NodeType.IDEA_GENERATOR; break;
                    case 'KeyC': nodeTypeToAdd = NodeType.CHARACTER_GENERATOR; break;
                    case 'KeyS': nodeTypeToAdd = NodeType.SCRIPT_GENERATOR; break;
                    case 'KeyD': nodeTypeToAdd = NodeType.SCRIPT_ANALYZER; break;
                    case 'KeyF': nodeTypeToAdd = NodeType.SCRIPT_PROMPT_MODIFIER; break;
                    case 'KeyR': nodeTypeToAdd = NodeType.DATA_READER; break;
                    case 'KeyG': nodeTypeToAdd = NodeType.NARRATOR_TEXT_GENERATOR; break;
                    case 'KeyN': nodeTypeToAdd = NodeType.SPEECH_SYNTHESIZER; break;
                    case 'KeyB': nodeTypeToAdd = NodeType.AUDIO_TRANSCRIBER; break;
                    case 'KeyT': nodeTypeToAdd = NodeType.YOUTUBE_TITLE_GENERATOR; break;
                    case 'KeyY': nodeTypeToAdd = NodeType.YOUTUBE_ANALYTICS; break;
                    case 'KeyM': nodeTypeToAdd = NodeType.MUSIC_IDEA_GENERATOR; break;
                 }
            } else if (!e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
                switch (code) {
                    case 'KeyT': nodeTypeToAdd = NodeType.TEXT_INPUT; break;
                    case 'KeyA': nodeTypeToAdd = NodeType.PROMPT_ANALYZER; break;
                    case 'KeyP': nodeTypeToAdd = NodeType.PROMPT_PROCESSOR; break;
                    case 'KeyM': nodeTypeToAdd = NodeType.GEMINI_CHAT; break;
                    case 'KeyL': nodeTypeToAdd = NodeType.TRANSLATOR; break;
                    case 'KeyN': nodeTypeToAdd = NodeType.NOTE; break;
                    case 'KeyO': nodeTypeToAdd = NodeType.IMAGE_GENERATOR; break;
                    case 'KeyI': nodeTypeToAdd = NodeType.IMAGE_PREVIEW; break;
                }
            }
            if (nodeTypeToAdd) { e.preventDefault(); addNodeAndCloseMenus(nodeTypeToAdd); }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleGroupSelection, setActiveTool, addNodeAndCloseMenus, selectedNodeIds, deleteNodeAndConnections, setSelectedNodeIds, handleToggleNodeCollapse, copyNodeValue, setIsSnapToGrid, setLineStyle, isQuickSearchOpen, handleToggleCatalog, nodes, geminiContext, handleDuplicateNode, handleDuplicateNodeEmpty, handleNodeDoubleClick, t, contextMenuSlots, handleSaveProject, addToast, clientPointerPositionRef, openQuickSearchMenu, openQuickAddMenu]);

    return {
        isDraggingOverCanvas,
        handleCanvasDoubleClick,
        handleDragOver,
        handleDragLeave,
        handleDrop,
    };
};
