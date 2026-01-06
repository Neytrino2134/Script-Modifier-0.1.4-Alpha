import React from 'react';
import { ActionButton } from '../../ActionButton';

const UpstreamSceneDisplay: React.FC<{ scene: any, t: (key: string) => string, isCollapsed: boolean, onToggle: () => void }> = React.memo(({ scene, t, isCollapsed, onToggle }) => {
    const hasFrames = scene.frames && Array.isArray(scene.frames) && scene.frames.length > 0;
    
    return (
        <div className="bg-gray-800/50 rounded-lg p-2 border border-transparent hover:border-gray-700/50 transition-colors">
            <div className="flex justify-between items-center cursor-pointer select-none" onClick={(e) => { e.stopPropagation(); onToggle(); }}>
                <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-gray-300 text-sm truncate pr-2">
                        {`${t('node.content.scene')} ${scene.sceneNumber}${scene.title ? `: ${scene.title}` : ''}`}
                    </span>
                    <span className="text-[9px] text-emerald-500 font-mono font-bold uppercase tracking-wider">
                        {hasFrames 
                            ? `${scene.frames.length} ${t('node.content.frame_plural')}`
                            : (scene.recommendedFrames !== undefined ? `${t('node.content.recommendedFrames')}: ${scene.recommendedFrames}` : '')
                        }
                    </span>
                </div>
                 <ActionButton tooltipPosition="left" title={isCollapsed ? t('node.action.expandScene') : t('node.action.collapseScene')} onClick={(e) => { e.stopPropagation(); onToggle(); }}>
                    {isCollapsed ? (<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>) : (<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>)}
                 </ActionButton>
            </div>
            {!isCollapsed && (
                <div className="mt-2 text-xs">
                    {hasFrames ? (
                        <div className="space-y-3">
                             {/* Scene Context */}
                             {scene.sceneContext && (
                                <div className="bg-gray-900/30 p-2 rounded border border-gray-700/50">
                                    <p className="text-[9px] uppercase font-bold text-emerald-500 mb-1">{t('node.content.sceneContext')}</p>
                                    <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{scene.sceneContext}</p>
                                </div>
                             )}
                             
                             {/* Frames List */}
                             <div className="space-y-2">
                                {scene.frames.map((frame: any, idx: number) => {
                                    const charList = (frame.characters || []).map((c: string) => {
                                        const match = c.match(/(?:Entity|Character|Персонаж)[-\s]?(\d+)/i);
                                        return match ? `ENT-${match[1]}` : c;
                                    });
                                    const charString = charList.length > 0 ? charList.join(', ') : '';

                                    return (
                                        <div key={idx} className="bg-gray-900/50 p-2 rounded border border-gray-800">
                                            <div className="flex justify-between items-center mb-1.5 border-b border-gray-800 pb-1">
                                                 <div className="flex items-center gap-2 overflow-hidden">
                                                    <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap">
                                                        {t('node.content.frame')} {frame.frameNumber} {frame.shotType ? `| ${frame.shotType}` : ''}
                                                    </span>
                                                    {charString && (
                                                        <span className="text-[9px] text-cyan-500 font-mono truncate" title={charString}>
                                                            {charString}
                                                        </span>
                                                    )}
                                                 </div>
                                                 {frame.duration && <span className="text-[9px] text-gray-600 whitespace-nowrap ml-1">{frame.duration}s</span>}
                                            </div>
                                            <div className="space-y-2">
                                                {/* Component 1: Composition/Image */}
                                                <div>
                                                    <p className="text-[9px] text-emerald-600 uppercase font-semibold">{t('node.content.compositionAndBlocking')}</p>
                                                    <p className="text-[10px] text-gray-400 italic leading-snug">{frame.imagePrompt}</p>
                                                </div>
                                                {/* Component 2: Environment */}
                                                <div>
                                                    <p className="text-[9px] text-cyan-600 uppercase font-semibold">{t('node.content.environmentPrompt')}</p>
                                                    <p className="text-[10px] text-gray-400 italic leading-snug">{frame.environmentPrompt}</p>
                                                </div>
                                                {/* Component 3: Video */}
                                                {frame.videoPrompt && (
                                                    <div>
                                                        <p className="text-[9px] text-purple-500 uppercase font-semibold">{t('node.content.videoPrompt')}</p>
                                                        <p className="text-[10px] text-gray-400 italic leading-snug">{frame.videoPrompt}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                             </div>
                        </div>
                    ) : (
                        /* Fallback for basic script data without frames */
                        <>
                            <p className="text-gray-400 whitespace-pre-wrap select-text">{scene.description}</p>
                            {scene.narratorText && (
                                <div className="mt-2 pt-2 border-t border-gray-700/50">
                                    <p className="font-semibold text-emerald-400 mb-1">{t('node.content.narrator')}</p>
                                    <p className="text-gray-300 italic whitespace-pre-wrap select-text pl-2 border-l-2 border-emerald-500">{scene.narratorText}</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
});

interface InputFramesPanelProps {
    verticalDividerPos: number;
    upstreamAnalyzerData: any;
    collapsedInputScenes: Set<number>;
    collapsedInputFrames: Set<string>;
    collapsedInputContexts: Set<number>; 
    onToggleInputSceneCollapse: (idx: number) => void;
    onToggleInputFrameCollapse: (key: string) => void;
    onToggleInputContextCollapse: (idx: number) => void; 
    onToggleAllInputScenes: () => void;
    onToggleAllInputFrames: () => void;
    areAllInputScenesCollapsed: boolean;
    areAllInputFramesCollapsed: boolean;
    t: (key: string) => string;
    isProcessWholeScene: boolean;
}

export const InputFramesPanel: React.FC<InputFramesPanelProps> = ({
    verticalDividerPos, isProcessWholeScene, upstreamAnalyzerData,
    collapsedInputScenes, collapsedInputFrames, collapsedInputContexts,
    onToggleInputSceneCollapse, onToggleInputFrameCollapse, onToggleInputContextCollapse,
    onToggleAllInputScenes, onToggleAllInputFrames,
    areAllInputScenesCollapsed, areAllInputFramesCollapsed,
    t
}) => {
    return (
        <div className="overflow-y-scroll overflow-x-hidden custom-scrollbar pr-1 space-y-2 px-1" style={{ width: `calc(${verticalDividerPos}% - 0.5rem)`, contentVisibility: 'auto' }} onWheel={e => e.stopPropagation()}>
            <div className="flex justify-between items-center pr-2 sticky top-0 bg-gray-900 z-10 pt-1 pb-1 border-b border-gray-800/50 mb-2 -mx-1 px-2">
                <h3 className="font-bold text-emerald-400 px-1">{t('node.content.inputFrames')}</h3>
                {upstreamAnalyzerData?.scenes && upstreamAnalyzerData.scenes.length > 0 && (
                     <ActionButton tooltipPosition="left" title={areAllInputScenesCollapsed ? t('node.action.expandAllScenes') : t('node.action.collapseAllScenes')} onClick={onToggleAllInputScenes}>
                         {areAllInputScenesCollapsed ? (
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" /></svg>
                         ) : (
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
                         )}
                    </ActionButton>
                )}
            </div>
            
            {/* Summary only shown if it exists and we have data */}
            {upstreamAnalyzerData?.summary && (
                <div className="bg-gray-800/50 rounded-lg p-2 border border-transparent mb-2">
                    <h4 className="font-semibold text-gray-300 text-sm mb-1">{t('node.content.summary')}</h4>
                    <div className="text-xs text-gray-400 whitespace-pre-wrap select-text">{upstreamAnalyzerData.summary}</div>
                </div>
            )}

            {upstreamAnalyzerData?.scenes && upstreamAnalyzerData.scenes.length > 0 ? upstreamAnalyzerData.scenes.map((scene: any, index: number) => (
                <UpstreamSceneDisplay key={index} scene={scene} t={t} isCollapsed={collapsedInputScenes.has(index)} onToggle={() => onToggleInputSceneCollapse(index)} />
            )) : <div className="text-center text-xs text-gray-500 p-4">{t('node.content.noInputScenes')}</div>}
         </div>
    );
};