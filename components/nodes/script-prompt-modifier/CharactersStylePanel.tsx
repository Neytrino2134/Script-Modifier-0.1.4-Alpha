
import React, { useMemo } from 'react';
import { ModifierUiState } from './types';
import { ActionButton } from '../../ActionButton';

interface CharactersStylePanelProps {
    uiState: ModifierUiState;
    onUpdateUiState: (updates: Partial<ModifierUiState>) => void;
    onUpdateValue: (updates: any) => void;
    upstreamAnalyzerData: any;
    isStyleConnected: boolean;
    isDataConnected?: boolean;
    upstreamStyleValue: string;
    styleOverride: string;
    deselectAllNodes: () => void;
    t: (key: string) => string;
    characters: any[];
    onRefresh?: () => void;
}

export const CharactersStylePanel: React.FC<CharactersStylePanelProps> = ({
    uiState, onUpdateUiState, onUpdateValue, upstreamAnalyzerData, isStyleConnected, isDataConnected, upstreamStyleValue, styleOverride, deselectAllNodes, t, characters, onRefresh
}) => {
    // Analyzer style is derived from upstream data
    // Prefer generatedStyle for the placeholder too
    const analyzerStyle = upstreamAnalyzerData?.generatedStyle || (upstreamAnalyzerData?.visualStyle !== 'none' ? upstreamAnalyzerData?.visualStyle : '') || '';
    
    // Placeholder Logic:
    // 1. If Connected: Show "Connected..."
    // 2. If Not Connected & Analyzer has valid style: Show Analyzer style
    // 3. Else: Show default placeholder
    const activePlaceholder = isStyleConnected 
        ? t('node.content.connectedPlaceholder') 
        : (analyzerStyle || t('node.content.stylePromptPlaceholder'));

    const sortedCharacters = useMemo(() => {
        if (!characters) return [];
        return [...characters].sort((a, b) => {
            const getNum = (str: string) => {
                const match = (str || '').match(/(\d+)/);
                return match ? parseInt(match[1], 10) : 99999;
            };
            // Priority: index > alias > name
            const idxA = a.index || a.alias || '';
            const idxB = b.index || b.alias || '';
            return getNum(idxA) - getNum(idxB);
        });
    }, [characters]);

    return (
        <div className="flex-shrink-0 mb-1 bg-gray-900 rounded-md border border-gray-700 hover:border-gray-400 overflow-hidden flex flex-col transition-colors duration-200">
            <div 
                className="flex justify-between items-center p-2 bg-gray-800/50 cursor-pointer select-none hover:bg-gray-700/50 transition-colors"
                onClick={() => onUpdateUiState({ isCharStyleCollapsed: !uiState.isCharStyleCollapsed })}
            >
                <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                    <h3 className="font-bold text-gray-400 text-xs uppercase tracking-wider">{t('node.content.characters')} & {t('node.content.style')}</h3>
                     {onRefresh && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onRefresh(); }}
                            className="p-1 hover:bg-gray-700 rounded text-emerald-400 hover:text-emerald-300 transition-colors ml-2"
                            title={t('node.action.refreshData')}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    )}
                </div>
                <div className="pl-1 border-l border-gray-700 ml-1">
                    <ActionButton tooltipPosition="left" title={uiState.isCharStyleCollapsed ? t('node.action.expand') : t('node.action.collapse')} onClick={(e) => { e.stopPropagation(); onUpdateUiState({ isCharStyleCollapsed: !uiState.isCharStyleCollapsed }); }}>
                        {uiState.isCharStyleCollapsed ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                        )}
                    </ActionButton>
                </div>
            </div>

            {!uiState.isCharStyleCollapsed && (
                <div className="p-2 flex gap-2 h-[170px]">
                    <div className="w-1/2 flex flex-col min-h-0">
                        <div className="flex-grow overflow-y-auto custom-scrollbar pr-1 space-y-1 bg-gray-800 rounded-md p-1 border border-gray-700" onWheel={(e) => e.stopPropagation()}>
                            {sortedCharacters && sortedCharacters.length > 0 ? sortedCharacters.map((char: any, index: number) => (
                                <div key={index} className="bg-gray-800 p-1.5 rounded-md text-xs flex flex-col border border-gray-600/50">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                            {isDataConnected && (
                                                <div title="Linked from upstream" className="text-emerald-400 flex-shrink-0">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                                    </svg>
                                                </div>
                                            )}
                                            <span className="font-semibold text-gray-200 truncate" title={char.name}>{char.name || 'Unknown'}</span>
                                        </div>
                                        {(char.index || char.alias) && <span className="text-gray-400 ml-2 flex-shrink-0 font-mono text-[10px]">({char.index || char.alias})</span>}
                                    </div>
                                    {char.id && <div className="text-[9px] text-gray-500 font-mono mt-0.5 truncate select-all" title={char.id}>ID: {char.id}</div>}
                                </div>
                            )) : <p className="text-xs text-gray-500 text-center pt-4">{t('node.content.noCharactersAnalyzed')}</p>}
                        </div>
                    </div>

                    <div className="w-1/2 flex flex-col min-h-0 border-l border-gray-700 pl-2">
                        <textarea
                            value={isStyleConnected ? upstreamStyleValue : styleOverride}
                            onChange={e => onUpdateValue({ styleOverride: e.target.value })}
                            placeholder={activePlaceholder}
                            readOnly={isStyleConnected}
                            className="w-full flex-grow p-2 bg-gray-800 rounded-md resize-none focus:ring-1 focus:ring-emerald-500 focus:outline-none custom-scrollbar read-only:bg-gray-800/50 read-only:cursor-default read-only:text-gray-400 border border-gray-700 text-xs leading-relaxed placeholder-gray-500"
                            onWheel={e => e.stopPropagation()}
                            onFocus={deselectAllNodes}
                            style={{ scrollbarGutter: 'stable' }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
