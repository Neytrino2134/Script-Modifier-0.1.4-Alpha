
import React, { useState, useEffect, useRef } from 'react';
import type { CatalogItem, LibraryItem } from '../types';
import { CatalogItemType, LibraryItemType } from '../types';
import { useLanguage } from '../localization';
import { useAppContext } from '../contexts/Context';

interface CatalogViewProps {
  isOpen: boolean;
  onClose: () => void;
  // Group/General Catalog Props
  currentCatalogItems: CatalogItem[];
  catalogPath: { id: string | null, name: string }[];
  onCatalogNavigateBack: () => void;
  onCatalogNavigateToFolder: (folderId: string | null) => void;
  onCreateCatalogFolder: () => void;
  onAddGroupFromCatalog: (itemId: string) => void;
  onRenameCatalogItem: (itemId: string, currentName: string) => void;
  onSaveCatalogItem: (itemId: string) => void;
  onDeleteCatalogItem: (itemId: string) => void;
  onLoadCatalogItemFromFile: () => void;
  onMoveCatalogItem: (itemId: string, newParentId: string | null) => void;
  activeCategory: CatalogItemType | null;
  setActiveCategory: (category: CatalogItemType | null) => void;
  // Prompt Library Props
  libraryItems: LibraryItem[];
  libraryPath: LibraryItem[];
  onNavigateBack: () => void;
  onNavigateToFolder: (folderId: string | null) => void;
  onCreateLibraryItem: (type: LibraryItemType) => void;
  onEditLibraryItem: (itemId: string) => void;
  onRenameLibraryItem: (itemId: string, currentName: string) => void;
  onDeleteLibraryItem: (itemId: string) => void;
  onSaveLibraryItem: (item: LibraryItem) => void;
  onLoadLibraryItemFromFile: () => void;
  onMoveLibraryItem: (itemId: string, newParentId: string | null) => void;
}

const ActionButton: React.FC<{ title: string; onClick: (e: React.MouseEvent) => void; children: React.ReactNode; className?: string }> = ({ title, onClick, children, className = "" }) => (
    <button
        onClick={onClick}
        onMouseDown={e => e.stopPropagation()}
        aria-label={title}
        title={title}
        className={`p-2 text-gray-300 rounded-full hover:bg-gray-600 hover:text-white transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-emerald-500 ${className}`}
    >
        {children}
    </button>
);


const CatalogItemCard: React.FC<{
  item: CatalogItem;
  onAddToCanvas: (itemId: string) => void;
  onNavigate: (folderId: string) => void;
  onRename: (itemId: string, currentName: string) => void;
  onSave: (itemId: string) => void;
  onDelete: (itemId: string) => void;
  onUploadCloud?: () => void;
  draggedItem: { id: string; tab: 'groups' | 'library' | 'generic' } | null;
  onDragStart: () => void;
  onDragEnd: () => void;
  onMoveItem: (targetFolderId: string) => void;
  isDragOver: boolean;
  setIsDragOver: (isOver: boolean) => void;
}> = ({ item, onAddToCanvas, onNavigate, onRename, onSave, onDelete, onUploadCloud, draggedItem, onDragStart, onDragEnd, onMoveItem, isDragOver, setIsDragOver }) => {
  const { t } = useLanguage();
  const isFolder = item.type === CatalogItemType.FOLDER;

  const mainAction = isFolder ? () => onNavigate(item.id) : () => {};
  
  const handleDragStart = (e: React.DragEvent) => {
    onDragStart();
    e.dataTransfer.setData('application/prompt-modifier-drag-item', JSON.stringify({
        type: item.type === CatalogItemType.GROUP ? 'catalog-group' : `catalog-data-${item.type.toLowerCase()}`,
        itemId: item.id,
        itemData: item.data 
    }));
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  const handleDragOver = (e: React.DragEvent) => {
      if (isFolder && draggedItem && (draggedItem.tab === 'groups' || draggedItem.tab === 'generic') && draggedItem.id !== item.id) {
          e.preventDefault();
          setIsDragOver(true);
      }
  };

  const handleDrop = (e: React.DragEvent) => {
      if (isFolder) {
          e.preventDefault();
          e.stopPropagation();
          setIsDragOver(false);
          onMoveItem(item.id);
      }
  };

  const renderIcon = () => {
      if (isFolder) return <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>;
      
      switch (item.type) {
          case CatalogItemType.GROUP:
              return <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>;
          case CatalogItemType.CHARACTERS:
              return <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
          case CatalogItemType.SCRIPT:
              return <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
          case CatalogItemType.ANALYSIS:
              return <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>;
          case CatalogItemType.FINAL_PROMPTS:
              return <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
          case CatalogItemType.YOUTUBE:
              if (item.data && item.data.type === 'youtube-analytics-data') {
                  return <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
              }
              return <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
          case CatalogItemType.MUSIC:
              return <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 6l12-3" /></svg>;
          default:
              return <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>;
      }
  };

  return (
    <div 
        draggable
        onDragStart={handleDragStart}
        onDragEnd={onDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`bg-gray-700 rounded-lg p-4 flex flex-col items-center justify-between space-y-3 border border-gray-600 hover:border-emerald-500 transition-colors duration-200 ${isDragOver ? 'ring-2 ring-emerald-400' : ''}`}
    >
      <div 
        className="relative w-24 h-20 mx-auto mb-2 group"
        onClick={mainAction}
        style={{ cursor: isFolder ? 'pointer' : 'default' }}
      >
        <div className={`absolute w-full h-full ${isFolder ? 'group-hover:scale-110' : ''} bg-gray-800 rounded-lg flex items-center justify-center transition-transform`}>
           {renderIcon()}
        </div>
      </div>
      <p className="font-semibold text-gray-100 text-center break-all w-full truncate" title={item.name}>{item.name}</p>
      <div className="flex justify-center space-x-2 w-full pt-2 border-t border-gray-600/50">
        {item.type === CatalogItemType.GROUP && (
            <ActionButton title={t('catalog.card.addToCanvas')} onClick={() => onAddToCanvas(item.id)}>
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </ActionButton>
        )}
        <ActionButton title={t('catalog.card.rename')} onClick={() => onRename(item.id, item.name)}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
        </ActionButton>
        {onUploadCloud && (
             <ActionButton title="Save to Cloud" onClick={onUploadCloud} className={item.driveFileId ? 'text-blue-400' : 'text-gray-400'}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
             </ActionButton>
        )}
        <ActionButton title={t('catalog.card.save')} onClick={() => onSave(item.id)}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
        </ActionButton>
        <ActionButton title={t('catalog.card.delete')} onClick={() => onDelete(item.id)}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </ActionButton>
      </div>
    </div>
  );
};

const LibraryItemCard: React.FC<{
  item: LibraryItem;
  onNavigate: (folderId: string) => void;
  onEdit: (itemId: string) => void;
  onRename: (itemId: string, currentName: string) => void;
  onSave: (item: LibraryItem) => void;
  onDelete: (itemId: string) => void;
  onMoveItem: (targetFolderId: string | null) => void;
  draggedItem: { id: string; tab: 'groups' | 'library' | 'generic' } | null;
  onDragStart: () => void;
  onDragEnd: () => void;
  isDragOver: boolean;
  setIsDragOver: (isOver: boolean) => void;
}> = ({ item, onNavigate, onEdit, onRename, onSave, onDelete, onMoveItem, draggedItem, onDragStart, onDragEnd, isDragOver, setIsDragOver }) => {
  const { t } = useLanguage();
  const isFolder = item.type === LibraryItemType.FOLDER;

  const handleCopy = () => {
    if (item.content) {
      navigator.clipboard.writeText(item.content).catch(err => console.error("Copy failed", err));
    }
  };

  const mainAction = isFolder ? () => onNavigate(item.id) : () => {};
  
  const handleDragStart = (e: React.DragEvent) => {
    onDragStart();
    e.dataTransfer.setData('application/prompt-modifier-drag-item', JSON.stringify({
        type: item.type === LibraryItemType.FOLDER ? 'library-folder' : 'library-prompt',
        itemId: item.id,
        content: item.content
    }));
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  const handleDragOver = (e: React.DragEvent) => {
      if (isFolder && draggedItem && draggedItem.tab === 'library' && draggedItem.id !== item.id) {
          e.preventDefault();
          setIsDragOver(true);
      }
  };

  const handleDrop = (e: React.DragEvent) => {
      if (isFolder) {
          e.preventDefault();
          e.stopPropagation();
          setIsDragOver(false);
          onMoveItem(item.id);
      }
  };

  return (
    <div 
        draggable
        onDragStart={handleDragStart}
        onDragEnd={onDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`bg-gray-700 rounded-lg p-4 flex flex-col items-center justify-between space-y-3 border border-gray-600 hover:border-emerald-500 transition-colors duration-200 ${isDragOver ? 'ring-2 ring-emerald-400' : ''}`}
    >
      <div 
        className="relative w-24 h-20 mx-auto mb-2 group"
        onClick={mainAction}
        style={{ cursor: isFolder ? 'pointer' : 'default' }}
      >
        <div className={`absolute w-full h-full ${isFolder ? 'group-hover:scale-110' : ''} bg-gray-800 rounded-lg flex items-center justify-center transition-transform`}>
          {isFolder ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          )}
        </div>
      </div>
      
      <div className="text-center w-full min-h-[4rem]">
        <p className="font-semibold text-gray-100 break-all w-full truncate" title={item.name}>{item.name}</p>
        {!isFolder && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{item.content || t('library.emptyPrompt')}</p>}
      </div>

      <div className="flex justify-center space-x-2 w-full pt-2 border-t border-gray-600/50">
        {!isFolder && (
          <>
            <ActionButton title={t('library.actions.copy')} onClick={handleCopy}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            </ActionButton>
            <ActionButton title={t('library.actions.edit')} onClick={() => onEdit(item.id)}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </ActionButton>
          </>
        )}
        <ActionButton title={t('catalog.card.rename')} onClick={() => onRename(item.id, item.name)}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
        </ActionButton>
        <ActionButton title={t('catalog.card.save')} onClick={() => onSave(item)}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
        </ActionButton>
        <ActionButton title={t('catalog.card.delete')} onClick={() => onDelete(item.id)}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </ActionButton>
      </div>
    </div>
  );
};


const CatalogView: React.FC<CatalogViewProps> = (props) => {
  const { 
    isOpen, onClose,
    currentCatalogItems, catalogPath, onCatalogNavigateBack, onCatalogNavigateToFolder, onCreateCatalogFolder, onAddGroupFromCatalog, onRenameCatalogItem, onSaveCatalogItem, onDeleteCatalogItem, onLoadCatalogItemFromFile, onMoveCatalogItem, activeCategory, setActiveCategory,
    libraryItems = [], libraryPath = [], onNavigateBack, onNavigateToFolder, onCreateLibraryItem, onEditLibraryItem, onRenameLibraryItem, onDeleteLibraryItem, onSaveLibraryItem, onLoadLibraryItemFromFile, onMoveLibraryItem
  } = props;
  const { t } = useLanguage();
  const { isSyncing, handleSyncCloud, handleUploadToCloud } = useAppContext();
  const [activeTab, setActiveTab] = useState<string>(CatalogItemType.GROUP);
  const [draggedItem, setDraggedItem] = useState<{ id: string; tab: 'groups' | 'library' | 'generic' } | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  if (!isOpen) return null;

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverTarget(null);
  };

  const handleTabClick = (id: string, index: number) => {
      setActiveTab(id);
      if (id !== 'library') {
          setActiveCategory(id as CatalogItemType);
          onCatalogNavigateToFolder(null);
      } else {
          onNavigateToFolder(null);
      }
      
      const container = tabsContainerRef.current;
      const tab = tabRefs.current[index];

      if (container && tab) {
        const containerRect = container.getBoundingClientRect();
        const tabRect = tab.getBoundingClientRect();
        const containerCenter = containerRect.left + containerRect.width / 2;
        const tabCenter = tabRect.left + tabRect.width / 2;
        const offset = tabCenter - containerCenter;
        container.scrollTo({
            left: container.scrollLeft + offset,
            behavior: 'smooth'
        });
      }
  };

  const tabsList = [
      { id: CatalogItemType.GROUP, label: t('catalog.tabs.groups') },
      { id: 'library', label: t('catalog.tabs.library') },
      { id: CatalogItemType.CHARACTERS, label: t('catalog.tabs.characters') },
      { id: CatalogItemType.SCRIPT, label: t('catalog.tabs.scripts') },
      { id: CatalogItemType.ANALYSIS, label: t('catalog.tabs.analysis') },
      { id: CatalogItemType.FINAL_PROMPTS, label: t('catalog.tabs.final_prompts') },
      { id: CatalogItemType.YOUTUBE, label: t('catalog.tabs.youtube') },
      { id: CatalogItemType.MUSIC, label: t('catalog.tabs.music') },
  ];

  const renderCatalog = () => (
    <>
      <div className="p-3 border-b border-gray-700 flex items-center justify-between space-x-2 flex-shrink-0">
        <div className="flex items-center space-x-1 min-w-0">
          <button 
            onClick={onCatalogNavigateBack} 
            disabled={catalogPath.length <= 1} 
            className={`p-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${dragOverTarget === 'back-catalog' ? 'bg-emerald-700' : 'hover:bg-gray-700'}`}
            onDragOver={(e) => { if ((draggedItem?.tab === 'groups' || draggedItem?.tab === 'generic') && catalogPath.length > 1) { e.preventDefault(); setDragOverTarget('back-catalog'); }}}
            onDragLeave={() => setDragOverTarget(null)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOverTarget(null);
              if (!draggedItem || (draggedItem.tab !== 'groups' && draggedItem.tab !== 'generic')) return;
              const newParentId = catalogPath.length > 1 ? catalogPath[catalogPath.length - 2].id : null;
              onMoveCatalogItem(draggedItem.id, newParentId);
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div className="flex items-center text-sm text-gray-400 truncate">
              {catalogPath.map((folder, index) => (
                  <React.Fragment key={folder.id || 'root'}>
                      <span onClick={() => onCatalogNavigateToFolder(folder.id)} className="px-1 hover:text-white cursor-pointer truncate">{folder.name}</span>
                      {index < catalogPath.length - 1 && <span className="px-1 select-none">/</span>}
                  </React.Fragment>
              ))}
          </div>
        </div>
        <div className="flex space-x-2 flex-shrink-0">
          <button 
            onClick={handleSyncCloud} 
            disabled={isSyncing}
            className={`px-3 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center space-x-2 transition-all ${isSyncing ? 'animate-pulse' : ''}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isSyncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            <span>{isSyncing ? 'Syncing...' : 'Sync Cloud'}</span>
          </button>
          <button onClick={onLoadCatalogItemFromFile} className="px-3 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
            <span>{t('catalog.loadFromFile')}</span>
          </button>
          <button onClick={onCreateCatalogFolder} className="px-3 py-2 text-sm font-semibold bg-gray-600 hover:bg-gray-500 text-white rounded-md flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
            <span>{t('library.actions.newFolder')}</span>
          </button>
        </div>
      </div>
      <div className="flex-grow overflow-y-auto p-4">
        {(currentCatalogItems && currentCatalogItems.length > 0) ? (
          <div className="grid grid-cols-3 gap-4">
            {currentCatalogItems.map((item) => (
              <CatalogItemCard 
                key={item.id} 
                item={item} 
                onAddToCanvas={onAddGroupFromCatalog} 
                onNavigate={(folderId) => onCatalogNavigateToFolder(folderId)}
                onRename={onRenameCatalogItem} 
                onSave={onSaveCatalogItem} 
                onDelete={onDeleteCatalogItem}
                onUploadCloud={() => handleUploadToCloud(item)}
                draggedItem={draggedItem}
                onDragStart={() => setDraggedItem({ id: item.id, tab: item.type === CatalogItemType.GROUP ? 'groups' : 'generic' })}
                onDragEnd={handleDragEnd}
                onMoveItem={(targetFolderId) => onMoveCatalogItem(item.id, targetFolderId)}
                isDragOver={dragOverTarget === item.id}
                setIsDragOver={(isOver) => setDragOverTarget(isOver ? item.id : null)}
              />
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
              <p className="font-semibold">{t('catalog.empty.title')}</p>
              <p className="text-sm">{t('catalog.empty.description')}</p>
          </div>
        )}
      </div>
    </>
  );

  const renderPromptLibrary = () => (
    <>
      <div className="p-3 border-b border-gray-700 flex items-center justify-between space-x-2 flex-shrink-0">
        <div className="flex items-center space-x-1 min-w-0">
          <button 
            onClick={onNavigateBack} 
            disabled={libraryPath.length <= 1} 
            className={`p-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${dragOverTarget === 'back-library' ? 'bg-emerald-700' : 'hover:bg-gray-700'}`}
            onDragOver={(e) => { if (draggedItem?.tab === 'library' && libraryPath.length > 1) { e.preventDefault(); setDragOverTarget('back-library'); }}}
            onDragLeave={() => setDragOverTarget(null)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOverTarget(null);
              if (!draggedItem || draggedItem.tab !== 'library') return;
              const newParentId = libraryPath.length > 1 ? libraryPath[libraryPath.length - 2].id : null;
              onMoveLibraryItem(draggedItem.id, newParentId);
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div className="flex items-center text-sm text-gray-400 truncate">
              {libraryPath.map((folder, index) => (
                  <React.Fragment key={folder.id || 'root'}>
                      <span onClick={() => onNavigateToFolder(folder.id === 'root' ? null : folder.id)} className="px-1 hover:text-white cursor-pointer truncate">{folder.name}</span>
                      {index < libraryPath.length - 1 && <span className="px-1 select-none">/</span>}
                  </React.Fragment>
              ))}
          </div>
        </div>
        <div className="flex space-x-2 flex-shrink-0">
          <button onClick={onLoadLibraryItemFromFile} className="px-3 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
            <span>{t('library.loadFromFile')}</span>
          </button>
          <button onClick={() => onCreateLibraryItem(LibraryItemType.FOLDER)} className="px-3 py-2 text-sm font-semibold bg-gray-600 hover:bg-gray-500 text-white rounded-md flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
            <span>{t('library.actions.newFolder')}</span>
          </button>
          <button onClick={() => onCreateLibraryItem(LibraryItemType.PROMPT)} className="px-3 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <span>{t('library.actions.newPrompt')}</span>
          </button>
        </div>
      </div>
      <div className="flex-grow overflow-y-auto p-4">
        {(libraryItems && libraryItems.length > 0) ? (
          <div className="grid grid-cols-3 gap-4">
            {libraryItems.map((item) => (
              <LibraryItemCard 
                key={item.id} 
                item={item} 
                onNavigate={onNavigateToFolder} 
                onEdit={onEditLibraryItem} 
                onRename={onRenameLibraryItem} 
                onSave={onSaveLibraryItem} 
                onDelete={onDeleteLibraryItem} 
                onMoveItem={(targetId) => onMoveLibraryItem(item.id, targetId)}
                draggedItem={draggedItem}
                onDragStart={() => setDraggedItem({ id: item.id, tab: 'library' })}
                onDragEnd={handleDragEnd}
                isDragOver={dragOverTarget === item.id}
                setIsDragOver={(isOver) => setDragOverTarget(isOver ? item.id : null)}
              />
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
            <p className="font-semibold">{t('library.empty.title')}</p>
            <p className="text-sm">{t('library.empty.description')}</p>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
      <div className="bg-gray-800 rounded-lg w-full max-w-4xl border border-gray-700 flex flex-col h-[80vh] pointer-events-auto shadow-2xl" onMouseDown={e => e.stopPropagation()}>
        <div className="p-4 pb-0 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
          <div 
             ref={tabsContainerRef}
             className="flex items-end space-x-1 overflow-x-auto pb-2 w-full mr-4 no-scrollbar relative"
             style={{ scrollbarWidth: 'none' }} 
          >
                {tabsList.map((tab, index) => (
                    <button 
                        key={tab.id}
                        ref={(el) => { tabRefs.current[index] = el }}
                        onClick={() => handleTabClick(tab.id, index)}
                        className={`px-4 py-2 text-sm font-bold whitespace-nowrap transition-colors rounded-t-md ${activeTab === tab.id ? 'bg-gray-700 text-emerald-400 border-t-2 border-emerald-400' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'}`}
                    >
                        {tab.label}
                    </button>
                ))}
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 rounded hover:bg-gray-600 hover:text-white mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        {activeTab === 'library' ? renderPromptLibrary() : renderCatalog()}
      </div>
    </div>
  );
};

export default CatalogView;
