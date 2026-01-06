import React from 'react';
import { CombinedPromptItem } from './DisplayItems';
import { ActionButton } from '../../ActionButton';

interface OutputPromptsPanelProps {
    verticalDividerPos: number;
    groupedPrompts: { sceneNum: string, title: string, prompts: any[] }[];
    collapsedOutputScenes: Set<string>;
    collapsedPrompts: Set<string>;
    areAllOutputScenesCollapsed: boolean;
    areAllOutputPromptsCollapsed: boolean;
    onToggleOutputSceneCollapse: (key: string) => void;
    onTogglePromptCollapse: (id: string) => void;
    onToggleAllOutputScenes: () => void;
    onToggleAllOutputPrompts: () => void;
    onDeletePrompt: (sNum: number, fNum: number) => void;
    onDeleteScenePrompts: (sNum: number) => void;
    onDownloadJson: () => void;
    onCopy: (text: string) => void;
    t: (key: string) => string;
}

export const OutputPromptsPanel: React.FC<OutputPromptsPanelProps> = ({
    verticalDividerPos, groupedPrompts, collapsedOutputScenes, collapsedPrompts,
    areAllOutputScenesCollapsed, areAllOutputPromptsCollapsed,
    onToggleOutputSceneCollapse, onTogglePromptCollapse,
    onToggleAllOutputScenes, onToggleAllOutputPrompts,
    onDeletePrompt, onDeleteScenePrompts, onDownloadJson, onCopy, t
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