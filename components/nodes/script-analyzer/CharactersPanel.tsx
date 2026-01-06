
import React, { useState, useEffect, useMemo } from 'react';
import { ActionButton } from '../../ActionButton';
import { EditableCharacterDescription } from './EditableCharacterDescription';
import { AnalyzerUiState } from './types';
import CustomCheckbox from '../../ui/CustomCheckbox';
import Tooltip from '../../ui/Tooltip';

const AnalyzerCharacterItem: React.FC<{
    char: any;
    currentId: string | number;
    isSelected: boolean;
    isCollapsed: boolean;
    t: (key: string) => string;
    onClick: (e: React.MouseEvent, id: string | number) => void;
    onToggleCollapse: (id: string | number) => void;
    onUpdate: (id: string | number, field: string, value: string) => void;
    deselectAllNodes: () => void;
    onEmbed: (char: any) => void;
    onDelete?: (id: string | number) => void;
}> = React.memo(({ char, currentId, isSelected, isCollapsed, t, onClick, onToggleCollapse, onUpdate, deselectAllNodes, onEmbed, onDelete }) => {
    return (
        <div className="bg-gray-800 rounded-lg p-3 mb-2 space-y-2 border border-gray-700 transition-colors">
            <div className="flex justify-between items-center cursor-pointer" onClick={(e) => { if (!(e.target as HTMLElement).closest('input, button')) onToggleCollapse(currentId); }}>
                <div className="flex items-center flex-grow min-w-0">
                    {char.isLinked && (
                        <div title="Linked from upstream (Read-only)" className="mr-2 text-emerald-400 flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                        </div>
                    )}
                    <ActionButton tooltipPosition="right" title={t('node.action.togglePanel')} onClick={(e) => { e.stopPropagation(); onToggleCollapse(currentId); }}>
                        {isCollapsed ? (<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>) : (<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>)}
                    </ActionButton>
                    <div className="flex items-center">
                         <input 
                            type="text" 
                            value={char.name} 
                            readOnly={char.isLinked} 
                            onChange={e => onUpdate(currentId, 'name', e.target.value)} 
                            className={`font-semibold text-white bg-transparent w-64 rounded px-1 border border-transparent focus:border-emerald-500 focus:ring-0 focus:bg-gray-800 focus:outline-none transition-colors ${char.isLinked ? 'cursor-not-allowed text-gray-400 focus:border-transparent' : ''}`} 
                            onMouseDown={e => e.stopPropagation()} 
                         />
                         <span className="text-[9px] text-gray-500 font-mono ml-2 truncate max-w-[120px]" title={String(currentId)}>({currentId})</span>
                    </div>
                </div>
                <div className="flex items-center space-x-1 flex-shrink-0">
                    <label className="text-xs text-gray-400 whitespace-nowrap">{t('node.content.characterIndex')}:</label>
                    <input
                        type="text"
                        value={char.index || ''}
                        readOnly={char.isLinked}
                        onChange={e => onUpdate(currentId, 'index', e.target.value)}
                        className={`font-semibold text-white bg-gray-800 w-24 rounded px-1 text-xs py-0.5 border border-transparent focus:border-emerald-500 focus:ring-0 focus:outline-none transition-colors ${char.isLinked ? 'bg-gray-900/50 text-gray-400 cursor-not-allowed focus:border-transparent' : ''}`}
                        onFocus={deselectAllNodes}
                        onMouseDown={e => e.stopPropagation()}
                    />
                    {onDelete && (
                        <ActionButton tooltipPosition="left" title={t('node.action.deleteItem')} onClick={(e) => { e.stopPropagation(); onDelete(currentId); }}>
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </ActionButton>
                    )}
                </div>
            </div>
            {!isCollapsed && (
                <>
                    <div className="space-y-1 mb-2">
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('node.content.imagePrompt')}</label>
                        <textarea value={char.imagePrompt || char.prompt || ''} onChange={e => onUpdate(currentId, 'imagePrompt', e.target.value)} readOnly={char.isLinked} className={`w-full text-xs p-2 bg-gray-900 border-none rounded-md resize-y min-h-[60px] focus:outline-none focus:ring-1 focus:ring-emerald-500 custom-scrollbar overflow-y-scroll ${char.isLinked ? 'bg-gray-900/50 text-gray-400 cursor-not-allowed' : ''}`} onWheel={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()} />
                    </div>
                    <EditableCharacterDescription fullDescription={char.fullDescription || ''} onDescriptionChange={newDesc => onUpdate(currentId, 'fullDescription', newDesc)} readOnly={char.isLinked} t={t} onFocus={deselectAllNodes} />
                </>
            )}
        </div>
    );
});

interface CharactersPanelProps {
    uiState: AnalyzerUiState;
    initialHeight: number;
    onHeightChange: (h: number) => void;
    scale: number;
    onUpdateUiState: (updates: Partial<AnalyzerUiState>) => void;
    onUpdateValue: (updates: any) => void;
    onApplyAliases: (nodeId: string) => void;
    nodeId: string;
    autoIndexCharacters: boolean;
    charactersToDisplay: any[];
    selectedCharacters: Set<string | number>;
    collapsedCharacters: Set<string | number>;
    areAllCharactersCollapsed: boolean;
    onToggleAllCharacters: () => void;
    handleCharacterClick: (e: React.MouseEvent, id: string | number) => void;
    handleToggleCharacterCollapse: (id: string | number) => void;
    updateCharacter: (id: string | number, field: string, value: string) => void;
    visualStyle: string;
    upstreamVisualStyle: string;
    deselectAllNodes: () => void;
    t: (key: string) => string;
    onEmbedCharacter: (char: any) => void;
    onSyncCharacters?: () => void;
    onClearCharacters?: () => void;
    onDeleteCharacter?: (id: string | number) => void;
    isSyncAvailable?: boolean;
    onMoveCharacter?: (index: number, direction: 'up' | 'down' | 'top' | 'bottom') => void;
    onAddCharacter?: () => void;
}

export const CharactersPanel: React.FC<CharactersPanelProps> = React.memo(({
    uiState, initialHeight, onHeightChange, scale, onUpdateUiState, onUpdateValue, onApplyAliases, nodeId, autoIndexCharacters,
    charactersToDisplay, selectedCharacters, collapsedCharacters, areAllCharactersCollapsed, onToggleAllCharacters, handleCharacterClick, handleToggleCharacterCollapse, updateCharacter,
    visualStyle, upstreamVisualStyle, deselectAllNodes, t, onEmbedCharacter, onSyncCharacters, onClearCharacters, onDeleteCharacter, isSyncAvailable, onMoveCharacter, onAddCharacter
}) => {
    const [isResizerHovered, setIsResizerHovered] = useState(false);
    
    // Internal state for smooth dragging
    const [height, setHeight] = useState(initialHeight || 200);

    // Sync internal state with prop (e.g. from undo/redo or external change)
    useEffect(() => {
        if (Math.abs(initialHeight - height) > 1) {
            setHeight(initialHeight || 200);
        }
    }, [initialHeight]);

    const handleResize = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        const startY = e.clientY;
        const startHeight = height;
        let currentHeight = startHeight;
        
        const handleMouseMove = (moveEvent: MouseEvent) => {
            moveEvent.preventDefault();
            moveEvent.stopPropagation();
            const dy = (moveEvent.clientY - startY) / scale;
            currentHeight = Math.max(100, Math.min(800, startHeight + dy));
            setHeight(currentHeight); 
        };

        const handleMouseUp = (upEvent: MouseEvent) => {
            upEvent.preventDefault();
            upEvent.stopPropagation();
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            onHeightChange(currentHeight); // Save to parent state on release
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const allCharacters = useMemo(() => {
         const rawChars = charactersToDisplay || [];
         
         // Enforce sorting by Index (e.g., Entity-1, Entity-2, Entity-10)
         return [...rawChars].sort((a, b) => {
             const getNum = (str: string) => {
                 const match = (str || '').match(/(\d+)/);
                 return match ? parseInt(match[1], 10) : 99999;
             };
             
             // Prioritize index
             const idxA = a.index || '';
             const idxB = b.index || '';
             
             return getNum(idxA) - getNum(idxB);
         });
    }, [charactersToDisplay]);

    const nameCounts: Record<string, number> = {};
    allCharacters.forEach(c => {
        const name = (c.name || '').trim().toLowerCase();
        nameCounts[name] = (nameCounts[name] || 0) + 1;
    });

    return (
        <div 
            style={{ height: uiState.isCharStyleCollapsed ? 'auto' : `${height}px` }} 
            className={`flex-shrink-0 mb-1 bg-gray-900 rounded-md border ${isResizerHovered ? 'border-emerald-500' : 'border-gray-700'} hover:border-gray-400 overflow-hidden flex flex-col transition-all duration-200 relative`}
        >
            <div 
                className="flex justify-between items-center p-2 bg-gray-800/50 cursor-pointer select-none hover:bg-gray-700/50 transition-colors flex-shrink-0"
                onClick={() => onUpdateUiState({ isCharStyleCollapsed: !uiState.isCharStyleCollapsed })}
            >
                <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                    <h3 className="font-bold text-gray-400 select-none transition-colors uppercase text-xs tracking-wider">{t('node.content.characters')}</h3>

                    {isSyncAvailable && onSyncCharacters && (
                        <Tooltip title={t('node.action.refreshData')} position="top">
                            <button 
                                onClick={(e) => { e.stopPropagation(); onSyncCharacters(); }}
                                className="p-1 hover:bg-gray-700 rounded text-emerald-400 hover:text-emerald-300 transition-colors ml-1"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </button>
                        </Tooltip>
                    )}
                </div>

                <div className="flex items-center space-x-1">
                    <Tooltip title={areAllCharactersCollapsed ? t('node.action.expandAll') : t('node.action.collapseAll')} position="top">
                        <button 
                            onClick={(e) => { e.stopPropagation(); onToggleAllCharacters(); }}
                            disabled={uiState.isCharStyleCollapsed}
                            className={`p-1 rounded transition-colors ${uiState.isCharStyleCollapsed ? 'text-gray-600 cursor-default' : 'hover:bg-gray-700 text-emerald-400 hover:text-emerald-300'}`}
                        >
                            {areAllCharactersCollapsed ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" /></svg>
                            )}
                        </button>
                    </Tooltip>

                    {onAddCharacter && (
                        <ActionButton tooltipPosition="left" title={t('node.action.addCharacter')} onClick={(e) => { e.stopPropagation(); onAddCharacter(); }}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                        </ActionButton>
                    )}
                    
                    {onClearCharacters && (
                         <ActionButton
                             tooltipPosition="left"
                             title={t('node.action.clear')}
                             onClick={(e) => { e.stopPropagation(); onClearCharacters(); }}
                         >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </ActionButton>
                     )}
                    
                     <Tooltip title={t('node.action.index')} position="left">
                         <button 
                            onClick={(e) => { e.stopPropagation(); onApplyAliases(nodeId); }}
                            className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-gray-200 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </button>
                    </Tooltip>

                    <div className="flex items-center space-x-2 pl-1" onClick={(e) => e.stopPropagation()}>
                        <CustomCheckbox
                            id={`auto-index-${nodeId}`} 
                            checked={autoIndexCharacters} 
                            onChange={(checked) => onUpdateValue({ autoIndexCharacters: checked })} 
                            className="h-3.5 w-3.5"
                        />
                        <label htmlFor={`auto-index-${nodeId}`} className="text-[10px] font-medium text-gray-400 cursor-pointer select-none uppercase tracking-wide">
                            {t('node.content.autoIndexCharacters')}
                        </label>
                    </div>

                    <div className="pl-1 border-l border-gray-700 ml-1">
                        <ActionButton tooltipPosition="left" title={uiState.isCharStyleCollapsed ? t('node.action.expand') : t('node.action.collapse')} onClick={(e) => { e.stopPropagation(); onUpdateUiState({ isCharStyleCollapsed: !uiState.isCharStyleCollapsed }); }}>
                            {uiState.isCharStyleCollapsed ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                                </svg>
                            )}
                        </ActionButton>
                    </div>
                </div>
            </div>
            
            {!uiState.isCharStyleCollapsed && (
                <div style={{ contentVisibility: 'auto' }} className="p-2 space-y-2 overflow-y-auto custom-scrollbar flex-grow" onWheel={e => e.stopPropagation()}>
                {allCharacters.map((char: any, index: number) => {
                    const charId = char.id || `char-idx-${index}`;
                    const hasDuplicateName = nameCounts[(char.name || '').trim().toLowerCase()] > 1;
                    return (
                        <div key={charId} className={hasDuplicateName ? "border-red-500 border rounded-lg" : ""}>
                            {hasDuplicateName && <div className="text-[10px] text-red-400 bg-red-900/30 px-2 py-0.5 rounded-t-lg">Duplicate Name Warning</div>}
                            <AnalyzerCharacterItem
                                char={char}
                                currentId={charId}
                                isSelected={selectedCharacters.has(charId)}
                                isCollapsed={collapsedCharacters.has(charId)}
                                t={t}
                                onToggleCollapse={handleToggleCharacterCollapse}
                                onClick={handleCharacterClick}
                                onUpdate={updateCharacter}
                                onEmbed={onEmbedCharacter}
                                onDelete={onDeleteCharacter}
                                deselectAllNodes={deselectAllNodes}
                            />
                        </div>
                    );
                })}
                </div>
            )}
            
            {!uiState.isCharStyleCollapsed && (
                <div 
                    className="absolute bottom-0 inset-x-0 h-3 cursor-ns-resize bg-transparent z-20"
                    onMouseDown={handleResize}
                    onMouseEnter={() => setIsResizerHovered(true)}
                    onMouseLeave={() => setIsResizerHovered(false)}
                />
            )}
        </div>
    );
});
