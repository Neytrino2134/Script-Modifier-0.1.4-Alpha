
import React from 'react';
import { ActionButton } from '../../ActionButton';

const UpstreamSceneDisplay: React.FC<{ scene: any, t: (key: string) => string, isCollapsed: boolean, onToggle: () => void }> = React.memo(({ scene, t, isCollapsed, onToggle }) => {
    // Format character list for badge
    const charBadgeText = scene.characters && Array.isArray(scene.characters) 
        ? scene.characters.map((c: string) => {
            const match = c.match(/(?:Entity|Character|Персонаж)[-\s]?(\d+)/i);
            return match ? `ENT-${match[1]}` : c;
        }).join(', ')
        : null;

    return (
        <div className="bg-gray-800/50 rounded-lg p-2 border border-transparent hover:border-gray-700/50 transition-colors">
            <div className="flex justify-between items-center cursor-pointer select-none" onClick={(e) => { e.stopPropagation(); onToggle(); }}>
                <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-gray-300 text-sm truncate pr-2">
                        {`${t('node.content.scene')} ${scene.sceneNumber}${scene.title ? `: ${scene.title}` : ''}`}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                        {scene.recommendedFrames !== undefined && (
                             <span className="text-[9px] text-emerald-500 font-mono font-bold uppercase tracking-wider">
                                {t('node.content.recommendedFrames')}: {scene.recommendedFrames}
                            </span>
                        )}
                        {charBadgeText && (
                            <span className="text-[9px] text-cyan-300 font-mono uppercase tracking-wider bg-cyan-900/30 px-1 rounded truncate max-w-[150px]" title={charBadgeText}>
                                {charBadgeText}
                            </span>
                        )}
                    </div>
                </div>
                 <ActionButton tooltipPosition="left" title={isCollapsed ? t('node.action.expandScene') : t('node.action.collapseScene')} onClick={(e) => { e.stopPropagation(); onToggle(); }}>
                    {isCollapsed ? (<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>) : (<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>)}
                 </ActionButton>
            </div>
            {!isCollapsed && (
                <div className="mt-2 text-xs">
                    <p className="text-gray-400 whitespace-pre-wrap select-text">{scene.description}</p>
                    {scene.narratorText && (
                        <div className="mt-2 pt-2 border-t border-gray-700/50">
                            <p className="font-semibold text-emerald-400 mb-1">{t('node.content.narrator')}</p>
                            <p className="text-gray-300 italic whitespace-pre-wrap select-text pl-2 border-l-2 border-emerald-500">{scene.narratorText}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});

interface InputScriptsPanelProps {
    width: string;
    upstreamScriptData: any;
    collapsedInputScenes: Set<number>;
    isSummaryCollapsed: boolean;
    onToggleInputSceneCollapse: (index: number) => void;
    setIsSummaryCollapsed: (collapsed: boolean) => void;
    t: (key: string) => string;
    onToggleAllInputScenes: () => void;
    areAllInputScenesCollapsed: boolean;
}

export const InputScriptsPanel: React.FC<InputScriptsPanelProps> = React.memo(({
    width, upstreamScriptData, collapsedInputScenes, isSummaryCollapsed,
    onToggleInputSceneCollapse, setIsSummaryCollapsed, t,
    onToggleAllInputScenes, areAllInputScenesCollapsed
}) => {
    return (
        <div className="overflow-y-scroll overflow-x-hidden custom-scrollbar pr-1 space-y-2 px-1 pb-1" style={{ width, contentVisibility: 'auto' }} onWheel={e => e.stopPropagation()}>
            <div className="flex justify-between items-center pr-2 sticky top-0 bg-gray-900 z-10 py-1 border-b border-gray-800/50 mb-2 -mx-1 px-2">
                <h3 className="font-bold text-emerald-400 px-1">{t('node.content.inputScripts')}</h3>
                {upstreamScriptData?.scenes && upstreamScriptData.scenes.length > 0 && (
                     <ActionButton tooltipPosition="left" title={areAllInputScenesCollapsed ? t('node.action.expandAllScenes') : t('node.action.collapseAllScenes')} onClick={onToggleAllInputScenes}>
                         {areAllInputScenesCollapsed ? (
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" /></svg>
                         ) : (
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
                         )}
                    </ActionButton>
                )}
            </div>
            {isSummaryCollapsed ? (
                upstreamScriptData?.summary && (
                    <div className="bg-gray-800/50 rounded-lg p-2 cursor-pointer hover:bg-gray-800 border border-transparent hover:border-gray-700/50 transition-colors" onClick={() => setIsSummaryCollapsed(false)}>
                        <h4 className="font-semibold text-gray-300 text-sm flex items-center"><span className="truncate mr-2">{t('node.content.summary')}</span><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg></h4>
                    </div>
                )
            ) : (
                upstreamScriptData?.summary && (
                    <div className="bg-gray-800/50 rounded-lg p-2 border border-transparent">
                        <h4 className="font-semibold text-gray-300 text-sm flex justify-between items-center cursor-pointer" onClick={() => setIsSummaryCollapsed(true)}>
                            <span>{t('node.content.summary')}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                        </h4>
                        <div className="mt-1 text-xs text-gray-400 whitespace-pre-wrap select-text">{upstreamScriptData.summary}</div>
                    </div>
                )
            )}
            {upstreamScriptData?.scenes && upstreamScriptData.scenes.length > 0 ? upstreamScriptData.scenes.map((scene: any, index: number) => (
                <UpstreamSceneDisplay key={index} scene={scene} t={t} isCollapsed={collapsedInputScenes.has(index)} onToggle={() => onToggleInputSceneCollapse(index)} />
            )) : <div className="text-center text-xs text-gray-500 p-4">{t('node.content.noInputScenes')}</div>}
         </div>
    );
});
