
import React, { useCallback, MouseEvent, useState, ReactNode, useEffect, useRef, TouchEvent, useMemo } from 'react';
import type { Node, Connection, LineStyle, Point, Tool, LibraryItem } from './types';
import { NodeType } from './types';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import QuickSearchMenu from './components/menus/QuickSearchMenu';
import QuickAddMenu from './components/menus/QuickAddMenu';
import RadialMenu from './components/menus/RadialMenu';
import RenameDialog from './components/dialogs/RenameDialog';
import CatalogView from './components/CatalogView';
import LanguageSelector from './components/ui/LanguageSelector';
import PermissionDialog from './components/dialogs/PermissionDialog';
import ConfirmDialog from './components/dialogs/ConfirmDialog';
import HelpPanel from './components/HelpPanel';
import PromptEditDialog from './components/dialogs/PromptEditDialog';
import ToastContainer from './components/ui/ToastContainer';
import FPSCounter from './components/ui/FPSCounter';
import ApiKeyDialog from './components/dialogs/ApiKeyDialog';
import WelcomeDialog from './components/dialogs/WelcomeDialog';
import VersionInfo from './components/VersionInfo';
import { LanguageContext, translations, LanguageCode, getTranslation } from './localization';
import { AppProvider } from './contexts/AppContext';
import { useAppContext } from './contexts/Context';
import { CatalogItemType } from './types';
import TabsView from './components/TabsView';
import { getNodeDefaults } from './hooks/useNodes';
import Tooltip from './components/ui/Tooltip';
import ContextMenu from './components/menus/ContextMenu';
import ConnectionQuickAddMenu from './components/menus/ConnectionQuickAddMenu';
import ImageViewer from './components/ui/ImageViewer';

const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<LanguageCode>('en');

  const t = useCallback((key: string, options?: { [key: string]: string | number }) => {
    return getTranslation(language, key, options);
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

const Editor: React.FC = () => {
  const context = useAppContext();
  
  if (!context) return null; // Should not happen within AppProvider

  const { 
    tabs, activeTabIndex, switchTab, addTab, closeTab, renameTab,
    t, isSnapToGrid, setIsSnapToGrid, lineStyle, setLineStyle, viewTransform,
    fileInputRef, handleFileChange, catalogFileInputRef, handleCatalogFileChange, libraryFileInputRef, handleLibraryFileChange,
    isQuickSearchOpen, handleCloseAddNodeMenus: baseHandleCloseAddNodeMenus, onAddNode, isQuickAddOpen, quickAddPosition, setActiveTool,
    isRadialMenuOpen, radialMenuPosition, openRadialMenu: baseOpenRadialMenu,
    isContextMenuOpen, contextMenuPosition, contextMenuSlots, setContextMenuSlot, openContextMenu, closeContextMenu, isContextMenuPinned,
    isCatalogOpen, onOpenCatalog: handleToggleCatalog, currentCatalogItems, catalogPath, navigateCatalogBack, navigateCatalogToFolder, createCatalogItem, handleAddGroupFromCatalog, handleRenameCatalogItem, saveCatalogItemToDisk, handleDeleteCatalogItem, triggerLoadFromFile, moveCatalogItem,
    currentLibraryItems, libraryItems, libraryPath, navigateBack, navigateToFolder, createLibraryItem, updateLibraryItem, deleteLibraryItem, saveLibraryItemToDisk, triggerLoadLibraryFromFile, moveLibraryItem, setPromptEditInfo,
    renameInfo, confirmRename, setRenameInfo, promptEditInfo, confirmPromptEdit, confirmInfo, setConfirmInfo,
    error, handleCopyError, isErrorCopied, setError, showDialog, requestPermission, declinePermission,
    effectiveTool, handleSaveCanvas, handleSaveProject, handleLoadCanvas, openQuickSearchMenu, openQuickAddMenu,
    handleClearCanvas, handleResetToDefault, clearCanvasData,
    clientPointerPosition, selectedNodeIds,
    deselectAllNodes,
    toasts,
    removeToast,
    addToast,
    activeCategory,
    setActiveCategory,
    connectionMenu,
    setConnectionMenu,
    handleAddNodeFromConnectionMenu,
    handleAddNodeFromToolbar,
    translateGraph,
    imageViewerState,
    setImageViewer,
    onDownloadImage,
    onCopyImageToClipboard,
  } = context;

  const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false);
  const [isWelcomeDialogOpen, setIsWelcomeDialogOpen] = useState(false);
  const [isTopPanelCollapsed, setIsTopPanelCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Track if the user has already passed the welcome screen in this session or previously
  const [hasWelcomeBeenShown, setHasWelcomeBeenShown] = useState(() => {
     // If API key exists, we consider welcome shown previously
     return !!(localStorage.getItem('gemini-api-key') || localStorage.getItem('gemini-use-free-key'));
  });

  const [apiSettings, setApiSettings] = useState(() => {
    const useFree = localStorage.getItem('gemini-use-free-key') === 'true';
    const userKey = localStorage.getItem('gemini-api-key');
    return {
      hasApiKey: useFree || (!!userKey && userKey.trim() !== ''),
      useFreeKey: useFree,
    };
  });

  const [radialMenuHoveredItem, setRadialMenuHoveredItem] = useState<NodeType | null>(null);

  useEffect(() => {
    const hasApiKeyInStorage = localStorage.getItem('gemini-api-key');
    const hasUseFreeKeyInStorage = localStorage.getItem('gemini-use-free-key');

    if (!hasApiKeyInStorage && !hasUseFreeKeyInStorage) {
      // First launch, no settings saved yet.
      setIsWelcomeDialogOpen(true);
      setHasWelcomeBeenShown(false);
    } else if (!apiSettings.hasApiKey) {
      // Settings exist but are empty/invalid.
      setIsApiKeyDialogOpen(true);
    }
  }, [apiSettings.hasApiKey]);

  // Handle Full Screen Changes
  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
    };
  }, []);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const handleSaveApiSettings = (apiKey: string, useFreeKey: boolean) => {
    localStorage.setItem('gemini-use-free-key', useFreeKey ? 'true' : 'false');
    if (useFreeKey) {
        localStorage.removeItem('gemini-api-key');
    } else if (apiKey) {
        localStorage.setItem('gemini-api-key', apiKey);
    }
    
    setApiSettings({
        hasApiKey: useFreeKey || !!localStorage.getItem('gemini-api-key'),
        useFreeKey: useFreeKey,
    });

    // Determine if this is a "Fresh Start" or just an update/resume
    if (!hasWelcomeBeenShown) {
        // First time running? Reset canvas to default state (fresh start)
        handleResetToDefault(true); // Pass true for silent reset
    } 

    setIsApiKeyDialogOpen(false);
    setIsWelcomeDialogOpen(false);
    setHasWelcomeBeenShown(true);

    // Trigger translation of the canvas using the currently selected language
    // Use setTimeout to ensure language context update has propagated
    setTimeout(() => {
        translateGraph();
    }, 50);

    addToast(t('toast.apiKeySaved'), 'success');
  };
  
  const handleClearApiKey = () => {
    localStorage.removeItem('gemini-api-key');
    localStorage.removeItem('gemini-use-free-key');
    setApiSettings({ hasApiKey: false, useFreeKey: false });
    addToast(t('toast.apiKeyCleared'), 'info');
  };

  const handleCloseAddNodeMenus = useCallback(() => {
    baseHandleCloseAddNodeMenus();
    setRadialMenuHoveredItem(null);
  }, [baseHandleCloseAddNodeMenus]);

  const openRadialMenu = useCallback((position: Point) => {
    setRadialMenuHoveredItem(null);
    baseOpenRadialMenu(position);
  }, [baseOpenRadialMenu]);
  
  const handleAddNodeFromContextMenu = useCallback((type: NodeType) => {
      // Position relative to where the menu was opened (client coords)
      // converted to canvas coords
      const cursorCanvasPosition = {
        x: (contextMenuPosition.x - viewTransform.translate.x) / viewTransform.scale,
        y: (contextMenuPosition.y - viewTransform.translate.y) / viewTransform.scale,
      };
      onAddNode(type, cursorCanvasPosition, undefined);
  }, [contextMenuPosition, viewTransform, onAddNode]);

  const handleCloseConnectionMenu = useCallback(() => {
    setConnectionMenu(null);
  }, [setConnectionMenu]);


  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        const target = e.target as HTMLElement;
        const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

        if ((e.ctrlKey || e.metaKey) && !isTyping) {
            if (e.code === 'KeyS') {
                e.preventDefault();
                handleSaveCanvas();
                return;
            }
            if (e.code === 'KeyO') {
                e.preventDefault();
                handleLoadCanvas();
                return;
            }
        }

        if (e.code === 'Space' && !e.repeat && !isTyping) {
             if (e.ctrlKey) {
                e.preventDefault();
                handleToggleCatalog();
            } else if (!isQuickAddOpen) {
                e.preventDefault();
                // Space now opens Quick Add Menu
                openQuickAddMenu(clientPointerPosition);
            }
            return;
        }

        // F key for Search Menu
        if (e.code === 'KeyF' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && !isTyping) {
            e.preventDefault();
            if (!isQuickSearchOpen) {
                openQuickSearchMenu(clientPointerPosition);
            }
            return;
        }

        if (isTyping || e.repeat) return;
        
        let nodeTypeToAdd: NodeType | null = null;
        if (e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
            switch (e.code) {
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
             switch (e.code) {
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

        if (nodeTypeToAdd) {
            e.preventDefault();
            const defaults = getNodeDefaults(nodeTypeToAdd, t);
            const nodeWidth = defaults.width;
            const HEADER_HEIGHT = 40;

            const cursorCanvasPosition = {
              x: (clientPointerPosition.x - viewTransform.translate.x) / viewTransform.scale,
              y: (clientPointerPosition.y - viewTransform.translate.y) / viewTransform.scale,
            };

            const newNodePosition = {
              x: cursorCanvasPosition.x - (nodeWidth / 2),
              y: cursorCanvasPosition.y - (HEADER_HEIGHT / 2),
            };
            
            onAddNode(nodeTypeToAdd, newNodePosition, undefined);
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isQuickSearchOpen, isQuickAddOpen, handleToggleCatalog, openQuickSearchMenu, openQuickAddMenu, clientPointerPosition, onAddNode, viewTransform.scale, viewTransform.translate.x, viewTransform.translate.y, t, handleSaveCanvas, handleLoadCanvas]);

  const handleAddNodeFromMenu = useCallback((type: NodeType) => {
    const defaults = getNodeDefaults(type, t);
    const nodeWidth = defaults.width;
    const HEADER_HEIGHT = 40;

    const cursorCanvasPosition = {
      x: (quickAddPosition.x - viewTransform.translate.x) / viewTransform.scale,
      y: (quickAddPosition.y - viewTransform.translate.y) / viewTransform.scale,
    };

    const newNodePosition = {
      x: cursorCanvasPosition.x - (nodeWidth / 2),
      y: cursorCanvasPosition.y - (HEADER_HEIGHT / 2),
    };
    onAddNode(type, newNodePosition, undefined);
  }, [quickAddPosition, viewTransform, onAddNode, t]);

  const handleAddNodeFromRadialMenu = useCallback((type: NodeType) => {
    const defaults = getNodeDefaults(type, t);
    const nodeWidth = defaults.width;
    const HEADER_HEIGHT = 40;

    const cursorCanvasPosition = {
      x: (radialMenuPosition.x - viewTransform.translate.x) / viewTransform.scale,
      y: (radialMenuPosition.y - viewTransform.translate.y) / viewTransform.scale,
    };

    const newNodePosition = {
      x: cursorCanvasPosition.x - (nodeWidth / 2),
      y: cursorCanvasPosition.y - (HEADER_HEIGHT / 2),
    };
    onAddNode(type, newNodePosition, undefined);
  }, [radialMenuPosition, viewTransform, onAddNode, t]);

  useEffect(() => {
    const handleTabKeyDown = (e: KeyboardEvent) => {
        const target = e.target as HTMLElement;
        const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
        if (isTyping) return;

        if (e.key === 'Tab') {
            e.preventDefault();
            if (!isRadialMenuOpen) {
                openRadialMenu(clientPointerPosition);
            }
        }
    };

    const handleTabKeyUp = (e: KeyboardEvent) => {
        if (e.key === 'Tab' && isRadialMenuOpen) {
            e.preventDefault();
            if (radialMenuHoveredItem) {
                handleAddNodeFromRadialMenu(radialMenuHoveredItem);
            }
            handleCloseAddNodeMenus();
        }
    };

    window.addEventListener('keydown', handleTabKeyDown);
    window.addEventListener('keyup', handleTabKeyUp);

    return () => {
        window.removeEventListener('keydown', handleTabKeyDown);
        window.removeEventListener('keyup', handleTabKeyUp);
    };
  }, [isRadialMenuOpen, radialMenuHoveredItem, openRadialMenu, handleCloseAddNodeMenus, handleAddNodeFromRadialMenu, clientPointerPosition]);


  const handleEditLibraryItem = (itemId: string) => {
    const item = libraryItems.find(i => i.id === itemId);
    if (item) {
        setPromptEditInfo(item);
    }
  };

  // Helper to determine dialog title
  const getRenameDialogTitle = () => {
      if (!renameInfo) return '';
      switch (renameInfo.type) {
          case 'group': return t('dialog.rename.group.title');
          case 'catalog': return t('dialog.rename.catalog.title');
          case 'node': return t('dialog.rename.title');
          default: return t('dialog.rename.title');
      }
  }

  const handleExitApp = () => {
     // Check if current tab is empty to decide whether to show confirmation
     const currentTab = tabs[activeTabIndex];
     const isEmpty = !currentTab || currentTab.nodes.length === 0;

     if (isEmpty) {
        // Just go to welcome screen (effectively clearing view context)
        setIsWelcomeDialogOpen(true);
     } else {
        setConfirmInfo({
            title: t('dialog.exit.title'),
            message: t('dialog.exit.message'),
            onConfirm: () => {
                clearCanvasData();
                setIsWelcomeDialogOpen(true);
                // Reset this flag so next time it shows "Let's Go" and resets canvas properly
                setHasWelcomeBeenShown(false); 
            }
        });
     }
  };

  const handleDownloadImageFromViewer = (imageUrl: string, frameNumber: number, prompt: string) => {
       const filename = `Image_${frameNumber}_${prompt.slice(0, 10).replace(/\s+/g, '_')}.png`;
       onDownloadImage(imageUrl.startsWith('data:') ? imageUrl.split(',')[1] : imageUrl, filename);
  };
  
  const handleCopyImageFromViewer = async (imageUrl: string) => {
       const base64 = imageUrl.startsWith('data:') ? imageUrl.split(',')[1] : imageUrl;
       await onCopyImageToClipboard(base64);
       addToast(t('toast.copied'), 'success');
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-gray-900 flex flex-col">
      <Canvas>
        <FPSCounter />
        
        {/* Author Info Overlay */}
        <div className="absolute bottom-2 right-2 z-50 text-[10px] text-gray-600 pointer-events-none flex flex-col items-end select-none">
            <span>Author: MeowMaster</span>
            <span>Email: MeowMasterart@gmail.com</span>
            <a href="https://www.netlify.com" target="_blank" rel="noopener noreferrer" className="pointer-events-auto hover:text-emerald-400 transition-colors mt-1">
              Powered by Netlify
            </a>
        </div>

        <ToastContainer toasts={toasts} removeToast={removeToast} />
        <PermissionDialog isOpen={showDialog} onAllow={requestPermission} onDecline={declinePermission} />
        <WelcomeDialog
          isOpen={isWelcomeDialogOpen}
          onSave={handleSaveApiSettings}
          isFirstRun={!hasWelcomeBeenShown}
        />
        <ApiKeyDialog
          isOpen={isApiKeyDialogOpen}
          onSave={handleSaveApiSettings}
          onClose={() => setIsApiKeyDialogOpen(false)}
          onClear={handleClearApiKey}
          hasExistingKey={apiSettings.hasApiKey}
          initialUseFreeKey={apiSettings.useFreeKey}
        />
        
        {imageViewerState && (
            <ImageViewer 
                sources={imageViewerState.sources}
                initialIndex={imageViewerState.initialIndex}
                initialPosition={{ x: window.innerWidth / 2 - 400, y: window.innerHeight / 2 - 300 }} // Centered fallback, component handles persistence
                onClose={() => setImageViewer(null)}
                onDownloadImageFromUrl={handleDownloadImageFromViewer}
                onCopyImageToClipboard={handleCopyImageFromViewer}
            />
        )}
        
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json,application/json" className="hidden" />
        <input type="file" ref={catalogFileInputRef} onChange={handleCatalogFileChange} accept=".json,application/json" className="hidden" />
        <input type="file" ref={libraryFileInputRef} onChange={handleLibraryFileChange} accept=".json,application/json" className="hidden" />
        
        <QuickSearchMenu isOpen={isQuickSearchOpen} onClose={handleCloseAddNodeMenus} onAddNode={handleAddNodeFromMenu} />
        <QuickAddMenu isOpen={isQuickAddOpen} position={quickAddPosition} onClose={handleCloseAddNodeMenus} onAddNode={handleAddNodeFromMenu} onToolChange={setActiveTool} />
        <RadialMenu 
          isOpen={isRadialMenuOpen}
          position={radialMenuPosition}
          onClose={handleCloseAddNodeMenus}
          onAddNode={handleAddNodeFromRadialMenu}
          onSelectItem={setRadialMenuHoveredItem}
        />
        <ContextMenu 
            isOpen={isContextMenuOpen}
            position={contextMenuPosition}
            onClose={closeContextMenu}
            onAddNode={handleAddNodeFromContextMenu}
            slots={contextMenuSlots}
            onAssignSlot={setContextMenuSlot}
            activeTool={effectiveTool}
            onToolChange={setActiveTool}
        />
        <ConnectionQuickAddMenu
            isOpen={!!connectionMenu?.isOpen}
            position={connectionMenu?.position || { x: 0, y: 0 }}
            fromType={connectionMenu?.fromType || null}
            onClose={handleCloseConnectionMenu}
            onSelect={handleAddNodeFromConnectionMenu}
        />
        <CatalogView 
            isOpen={isCatalogOpen} 
            onClose={handleToggleCatalog} 
            currentCatalogItems={currentCatalogItems} 
            catalogPath={catalogPath} 
            onCatalogNavigateBack={navigateCatalogBack} 
            onCatalogNavigateToFolder={navigateCatalogToFolder} 
            onCreateCatalogFolder={() => createCatalogItem(CatalogItemType.FOLDER)} 
            onAddGroupFromCatalog={handleAddGroupFromCatalog} 
            onRenameCatalogItem={handleRenameCatalogItem} 
            onSaveCatalogItem={saveCatalogItemToDisk} 
            onDeleteCatalogItem={handleDeleteCatalogItem} 
            onLoadCatalogItemFromFile={triggerLoadFromFile} 
            onMoveCatalogItem={moveCatalogItem} 
            libraryItems={currentLibraryItems} 
            libraryPath={libraryPath} 
            onNavigateBack={navigateBack} 
            onNavigateToFolder={navigateToFolder} 
            onCreateLibraryItem={createLibraryItem} 
            onEditLibraryItem={handleEditLibraryItem} 
            onRenameLibraryItem={(id, name) => setRenameInfo({type: 'library', id, currentTitle: name})} 
            onDeleteLibraryItem={deleteLibraryItem} 
            onSaveLibraryItem={saveLibraryItemToDisk} 
            onLoadLibraryItemFromFile={triggerLoadLibraryFromFile} 
            onMoveLibraryItem={moveLibraryItem}
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
        />
        <RenameDialog isOpen={!!renameInfo} initialValue={renameInfo?.currentTitle || ''} onConfirm={confirmRename} onClose={() => setRenameInfo(null)} title={getRenameDialogTitle()} label={t('dialog.rename.label')} confirmButtonText={t('dialog.rename.confirm')} cancelButtonText={t('dialog.rename.cancel')} deselectAllNodes={deselectAllNodes} />
        {/* Fixed: Removed duplicate PromptEditDialog instance */}
        <PromptEditDialog isOpen={!!promptEditInfo} initialName={promptEditInfo?.name || ''} initialContent={promptEditInfo?.content || ''} onConfirm={confirmPromptEdit} onClose={() => setPromptEditInfo(null)} deselectAllNodes={deselectAllNodes} />
        <ConfirmDialog isOpen={!!confirmInfo} onClose={() => setConfirmInfo(null)} onConfirm={() => { confirmInfo?.onConfirm(); setConfirmInfo(null); }} title={confirmInfo?.title || ''} message={confirmInfo?.message || ''} />
        
        {error && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-blue-900/95 p-4 rounded-lg border border-blue-500 flex items-start space-x-4 max-w-md shadow-xl backdrop-blur-md">
              <div className="flex-grow text-blue-100">
                  <p className="font-bold text-blue-50 mb-1">{t('app.error.title')}</p>
                  <p className="text-sm text-blue-100">{t(error)}</p>
              </div>
              <div className="flex flex-col space-y-1 flex-shrink-0">
                  <button onClick={() => setError(null)} className="p-1 text-blue-300 rounded-full hover:bg-blue-700/50 hover:text-white transition-colors" aria-label={t('node.action.close')} title={t('node.action.close')} >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                  <button onClick={handleCopyError} className="p-1 text-blue-300 rounded-full hover:bg-blue-700/50 hover:text-white transition-colors" aria-label={t('app.error.copy')} title={isErrorCopied ? t('app.error.copied') : t('app.error.copy')} >
                      {isErrorCopied ? (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>) : (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>)}
                  </button>
              </div>
          </div>
        )}

        <Toolbar
          activeTool={effectiveTool}
          onToolChange={setActiveTool}
          onAddNode={handleAddNodeFromToolbar}
          onSaveCanvas={handleSaveCanvas}
          onSaveProject={handleSaveProject}
          onLoadCanvas={handleLoadCanvas}
          onOpenSearch={() => openQuickSearchMenu(clientPointerPosition)}
          onOpenCatalog={handleToggleCatalog}
          viewTransform={viewTransform}
          setZoom={context.setZoom}
          isSnapToGrid={isSnapToGrid}
          setIsSnapToGrid={setIsSnapToGrid}
          lineStyle={lineStyle}
          setLineStyle={setLineStyle}
          handleClearCanvas={handleClearCanvas}
        />

        <div className="absolute top-2 left-2 z-20 flex items-center">
          <div className={`flex items-center p-1 ${isTopPanelCollapsed ? 'gap-0' : 'gap-1'} rounded-lg border border-gray-700 shadow-lg bg-gray-900/50 backdrop-blur-md`}>
              <Tooltip title={isTopPanelCollapsed ? t('toolbar.expand') : t('toolbar.collapse')} position="right">
                  <button
                    onClick={() => setIsTopPanelCollapsed(!isTopPanelCollapsed)}
                    className="h-9 w-9 flex-shrink-0 flex items-center justify-center rounded-md hover:bg-emerald-600 bg-gray-700 text-gray-300 hover:text-white transition-colors"
                  >
                    {isTopPanelCollapsed 
                        ? <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3l14 9-14 9V3z" /></svg>
                        : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3l-14 9 14 9V3z" /></svg>
                    }
                  </button>
              </Tooltip>
              {!isTopPanelCollapsed && (
                  <div className="flex items-center gap-1 whitespace-nowrap">
                    <Tooltip title={t('toolbar.home')} position="bottom">
                        <button
                            onClick={() => setIsWelcomeDialogOpen(true)}
                            className="p-1.5 rounded-md transition-colors duration-200 focus:outline-none flex items-center justify-center h-9 w-9 bg-gray-700 hover:bg-emerald-600 text-gray-300 hover:text-white"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                        </button>
                    </Tooltip>
                    <HelpPanel />
                    <Tooltip title={t('dialog.apiKey.title')} position="bottom">
                        <button
                          onClick={() => setIsApiKeyDialogOpen(true)}
                          className="p-1.5 rounded-md transition-colors duration-200 focus:outline-none flex items-center justify-center h-9 w-9 bg-gray-700 hover:bg-emerald-600 text-gray-300 hover:text-white"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </button>
                    </Tooltip>
                    <Tooltip title={t('toolbar.resetToDefault')} position="bottom">
                        <button
                          onClick={() => handleResetToDefault(false)}
                          className="p-1.5 rounded-md transition-colors duration-200 focus:outline-none flex items-center justify-center h-9 w-9 bg-gray-700 hover:bg-emerald-600 text-gray-300 hover:text-white"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </button>
                    </Tooltip>
                    <Tooltip title={isFullscreen ? t('toolbar.exitFullscreen') : t('toolbar.enterFullscreen')} position="bottom">
                        <button
                            onClick={toggleFullScreen}
                            className="p-1.5 rounded-md transition-colors duration-200 focus:outline-none flex items-center justify-center h-9 w-9 bg-gray-700 hover:bg-emerald-600 text-gray-300 hover:text-white"
                        >
                             {isFullscreen ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5M15 15l5.25 5.25" />
                                </svg>
                             ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                                </svg>
                             )}
                        </button>
                    </Tooltip>
                    <LanguageSelector />
                    <div className="flex items-center h-9 gap-1">
                      <TabsView
                        tabs={tabs}
                        activeTabIndex={activeTabIndex}
                        onTabClick={switchTab}
                        onCloseTab={closeTab}
                        onRenameTab={renameTab}
                      />
                      <Tooltip title="Add new tab" position="bottom" className="h-full">
                          <button 
                            onClick={addTab}
                            className="flex items-center justify-center h-full w-9 text-gray-300 hover:bg-emerald-600 bg-gray-700 rounded-md transition-colors hover:text-white"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                          </button>
                      </Tooltip>
                    </div>
                    <div className="flex items-center justify-start pl-3 pr-2 h-full">
                      <div className="mr-3 text-emerald-400">
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          className="w-5 h-5"
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="1.5" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        >
                          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                          <path d="m15 5 4 4"/>
                        </svg>
                      </div>
                      <div className="text-left">
                        <h1 className="text-lg font-bold text-emerald-400 select-none leading-tight">{t('app.title')}</h1>
                      </div>
                    </div>
                    <VersionInfo />
                    <Tooltip title={t('toolbar.closeProject')} position="bottom">
                        <button
                          onClick={handleExitApp}
                          className="p-1.5 rounded-md transition-colors duration-200 focus:outline-none flex items-center justify-center h-9 w-9 bg-gray-700 hover:bg-red-600 text-gray-300 hover:text-white"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                             <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                          </svg>
                        </button>
                    </Tooltip>
                  </div>
              )}
          </div>
        </div>
      </Canvas>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AppProvider>
        <Editor />
      </AppProvider>
    </LanguageProvider>
  );
};

export default App;
