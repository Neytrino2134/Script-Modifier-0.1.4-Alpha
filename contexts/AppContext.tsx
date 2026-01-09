import React, { createContext, useCallback, useMemo, useState, ReactNode, useContext, useRef, useEffect } from 'react';
import type { Node, Connection, Point, Group, LibraryItem, LineStyle, Tool, CatalogItem, TabState, ConnectingInfo } from '../types';
import { NodeType, LibraryItemType, CatalogItemType } from '../types';
import { useLanguage } from '../localization';
import {
  useNodes,
  useConnections,
  useCanvas,
  useInteraction,
  useGemini,
  useCanvasIO,
  useUIState,
  useGroups,
  useCatalog,
  usePermissions,
  usePromptLibrary,
  useDialogsAndUI,
  useCanvasEvents,
  useEntityActions,
  useDerivedMemo,
  useAutoSave,
} from '../hooks';
import { getOutputHandleType, getInputHandleType } from '../utils/nodeUtils';
import type { Toast } from '../components/ui/ToastContainer';
import { INITIAL_CANVAS_STATE } from '../utils/initialCanvasState';


export interface AppContextType {
    tabs: TabState[];
    activeTabIndex: number;
    switchTab: (index: number) => void;
    addTab: () => void;
    closeTab: (index: number) => void;
    renameTab: (index: number, newName: string) => void;
    nodes: Node[];
    setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
    connections: Connection[];
    groups: Group[];
    viewTransform: { scale: number; translate: Point };
    setViewTransform: React.Dispatch<React.SetStateAction<{ scale: number; translate: Point; }>>;
    setZoom: (newScale: number, pivot: Point) => void;
    isSnapToGrid: boolean;
    setIsSnapToGrid: React.Dispatch<React.SetStateAction<boolean>>;
    lineStyle: LineStyle;
    setLineStyle: React.Dispatch<React.SetStateAction<LineStyle>>;
    
    // UI State
    isQuickSearchOpen: boolean;
    isQuickAddOpen: boolean;
    quickAddPosition: Point;
    isRadialMenuOpen: boolean;
    radialMenuPosition: Point;
    isContextMenuOpen: boolean;
    contextMenuPosition: Point;
    contextMenuSlots: (NodeType | null)[];
    setContextMenuSlot: (index: number, type: NodeType | null) => void;
    isCatalogOpen: boolean;
    isErrorCopied: boolean;
    renameInfo: { type: 'group' | 'catalog' | 'library' | 'node'; id: string; currentTitle: string } | null;
    promptEditInfo: LibraryItem | null;
    confirmInfo: { title: string; message: string; onConfirm: () => void; } | null;
    isDraggingOverCanvas: boolean;
    showDialog: boolean;
    
    // Interaction State
    activeTool: Tool;
    effectiveTool: Tool;
    connectingInfo: any; // Simplified for brevity
    connectionTarget: any;
    hoveredNodeId: string | null;
    selectedNodeIds: string[];
    setSelectedNodeIds: React.Dispatch<React.SetStateAction<string[]>>;
    selectionRect: { x: number; y: number; width: number; height: number; } | null;
    groupButtonPosition: Point | null;
    draggingInfo: any;
    dollyZoomingInfo: any;
    hoveredGroupIdForDrop: string | null;
    dragOverNodeId: string | null;
    isAltDown: boolean;
    extractionTarget: string | null;

    // Gemini State
    isExecutingChain: boolean;
    executingNodeId: string | null;
    error: string | null;
    stoppingNodes: Set<string>;

    // Catalog & Library State
    currentCatalogItems: CatalogItem[];
    catalogPath: any[];
    currentLibraryItems: LibraryItem[];
    libraryPath: LibraryItem[];
    libraryItems: LibraryItem[];
    activeCategory: CatalogItemType | null;
    setActiveCategory: (category: CatalogItemType | null) => void;

    // Refs
    fileInputRef: React.RefObject<HTMLInputElement>;
    catalogFileInputRef: React.RefObject<HTMLInputElement>;
    libraryFileInputRef: React.RefObject<HTMLInputElement>;

    // Handlers
    handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleCatalogFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleLibraryFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleCanvasMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
    handleCanvasContextMenu: (e: React.MouseEvent<HTMLDivElement>) => void;
    updatePointerPosition: (e: { clientX: number, clientY: number }) => void;
    pointerPosition: Point;
    clientPointerPosition: Point;
    handleWheel: (e: React.WheelEvent<HTMLDivElement>) => void;
    handleCanvasDoubleClick: (e: React.MouseEvent<HTMLDivElement>) => void;
    handleDrop: (e: React.DragEvent<HTMLDivElement>) => void;
    handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
    handleDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
    getCanvasCursor: () => string;
    getConnectionPoints: (fromNode: Node, toNode: Node, conn: Connection) => { start: Point; end: Point };
    handleCanvasTouchStart: (e: React.TouchEvent<HTMLDivElement>) => void;
    handleCanvasTouchMove: (e: React.TouchEvent<HTMLDivElement>) => void;
    handleCanvasTouchEnd: (e: React.TouchEvent<HTMLDivElement>) => void;
    
    // Node Handlers
    handleNodeMouseDown: (e: React.MouseEvent<HTMLDivElement, globalThis.MouseEvent>, nodeId: string) => void;
    handleNodeTouchStart: (e: React.TouchEvent<HTMLDivElement>, nodeId: string) => void;
    handleNodeResizeMouseDown: (e: React.MouseEvent<HTMLDivElement, globalThis.MouseEvent>, nodeId: string) => void;
    handleNodeResizeTouchStart: (e: React.TouchEvent<HTMLDivElement>, nodeId: string) => void;
    handleStartConnection: (e: React.MouseEvent<HTMLDivElement, globalThis.MouseEvent>, fromNodeId: string, fromHandleId?: string) => void;
    handleStartConnectionTouchStart: (e: React.TouchEvent<HTMLDivElement>, fromNodeId: string, fromHandleId?: string) => void;
    setHoveredNodeId: React.Dispatch<React.SetStateAction<string | null>>;
    deleteNodeAndConnections: (nodeId: string) => void;
    removeConnectionsByNodeId: (nodeId: string) => void;
    copyNodeValue: (nodeId: string) => Promise<void>;
    pasteNodeValue: (nodeId: string) => Promise<void>;
    handleToggleNodeCollapse: (nodeId: string) => void;
    deselectAllNodes: () => void;
    handleNodeClick: (nodeId: string) => void;
    handleDetachCharacter: (characterData: any, generatorNode: Node) => void;
    addCharacterCardFromFile: (cardData: any, position: Point) => void;
    addImagePreviewNodeFromFile: (file: File, position: Point) => void;
    handlePasteFromClipboard: () => Promise<void>;
    handleDuplicateNode: (nodeId: string) => string;
    handleDuplicateNodeEmpty: (nodeId: string) => string;
    handleNodeDoubleClick: (nodeId: string) => void;
    handleAddNodeFromConnectionMenu: (type: NodeType) => void;
    handleRenameNode: (nodeId: string, currentTitle: string) => void;
    handleToggleNodeOutputVisibility: (nodeId: string) => void;

    // Group Handlers
    handleGroupMouseDown: (e: React.MouseEvent<HTMLDivElement, globalThis.MouseEvent>, groupId: string) => void;
    handleGroupTouchStart: (e: React.TouchEvent<HTMLDivElement>, groupId: string) => void;
    handleGroupSelection: () => void;
    handleRenameGroup: (groupId: string, currentTitle: string) => void;
    handleRemoveGroup: (groupId: string, e: React.MouseEvent) => void;
    handleSaveGroupToCatalog: (groupId: string) => void;
    handleSaveGroupToDisk: (groupId: string) => void;
    handleCopyGroup: (groupId: string) => void;
    handleDuplicateGroup: (groupId: string) => void;
    
    // Connection Handlers
    removeConnectionById: (connectionId: string) => void;
    handleSplitConnection: (connectionId: string, e: React.MouseEvent) => void;

    // Gemini Handlers
    getUpstreamTextValue: (nodeId: string, handleId: string | undefined) => string;
    handleEnhance: (nodeId: string) => Promise<void> | void;
    handleAnalyzePrompt: (nodeId: string) => Promise<void> | void;
    handleAnalyzeCharacter: (nodeId: string) => Promise<void> | void;
    handleSendMessage: (nodeId: string) => Promise<void> | void;
    handleTranslate: (nodeId: string) => Promise<void> | void;
    handleGenerateScript: (nodeId: string) => Promise<void> | void;
    handleGenerateEntities: (nodeId: string) => Promise<void> | void;
    isGeneratingEntities: string | null;
    handleModifyScriptPart: (nodeId: string, partId: string, originalText: string, modificationPrompt: string) => Promise<void> | void;
    handleModifyAnalyzerFramePart: (nodeId: string, frameNumber: number, partKey: string, modificationPrompt: string) => Promise<void> | void;
    handleFixErrors: (nodeId: string) => Promise<void> | void;
    handleExecuteChain: (nodeId: string) => Promise<void> | void;
    handleExecuteFullChain: (nodeId: string) => void;
    handleProcessChainForward: (nodeId: string) => Promise<void> | void;
    stopGeneration: () => void;
    setError: React.Dispatch<React.SetStateAction<string | null>>;
    isEnhancing: string | null;
    isAnalyzing: string | null;
    isAnalyzingCharacter: string | null;
    isChatting: string | null;
    isTranslating: string | null;
    isGeneratingScript: string | null;
    isModifyingScriptPart: string | null;
    isFixingErrors: string | null;
    handleAnalyzeScript: (nodeId: string) => Promise<void> | void;
    isAnalyzingScript: string | null;
    handleGenerateCharacters: (nodeId: string) => void;
    isGeneratingCharacters: string | null;
    handleGenerateImage: (nodeId: string, characterId?: number | string) => void;
    isGeneratingImage: string | null;
    handleGenerateCharacterImage: (nodeId: string, characterId: string) => void;
    isGeneratingCharacterImage: string | null;
    handleModifyScriptPrompts: (nodeId: string) => void;
    isModifyingScriptPrompts: string | null;
    handleApplyAliases: (nodeId: string) => void;
    handleReadData: (nodeId: string) => void;
    isReadingData: string | null;
    handleGenerateSpeech: (nodeId: string) => void;
    isGeneratingSpeech: string | null;
    handleGenerateIdeaCategories: (nodeId: string) => void;
    isGeneratingIdeaCategories: string | null;
    handleCombineStoryIdea: (nodeId: string) => void;
    isCombiningStoryIdea: string | null;
    handleGenerateNarratorText: (nodeId: string) => void;
    isGeneratingNarratorText: string | null;
    handleTranscribeAudio: (nodeId: string) => void;
    isTranscribingAudio: string | null;
    handleGenerateYouTubeTitles: (nodeId: string) => Promise<void> | void;
    isGeneratingYouTubeTitles: string | null;
    handleGenerateYouTubeChannelInfo: (nodeId: string) => Promise<void> | void;
    isGeneratingYouTubeChannelInfo: string | null;
    handleGenerateMusicIdeas: (nodeId: string) => Promise<void> | void;
    isGeneratingMusicIdeas: string | null;
    handleExtractTextFromImage: (nodeId: string) => void;
    isExtractingText: string | null;
    onAnalyzeYouTubeStats: (nodeId: string) => Promise<void> | void;
    isAnalyzingYouTubeStats: string | null;
    handleImproveScriptConcept: (nodeId: string, currentConcept: string) => void;
    isImprovingScriptConcept: string | null;
    
    // UI Handlers
    handleCloseAddNodeMenus: () => void;
    setActiveTool: React.Dispatch<React.SetStateAction<Tool>>;
    onAddNode: (type: NodeType, position: Point, value?: string, title?: string) => string;
    handleAddNodeFromToolbar: (type: NodeType) => void;
    handleSaveCanvas: () => void;
    handleLoadCanvas: () => void;
    openQuickSearchMenu: (position: Point) => void;
    openQuickAddMenu: (position: Point) => void;
    openRadialMenu: (position: Point) => void;
    onOpenCatalog: () => void;
    handleClearCanvas: () => void;
    clearCanvasData: () => void;
    handleResetToDefault: (silent?: boolean) => void;
    handleCloseCatalog: () => void;
    confirmRename: (newName: string) => void;
    confirmPromptEdit: (name: string, content: string) => void;
    setRenameInfo: React.Dispatch<React.SetStateAction<{ type: 'group' | 'catalog' | 'library' | 'node'; id: string; currentTitle: string } | null>>;
    setPromptEditInfo: React.Dispatch<React.SetStateAction<LibraryItem | null>>;
    setConfirmInfo: React.Dispatch<React.SetStateAction<{ title: string; message: string; onConfirm: () => void; } | null>>;
    handleCopyError: () => void;
    requestPermission: () => Promise<void>;
    declinePermission: () => void;
    translateGraph: () => void;
    
    // State for connection quick add menu
    connectionMenu: { isOpen: boolean; position: Point; sourceNodeId: string; sourceHandleId?: string; fromType: 'text' | 'image' | null } | null;
    setConnectionMenu: React.Dispatch<React.SetStateAction<{ isOpen: boolean; position: Point; sourceNodeId: string; sourceHandleId?: string; fromType: 'text' | 'image' | null } | null>>;

    // Catalog & Library Handlers
    navigateCatalogBack: () => void;
    navigateCatalogToFolder: (folderId: string | null) => void;
    createCatalogItem: (type: CatalogItemType) => void;
    handleAddGroupFromCatalog: (itemId: string) => void;
    handleRenameCatalogItem: (itemId: string, currentName: string) => void;
    saveCatalogItemToDisk: (itemId: string) => void;
    handleDeleteCatalogItem: (itemId: string) => void;
    triggerLoadFromFile: () => void;
    moveCatalogItem: (itemId: string, newParentId: string | null) => void;
    importCatalog: (items: CatalogItem[]) => void;
    importLibrary: (items: LibraryItem[]) => void;
    navigateBack: () => void;
    navigateToFolder: (folderId: string) => void;
    createLibraryItem: (type: LibraryItemType) => void;
    updateLibraryItem: (itemId: string, updates: Partial<Pick<LibraryItem, "name" | "content">>) => void;
    deleteLibraryItem: (itemId: string) => void;
    saveLibraryItemToDisk: (item: LibraryItem) => void;
    triggerLoadLibraryFromFile: () => void;
    moveLibraryItem: (itemId: string, newParentId: string | null) => void;

    // Props for NodeView
    handleValueChange: (nodeId: string, value: string) => void;
    connectedInputs: Map<string, Set<string | undefined>>;
    t: (key: string, options?: { [key: string]: string | number }) => string;
    lastAddedNodeId: string | null;
    creationLine: { start: Point; end: Point; } | null;
    clearSelectionsSignal: number;
    toasts: Toast[];
    addToast: (message: string, type?: 'success' | 'info' | 'error') => void;
    removeToast: (id: number) => void;
    setIsSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    saveDataToCatalog: (nodeId: string, type: CatalogItemType, name: string) => void;
    
    // Context Menu & Connection Menu
    handleSaveProject: () => void;
    handleLoadProject: (projectData: any) => void;
    closeContextMenu: () => void;
    openContextMenu: (position: Point) => void;
    isContextMenuPinned: boolean;
    toggleContextMenuPin: () => void;
    isQuickAddPinned: boolean;
    toggleQuickAddPin: () => void;

    // Image Caching & Viewer
    setFullSizeImage: (nodeId: string, slotIndex: number, imageBase64: string) => void;
    getFullSizeImage: (nodeId: string, slotIndex: number) => string | null;
    setImageViewer: (data: { sources: {src: string, frameNumber: number; prompt?: string}[], initialIndex: number } | null) => void;
    imageViewerState: { sources: {src: string, frameNumber: number; prompt?: string}[], initialIndex: number } | null;
    onCopyImageToClipboard: (base64: string) => void;
    onDownloadImage: (base64: string, filename: string) => void;
    onSaveCharacterCard: (nodeId: string) => void;
    onLoadCharacterCard: (nodeId: string) => void;
    onSaveCharacterToCatalog: (nodeId: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

const HEADER_HEIGHT = 40;
const CONTENT_PADDING = 12;

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { t } = useLanguage();
    const [isSnapToGrid, setIsSnapToGrid] = useState(false);
    const [lineStyle, setLineStyle] = useState<LineStyle>('orthogonal');
    
    // Context Menu Slots State
    const [contextMenuSlots, setContextMenuSlots] = useState<(NodeType | null)[]>(() => {
        try {
            const saved = localStorage.getItem('context-menu-slots');
            if (saved) return JSON.parse(saved);
        } catch {}
        return Array(8).fill(null);
    });

    // --- Image Cache & Viewer State ---
    // Stores full resolution images in memory: Key = `${nodeId}-${slotIndex}`, Value = base64String
    const imageCache = useRef<Map<string, string>>(new Map());
    const [imageViewerState, setImageViewer] = useState<{ sources: {src: string, frameNumber: number; prompt?: string}[], initialIndex: number } | null>(null);

    const setFullSizeImage = useCallback((nodeId: string, slotIndex: number, imageBase64: string) => {
        const key = `${nodeId}-${slotIndex}`;
        if (!imageBase64) imageCache.current.delete(key);
        else imageCache.current.set(key, imageBase64);
    }, []);

    const getFullSizeImage = useCallback((nodeId: string, slotIndex: number) => {
        const key = `${nodeId}-${slotIndex}`;
        return imageCache.current.get(key) || null;
    }, []);

    const onCopyImageToClipboard = useCallback(async (base64: string) => {
        try {
            const res = await fetch(`data:image/png;base64,${base64}`);
            const blob = await res.blob();
            await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
        } catch (e) {
            console.error("Failed to copy image", e);
        }
    }, []);

    const onDownloadImage = useCallback((base64: string, filename: string) => {
        const link = document.createElement('a');
        link.href = `data:image/png;base64,${base64}`;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, []);

    const setContextMenuSlot = useCallback((index: number, type: NodeType | null) => {
        setContextMenuSlots(prev => {
            const newSlots = [...prev];
            if (index >= 0 && index < 8) {
                newSlots[index] = type;
            }
            localStorage.setItem('context-menu-slots', JSON.stringify(newSlots));
            return newSlots;
        });
    }, []);

    const createNewTab = useCallback((name: string, content?: Partial<TabState>): TabState => {
        return {
          id: `tab-${Date.now()}`,
          name,
          nodes: content?.nodes ?? [],
          connections: content?.connections ?? [],
          groups: content?.groups ?? [],
          viewTransform: content?.viewTransform ?? { scale: 1, translate: { x: 0, y: 0 } },
          nodeIdCounter: content?.nodeIdCounter ?? 1,
          ...content,
        };
    }, []);

    const initialSavedState: TabState = {
      id: `tab-${Date.now()}`,
      name: 'Tab 1',
      ...INITIAL_CANVAS_STATE
    };
    
    const [tabs, setTabs] = useState<TabState[]>([createNewTab('Tab 1', initialSavedState)]);
    const [activeTabIndex, setActiveTabIndex] = useState(0);
    
    const loadedTabIdRef = useRef<string | null>(initialSavedState.id);

    const switchTab = (index: number) => {
        if (index < 0 || index >= tabs.length) return;
        setActiveTabIndex(index);
    };

    const addTab = () => {
        const newTab = createNewTab(`Tab ${tabs.length + 1}`);
        setTabs(prev => [...prev, newTab]);
        setActiveTabIndex(tabs.length);
    };

    const closeTab = (index: number) => {
        if (tabs.length <= 1) return;
        const tabToClose = tabs[index];
        const activeTab = tabs[activeTabIndex];
        let newIndex = activeTabIndex;
        if (index < activeTabIndex) {
            newIndex = activeTabIndex - 1;
        } else if (index === activeTabIndex) {
            newIndex = index > 0 ? index - 1 : 0;
        }
        setTabs(prev => prev.filter((_, i) => i !== index));
        setActiveTabIndex(newIndex);
    };

    const renameTab = (index: number, newName: string) => {
        setTabs(prev => prev.map((tab, i) => i === index ? { ...tab, name: newName } : tab));
    };

    const { nodes, setNodes, nodeIdCounter, handleValueChange, handleAddNode: addNodeFromHook, handleDeleteNode, handleCopyNodeValue, handlePasteNodeValue, handleToggleNodeCollapse: baseHandleToggleNodeCollapse, handleDuplicateNode: baseHandleDuplicateNode, handleDuplicateNodeEmpty, handleToggleNodeOutputVisibility } = useNodes([], 0);
    const handleDuplicateNode = baseHandleDuplicateNode;
    
    const { connections, setConnections, addConnection, removeConnectionsByNodeId, removeConnectionById } = useConnections([]);
    const { viewTransform, setViewTransform, isPanning, pointerPosition, clientPointerPosition, handleWheel, startPanning, pan, updatePointerPosition, stopPanning, setZoom, handleCanvasTouchStart, handleCanvasTouchMove, handleCanvasTouchEnd } = useCanvas({ scale: 1, translate: { x: 0, y: 0 } });
    const { groups, setGroups, addGroup, removeGroup } = useGroups([]);
    
    const handleToggleNodeCollapse = useCallback((nodeId: string) => {
        setNodes(currentNodes => {
            const updatedNodes = currentNodes.map(n => n.id === nodeId ? { ...n, isCollapsed: !n.isCollapsed } : n);
            setGroups(currentGroups => {
                 return currentGroups.map(group => {
                     if (!group.nodeIds.includes(nodeId)) return group;
                     const memberNodes = updatedNodes.filter(n => group.nodeIds.includes(n.id));
                     if (memberNodes.length === 0) return group;
                     const padding = 30;
                     const paddingTop = 70;
                     let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                     memberNodes.forEach(node => {
                         minX = Math.min(minX, node.position.x);
                         minY = Math.min(minY, node.position.y);
                         maxX = Math.max(maxX, node.position.x + node.width);
                         const nodeHeight = node.isCollapsed ? 40 : node.height;
                         maxY = Math.max(maxY, node.position.y + nodeHeight);
                     });
                     return {
                         ...group,
                         position: { x: minX - padding, y: minY - paddingTop },
                         width: maxX - minX + padding * 2,
                         height: (maxY - minY) + paddingTop + padding,
                     };
                 });
            });
            return updatedNodes;
        });
    }, [setNodes, setGroups]);

    useEffect(() => {
        const activeTab = tabs[activeTabIndex];
        if (activeTab && activeTab.id === loadedTabIdRef.current) {
             setTabs(prevTabs => prevTabs.map((tab, i) => {
                 if (i === activeTabIndex) {
                     return { 
                         ...tab, 
                         nodes, 
                         connections, 
                         groups, 
                         viewTransform, 
                         nodeIdCounter: nodeIdCounter.current 
                     };
                 }
                 return tab;
             }));
        }
    }, [nodes, connections, groups, viewTransform, activeTabIndex]);

    useEffect(() => {
        const tabToLoad = tabs[activeTabIndex];
        if (tabToLoad && tabToLoad.id !== loadedTabIdRef.current) {
            setNodes(tabToLoad.nodes);
            setConnections(tabToLoad.connections);
            setGroups(tabToLoad.groups || []);
            setViewTransform(tabToLoad.viewTransform);
            nodeIdCounter.current = tabToLoad.nodeIdCounter;
            loadedTabIdRef.current = tabToLoad.id;
        }
    }, [activeTabIndex, tabs]); 

    useAutoSave(tabs, activeTabIndex);

    const clientPointerPositionRef = useRef(clientPointerPosition);
    useEffect(() => {
        clientPointerPositionRef.current = clientPointerPosition;
    }, [clientPointerPosition]);

    const { showDialog, requestPermission, declinePermission } = usePermissions('clipboard-read');
    
    const { isQuickSearchOpen, isQuickAddOpen, quickAddPosition, openQuickSearchMenu, openQuickAddMenu, handleCloseAddNodeMenus, isCatalogOpen, handleToggleCatalog, handleCloseCatalog, isRadialMenuOpen, radialMenuPosition, openRadialMenu, isContextMenuOpen, contextMenuPosition, openContextMenu, closeContextMenu, connectionMenu, setConnectionMenu, isContextMenuPinned, toggleContextMenuPin, isQuickAddPinned, toggleQuickAddPin } = useUIState();
    
    const geminiContext = useGemini(nodes, connections, setNodes);
    
    const { currentCatalogItems, catalogPath, navigateCatalogBack, navigateCatalogToFolder, createCatalogItem, saveGroupToCatalog, saveGenericItemToCatalog, renameCatalogItem, deleteCatalogItem, saveCatalogItemToDisk, catalogFileInputRef, handleCatalogFileChange, triggerLoadFromFile, moveCatalogItem, catalogItems, activeCategory, setActiveCategory, importCatalog } = useCatalog(t);
    const { libraryItems, currentLibraryItems, currentPath: libraryPath, navigateBack, navigateToFolder, createLibraryItem, updateLibraryItem, deleteLibraryItem, saveLibraryItemToDisk, libraryFileInputRef, handleLibraryFileChange, triggerLoadLibraryFromFile, moveLibraryItem, importLibrary } = usePromptLibrary(t);
    const [clearSelectionsSignal, setClearSelectionsSignal] = useState(0);
    const triggerClearSelections = useCallback(() => setClearSelectionsSignal(s => s + 1), []);
    
    const [lastAddedNodeId, setLastAddedNodeId] = useState<string | null>(null);
    const [creationLine, setCreationLine] = useState<{ start: Point; end: Point; } | null>(null);
    
    const saveDataToCatalogRef = useRef<((nodeId: string, type: CatalogItemType, name: string) => void) | null>(null);

    const { renameInfo, setRenameInfo, promptEditInfo, setPromptEditInfo, confirmInfo, setConfirmInfo, isErrorCopied, handleCopyError, handleRenameGroup, handleRenameCatalogItem, handleRenameLibraryItem, confirmRename, confirmPromptEdit, handleDeleteCatalogItem, handleDeleteLibraryItem, handleClearCanvas, toasts, addToast: baseAddToast, removeToast } = useDialogsAndUI({ 
        t, setGroups, renameCatalogItem, updateLibraryItem, libraryItems, deleteLibraryItem, setNodes, setConnections, nodeIdCounter, geminiContext, currentCatalogItems, deleteCatalogItem, 
        saveDataToCatalog: (nodeId: string, type: CatalogItemType, name: string) => saveDataToCatalogRef.current?.(nodeId, type, name)
    });
    
    const addToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'info') => baseAddToast(message, type as 'success' | 'info'), [baseAddToast]);

    const translateGraph = useCallback(() => {
        setNodes(prev => prev.map(node => {
            if (node.id === 'node-24-1763746608198') {
                 return { ...node, title: t('app.title') };
            }
            return {
                ...node,
                title: t(`node.title.${node.type.toLowerCase()}` as any)
            };
        }));
    }, [t, setNodes]);

    const handleResetToDefault = useCallback((silent: boolean = false) => {
        const doReset = () => {
             const defaultState = INITIAL_CANVAS_STATE;
             setNodes(defaultState.nodes);
             setConnections(defaultState.connections);
             setGroups(defaultState.groups || []);
             setViewTransform(defaultState.viewTransform);
             nodeIdCounter.current = defaultState.nodeIdCounter;
             setTabs(prevTabs => prevTabs.map((tab, i) => {
                 if (i === activeTabIndex) {
                     return { ...tab, ...defaultState };
                 }
                 return tab;
             }));
             setTimeout(translateGraph, 0); 
             if (!silent) baseAddToast(t('toast.resetComplete'), 'success');
        };
        if (silent) {
            doReset();
        } else {
            setConfirmInfo({
                title: t('dialog.reset.title'),
                message: t('dialog.reset.message'),
                onConfirm: doReset
            });
        }
    }, [t, setNodes, setConnections, setGroups, setViewTransform, nodeIdCounter, baseAddToast, translateGraph, activeTabIndex]);

    const clearCanvasData = useCallback(() => {
        setNodes([]);
        setConnections([]);
        setGroups([]);
        nodeIdCounter.current = 0;
        setTabs(prevTabs => prevTabs.map((tab, i) => {
             if (i === activeTabIndex) {
                 return { ...tab, nodes: [], connections: [], groups: [], nodeIdCounter: 0 };
             }
             return tab;
        }));
    }, [setNodes, setConnections, setGroups, activeTabIndex]);

    const addConnectionWithLogic = useCallback((newConnection: Omit<Connection, 'id'>, fromNode: Node) => {
        const toNode = nodes.find(n => n.id === newConnection.toNodeId);
        if (toNode && toNode.type === NodeType.REROUTE_DOT) {
            const fromType = getOutputHandleType(fromNode, newConnection.fromHandleId);
            handleValueChange(toNode.id, JSON.stringify({ type: fromType }));
        }
        addConnection(newConnection);
        if (toNode && (toNode.type === NodeType.SPEECH_SYNTHESIZER || toNode.type === NodeType.DATA_READER)) {
            setTimeout(() => geminiContext.handleReadData(toNode.id), 100);
        }
    }, [nodes, addConnection, handleValueChange, geminiContext]);

    const handleExtractNodeFromGroup = useCallback((nodeId: string) => { 
        setGroups(currentGroups => {
            const groupToUpdate = currentGroups.find(g => g.nodeIds.includes(nodeId));
            if (!groupToUpdate) return currentGroups;
            const updatedNodeIds = groupToUpdate.nodeIds.filter(id => id !== nodeId);
            if (updatedNodeIds.length === 0) {
                return currentGroups.filter(g => g.id !== groupToUpdate.id);
            } else {
                const memberNodes = nodes.filter(n => updatedNodeIds.includes(n.id));
                const groupBounds = (g: Group, m: Node[]) => {
                    if (m.length === 0) return g;
                    const padding = 30;
                    const paddingTop = 70;
                    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                    m.forEach(node => {
                        minX = Math.min(minX, node.position.x);
                        minY = Math.min(minY, node.position.y);
                        maxX = Math.max(maxX, node.position.x + node.width);
                        const nodeHeight = node.isCollapsed ? 40 : node.height;
                        maxY = Math.max(maxY, node.position.y + nodeHeight);
                    });
                    return { ...g, position: { x: minX - padding, y: minY - paddingTop }, width: maxX - minX + padding * 2, height: (maxY - minY) + paddingTop + padding };
                };
                const updatedGroup = groupBounds({ ...groupToUpdate, nodeIds: updatedNodeIds }, memberNodes);
                return currentGroups.map(g => g.id === updatedGroup.id ? updatedGroup : g);
            }
        });
     }, [nodes, setGroups]);

    const onConnectionReleased = useCallback((info: ConnectingInfo, position: Point) => {
        setConnectionMenu({
            isOpen: true,
            position,
            sourceNodeId: info.fromNodeId,
            sourceHandleId: info.fromHandleId,
            fromType: info.fromType
        });
    }, [setConnectionMenu]);

    const { activeTool, effectiveTool, setActiveTool, connectingInfo, connectionTarget, hoveredNodeId, setHoveredNodeId, selectedNodeIds, setSelectedNodeIds, deselectAllNodes, handleNodeMouseDown, handleGroupMouseDown, handleNodeResizeMouseDown, handleStartConnection, handleNodeClick: handleNodeCutConnections, hoveredGroupIdForDrop, handleCanvasMouseDown: useInteractionCanvasMouseDown, selectionRect: selectionRectPoints, draggingInfo, dollyZoomingInfo, handleNodeTouchStart, handleGroupTouchStart, handleNodeResizeTouchStart, handleStartConnectionTouchStart, isAltDown, extractionTarget,
    } = useInteraction({
        nodes, setNodes, groups, setGroups, addConnection: addConnectionWithLogic, connections,
        setConnections,
        viewTransform, updatePointerPosition, pan, isPanning, startPanning, stopPanning, isSnapToGrid,
        onAddNode: addNodeFromHook, removeConnectionsByNodeId, setZoom, triggerClearSelections, t, clientPointerPosition,
        clientPointerPositionRef,
        isQuickAddOpen,
        handleCloseAddNodeMenus,
        handleExtractNodeFromGroup,
        openRadialMenu,
        onConnectionReleased,
    });
    
    const { onAddNode, handleAddNodeFromToolbar, deleteNodeAndConnections, handleSplitConnection, handleGroupSelection, handleRemoveGroup, handleSaveGroupToCatalog, handleSaveGroupToDisk, handleCopyGroup, handleDuplicateGroup, handleAddGroupFromCatalog, handleApplyAliases, handleDetachCharacter, addCharacterCardFromFile, addImagePreviewNodeFromFile, handlePasteFromClipboard, handleAddGroupFromTemplate, handleDuplicateNode: handleDuplicateNodeFromEntityActions, handleDuplicateNodeEmpty: handleDuplicateNodeEmptyFromEntityActions, saveDataToCatalog } = useEntityActions({
      nodes, connections, groups, addNodeFromHook, t,
      clientPointerPosition, clientPointerPositionRef, viewTransform, setCreationLine, setLastAddedNodeId, handleDeleteNode, removeConnectionsByNodeId,
      addConnection: addConnectionWithLogic, handleValueChange, nodeIdCounter, setNodes, setConnections, addGroup, selectedNodeIds, setSelectedNodeIds: setSelectedNodeIds, removeGroup, saveGroupToCatalog, catalogItems, currentCatalogItems, handleCloseCatalog,
      geminiContext,
      addToast, setGroups, handleDuplicateNode,
      handleDuplicateNodeEmpty,
      saveGenericItemToCatalog
    });

    const handleAddNodeFromConnectionMenu = useCallback((type: NodeType) => {
        if (!connectionMenu) return;
        const canvasPosition = {
            x: (connectionMenu.position.x - viewTransform.translate.x) / viewTransform.scale,
            y: (connectionMenu.position.y - viewTransform.translate.y) / viewTransform.scale,
        };
        const pos = { x: canvasPosition.x - 20, y: canvasPosition.y - 20 };
        let value: string | undefined;
        if (type === NodeType.REROUTE_DOT && connectionMenu.fromType) {
             value = JSON.stringify({ type: connectionMenu.fromType });
        }
        const newNodeId = onAddNode(type, pos, value);
        const fromNode = nodes.find(n => n.id === connectionMenu.sourceNodeId);
        if (fromNode) {
             let toHandleId: string | undefined = undefined;
             if (type === NodeType.SCRIPT_GENERATOR) toHandleId = 'prompt';
             else if (type === NodeType.SCRIPT_PROMPT_MODIFIER) toHandleId = 'all-script-analyzer-data';
             else if (type === NodeType.SCRIPT_ANALYZER) toHandleId = undefined; 
             addConnectionWithLogic({
                 fromNodeId: connectionMenu.sourceNodeId,
                 fromHandleId: connectionMenu.sourceHandleId,
                 toNodeId: newNodeId,
                 toHandleId
             }, fromNode);
        }
        setConnectionMenu(null);
    }, [connectionMenu, viewTransform, onAddNode, nodes, addConnectionWithLogic, setConnectionMenu]);

    useEffect(() => {
        saveDataToCatalogRef.current = saveDataToCatalog;
    }, [saveDataToCatalog]);
    
    const handleNodeDoubleClick = (nodeId: string) => isAltDown ? handleExtractNodeFromGroup(nodeId) : handleToggleNodeCollapse(nodeId);
    
    const handleSaveProject = useCallback(() => {
        try {
            const now = new Date();
            const dateString = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const projectData = {
                type: 'script-modifier-project',
                timestamp: Date.now(),
                appState: { activeTabIndex, isSnapToGrid, lineStyle },
                tabs, catalog: catalogItems, library: libraryItems
            };
            const stateString = JSON.stringify(projectData, null, 2);
            const blob = new Blob([stateString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Script_Modifier_Project_${dateString}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            baseAddToast(t('toast.projectSaved'), 'success');
        } catch (err) {
            console.error("Failed to save project:", err);
            baseAddToast(t('toast.saveFailed') || "Failed to save project", 'info');
        }
    }, [activeTabIndex, isSnapToGrid, lineStyle, tabs, catalogItems, libraryItems, baseAddToast, t]);

    const handleLoadProject = useCallback((projectData: any) => {
        if (projectData.type !== 'script-modifier-project') {
            baseAddToast(t('alert.loadProjectFailed') || 'Invalid project file format', 'info');
            return;
        }
        setConfirmInfo({
            title: 'Load Project',
            message: t('alert.confirmLoadProject'),
            onConfirm: () => {
                if (projectData.appState) {
                    if (typeof projectData.appState.activeTabIndex === 'number') setActiveTabIndex(projectData.appState.activeTabIndex);
                    if (typeof projectData.appState.isSnapToGrid === 'boolean') setIsSnapToGrid(projectData.appState.isSnapToGrid);
                    if (projectData.appState.lineStyle) setLineStyle(projectData.appState.lineStyle);
                }
                if (Array.isArray(projectData.tabs)) {
                    setTabs(projectData.tabs);
                    loadedTabIdRef.current = null;
                    const activeIdx = projectData.appState?.activeTabIndex || 0;
                    const targetTab = projectData.tabs[activeIdx] || projectData.tabs[0];
                    if (targetTab) {
                        setNodes(targetTab.nodes);
                        setConnections(targetTab.connections);
                        setGroups(targetTab.groups || []);
                        setViewTransform(targetTab.viewTransform);
                        nodeIdCounter.current = targetTab.nodeIdCounter;
                        loadedTabIdRef.current = targetTab.id;
                    }
                }
                if (projectData.catalog) importCatalog(projectData.catalog);
                if (projectData.library) importLibrary(projectData.library);
                baseAddToast(t('toast.projectLoaded'), 'success');
            }
        });
    }, [t, baseAddToast, importCatalog, importLibrary, setNodes, setConnections, setGroups, setViewTransform, nodeIdCounter]);

    const handleLoadProjectRef = useRef<((data: any) => void) | null>(null);

    useEffect(() => {
        handleLoadProjectRef.current = handleLoadProject;
    }, [handleLoadProject]);

    const { fileInputRef, handleSaveCanvas, handleLoadCanvas, handleFileChange: baseHandleFileChange, loadStateFromFileContent } = useCanvasIO({ 
        nodes, connections, groups, viewTransform, nodeIdCounter, setNodes, setConnections, setGroups, setViewTransform, 
        activeTabName: tabs[activeTabIndex]?.name || 'default',
        onLoadProject: (data) => handleLoadProjectRef.current?.(data),
        addToast: baseAddToast,
        setGlobalError: geminiContext.setError 
    });
    
    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const regex = /^Script-Modifier-(.+)-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.json$/;
            const match = file.name.match(regex);
            if (match && match[1]) {
                const tabName = match[1].replace(/_/g, ' ');
                renameTab(activeTabIndex, tabName);
            }
        }
        baseHandleFileChange(e);
    }, [baseHandleFileChange, renameTab, activeTabIndex]);

    const { isDraggingOverCanvas, handleCanvasDoubleClick, handleDrop, handleDragOver, handleDragLeave } = useCanvasEvents({
      isQuickSearchOpen, handleToggleCatalog, openQuickSearchMenu, openQuickAddMenu, clientPointerPosition,
      clientPointerPositionRef,
      onAddNode, handleCloseAddNodeMenus, loadStateFromFileContent, activeTool, setActiveTool,
      isSnapToGrid, setIsSnapToGrid, lineStyle, setLineStyle, selectedNodeIds,
      copyNodeValue: handleCopyNodeValue, geminiContext,
      addCharacterCardFromFile, addImagePreviewNodeFromFile, viewTransform, nodes,
      handlePasteFromClipboard,
      handleAddGroupFromTemplate,
      catalogItems,
      handleToggleNodeCollapse,
      handleNodeDoubleClick,
      deleteNodeAndConnections,
      setSelectedNodeIds: setSelectedNodeIds,
      handleGroupSelection,
      handleDuplicateNode: handleDuplicateNodeFromEntityActions,
      handleDuplicateNodeEmpty: handleDuplicateNodeEmptyFromEntityActions,
      t,
      contextMenuSlots,
      handleValueChange,
      handleSaveProject,
      handleLoadProject,
      addToast 
    });
    
    const { connectedInputs, groupButtonPosition, getCanvasCursor, getConnectionPoints, selectionRect } = useDerivedMemo({ nodes, connections, selectedNodeIds, dollyZoomingInfo, draggingInfo, effectiveTool, isPanning, t, selectionRect: selectionRectPoints });

    const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (isContextMenuOpen && !isContextMenuPinned) {
            closeContextMenu();
        }
        if (e.button !== 2) {
             useInteractionCanvasMouseDown(e);
        }
    }, [isContextMenuOpen, isContextMenuPinned, closeContextMenu, useInteractionCanvasMouseDown]);

    const handleCanvasContextMenu = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        openContextMenu({ x: e.clientX, y: e.clientY });
    }, [openContextMenu]);

    const handleRenameNode = useCallback((nodeId: string, currentTitle: string) => {
        setRenameInfo({ type: 'node', id: nodeId, currentTitle });
    }, [setRenameInfo]);

    // Character Card specific handlers placeholders
    const onSaveCharacterCard = (nodeId: string) => { console.log('Save character card', nodeId); };
    const onLoadCharacterCard = (nodeId: string) => { console.log('Load character card', nodeId); };
    const onSaveCharacterToCatalog = (nodeId: string) => { saveDataToCatalog(nodeId, CatalogItemType.CHARACTERS, "Character"); };
    
    const contextValue: AppContextType = {
        tabs, activeTabIndex, switchTab, addTab, closeTab, renameTab,
        nodes, setNodes, connections, groups, viewTransform, setViewTransform, isSnapToGrid, setIsSnapToGrid, lineStyle, setLineStyle, setZoom,
        isQuickSearchOpen, isQuickAddOpen, quickAddPosition, isRadialMenuOpen, radialMenuPosition, isContextMenuOpen, contextMenuPosition,
        isCatalogOpen, isErrorCopied, renameInfo, promptEditInfo, confirmInfo, isDraggingOverCanvas: isDraggingOverCanvas || !!extractionTarget, showDialog,
        activeTool, effectiveTool, connectingInfo, connectionTarget, hoveredNodeId, selectedNodeIds, setSelectedNodeIds, selectionRect, groupButtonPosition, draggingInfo, dollyZoomingInfo, hoveredGroupIdForDrop, dragOverNodeId: null, isAltDown, extractionTarget,
        currentCatalogItems, catalogPath, currentLibraryItems, libraryPath, libraryItems, activeCategory, setActiveCategory,
        fileInputRef, catalogFileInputRef, libraryFileInputRef,
        handleFileChange, handleCatalogFileChange, handleLibraryFileChange, handleCanvasMouseDown, handleCanvasContextMenu, updatePointerPosition, pointerPosition, clientPointerPosition,
        handleWheel, handleCanvasDoubleClick, handleDrop, handleDragOver, handleDragLeave, getCanvasCursor, getConnectionPoints,
        handleCanvasTouchStart, handleCanvasTouchMove, handleCanvasTouchEnd, handleNodeMouseDown, handleNodeTouchStart, handleNodeResizeMouseDown, handleNodeResizeTouchStart,
        handleStartConnection, handleStartConnectionTouchStart, setHoveredNodeId, deleteNodeAndConnections, removeConnectionsByNodeId, 
        copyNodeValue: handleCopyNodeValue,
        pasteNodeValue: handlePasteNodeValue,
        handleDuplicateNode: handleDuplicateNodeFromEntityActions,
        handleDuplicateNodeEmpty: handleDuplicateNodeEmptyFromEntityActions,
        handleToggleNodeCollapse, deselectAllNodes, handleNodeClick: handleNodeCutConnections, handleNodeDoubleClick, handleGroupMouseDown, handleGroupTouchStart, handleGroupSelection, handleRenameGroup, handleRemoveGroup, handleSaveGroupToCatalog,
        handleSaveGroupToDisk,
        removeConnectionById, handleSplitConnection,
        handleCloseAddNodeMenus, setActiveTool, onAddNode, handleAddNodeFromToolbar, handleSaveCanvas, handleLoadCanvas, openQuickSearchMenu, openQuickAddMenu, openRadialMenu, onOpenCatalog: handleToggleCatalog,
        handleClearCanvas, handleResetToDefault, handleCloseCatalog, confirmRename, confirmPromptEdit, setRenameInfo, setPromptEditInfo, setConfirmInfo, handleCopyError, requestPermission, declinePermission,
        navigateCatalogBack, navigateCatalogToFolder, createCatalogItem, handleAddGroupFromCatalog, handleRenameCatalogItem, saveCatalogItemToDisk, handleDeleteCatalogItem, triggerLoadFromFile, moveCatalogItem,
        importCatalog,
        importLibrary,
        navigateBack, navigateToFolder, createLibraryItem, updateLibraryItem, deleteLibraryItem: (id: string) => handleDeleteLibraryItem(id), saveLibraryItemToDisk, triggerLoadLibraryFromFile, moveLibraryItem,
        handleValueChange, connectedInputs, t, lastAddedNodeId, creationLine, clearSelectionsSignal,
        ...geminiContext,
        handleGenerateEntities: geminiContext.handleGenerateEntities,
        isGeneratingEntities: geminiContext.isGeneratingEntities,
        onAnalyzeYouTubeStats: geminiContext.handleAnalyzeYouTubeStats,
        handleApplyAliases, handleDetachCharacter,
        addCharacterCardFromFile, addImagePreviewNodeFromFile,
        handlePasteFromClipboard,
        toasts, addToast, removeToast,
        setIsSettingsOpen: () => {},
        contextMenuSlots, setContextMenuSlot,
        saveDataToCatalog,
        connectionMenu, setConnectionMenu,
        handleAddNodeFromConnectionMenu,
        handleRenameNode,
        handleSaveProject,
        handleLoadProject,
        closeContextMenu, openContextMenu,
        isContextMenuPinned, toggleContextMenuPin, isQuickAddPinned, toggleQuickAddPin,
        handleCopyGroup,
        handleDuplicateGroup,
        translateGraph,
        clearCanvasData,
        handleToggleNodeOutputVisibility,
        // Image Handling
        setFullSizeImage,
        getFullSizeImage,
        setImageViewer,
        imageViewerState,
        onCopyImageToClipboard,
        onDownloadImage,
        onSaveCharacterCard,
        onLoadCharacterCard,
        onSaveCharacterToCatalog,
        handleGenerateMusicIdeas: geminiContext.handleGenerateMusicIdeas,
        isGeneratingMusicIdeas: geminiContext.isGeneratingMusicIdeas,
        handleExtractTextFromImage: geminiContext.handleExtractTextFromImage,
        isExtractingText: geminiContext.isExtractingText,
        isAnalyzingYouTubeStats: geminiContext.isAnalyzingYouTubeStats,
    };

    return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error('useAppContext must be used within an AppProvider');
    return context;
};