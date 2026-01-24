
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
  loadAutoSavedState,
  useGoogleDrive
} from '../hooks';
import { getOutputHandleType } from '../utils/nodeUtils';
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
    
    activeTool: Tool;
    effectiveTool: Tool;
    connectingInfo: any; 
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

    isExecutingChain: boolean;
    executingNodeId: string | null;
    error: string | null;
    stoppingNodes: Set<string>;

    currentCatalogItems: CatalogItem[];
    catalogPath: any[];
    currentLibraryItems: LibraryItem[];
    libraryPath: LibraryItem[];
    libraryItems: LibraryItem[];
    activeCategory: CatalogItemType | null;
    setActiveCategory: (category: CatalogItemType | null) => void;

    isSyncing: boolean;
    handleSyncCloud: () => void;
    handleUploadToCloud: (item: CatalogItem) => void;

    fileInputRef: React.RefObject<HTMLInputElement>;
    catalogFileInputRef: React.RefObject<HTMLInputElement>;
    libraryFileInputRef: React.RefObject<HTMLInputElement>;

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
    handleDownloadChat: (nodeId: string) => void;

    handleGroupMouseDown: (e: React.MouseEvent<HTMLDivElement, globalThis.MouseEvent>, groupId: string) => void;
    handleGroupTouchStart: (e: React.TouchEvent<HTMLDivElement>, groupId: string) => void;
    handleGroupSelection: () => void;
    handleRenameGroup: (groupId: string, currentTitle: string) => void;
    handleRemoveGroup: (groupId: string, e: React.MouseEvent) => void;
    handleSaveGroupToCatalog: (groupId: string) => void;
    handleSaveGroupToDisk: (groupId: string) => void;
    handleCopyGroup: (groupId: string) => void;
    handleDuplicateGroup: (groupId: string) => void;
    
    removeConnectionById: (connectionId: string) => void;
    handleSplitConnection: (connectionId: string, e: React.MouseEvent) => void;

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
    handleApplyAliases: (nodeId: string) => Promise<void>;
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
    clearProject: () => void;
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
    
    connectionMenu: { isOpen: boolean; position: Point; sourceNodeId: string; sourceHandleId?: string; fromType: 'text' | 'image' | null } | null;
    setConnectionMenu: React.Dispatch<React.SetStateAction<{ isOpen: boolean; position: Point; sourceNodeId: string; sourceHandleId?: string; fromType: 'text' | 'image' | null } | null>>;

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
    
    handleSaveProject: () => void;
    handleLoadProject: (projectData: any) => void;
    closeContextMenu: () => void;
    openContextMenu: (position: Point) => void;
    isContextMenuPinned: boolean;
    toggleContextMenuPin: () => void;
    isQuickAddPinned: boolean;
    toggleQuickAddPin: () => void;
    
    handleLoadAutoSave: () => Promise<void>;

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

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { t } = useLanguage();
    const [isSnapToGrid, setIsSnapToGrid] = useState(false);
    const [lineStyle, setLineStyle] = useState<LineStyle>('orthogonal');
    
    const [contextMenuSlots, setContextMenuSlots] = useState<(NodeType | null)[]>(() => {
        try {
            const saved = localStorage.getItem('context-menu-slots');
            if (saved) return JSON.parse(saved);
        } catch {}
        return Array(8).fill(null);
    });

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
      name: 'Canvas 1',
      ...INITIAL_CANVAS_STATE
    };
    
    const [tabs, setTabs] = useState<TabState[]>([createNewTab('Canvas 1', initialSavedState)]);
    const [activeTabIndex, setActiveTabIndex] = useState(0);
    const loadedTabIdRef = useRef<string | null>(initialSavedState.id);

    const switchTab = (index: number) => {
        if (index < 0 || index >= tabs.length) return;
        setActiveTabIndex(index);
    };

    const addTab = () => {
        const newTab = createNewTab(`Canvas ${tabs.length + 1}`);
        setTabs(prev => [...prev, newTab]);
        setActiveTabIndex(tabs.length);
    };

    const closeTab = (index: number) => {
        if (tabs.length <= 1) return;
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

    const { nodes, setNodes, nodeIdCounter, handleValueChange, handleAddNode: addNodeFromHook, handleDeleteNode, handleCopyNodeValue, handlePasteNodeValue, handleToggleNodeCollapse: baseHandleToggleNodeCollapse, handleDuplicateNode: baseHandleDuplicateNode, handleDuplicateNodeEmpty, handleToggleNodeOutputVisibility } = useNodes(INITIAL_CANVAS_STATE.nodes, INITIAL_CANVAS_STATE.nodeIdCounter);
    const { connections, setConnections, addConnection, removeConnectionsByNodeId, removeConnectionById } = useConnections(INITIAL_CANVAS_STATE.connections);
    const { viewTransform, setViewTransform, isPanning, pointerPosition, clientPointerPosition, handleWheel, startPanning, pan, updatePointerPosition, stopPanning, setZoom, handleCanvasTouchStart, handleCanvasTouchMove, handleCanvasTouchEnd } = useCanvas(INITIAL_CANVAS_STATE.viewTransform);
    const { groups, setGroups, addGroup, removeGroup } = useGroups(INITIAL_CANVAS_STATE.groups);
    
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
    
    const catalog = useCatalog('groups', t('catalog.tabs.groups'), t, 'groups');
    const { 
        currentItems: currentCatalogItems, catalogPath, navigateToFolder: navigateCatalogToFolder, createFolder: createCatalogFolder, saveGroupToCatalog, saveGenericItemToCatalog, renameItem: renameCatalogItem, deleteItem: deleteCatalogItem, importItemsData, persistItems: persistCatalogItems, catalogContext, catalogFileInputRef, handleCatalogFileChange, saveCatalogItemToDisk, triggerLoadFromFile, moveItem: moveCatalogItem 
    } = catalog;
    
    const navigateCatalogBack = useCallback(() => {
        if (catalogPath.length > 1) navigateCatalogToFolder(catalogPath[catalogPath.length - 2].id);
    }, [catalogPath, navigateCatalogToFolder]);

    const createCatalogItem = useCallback((type: CatalogItemType) => { if (type === CatalogItemType.FOLDER) createCatalogFolder(); }, [createCatalogFolder]);

    const library = usePromptLibrary(t);
    const { libraryItems, currentLibraryItems, currentPath: libraryPath, navigateBack, navigateToFolder, createLibraryItem, updateLibraryItem, deleteLibraryItem, saveLibraryItemToDisk, libraryFileInputRef, handleLibraryFileChange, triggerLoadLibraryFromFile, moveLibraryItem, importLibrary } = library;

    const [clearSelectionsSignal, setClearSelectionsSignal] = useState(0);
    const triggerClearSelections = useCallback(() => setClearSelectionsSignal(s => s + 1), []);
    const [lastAddedNodeId, setLastAddedNodeId] = useState<string | null>(null);
    const [creationLine, setCreationLine] = useState<{ start: Point; end: Point; } | null>(null);
    const saveDataToCatalogRef = useRef<((nodeId: string, type: CatalogItemType, name: string) => void) | null>(null);

    const dialogs = useDialogsAndUI({ 
        t, setGroups, renameCatalogItem, updateLibraryItem, libraryItems, deleteLibraryItem, setNodes, setConnections, nodeIdCounter, geminiContext, currentCatalogItems, deleteCatalogItem, 
        saveDataToCatalog: (nodeId: string, type: CatalogItemType, name: string) => saveDataToCatalogRef.current?.(nodeId, type, name)
    });
    const { renameInfo, setRenameInfo, promptEditInfo, setPromptEditInfo, confirmInfo, setConfirmInfo, isErrorCopied, handleCopyError, handleRenameGroup, handleRenameCatalogItem, handleRenameLibraryItem, confirmRename, confirmPromptEdit, handleDeleteCatalogItem, handleDeleteLibraryItem, handleClearCanvas, toasts, addToast: baseAddToast, removeToast } = dialogs;
    
    const handleRenameNode = useCallback((nodeId: string, currentTitle: string) => { setRenameInfo({ type: 'node', id: nodeId, currentTitle }); }, [setRenameInfo]);

    const addToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'info') => baseAddToast(message, type as 'success' | 'info'), [baseAddToast]);

    const { isSyncing, handleSyncCatalogs, uploadCatalogItem } = useGoogleDrive({
        groups: { items: catalog.items, importItemsData, persistItems: persistCatalogItems, catalogContext: 'groups' },
        library: { items: [], importItemsData: () => {}, persistItems: () => {}, catalogContext: 'library' }, 
        characters: { items: [], importItemsData: () => {}, persistItems: () => {}, catalogContext: 'characters' }
    }, addToast, t);

    const translateGraph = useCallback(() => {
        setNodes(prev => prev.map(node => {
            if (node.id === 'node-24-1763746608198') return { ...node, title: t('app.title') };
            return { ...node, title: t(`node.title.${node.type.toLowerCase()}` as any) };
        }));
    }, [t, setNodes]);
    
    const handleLoadAutoSave = useCallback(async () => {
        const savedState = await loadAutoSavedState();
        if (savedState && savedState.tabs.length > 0) {
            setTabs(savedState.tabs);
            setActiveTabIndex(Math.min(savedState.activeTabIndex, savedState.tabs.length - 1));
            const targetTab = savedState.tabs[Math.min(savedState.activeTabIndex, savedState.tabs.length - 1)];
            setNodes(targetTab.nodes);
            setConnections(targetTab.connections);
            setGroups(targetTab.groups);
            setViewTransform(targetTab.viewTransform);
            nodeIdCounter.current = targetTab.nodeIdCounter;
            loadedTabIdRef.current = targetTab.id;
            baseAddToast(t('toast.projectLoaded'), 'success'); 
        }
    }, [t, baseAddToast]);

    const handleResetToDefault = useCallback((silent: boolean = false) => {
        const doReset = () => {
             const defaultState = INITIAL_CANVAS_STATE;
             setNodes(defaultState.nodes);
             setConnections(defaultState.connections);
             setGroups(defaultState.groups || []);
             setViewTransform(defaultState.viewTransform);
             nodeIdCounter.current = defaultState.nodeIdCounter;
             setTabs(prevTabs => prevTabs.map((tab, i) => i === activeTabIndex ? { ...tab, ...defaultState } : tab));
             setTimeout(translateGraph, 0); 
             if (!silent) baseAddToast(t('toast.resetComplete'), 'success');
        };
        if (silent) doReset(); else setConfirmInfo({ title: t('dialog.reset.title'), message: t('dialog.reset.message'), onConfirm: doReset });
    }, [t, setNodes, setConnections, setGroups, setViewTransform, nodeIdCounter, baseAddToast, translateGraph, activeTabIndex, setConfirmInfo]);

    const clearCanvasData = useCallback(() => {
        setNodes([]); setConnections([]); setGroups([]); nodeIdCounter.current = 0;
        setTabs(prevTabs => prevTabs.map((tab, i) => i === activeTabIndex ? { ...tab, nodes: [], connections: [], groups: [], nodeIdCounter: 0 } : tab));
    }, [setNodes, setConnections, setGroups, activeTabIndex]);
    
    const clearProject = useCallback(() => {
        const emptyState = { nodes: [], connections: [], groups: [], viewTransform: { scale: 1, translate: { x: 0, y: 0 } }, nodeIdCounter: 1 };
        const newTab = createNewTab('Canvas 1', emptyState);
        setNodes([]); setConnections([]); setGroups([]); setViewTransform(emptyState.viewTransform);
        nodeIdCounter.current = 1; setTabs([newTab]); setActiveTabIndex(0); loadedTabIdRef.current = newTab.id;
    }, [createNewTab, setNodes, setConnections, setGroups, setViewTransform]);

    const addConnectionWithLogic = useCallback((newConnection: Omit<Connection, 'id'>, fromNode: Node) => {
        const toNode = nodes.find(n => n.id === newConnection.toNodeId);
        addConnection(newConnection);
        if (toNode && (toNode.type === NodeType.SPEECH_SYNTHESIZER || toNode.type === NodeType.DATA_READER)) {
            setTimeout(() => geminiContext.handleReadData(toNode.id), 100);
        }
    }, [nodes, addConnection, geminiContext]);

    const handleExtractNodeFromGroup = useCallback((nodeId: string) => { 
        setGroups(currentGroups => {
            const groupToUpdate = currentGroups.find(g => g.nodeIds.includes(nodeId));
            if (!groupToUpdate) return currentGroups;
            const updatedNodeIds = groupToUpdate.nodeIds.filter(id => id !== nodeId);
            if (updatedNodeIds.length === 0) return currentGroups.filter(g => g.id !== groupToUpdate.id);
            const memberNodes = nodes.filter(n => updatedNodeIds.includes(n.id));
            const groupBounds = (g: Group, m: Node[]) => {
                const padding = 30; const paddingTop = 70;
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                m.forEach(node => { minX = Math.min(minX, node.position.x); minY = Math.min(minY, node.position.y); maxX = Math.max(maxX, node.position.x + node.width); maxY = Math.max(maxY, node.position.y + (node.isCollapsed ? 40 : node.height)); });
                return { ...g, position: { x: minX - padding, y: minY - paddingTop }, width: maxX - minX + padding * 2, height: (maxY - minY) + paddingTop + padding };
            };
            return currentGroups.map(g => g.id === groupToUpdate.id ? groupBounds({ ...groupToUpdate, nodeIds: updatedNodeIds }, memberNodes) : g);
        });
     }, [nodes, setGroups]);

    const onConnectionReleased = useCallback((info: ConnectingInfo, position: Point) => {
        setConnectionMenu({ isOpen: true, position, sourceNodeId: info.fromNodeId, sourceHandleId: info.fromHandleId, fromType: info.fromType });
    }, [setConnectionMenu]);

    const { activeTool, effectiveTool, setActiveTool, connectingInfo, connectionTarget, hoveredNodeId, setHoveredNodeId, selectedNodeIds, setSelectedNodeIds, deselectAllNodes: baseDeselectAllNodes, handleNodeMouseDown, handleGroupMouseDown, handleNodeResizeMouseDown, handleStartConnection, handleNodeClick: handleNodeCutConnections, hoveredGroupIdForDrop, handleCanvasMouseDown: useInteractionCanvasMouseDown, selectionRect: selectionRectPoints, draggingInfo, dollyZoomingInfo, handleNodeTouchStart, handleGroupTouchStart, handleNodeResizeTouchStart, handleStartConnectionTouchStart, isAltDown, extractionTarget } = useInteraction({
        nodes, setNodes, groups, setGroups, addConnection: addConnectionWithLogic, connections, setConnections, viewTransform, updatePointerPosition, pan, isPanning, startPanning, stopPanning, isSnapToGrid, onAddNode: (type, pos) => onAddNode(type, pos), removeConnectionsByNodeId, setZoom, triggerClearSelections, t, clientPointerPosition, clientPointerPositionRef, handleExtractNodeFromGroup, isQuickAddOpen, handleCloseAddNodeMenus, openRadialMenu, onConnectionReleased
    });
    
    const entityActions = useEntityActions({
      nodes, connections, groups, addNodeFromHook, t, clientPointerPosition, clientPointerPositionRef, viewTransform, setCreationLine, setLastAddedNodeId, handleDeleteNode, removeConnectionsByNodeId, addConnection: addConnectionWithLogic, handleValueChange, nodeIdCounter, setNodes, setConnections, addGroup, selectedNodeIds, setSelectedNodeIds, removeGroup, saveGroupToCatalog, catalogItems: catalog.items, currentCatalogItems: catalog.currentItems, handleCloseCatalog, geminiContext, addToast, setGroups, 
      handleDuplicateNode: baseHandleDuplicateNode, 
      handleDuplicateNodeEmpty, saveGenericItemToCatalog
    });
    const { 
        onAddNode, 
        handleAddNodeFromToolbar, 
        deleteNodeAndConnections, 
        handleSplitConnection, 
        handleGroupSelection, 
        handleRemoveGroup, 
        handleSaveGroupToCatalog, 
        handleSaveGroupToDisk, 
        handleCopyGroup, 
        handleDuplicateGroup, 
        handleAddGroupFromCatalog, 
        handleApplyAliases, 
        handleDetachCharacter, 
        addCharacterCardFromFile, 
        addImagePreviewNodeFromFile, 
        handlePasteFromClipboard, 
        handleAddGroupFromTemplate, 
        saveDataToCatalog, 
        handleDownloadChat,
        handleDuplicateNode
    } = entityActions;

    const handleAddNodeFromConnectionMenu = useCallback((type: NodeType) => {
        if (!connectionMenu) return;
        const canvasPos = { x: (connectionMenu.position.x - viewTransform.translate.x) / viewTransform.scale, y: (connectionMenu.position.y - viewTransform.translate.y) / viewTransform.scale };
        const pos = { x: canvasPos.x - 20, y: canvasPos.y - 20 };
        const newNodeId = onAddNode(type, pos);
        const fromNode = nodes.find(n => n.id === connectionMenu.sourceNodeId);
        if (fromNode) addConnectionWithLogic({ fromNodeId: connectionMenu.sourceNodeId, fromHandleId: connectionMenu.sourceHandleId, toNodeId: newNodeId }, fromNode);
        setConnectionMenu(null);
    }, [connectionMenu, viewTransform, onAddNode, nodes, addConnectionWithLogic]);

    useEffect(() => { saveDataToCatalogRef.current = saveDataToCatalog; }, [saveDataToCatalog]);
    
    const handleNodeDoubleClickWrapper = (nodeId: string) => isAltDown ? handleExtractNodeFromGroup(nodeId) : handleToggleNodeCollapse(nodeId);
    
    const handleSaveProject = useCallback(() => {
        const now = new Date(); const dateTimeString = now.toISOString().replace(/[:.]/g, '-');
        const projectData = { type: 'script-modifier-project', timestamp: Date.now(), appState: { activeTabIndex, isSnapToGrid, lineStyle }, tabs, catalog: catalog.items, library: libraryItems };
        const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `Script_Modifier_Project_${dateTimeString}.SMP`; a.click(); URL.revokeObjectURL(url);
        baseAddToast(t('toast.projectSaved'), 'success');
    }, [activeTabIndex, isSnapToGrid, lineStyle, tabs, catalog.items, libraryItems, baseAddToast, t]);

    const handleLoadProjectWrapper = useCallback((projectData: any) => {
        if (projectData.type !== 'script-modifier-project') { baseAddToast(t('alert.loadProjectFailed') || 'Invalid format', 'info'); return; }
        setConfirmInfo({ title: 'Load Project', message: t('alert.confirmLoadProject'), onConfirm: () => {
            if (projectData.appState) { setActiveTabIndex(projectData.appState.activeTabIndex || 0); setIsSnapToGrid(!!projectData.appState.isSnapToGrid); setLineStyle(projectData.appState.lineStyle || 'orthogonal'); }
            if (Array.isArray(projectData.tabs)) { setTabs(projectData.tabs); loadedTabIdRef.current = null; const targetTab = projectData.tabs[projectData.appState?.activeTabIndex || 0] || projectData.tabs[0]; if (targetTab) { setNodes(targetTab.nodes); setConnections(targetTab.connections); setGroups(targetTab.groups || []); setViewTransform(targetTab.viewTransform); nodeIdCounter.current = targetTab.nodeIdCounter; loadedTabIdRef.current = targetTab.id; } }
            if (projectData.catalog) importItemsData(projectData.catalog); if (projectData.library) importLibrary(projectData.library);
            baseAddToast(t('toast.projectLoaded'), 'success');
        }});
    }, [t, baseAddToast, importItemsData, importLibrary, setNodes, setConnections, setGroups, setViewTransform, nodeIdCounter, setConfirmInfo]);

    const { fileInputRef, handleSaveCanvas, handleLoadCanvas, handleFileChange: baseHandleFileChange, loadStateFromFileContent } = useCanvasIO({ nodes, connections, groups, viewTransform, nodeIdCounter, setNodes, setConnections, setGroups, setViewTransform, activeTabName: tabs[activeTabIndex]?.name || 'default', onLoadProject: handleLoadProjectWrapper, addToast: baseAddToast, setGlobalError: geminiContext.setError });
    
    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const match = file.name.match(/^Script_Modifier_Canvas_(.+)_\d{4}-\d{2}-\d{2}/i);
            if (match && match[1]) renameTab(activeTabIndex, match[1].replace(/_/g, ' '));
        }
        baseHandleFileChange(e);
    }, [baseHandleFileChange, renameTab, activeTabIndex]);

    const { isDraggingOverCanvas, handleCanvasDoubleClick: baseHandleCanvasDoubleClick, handleDrop: baseHandleDrop, handleDragOver: baseHandleDragOver, handleDragLeave: baseHandleDragLeave } = useCanvasEvents({
      isQuickSearchOpen, handleToggleCatalog, openQuickSearchMenu, openQuickAddMenu, clientPointerPosition, clientPointerPositionRef, onAddNode, handleCloseAddNodeMenus, loadStateFromFileContent, activeTool, setActiveTool, isSnapToGrid, setIsSnapToGrid, lineStyle, setLineStyle, selectedNodeIds, copyNodeValue: (id) => handleCopyNodeValue(id), geminiContext, addCharacterCardFromFile, addImagePreviewNodeFromFile, viewTransform, nodes, handlePasteFromClipboard, handleAddGroupFromTemplate, catalogItems: catalog.items, handleToggleNodeCollapse, handleNodeDoubleClick: handleNodeDoubleClickWrapper, deleteNodeAndConnections, setSelectedNodeIds, handleGroupSelection, handleDuplicateNode, handleDuplicateNodeEmpty: (id) => handleDuplicateNodeEmpty(id, t), t, contextMenuSlots, handleValueChange, handleSaveProject, handleLoadProject: handleLoadProjectWrapper, addToast 
    });
    
    const { connectedInputs: derivedConnectedInputs, groupButtonPosition, getCanvasCursor, getConnectionPoints, selectionRect } = useDerivedMemo({ nodes, connections, selectedNodeIds, dollyZoomingInfo, draggingInfo, effectiveTool, isPanning, t, selectionRect: selectionRectPoints });

    const [activeCategory, setActiveCategory] = useState<CatalogItemType | null>(null);
    const onSaveCharacterCard = useCallback((nodeId: string) => addToast("Saving character card...", "info"), [addToast]);
    const onLoadCharacterCard = useCallback((nodeId: string) => addToast("Loading character card...", "info"), [addToast]);
    const onSaveCharacterToCatalog = useCallback((nodeId: string) => saveDataToCatalog(nodeId, CatalogItemType.CHARACTERS, "New Character"), [saveDataToCatalog]);

    const contextValue: AppContextType = {
        tabs, activeTabIndex, switchTab, addTab, closeTab, renameTab, nodes, setNodes, connections, groups, viewTransform, setViewTransform, isSnapToGrid, setIsSnapToGrid, lineStyle, setLineStyle, setZoom, isQuickSearchOpen, isQuickAddOpen, quickAddPosition, isRadialMenuOpen, radialMenuPosition, isContextMenuOpen, contextMenuPosition, isCatalogOpen, isErrorCopied, renameInfo, promptEditInfo, confirmInfo, isDraggingOverCanvas: isDraggingOverCanvas || !!extractionTarget, showDialog, activeTool, effectiveTool, connectingInfo, connectionTarget, hoveredNodeId, selectedNodeIds, setSelectedNodeIds, selectionRect, groupButtonPosition, draggingInfo, dollyZoomingInfo, hoveredGroupIdForDrop, dragOverNodeId: null, isAltDown, extractionTarget, currentCatalogItems, catalogPath, currentLibraryItems, libraryPath, libraryItems, activeCategory, setActiveCategory, isSyncing, handleSyncCloud: handleSyncCatalogs, handleUploadToCloud: (item) => uploadCatalogItem(item, 'groups'), fileInputRef, catalogFileInputRef, libraryFileInputRef, handleFileChange, handleCatalogFileChange, handleLibraryFileChange, handleCanvasMouseDown: useInteractionCanvasMouseDown, handleCanvasContextMenu: (e) => openContextMenu({ x: e.clientX, y: e.clientY }), updatePointerPosition, pointerPosition, clientPointerPosition, handleWheel, handleCanvasDoubleClick: baseHandleCanvasDoubleClick, handleDrop: baseHandleDrop, handleDragOver: baseHandleDragOver, handleDragLeave: baseHandleDragLeave, getCanvasCursor, getConnectionPoints, handleCanvasTouchStart, handleCanvasTouchMove, handleCanvasTouchEnd, handleNodeMouseDown, handleNodeTouchStart, handleNodeResizeMouseDown, handleNodeResizeTouchStart, setHoveredNodeId, deleteNodeAndConnections, removeConnectionsByNodeId, copyNodeValue: handleCopyNodeValue, pasteNodeValue: handlePasteNodeValue, handleDuplicateNode, handleDuplicateNodeEmpty: (id) => handleDuplicateNodeEmpty(id, t), handleToggleNodeCollapse, deselectAllNodes: baseDeselectAllNodes, handleNodeClick: handleNodeCutConnections, handleNodeDoubleClick: handleNodeDoubleClickWrapper, handleGroupMouseDown, handleGroupTouchStart, handleGroupSelection, handleRenameGroup, handleRemoveGroup, handleSaveGroupToCatalog, handleSaveGroupToDisk, removeConnectionById, handleSplitConnection, handleCloseAddNodeMenus, setActiveTool, onAddNode, handleAddNodeFromToolbar, handleSaveCanvas, handleLoadCanvas, openQuickSearchMenu, openQuickAddMenu, openRadialMenu, onOpenCatalog: handleToggleCatalog, handleClearCanvas, handleResetToDefault, handleCloseCatalog, confirmRename, confirmPromptEdit, setRenameInfo, setPromptEditInfo, setConfirmInfo, handleCopyError, requestPermission, declinePermission, navigateCatalogBack, navigateCatalogToFolder, createCatalogItem, handleAddGroupFromCatalog, handleRenameCatalogItem, saveCatalogItemToDisk, handleDeleteCatalogItem, triggerLoadFromFile, moveCatalogItem, importCatalog: importItemsData, importLibrary, navigateBack, navigateToFolder, createLibraryItem, updateLibraryItem, deleteLibraryItem: (id: string) => handleDeleteLibraryItem(id), saveLibraryItemToDisk, triggerLoadLibraryFromFile, moveLibraryItem, handleValueChange, connectedInputs: derivedConnectedInputs, t, lastAddedNodeId, creationLine, clearSelectionsSignal, ...geminiContext, handleGenerateEntities: geminiContext.handleGenerateEntities, isGeneratingEntities: geminiContext.isGeneratingEntities, onAnalyzeYouTubeStats: geminiContext.handleAnalyzeYouTubeStats, handleApplyAliases, handleDetachCharacter, addCharacterCardFromFile, addImagePreviewNodeFromFile, handlePasteFromClipboard, toasts, addToast, removeToast, setIsSettingsOpen: () => {}, contextMenuSlots, setContextMenuSlot, saveDataToCatalog, connectionMenu, setConnectionMenu, handleAddNodeFromConnectionMenu, handleRenameNode, handleSaveProject, handleLoadProject: handleLoadProjectWrapper, closeContextMenu, openContextMenu, isContextMenuPinned, toggleContextMenuPin, isQuickAddPinned, toggleQuickAddPin, handleCopyGroup, handleDuplicateGroup, translateGraph, clearCanvasData, clearProject, handleToggleNodeOutputVisibility, setFullSizeImage, getFullSizeImage, setImageViewer, imageViewerState, onCopyImageToClipboard, onDownloadImage, onSaveCharacterCard, onLoadCharacterCard, onSaveCharacterToCatalog, handleGenerateMusicIdeas: geminiContext.handleGenerateMusicIdeas, isGeneratingMusicIdeas: geminiContext.isGeneratingMusicIdeas, handleExtractTextFromImage: geminiContext.handleExtractTextFromImage, isExtractingText: geminiContext.isExtractingText, isAnalyzingYouTubeStats: geminiContext.isAnalyzingYouTubeStats, handleDownloadChat, handleLoadAutoSave,
        // Added missing properties to fix build error
        handleStartConnection,
        handleStartConnectionTouchStart
    };

    return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error('useAppContext must be used within an AppProvider');
    return context;
};
