
import React, { useState } from 'react';
import { ActionButton } from '../../ActionButton';
import Tooltip from '../../ui/Tooltip';

const SceneItem: React.FC<{
    scene: any;
    index: number;
    isSelected: boolean;
    isCollapsed: boolean;
    narratorEnabled: boolean;
    isModifying: boolean;
    t: (key: string) => string;
    onToggleCollapse: (index: number) => void;
    onClick: (e: React.MouseEvent, index: number) => void;
    onUpdate: (index: number, field: string, value: any) => void;
    onDelete: (index: number) => void;
    onAddAfter: (index: number) => void;
    onMove: (index: number, direction: 'up' | 'down') => void;
    onModifyScriptPart: (partId: string, original: string, modPrompt: string) => void;
    deselectAllNodes: () => void;
}> = React.memo(({ scene, index, isSelected, isCollapsed, narratorEnabled, isModifying, t, onToggleCollapse, onClick, onUpdate, onDelete, onAddAfter, onMove, onModifyScriptPart, deselectAllNodes }) => {
    const [modPrompt, setModPrompt] = useState('');
    
    // Determine the display title
    const displayTitle = scene.title?.startsWith(`${t('node.content.scene')} ${index + 1}`) 
        ? scene.title 
        : `${t('node.content.scene')} ${index + 1}: ${scene.title || ''}`;

    const handleAddCharacter = (e: React.MouseEvent) => {
        e.stopPropagation();
        const currentChars = Array.isArray(scene.characters) ? scene.characters : [];
        
        // Find max index to auto-increment
        let maxNum = 0;
        currentChars.forEach((c: string) => {
            const match = c.match(/(\d+)/);
            if (match) maxNum = Math.max(maxNum, parseInt(match[1], 10));
        });
        
        const newChars = [...currentChars, `Entity-${maxNum + 1}`];
        onUpdate(index, 'characters', newChars);
    };

    const handleCharacterIndexChange = (charIndex: number, delta: number) => {
        const currentChars = [...(Array.isArray(scene.characters) ? scene.characters : [])];
        const charStr = currentChars[charIndex];
        
        // Extract number
        const match = charStr.match(/(\d+)/);
        let num = match ? parseInt(match[1], 10) : 0;
        
        // Update number
        const newNum = Math.max(1, num + delta);
        
        // Preserve prefix logic slightly or enforce Entity- format
        // For Script Generator output, Entity-N is the standard
        currentChars[charIndex] = `Entity-${newNum}`;
        onUpdate(index, 'characters', currentChars);
    };

    const handleDeleteCharacter = (charIndex: number) => {
         const currentChars = [...(Array.isArray(scene.characters) ? scene.characters : [])];
         currentChars.splice(charIndex, 1);
         onUpdate(index, 'characters', currentChars);
    };

    return (
        <div className={`bg-gray-800 rounded-lg p-3 mb-2 space-y-2 border-2 ${isSelected ? 'border-emerald-500' : 'border-transparent'} transition-colors shadow-sm`} onClick={(e) => onClick(e, index)}>
            <div className="flex justify-between items-center cursor-pointer" onClick={(e) => { if (!(e.target as HTMLElement).closest('input, button')) onToggleCollapse(index); }}>
                <div className="flex items-center space-x-2 flex-grow min-w-0">
                    <div className="flex flex-col min-w-0">
                        <span className="font-bold text-white truncate text-sm" title={displayTitle}>{displayTitle}</span>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {scene.recommendedFrames !== undefined && (
                                <span className="text-[9px] text-emerald-400 font-mono uppercase tracking-wider bg-emerald-900/30 px-1 rounded whitespace-nowrap">
                                    {t('node.content.recommendedFrames')}: {scene.recommendedFrames}
                                </span>
                            )}
                            
                            {/* Editable Character Badges */}
                            <div className="flex items-center gap-1 flex-wrap">
                                {(Array.isArray(scene.characters) ? scene.characters : []).map((char: string, charIdx: number) => {
                                    const match = char.match(/(?:Entity|Character|Персонаж)[-\s]?(\d+)/i);
                                    const displayVal = match ? `ENT-${match[1]}` : char;
                                    
                                    return (
                                        <div 
                                            key={`${index}-${charIdx}`}
                                            className="relative group/char"
                                        >
                                            <Tooltip title="Scroll/Arrows to change. Shift+Click to delete." position="top">
                                                <input
                                                    type="text"
                                                    value={displayVal}
                                                    readOnly
                                                    className="text-[9px] text-cyan-300 font-mono uppercase tracking-wider bg-cyan-900/30 px-1 rounded w-12 text-center border border-transparent focus:border-cyan-500 focus:outline-none cursor-text select-none"
                                                    onClick={(e) => e.stopPropagation()}
                                                    onWheel={(e) => {
                                                        e.stopPropagation();
                                                        e.preventDefault();
                                                        const delta = e.deltaY < 0 ? 1 : -1;
                                                        handleCharacterIndexChange(charIdx, delta);
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            handleCharacterIndexChange(charIdx, 1);
                                                        }
                                                        if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            handleCharacterIndexChange(charIdx, -1);
                                                        }
                                                    }}
                                                    onMouseDown={(e) => {
                                                        if (e.shiftKey) {
                                                            e.stopPropagation();
                                                            e.preventDefault();
                                                            handleDeleteCharacter(charIdx);
                                                        }
                                                    }}
                                                />
                                            </Tooltip>
                                        </div>
                                    );
                                })}
                                
                                {/* Add Character Button */}
                                <Tooltip title="Add Character (ENT-N)" position="top">
                                    <button
                                        onClick={handleAddCharacter}
                                        className="text-[9px] text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 px-1.5 rounded transition-colors font-bold h-4 flex items-center justify-center"
                                    >
                                        +
                                    </button>
                                </Tooltip>
                            </div>
                        </div>
                    </div>
                </div>
                 <div className="flex items-center space-x-1 flex-shrink-0">
                    <ActionButton tooltipPosition="left" title={t('node.action.addScene')} onClick={(e) => { e.stopPropagation(); onAddAfter(index); }}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg></ActionButton>
                    <ActionButton tooltipPosition="left" title={t('node.action.moveUp')} onClick={(e) => { e.stopPropagation(); onMove(index, 'up'); }}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg></ActionButton>
                    <ActionButton tooltipPosition="left" title={t('node.action.moveDown')} onClick={(e) => { e.stopPropagation(); onMove(index, 'down'); }}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg></ActionButton>
                    <ActionButton tooltipPosition="left" title={t('node.action.deleteItem')} onClick={(e) => { e.stopPropagation(); onDelete(index); }}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></ActionButton>
                    
                    <div className="pl-1 border-l border-gray-700 ml-1">
                        <ActionButton tooltipPosition="left" title={isCollapsed ? t('node.action.expandScene') : t('node.action.collapseScene')} onClick={(e) => { e.stopPropagation(); onToggleCollapse(index); }}>
                            {isCollapsed ? (<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>) : (<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>)}
                        </ActionButton>
                    </div>
                </div>
            </div>
            
             {!isCollapsed && (
                <div className="space-y-2 pt-2 border-t border-gray-700/50">
                     <div className="space-y-1">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <label className="text-xs font-medium text-gray-400">{t('node.content.sceneDescription')}</label>
                                <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-gray-500 uppercase">{t('node.content.recommendedFrames')}:</span>
                                    <input 
                                        type="number" 
                                        min="1"
                                        value={scene.recommendedFrames || ''}
                                        onChange={(e) => onUpdate(index, 'recommendedFrames', parseInt(e.target.value, 10) || 0)}
                                        className="bg-gray-900 border border-gray-700 text-emerald-400 text-[10px] w-10 px-1 rounded focus:outline-none focus:border-emerald-500"
                                        onMouseDown={e => e.stopPropagation()}
                                    />
                                </div>
                            </div>
                             <ActionButton tooltipPosition="left" title={t('node.action.copy')} onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(scene.description); }}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                            </ActionButton>
                        </div>
                        <textarea
                            value={scene.description}
                            onChange={(e) => onUpdate(index, 'description', e.target.value)}
                            className="w-full text-sm p-2 bg-gray-900 border-none rounded-md resize-y min-h-[80px] focus:outline-none focus:ring-1 focus:ring-emerald-500 custom-scrollbar overflow-y-scroll"
                            onWheel={e => e.stopPropagation()}
                            onFocus={deselectAllNodes}
                        />
                        <div className="flex gap-1">
                            <input 
                                type="text" 
                                value={modPrompt} 
                                onChange={(e) => setModPrompt(e.target.value)} 
                                placeholder={t('node.content.modificationPromptPlaceholder')} 
                                className="flex-grow bg-gray-800 text-xs rounded px-2 py-1 border border-gray-700 focus:border-emerald-500 outline-none text-gray-300"
                                onMouseDown={e => e.stopPropagation()}
                            />
                            <button 
                                onClick={(e) => { e.stopPropagation(); onModifyScriptPart(`scene-${index}-description`, scene.description, modPrompt); setModPrompt(''); }}
                                disabled={!modPrompt.trim() || isModifying}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-2 py-1 rounded disabled:opacity-50"
                            >
                                {isModifying ? <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                            </button>
                        </div>
                     </div>

                     {narratorEnabled && (
                         <div className="space-y-1">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-medium text-emerald-400">{t('node.content.narrator')}</label>
                                 <ActionButton tooltipPosition="left" title={t('node.action.copy')} onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(scene.narratorText || ''); }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                                </ActionButton>
                            </div>
                            <textarea
                                value={scene.narratorText || ''}
                                onChange={(e) => onUpdate(index, 'narratorText', e.target.value)}
                                className="w-full text-sm p-2 bg-gray-900 border-none rounded-md resize-y min-h-[60px] focus:outline-none focus:ring-1 focus:ring-emerald-500 custom-scrollbar overflow-y-scroll text-gray-300 italic"
                                onWheel={e => e.stopPropagation()}
                                onFocus={deselectAllNodes}
                            />
                         </div>
                     )}
                </div>
             )}
        </div>
    );
});

export const ScenesPanel: React.FC<{
    isScenesSectionCollapsed: boolean;
    areAllScenesCollapsed: boolean;
    scenes: any[];
    selectedScenes: Set<number>;
    collapsedScenes: number[];
    narratorEnabled: boolean;
    isModifyingScriptPart: string | null;
    nodeId: string;
    t: (key: string) => string;
    handleUiStateUpdate: (updates: any) => void;
    addScene: () => void;
    handleToggleAllScenes: () => void;
    handleSceneClick: (e: React.MouseEvent, index: number) => void;
    handleToggleSceneCollapse: (index: number) => void;
    updateScene: (index: number, field: string, value: any) => void;
    deleteScene: (index: number) => void;
    addSceneAfter: (index: number) => void;
    moveScene: (index: number, direction: 'up' | 'down') => void;
    onModifyScriptPart: (partId: string, original: string, modPrompt: string) => void;
    deselectAllNodes: () => void;
    onClearScenes: () => void;
}> = ({
    isScenesSectionCollapsed, areAllScenesCollapsed, scenes, selectedScenes, collapsedScenes, narratorEnabled, isModifyingScriptPart, nodeId, t,
    handleUiStateUpdate, addScene, handleToggleAllScenes, handleSceneClick, handleToggleSceneCollapse, updateScene, deleteScene, addSceneAfter, moveScene, onModifyScriptPart, deselectAllNodes, onClearScenes
}) => {
    return (
        <div className="flex-shrink-0 mb-1 bg-gray-900 rounded-md border border-gray-700 hover:border-emerald-500 overflow-hidden flex flex-col transition-all duration-200">
            <div
                className="flex justify-between items-center p-2 bg-gray-800/50 cursor-pointer select-none hover:bg-gray-700/50 transition-colors"
                onClick={() => handleUiStateUpdate({ isScenesSectionCollapsed: !isScenesSectionCollapsed })}
            >
                <div className="flex items-center space-x-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                    </svg>
                    <h3 className="font-bold text-emerald-400 select-none transition-colors uppercase text-xs tracking-wider">{t('node.content.scenes')}</h3>
                </div>
                <div className="flex items-center space-x-1">
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleToggleAllScenes(); }}
                        disabled={isScenesSectionCollapsed}
                        className={`p-1 rounded transition-colors ${isScenesSectionCollapsed ? 'text-gray-600 cursor-default' : 'hover:bg-gray-700 text-emerald-400 hover:text-emerald-300'}`}
                        title={areAllScenesCollapsed ? t('node.action.expandAll') : t('node.action.collapseAll')}
                    >
                        {areAllScenesCollapsed ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" /></svg>
                        )}
                    </button>

                    <ActionButton tooltipPosition="left" title={t('node.action.addScene')} onClick={(e) => { e.stopPropagation(); addScene(); }}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg></ActionButton>
                    
                    <ActionButton tooltipPosition="left" title={t('node.action.clear')} onClick={(e) => { e.stopPropagation(); onClearScenes(); }}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </ActionButton>

                    <div className="pl-1 border-l border-gray-700 ml-1">
                        <ActionButton tooltipPosition="left" title={isScenesSectionCollapsed ? t('node.action.expand') : t('node.action.collapse')} onClick={(e) => { e.stopPropagation(); handleUiStateUpdate({ isScenesSectionCollapsed: !isScenesSectionCollapsed }); }}>
                            {isScenesSectionCollapsed ? (
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
            
            {!isScenesSectionCollapsed && (
                <div style={{ contentVisibility: 'auto' }} className="p-2 space-y-2">
                {scenes.map((scene, index) => (
                    <SceneItem
                        key={index}
                        scene={scene}
                        index={index}
                        isSelected={selectedScenes.has(index)}
                        isCollapsed={collapsedScenes.includes(index)}
                        narratorEnabled={narratorEnabled}
                        isModifying={isModifyingScriptPart === `${nodeId}/scene-${index}-description`}
                        t={t}
                        onToggleCollapse={handleToggleSceneCollapse}
                        onClick={handleSceneClick}
                        onUpdate={updateScene}
                        onDelete={deleteScene}
                        onAddAfter={addSceneAfter} 
                        onMove={moveScene}
                        onModifyScriptPart={onModifyScriptPart}
                        deselectAllNodes={deselectAllNodes}
                    />
                ))}
                </div>
            )}
        </div>
    );
};
