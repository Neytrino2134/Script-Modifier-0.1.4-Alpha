
import React from 'react';
import { CombinedPromptItem } from './DisplayItems';
import { ActionButton } from '../../ActionButton';
import { SceneContextMap } from './types';

interface OutputPromptsPanelProps {
    verticalDividerPos: number;
    groupedPrompts: { sceneNum: string, title: string, prompts: any[] }[];
    collapsedOutputScenes: Set<string>;
    collapsedPrompts: Set<string>;
    areAllOutputScenesCollapsed: boolean;
    areAllOutputPromptsCollapsed: boolean;
    sceneContexts: SceneContextMap; // Received context map
    onToggleOutputSceneCollapse: (key: string) => void;
    onTogglePromptCollapse: (id: string) => void;
    onToggleAllOutputScenes: () => void;
    onToggleAllOutputPrompts: () => void;
    onDeletePrompt: (sNum: number, fNum: number) => void;
    onDeleteScenePrompts: (sNum: number) => void;
    onDownloadJson: () => void;
    onCopy: (text: string) => void;
    onUpdateSceneContext: (sceneNum: string, newValue: string) => void; // Update handler
    t: (key: string) => string;
    deselectAllNodes?: () => void;
}

export const OutputPromptsPanel: React.FC<OutputPromptsPanelProps> = ({
    verticalDividerPos, groupedPrompts, collapsedOutputScenes, collapsedPrompts,
    areAllOutputScenesCollapsed, areAllOutputPromptsCollapsed, sceneContexts,
    onToggleOutputSceneCollapse, onTogglePromptCollapse,
    onToggleAllOutputScenes, onToggleAllOutputPrompts,
    onDeletePrompt, onDeleteScenePrompts, onDownloadJson, onCopy, onUpdateSceneContext, t,
    deselectAllNodes
}) => {
    return (
        <div className="overflow-y-scroll custom-scrollbar pl-1 space-y-2" style={{ width: `calc(${100 - verticalDividerPos}% - 0.5rem)`, contentVisibility: 'auto' }} onWheel={e => e.stopPropagation()}>
            <div className="flex justify-between items-center pl-2 sticky top-0 bg-gray-900 z-10 pt-1 pb-1 border-b border-gray-800/50">
                <h3 className="font-bold text-emerald-400 px-2">{t('node.content.finalPrompt_plural')}</h3>
                <div className="flex items-center space-x-1">
                     <ActionButton tooltipPosition="left" title={t('node.action.downloadJson')} onClick={onDownloadJson}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                     </ActionButton>
                    {groupedPrompts.length > 0 && (
                        <>
                            <ActionButton tooltipPosition="left" title={areAllOutputScenesCollapsed ? t('node.action.expandAllScenes') : t('node.action.collapseAllScenes')} onClick={onToggleAllOutputScenes}>
                                {areAllOutputScenesCollapsed ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" /></svg>
                                )}
                            </ActionButton>
                            <ActionButton tooltipPosition="left" title={areAllOutputPromptsCollapsed ? t('node.action.expandAllFrames') : t('node.action.collapseAllFrames')} onClick={onToggleAllOutputPrompts} disabled={areAllOutputScenesCollapsed}>
                                {areAllOutputPromptsCollapsed ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${areAllOutputScenesCollapsed ? 'text-gray-600' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 13l-7 7-7-7m14-8l-7 7-7-7" /></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${areAllOutputScenesCollapsed ? 'text-gray-600' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 11l7-7 7 7M5 19l7-7 7 7" /></svg>
                                )}
                            </ActionButton>
                        </>
                    )}
                </div>
            </div>
            {groupedPrompts.length > 0 ? groupedPrompts.map((group) => {
                const isSceneCollapsed = collapsedOutputScenes.has(group.sceneNum);
                const contextValue = sceneContexts[group.sceneNum] || '';
                
                return (
                    <div key={group.sceneNum} className="mb-4">
                        <div className="px-2 py-1 mb-1 text-xs font-bold text-gray-400 uppercase border-b border-gray-700 flex justify-between items-center group cursor-pointer hover:bg-gray-800/50 transition-colors rounded" onClick={() => onToggleOutputSceneCollapse(group.sceneNum)}>
                            <div className="flex items-center space-x-2 overflow-hidden flex-1 min-w-0">
                                <ActionButton tooltipPosition="right" title={isSceneCollapsed ? t('node.action.expandScene') : t('node.action.collapseScene')} onClick={(e) => { e.stopPropagation(); onToggleOutputSceneCollapse(group.sceneNum); }}>
                                    {isSceneCollapsed ? (<svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>) : (<svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>)}
                                </ActionButton>
                                <span className="truncate">{`${t('node.content.scene')} ${group.sceneNum}${group.title ? `: ${group.title}` : ''}`}</span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                <span className="text-[9px] bg-gray-700 px-1.5 py-0.5 rounded text-gray-400 font-mono">{group.prompts.length} {t('node.content.frame_plural')}</span>
                                <ActionButton tooltipPosition="left" title={t('node.action.deleteItem')} onClick={(e) => { e.stopPropagation(); onDeleteScenePrompts(Number(group.sceneNum)); }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                </ActionButton>
                            </div>
                        </div>
                        {!isSceneCollapsed && (
                            <div className="pl-2 space-y-2">
                                {/* MASTER ENVIRONMENT PROMPT UI */}
                                <div className="bg-gray-800/80 border border-emerald-500/30 rounded-md p-2 mb-2 shadow-inner">
                                    <div className="flex justify-between items-center mb-1">
                                        <div className="flex items-center gap-1.5">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">MASTER ENVIRONMENT PROMPT</span>
                                        </div>
                                        <ActionButton tooltipPosition="left" title={t('node.action.copy')} onClick={(e) => { e.stopPropagation(); onCopy(contextValue); }}>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                        </ActionButton>
                                    </div>
                                    <textarea 
                                        value={contextValue}
                                        onChange={(e) => onUpdateSceneContext(group.sceneNum, e.target.value)}
                                        className="w-full text-xs p-2 bg-gray-900 border border-gray-700 rounded resize-y min-h-[60px] focus:outline-none focus:ring-1 focus:ring-emerald-500 custom-scrollbar text-gray-300 placeholder-gray-600"
                                        placeholder="Detailed master scene description (Furniture, Lighting, Textures)..."
                                        onFocus={deselectAllNodes}
                                        onMouseDown={e => e.stopPropagation()}
                                    />
                                </div>

                                {group.prompts.map((item, idx) => {
                                    const p = item.final || item.video;
                                    const promptId = `${p.sceneNumber}-${p.frameNumber}`;
                                    
                                    // Formatting: Frame-1 [SHOT_TYPE] ENT-1, ENT-2...
                                    const charList = (p.characters || []).map((c: string) => {
                                        // Match various formats: Entity-1, Character-1, Персонаж-1
                                        const match = c.match(/(?:Entity|Character|Персонаж)[-\s]?(\d+)/i);
                                        return match ? `ENT-${match[1]}` : c;
                                    });
                                    const charString = charList.length > 0 ? charList.join(', ') : '';
                                    const shotLabel = p.shotType ? ` [${p.shotType}]` : '';
                                    const title = `Frame-${p.frameNumber}${shotLabel} ${charString}`;
                                    
                                    return <CombinedPromptItem key={promptId} promptId={promptId} title={title} imagePrompt={item.final ? item.final.prompt : "No Image Prompt Generated"} videoPrompt={item.video ? item.video.videoPrompt : "No Video Prompt Generated"} isCollapsed={collapsedPrompts.has(promptId)} t={t} onToggleCollapse={onTogglePromptCollapse} onCopy={onCopy} onDelete={() => onDeletePrompt(Number(group.sceneNum), p.frameNumber)} />;
                                })}
                            </div>
                        )}
                    </div>
                );
            }) : <div className="text-center text-xs text-gray-500 p-4">{t('node.content.promptsGeneratedPlaceholder')}</div>}
        </div>
    );
};
