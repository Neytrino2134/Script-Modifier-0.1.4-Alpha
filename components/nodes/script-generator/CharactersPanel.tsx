
import React, { useState, useEffect } from 'react';
import { ActionButton } from '../../ActionButton';
import { EditableCharacterDescription } from './EditableCharacterDescription';
import { GeneratorUiState } from './types';
import CustomCheckbox from '../../ui/CustomCheckbox';
import Tooltip from '../../ui/Tooltip';

const CharacterItem: React.FC<{
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
    onDetach?: (char: any) => void;
    onMove?: (index: number, direction: 'up' | 'down' | 'top' | 'bottom') => void;
    index: number;
    isFirst: boolean;
    isLast: boolean;
    hasDuplicateIndex: boolean;
}> = React.memo(({ char, currentId, isSelected, isCollapsed, t, onClick, onToggleCollapse, onUpdate, deselectAllNodes, onEmbed, onDelete, onDetach, onMove, index, isFirst, isLast, hasDuplicateIndex }) => {
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
                            onFocus={deselectAllNodes}
                         />
                         <span className="text-[9px] text-gray-500 font-mono ml-2 opacity-50 select-none">#{String(currentId)}</span>
                    </div>
                </div>
                <div className="flex items-center space-x-1 flex-shrink-0">
                    <label className="text-xs text-gray-400 whitespace-nowrap">{t('node.content.characterIndex')}:</label>
                    <input
                        type="text"
                        value={char.index || char.alias || ''}
                        readOnly={true}
                        className={`font-semibold text-gray-400 bg-gray-900/50 w-24 rounded px-1 text-xs py-0.5 border border-transparent cursor-not-allowed focus:outline-none focus:ring-0 ${hasDuplicateIndex ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                        onFocus={deselectAllNodes}
                        onMouseDown={e => e.stopPropagation()}
                    />
                    
                    {/* Detach/Embed */}
                    {char.isLinked ? (
                        <ActionButton tooltipPosition="left" title={t('node.action.embedCharacter')} onClick={(e) => { e.stopPropagation(); onEmbed(char); }}>
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        </ActionButton>
                    ) : (
                        onDetach && (
                            <ActionButton tooltipPosition="left" title="Detach to Character Card Node" onClick={(e) => { e.stopPropagation(); onDetach(char); }}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                            </ActionButton>
                        )
                    )}

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
                        <textarea 
                            value={char.prompt || ''} 
                            onChange={e => onUpdate(currentId, 'prompt', e.target.value)} 
                            readOnly={char.isLinked} 
                            className={`w-full text-xs p-2 bg-gray-900 border-none rounded-md resize-y min-h-[60px] focus:outline-none focus:ring-1 focus:ring-emerald-500 custom-scrollbar overflow-y-scroll ${char.isLinked ? 'bg-gray-900/50 text-gray-400 cursor-not-allowed' : ''}`} 
                            onWheel={e => e.stopPropagation()} 
                            onMouseDown={e => e.stopPropagation()} 
                            onFocus={deselectAllNodes}
                        />
                    </div>
                    <EditableCharacterDescription fullDescription={char.fullDescription || ''} onDescriptionChange={newDesc => onUpdate(currentId, 'fullDescription', newDesc)} readOnly={char.isLinked} t={t} onFocus={deselectAllNodes} />
                </>
            )}
        </div>
    );
});

interface CharactersPanelProps {
    uiState: GeneratorUiState;
    onUpdateUiState: (updates: Partial<GeneratorUiState>) => void;
    onUpdateValue: (updates: any) => void;
    isCharactersSectionCollapsed: boolean;
    onDetachCharacter?: (char: any) => void;
    initialHeight?: number;
    onHeightChange?: (h: number) => void;
    scale?: number;
    nodeId?: string;
    autoIndexCharacters?: boolean;
    charactersToDisplay?: any[];
    allCharacters: any[];
    selectedCharacters: Set<string | number>;
    collapsedCharacters: string[];
    areAllCharactersCollapsed: boolean;
    onToggleAllCharacters?: () => void;
    handleToggleAllCharacters: () => void;
    handleCharacterClick: (e: React.MouseEvent, id: string | number) => void;
    handleToggleCharacterCollapse: (id: string | number) => void;
    updateCharacter: (id: string | number, field: string, value: string) => void;
    deleteCharacter: (id: string | number) => void;
    onAddCharacter: () => void;
    handleEmbedCharacter: (char: any) => void;
    deselectAllNodes: () => void;
    t: (key: string) => string;
    onSyncCharacters?: () => void;
    isSyncAvailable?: boolean;
    onMoveCharacter: (index: number, direction: 'up' | 'down' | 'top' | 'bottom') => void;
    onClearCharacters: () => void;
}

export const CharactersPanel: React.FC<CharactersPanelProps> = React.memo(({
    uiState, onUpdateUiState, onUpdateValue,
    isCharactersSectionCollapsed,
    allCharacters, selectedCharacters, collapsedCharacters, areAllCharactersCollapsed,
    handleToggleAllCharacters, handleCharacterClick, handleToggleCharacterCollapse,
    updateCharacter, deleteCharacter, onAddCharacter, handleEmbedCharacter,
    deselectAllNodes, t, onDetachCharacter, onMoveCharacter, onClearCharacters
}) => {
    
    // Calculate duplicate indices
    const indexCounts: Record<string, number> = {};
    allCharacters.forEach(c => {
        const idx = (c.index || c.alias || '').trim().toLowerCase();
        indexCounts[idx] = (indexCounts[idx] || 0) + 1;
    });

    const nameCounts: Record<string, number> = {};
    allCharacters.forEach(c => {
        const name = (c.name || '').trim().toLowerCase();
        nameCounts[name] = (nameCounts[name] || 0) + 1;
    });

    return (
        <div 
            className={`flex-shrink-0 mb-1 bg-gray-900 rounded-md border border-gray-700 hover:border-emerald-500 overflow-hidden flex flex-col transition-all duration-200 relative`}
        >
            <div 
                className="flex justify-between items-center p-2 bg-gray-800/50 cursor-pointer select-none hover:bg-gray-700/50 transition-colors flex-shrink-0"
                onClick={() => onUpdateUiState({ isCharactersSectionCollapsed: !isCharactersSectionCollapsed })}
            >
                <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                    <h3 className="font-bold text-emerald-400 select-none transition-colors uppercase text-xs tracking-wider">{t('node.content.characters')}</h3>
                </div>

                <div className="flex items-center space-x-1">
                    <Tooltip title={areAllCharactersCollapsed ? t('node.action.expandAll') : t('node.action.collapseAll')} position="top">
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleToggleAllCharacters(); }}
                            disabled={isCharactersSectionCollapsed}
                            className={`p-1 rounded transition-colors ${isCharactersSectionCollapsed ? 'text-gray-600 cursor-default' : 'hover:bg-gray-700 text-emerald-400 hover:text-emerald-300'}`}
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

                    <div className="pl-1 border-l border-gray-700 ml-1">
                        <ActionButton tooltipPosition="left" title={isCharactersSectionCollapsed ? t('node.action.expand') : t('node.action.collapse')} onClick={(e) => { e.stopPropagation(); onUpdateUiState({ isCharactersSectionCollapsed: !isCharactersSectionCollapsed }); }}>
                            {isCharactersSectionCollapsed ? (
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
            
            {!isCharactersSectionCollapsed && (
                <div style={{ contentVisibility: 'auto' }} className="p-2 space-y-2 overflow-y-auto custom-scrollbar flex-grow" onWheel={e => e.stopPropagation()}>
                {allCharacters.map((char: any, index: number) => {
                    const charId = char.id || `char-idx-${index}`;
                    const hasDuplicateName = nameCounts[(char.name || '').trim().toLowerCase()] > 1;
                    const charIndexVal = (char.index || char.alias || '').trim().toLowerCase();
                    const hasDuplicateIndex = indexCounts[charIndexVal] > 1;

                    return (
                        <div key={charId} className={hasDuplicateName ? "border-red-500 border rounded-lg" : ""}>
                            {hasDuplicateName && <div className="text-[10px] text-red-400 bg-red-900/30 px-2 py-0.5 rounded-t-lg">Duplicate Name Warning</div>}
                            <CharacterItem
                                char={char}
                                index={index}
                                currentId={charId}
                                isSelected={selectedCharacters.has(charId)}
                                isCollapsed={collapsedCharacters.includes(String(charId))}
                                t={t}
                                onToggleCollapse={handleToggleCharacterCollapse}
                                onClick={handleCharacterClick}
                                onUpdate={updateCharacter}
                                onDelete={deleteCharacter}
                                onDetach={onDetachCharacter}
                                onEmbed={handleEmbedCharacter}
                                onMove={onMoveCharacter}
                                deselectAllNodes={deselectAllNodes}
                                isFirst={index === 0}
                                isLast={index === allCharacters.length - 1}
                                hasDuplicateIndex={hasDuplicateIndex}
                            />
                        </div>
                    );
                })}
                </div>
            )}
        </div>
    );
});
