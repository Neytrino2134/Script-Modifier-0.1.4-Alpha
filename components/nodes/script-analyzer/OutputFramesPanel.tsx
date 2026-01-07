
import React, { useState } from 'react';
import { ActionButton } from '../../ActionButton';
import { AnalyzedCharacter, EditableFramePart } from './types';
import { CharacterIndexControl } from './CharacterIndexControl';

const AnalyzerFrameItem: React.FC<{
    frame: any;
    sceneIndex: number;
    frameIndex: number;
    frameUniqueId: string;
    isSelected: boolean;
    isCollapsed: boolean;
    availableCharacters: AnalyzedCharacter[];
    t: (key: string) => string;
    onClick: (e: React.MouseEvent, id: string) => void;
    onToggleCollapse: (id: string) => void;
    onUpdate: (sceneIdx: number, frameIdx: number, partKey: any, value: any) => void;
    onAddFrame: (sceneIdx: number, frameIdx?: number) => void;
    onReorder: (sceneIdx: number, frameIdx: number, dir: 'up' | 'down') => void;
    onDelete: (sceneIdx: number, frameIdx: number) => void;
    onCopy: (text: string) => void;
    handleTextFocus: () => void;
}> = React.memo(({ frame, sceneIndex, frameIndex, frameUniqueId, isSelected, isCollapsed, availableCharacters, t, onClick, onToggleCollapse, onUpdate, onAddFrame, onReorder, onDelete, onCopy, handleTextFocus }) => {
    
    const charList = (frame.characters || []).map((c: string) => {
        // Direct index match (e.g. Entity-1)
        const match = c.match(/(?:Entity|Character|Персонаж)[-\s]?(\d+)/i);
        if (match) return `ENT-${match[1]}`;
        
        // Lookup by name if alias not directly used in the frame data
        const found = availableCharacters.find(ac => ac.name === c);
        if (found) {
             // Prefer index if available, fall back to alias (legacy), then match name
             const sourceIndex = found.index || (found as any).alias;
             if (sourceIndex) {
                 const aliasMatch = sourceIndex.match(/(?:Entity|Character|Персонаж)[-\s]?(\d+)/i);
                 if (aliasMatch) return `ENT-${aliasMatch[1]}`;
                 return sourceIndex;
             }
        }
        return c; // Fallback to raw string
    });
    const charString = charList.length > 0 ? charList.join(', ') : 'NONE';
    const shotLabel = frame.shotType ? ` [${frame.shotType}]` : '';
    const title = `F${frame.frameNumber}-S${frame.sceneNumber || (sceneIndex + 1)}: ${charString}${shotLabel} (${frame.duration}s)`;

    return (
        <div className={`bg-gray-800 rounded-lg p-2 space-y-2 border ${isSelected ? 'border-emerald-500' : 'border-gray-700'} cursor-pointer`} onClick={(e) => onClick(e, frameUniqueId)}>
            <div className="flex justify-between items-center" onClick={(e) => { if (!(e.target as HTMLElement).closest('input, button')) onToggleCollapse(frameUniqueId); }}>
                <div className="flex items-center space-x-2 flex-grow min-w-0">
                    <ActionButton tooltipPosition="right" title={isCollapsed ? t('node.action.expandFrame') : t('node.action.collapseFrame')} onClick={(e) => { e.stopPropagation(); onToggleCollapse(frameUniqueId); }}>
                        {isCollapsed ? (<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>) : (<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>)}
                    </ActionButton>
                    <h4 className="font-bold text-white truncate pr-2 text-sm">{title}</h4>
                </div>
                <div className="flex items-center space-x-1">
                    <ActionButton tooltipPosition="left" title={t('node.action.addFrame')} onClick={(e) => { e.stopPropagation(); onAddFrame(sceneIndex, frameIndex); }}><svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg></ActionButton>
                    <ActionButton tooltipPosition="left" title={t('node.action.moveUp')} onClick={(e) => { e.stopPropagation(); onReorder(sceneIndex, frameIndex, 'up'); }}><svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg></ActionButton>
                    <ActionButton tooltipPosition="left" title={t('node.action.moveDown')} onClick={(e) => { e.stopPropagation(); onReorder(sceneIndex, frameIndex, 'down'); }}><svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg></ActionButton>
                    <ActionButton tooltipPosition="left" title={t('node.action.deleteItem')} onClick={(e) => { e.stopPropagation(); onDelete(sceneIndex, frameIndex); }}><svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></ActionButton>
                </div>
            </div>
            {!isCollapsed && (
                <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center justify-between bg-gray-900/50 p-1 rounded border border-gray-700 overflow-hidden">
                            <div className="flex items-center ml-1">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-gray-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <label className="text-[10px] font-bold text-gray-500 uppercase flex-shrink-0">время:</label>
                            </div>
                            <input 
                                type="number" 
                                value={frame.duration} 
                                onChange={e => onUpdate(sceneIndex, frameIndex, 'duration', parseInt(e.target.value) || 0)} 
                                className="w-10 p-0.5 bg-gray-800 text-white rounded text-[10px] border border-gray-600 outline-none focus:border-emerald-500 text-center" 
                                onFocus={handleTextFocus} 
                                onMouseDown={e => e.stopPropagation()} 
                            />
                        </div>
                        <div className="flex items-center justify-between bg-gray-900/50 p-1 rounded border border-gray-700 overflow-hidden">
                            <div className="flex items-center ml-1">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-gray-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                <label className="text-[10px] font-bold text-gray-500 uppercase flex-shrink-0">план:</label>
                            </div>
                            <input 
                                type="text"
                                value={frame.shotType || ''}
                                onChange={(e) => onUpdate(sceneIndex, frameIndex, 'shotType', e.target.value)}
                                placeholder="..."
                                className="w-14 p-0.5 bg-gray-800 text-white rounded text-[10px] border border-gray-600 outline-none focus:border-emerald-500 font-mono uppercase px-1 text-center"
                                onFocus={handleTextFocus} 
                                onMouseDown={e => e.stopPropagation()}
                            />
                        </div>
                    </div>
                    <div className="bg-gray-900/30 p-1.5 rounded border border-gray-700">
                        <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">{t('node.content.characters')}</label>
                        <CharacterIndexControl characters={frame.characters || []} onChange={(newChars) => onUpdate(sceneIndex, frameIndex, 'characters', newChars)} availableCharacters={availableCharacters} />
                    </div>
                    
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-emerald-500 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                <label className="text-xs font-medium text-emerald-400">{t('node.content.compositionAndBlocking')}</label>
                            </div>
                            <ActionButton tooltipPosition="left" title={t('node.action.copy')} onClick={(e) => { e.stopPropagation(); onCopy(frame.imagePrompt); }}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                            </ActionButton>
                        </div>
                        <textarea value={frame.imagePrompt} onChange={e => onUpdate(sceneIndex, frameIndex, 'imagePrompt', e.target.value)} className="w-full text-xs p-2 bg-gray-900 border-none rounded-md resize-y min-h-[60px] focus:outline-none focus:ring-1 focus:ring-emerald-500 custom-scrollbar" onFocus={handleTextFocus} onMouseDown={e => e.stopPropagation()} />
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <div className="flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-cyan-500 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    <label className="text-xs font-medium text-cyan-400">{t('node.content.environmentPrompt')}</label>
                                </div>
                                <ActionButton tooltipPosition="left" title={t('node.action.copy')} onClick={(e) => { e.stopPropagation(); onCopy(frame.environmentPrompt); }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                </ActionButton>
                            </div>
                            <textarea value={frame.environmentPrompt} onChange={e => onUpdate(sceneIndex, frameIndex, 'environmentPrompt', e.target.value)} className="w-full text-xs p-2 bg-gray-900 border-none rounded-md resize-y min-h-[40px] focus:outline-none focus:ring-1 focus:ring-emerald-500 custom-scrollbar" onFocus={handleTextFocus} onMouseDown={e => e.stopPropagation()} />
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <div className="flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-purple-500 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                    <label className="text-xs font-medium text-purple-400">{t('node.content.videoPrompt')}</label>
                                </div>
                                <ActionButton tooltipPosition="left" title={t('node.action.copy')} onClick={(e) => { e.stopPropagation(); onCopy(frame.videoPrompt); }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                </ActionButton>
                            </div>
                            <textarea value={frame.videoPrompt} onChange={e => onUpdate(sceneIndex, frameIndex, 'videoPrompt', e.target.value)} className="w-full text-xs p-2 bg-gray-900 border-none rounded-md resize-y min-h-[40px] focus:outline-none focus:ring-1 focus:ring-emerald-500 custom-scrollbar" onFocus={handleTextFocus} onMouseDown={e => e.stopPropagation()} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

interface OutputFramesPanelProps {
    width: string;
    scenes: any[];
    characters: any[];
    areAllOutputScenesCollapsed: boolean;
    areAllFramesCollapsed: boolean;
    collapsedOutputScenes: Set<number>;
    collapsedFrames: Set<string>;
    collapsedContexts: Set<number>;
    selectedFrames: Set<string>;
    onToggleAllOutputScenes: () => void;
    onToggleAllFramesCollapse: () => void;
    onToggleOutputSceneCollapse: (sceneIndex: number) => void;
    onToggleSceneContextCollapse: (sceneIndex: number) => void;
    onToggleCollapse: (frameUniqueId: string) => void;
    onAddFrame: (sceneIndex: number, frameIndex?: number) => void;
    onAddScene: () => void;
    onRenameScene: (sceneIndex: number, newTitle: string) => void;
    onReorderFrame: (sceneIndex: number, frameIndex: number, dir: 'up' | 'down') => void;
    onDeleteFrame: (sceneIndex: number, frameIndex: number) => void;
    onFramePartChange: (sceneIndex: number, frameIndex: number, partKey: EditableFramePart | 'characters' | 'duration', value: any) => void;
    onSceneContextChange: (sceneIndex: number, newValue: string) => void;
    onFrameClick: (e: React.MouseEvent, frameUniqueId: string) => void;
    onCopy: (text: string) => void;
    handleTextFocus: () => void;
    t: (key: string) => string;
    onDeleteScene: (sceneIndex: number) => void;
}

export const OutputFramesPanel: React.FC<OutputFramesPanelProps> = React.memo(({
    width, scenes, characters,
    areAllOutputScenesCollapsed, areAllFramesCollapsed,
    collapsedOutputScenes, collapsedFrames, collapsedContexts, selectedFrames,
    onToggleAllOutputScenes, onToggleAllFramesCollapse,
    onToggleOutputSceneCollapse, onToggleSceneContextCollapse, onToggleCollapse,
    onAddFrame, onAddScene, onRenameScene, onReorderFrame, onDeleteFrame, onFramePartChange, onSceneContextChange,
    onFrameClick, onCopy, handleTextFocus, t, onDeleteScene
}) => {
    const [editingSceneIndex, setEditingSceneIndex] = useState<number | null>(null);
    const [tempTitle, setTempTitle] = useState('');

    const startEditing = (index: number, currentTitle: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingSceneIndex(index);
        setTempTitle(currentTitle);
    };

    const saveTitle = (index: number) => {
        onRenameScene(index, tempTitle);
        setEditingSceneIndex(null);
    };

    const cancelEditing = () => {
        setEditingSceneIndex(null);
    };

    return (
        <div className="overflow-y-scroll custom-scrollbar pl-1 space-y-2 px-1 pb-1" style={{ width, contentVisibility: 'auto' }} onWheel={e => e.stopPropagation()}>
            <div className="flex justify-between items-center pr-2 sticky top-0 bg-gray-900 z-10 py-1 border-b border-gray-800/50 -mx-1 px-2">
                <h3 className="font-bold text-emerald-400 px-2">{t('node.content.frames')}</h3>
                <div className="flex items-center space-x-1">
                    {scenes.length === 0 && (
                         <ActionButton tooltipPosition="left" title={t('node.action.addFirstFrame')} onClick={(e) => { e.stopPropagation(); onAddScene(); }}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                        </ActionButton>
                    )}
                    {scenes.length > 0 && (
                        <>
                             <ActionButton tooltipPosition="left" title={t('node.action.addScene')} onClick={(e) => { e.stopPropagation(); onAddScene(); }}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                </svg>
                            </ActionButton>
                            <ActionButton tooltipPosition="left" title={areAllOutputScenesCollapsed ? t('node.action.expandAllScenes') : t('node.action.collapseAllScenes')} onClick={onToggleAllOutputScenes}>
                                {areAllOutputScenesCollapsed ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
                                )}
                            </ActionButton>
                            <ActionButton tooltipPosition="left" title={areAllFramesCollapsed ? t('node.action.expandAllFrames') : t('node.action.collapseAllFrames')} onClick={onToggleAllFramesCollapse} disabled={areAllOutputScenesCollapsed}>
                                {areAllFramesCollapsed ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${areAllOutputScenesCollapsed ? 'text-gray-600' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 13l-7 7-7-7m14-8l-7 7-7-7" /></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${areAllOutputScenesCollapsed ? 'text-gray-600' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 11l7-7 7 7M5 19l7-7 7 7" /></svg>
                                )}
                            </ActionButton>
                        </>
                    )}
                </div>
            </div>
            {scenes.map((scene, sceneIndex) => {
                const isSceneCollapsed = collapsedOutputScenes.has(sceneIndex);
                const isContextCollapsed = collapsedContexts.has(sceneIndex);
                const sceneTitle = scene.title || `Scene ${scene.sceneNumber}`;

                return (
                    <div key={scene.sceneNumber} className="mb-4">
                        <div 
                            className="group px-2 py-1 mb-1 text-xs font-bold text-gray-400 uppercase border-b border-gray-700 hover:bg-gray-800/50 transition-colors rounded" 
                            onClick={() => onToggleOutputSceneCollapse(sceneIndex)}
                        >
                            <div className="flex items-center justify-between w-full gap-2">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <ActionButton tooltipPosition="right" title={isSceneCollapsed ? t('node.action.expandScene') : t('node.action.collapseScene')} onClick={(e) => { e.stopPropagation(); onToggleOutputSceneCollapse(sceneIndex); }}>
                                        {isSceneCollapsed ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                                        )}
                                    </ActionButton>
                                    
                                    {editingSceneIndex === sceneIndex ? (
                                        <input
                                            type="text"
                                            value={tempTitle}
                                            onChange={(e) => setTempTitle(e.target.value)}
                                            onBlur={() => saveTitle(sceneIndex)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') saveTitle(sceneIndex); else if (e.key === 'Escape') cancelEditing(); }}
                                            onClick={(e) => e.stopPropagation()}
                                            onMouseDown={(e) => e.stopPropagation()}
                                            autoFocus
                                            className="bg-gray-900 text-white px-1 py-0.5 rounded border border-emerald-500 outline-none w-full font-bold"
                                        />
                                    ) : (
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="truncate font-bold text-gray-300 text-sm">
                                                {`${t('node.content.scene')} ${scene.sceneNumber}: ${scene.title || ''}`}
                                            </span>
                                            <button 
                                                onClick={(e) => startEditing(sceneIndex, scene.title || `Scene ${scene.sceneNumber}`, e)}
                                                className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-emerald-400 transition-opacity"
                                            >
                                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                </svg>
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <span className="flex-shrink-0 text-[9px] bg-gray-700 px-1.5 py-0.5 rounded text-gray-400 font-mono">{(scene.frames?.length || 0)} {t('node.content.frame_plural')}</span>
                                    <ActionButton tooltipPosition="left" title={t('node.action.addFrame')} onClick={(e) => {e.stopPropagation(); onAddFrame(sceneIndex);}}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                                    </ActionButton>
                                    <ActionButton tooltipPosition="left" title={t('node.action.deleteItem')} onClick={(e) => { e.stopPropagation(); onDeleteScene(sceneIndex); }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </ActionButton>
                                </div>
                            </div>
                        </div>
                        {!isSceneCollapsed && (
                            <div className="pl-2 space-y-2">
                                <div className="bg-gray-800 p-2 rounded-md border border-gray-700 mb-2">
                                    <div 
                                        className="flex justify-between items-center mb-1 cursor-pointer" 
                                        onClick={(e) => { 
                                            const target = e.target as HTMLElement;
                                            if (target && !target.closest('button')) {
                                                onToggleSceneContextCollapse(sceneIndex); 
                                            }
                                        }}
                                    >
                                        <div className="flex items-center space-x-1">
                                             <ActionButton 
                                                tooltipPosition="right" 
                                                title={isContextCollapsed ? t('node.action.expand') : t('node.action.collapse')} 
                                                onClick={(e) => { e.stopPropagation(); onToggleSceneContextCollapse(sceneIndex); }}
                                            >
                                                {isContextCollapsed ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                                                )}
                                            </ActionButton>
                                            <label className="text-xs font-bold text-emerald-400 cursor-pointer select-none">{t('node.content.sceneContext')}</label>
                                        </div>
                                        <ActionButton tooltipPosition="left" title={t('node.action.copy')} onClick={(e) => { e.stopPropagation(); onCopy(scene.sceneContext || ''); }}>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                        </ActionButton>
                                    </div>
                                    {!isContextCollapsed && (
                                        <textarea 
                                            value={scene.sceneContext || ''} 
                                            onChange={(e) => onSceneContextChange(sceneIndex, e.target.value)} 
                                            className="w-full text-xs p-2 bg-gray-900 border-none rounded-md resize-y min-h-[50px] focus:outline-none focus:ring-1 focus:ring-emerald-500 custom-scrollbar" 
                                            placeholder={t('node.content.sceneContextPlaceholder')}
                                            onFocus={handleTextFocus} 
                                            onMouseDown={e => e.stopPropagation()}
                                        />
                                    )}
                                </div>
                                
                                {(scene.frames || []).map((frame: any, frameIndex: number) => {
                                    const frameUniqueId = `${sceneIndex}-${frame.frameNumber}`;
                                    return (
                                        <AnalyzerFrameItem 
                                            key={frameUniqueId}
                                            frame={frame}
                                            sceneIndex={sceneIndex}
                                            frameIndex={frameIndex}
                                            frameUniqueId={frameUniqueId}
                                            isSelected={selectedFrames.has(frameUniqueId)}
                                            isCollapsed={collapsedFrames.has(frameUniqueId)}
                                            availableCharacters={characters}
                                            t={t}
                                            onClick={onFrameClick}
                                            onToggleCollapse={onToggleCollapse}
                                            onUpdate={onFramePartChange}
                                            onAddFrame={onAddFrame}
                                            onReorder={onReorderFrame}
                                            onDelete={onDeleteFrame}
                                            onCopy={onCopy}
                                            handleTextFocus={handleTextFocus}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
});
