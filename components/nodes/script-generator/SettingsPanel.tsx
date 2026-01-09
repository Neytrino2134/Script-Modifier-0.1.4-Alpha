
import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { SCRIPT_GENERATOR_INSTRUCTIONS, CHAR_GEN_INSTRUCTIONS } from '../../../utils/prompts/scriptGenerator';
import { SAFE_GENERATION_INSTRUCTIONS } from '../../../utils/prompts/common';
import { InstructionBrick } from './InstructionBrick';
import { GeneratorUiState } from './types';
import CustomSelect, { CustomSelectOption } from '../../ui/CustomSelect';
import CustomCheckbox from '../../ui/CustomCheckbox';
import { getLanguageName } from '../../../utils/languageUtils';
import { ActionButton } from '../../ActionButton';
import Tooltip from '../../ui/Tooltip';

interface SettingsPanelProps {
    uiState: GeneratorUiState;
    onUpdateUiState: (updates: Partial<GeneratorUiState>) => void;
    onUpdateValue: (updates: any) => void;
    nodeId: string;
    t: (key: string, options?: { [key: string]: string | number }) => string;
    deselectAllNodes: () => void;
    // Data Props
    numberOfScenes: number | null;
    visualStyle: string;
    customVisualStyle: string;
    genre: string;
    genre2: string;
    characterType: string;
    narratorMode: string;
    narratorEnabled: boolean;
    noCharacters: boolean;
    useExistingCharacters: boolean;
    isCharactersInputConnected: boolean;
    linkedCharactersCount: number;
    // createSecondaryChars & createKeyItems REMOVED from here
    isDetailedPlot: boolean;
    includeSubscribeScene: boolean;
    model: string;
    isLoading: boolean;
    targetLanguage: string;
    prompt: string; 
    allCharacters: any[]; 
    estimateFrames?: boolean;
    safeGeneration?: boolean;
    thinkingEnabled?: boolean;
    scenelessMode?: boolean; 
    simpleActions?: boolean;
    commercialSafe?: boolean;
    smartConceptEnabled?: boolean;
    atmosphericEntryEnabled?: boolean;
    
    // Entity Generation Props passed from parent for stack visualization
    generateMainChars?: boolean;
    createSecondaryChars?: boolean;
    createKeyItems?: boolean;
    onToggleGenerateMainChars?: () => void;
    onToggleCreateSecondaryChars?: () => void;
    onToggleCreateKeyItems?: () => void;
    
    targetScrollId: string | null;
    onSetTargetScrollId: (id: string | null) => void;
}

// Defined outside to prevent re-mounting and flickering
const SearchTrigger: React.FC<{ id: string; onClick: (e: React.MouseEvent, id: string) => void; t: any }> = React.memo(({ id, onClick, t }) => (
    <Tooltip title={t('node.action.locateInStack')} position="left">
        <button 
            onClick={(e) => { e.stopPropagation(); onClick(e, id); }}
            className="ml-auto p-0.5 text-gray-500 hover:text-emerald-400 opacity-50 hover:opacity-100 transition-all focus:outline-none"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
        </button>
    </Tooltip>
));

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
    uiState, onUpdateUiState, onUpdateValue, nodeId, t, deselectAllNodes,
    numberOfScenes, visualStyle, customVisualStyle, genre, genre2, characterType, narratorMode,
    narratorEnabled, noCharacters, useExistingCharacters, isCharactersInputConnected, linkedCharactersCount,
    isDetailedPlot, includeSubscribeScene, model, isLoading, targetLanguage,
    prompt, allCharacters, estimateFrames = true, safeGeneration = false, thinkingEnabled = false, scenelessMode = false, simpleActions = false, commercialSafe = false, smartConceptEnabled = true, atmosphericEntryEnabled = true,
    generateMainChars, createSecondaryChars, createKeyItems, onToggleGenerateMainChars, onToggleCreateSecondaryChars, onToggleCreateKeyItems,
    targetScrollId, onSetTargetScrollId
}) => {
    
    // Search & Filter State
    const [stackFilter, setStackFilter] = useState('');
    const [highlightedId, setHighlightedId] = useState<string | null>(null);
    const brickRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const handleScrollToBrick = useCallback((e: React.MouseEvent, id: string) => {
        setStackFilter(''); 
        // Delay to allow filter clear to render, then scroll within the specific container
        requestAnimationFrame(() => {
            setTimeout(() => {
                const el = brickRefs.current[id];
                const container = scrollContainerRef.current;
                
                if (el && container) {
                    const HEADER_OFFSET = 40; 
                    const topPos = el.offsetTop - HEADER_OFFSET;
                    container.scrollTo({ top: Math.max(0, topPos), behavior: 'smooth' });
                    setHighlightedId(id);
                    setTimeout(() => setHighlightedId(null), 2000);
                }
            }, 50); 
        });
    }, []);
    
    const getFormattedModelName = (modelId: string) => {
        if (modelId === 'gemini-3-flash-preview') return 'Gemini 3 Flash Preview';
        if (modelId === 'gemini-3-pro-preview') return 'Gemini 3 Pro Preview';
        return modelId;
    };

    const getNativeLanguageName = (code: string) => {
        const map: Record<string, string> = {
            'ru': 'Русский', 'en': 'English', 'es': 'Español', 'fr': 'Français', 'de': 'Deutsch',
            'it': 'Italian', 'pt': 'Português', 'zh': '中文', 'ja': '日本語', 'ko': '한국어',
            'uz': 'Oʻzbek', 'tr': 'Türkçe'
        };
        return map[code] || code.toUpperCase();
    };

    const getGenreEnglishName = (genreKey: string) => {
        const map: Record<string, string> = {
            'general': 'General',
            'comedy': 'Comedy',
            'drama': 'Drama',
            'action': 'Action',
            'scifi': 'Sci-Fi',
            'fantasy': 'Fantasy',
            'horror': 'Horror',
            'thriller': 'Thriller',
            'childrens_animation': 'Children\'s Animation',
            'shorts_story': 'Shorts Story',
            'scientific_historical': 'Scientific Historical'
        };
        return map[genreKey] || genreKey;
    };

    const getStyleEnglishName = (styleKey: string) => {
        const map: Record<string, string> = {
            'none': 'None',
            'simple': 'Simple',
            'realistic': 'Realistic',
            '3d_cartoon': '3D Cartoon',
            '3d_realistic': '3D Realistic',
            '2d_animation': '2D Animation',
            'anime': 'Anime',
            'comics': 'Comics',
            'custom': 'Custom'
        };
        return map[styleKey] || styleKey;
    };

    // Prepare Options for Custom Selects
    const genreOptions = useMemo<CustomSelectOption[]>(() => [
        'general', 'comedy', 'drama', 'action', 'scifi', 'fantasy', 'horror', 'thriller', 'childrens_animation', 'shorts_story', 'scientific_historical'
    ].map(g => ({ value: g, label: t(`genre.${g}`) })), [t]);

    const styleOptions = useMemo<CustomSelectOption[]>(() => [
        { value: "", label: t('node.content.style.none') },
        { value: "simple", label: t('node.content.style.simple') },
        { value: "realistic", label: t('node.content.style.realistic') },
        { value: "3d_cartoon", label: t('node.content.style.3d_cartoon') },
        { value: "3d_realistic", label: t('node.content.style.3d_realistic') },
        { value: "2d_animation", label: t('node.content.style.2d_animation') },
        { value: "anime", label: t('node.content.style.anime') },
        { value: "comics", label: t('node.content.style.comics') },
        { value: "custom", label: t('node.content.style.custom') },
    ], [t]);

    const charTypeOptions = useMemo<CustomSelectOption[]>(() => [
        { value: "simple", label: t('node.content.characterType.simple') },
        { value: "anthro", label: t('node.content.characterType.anthro') },
    ], [t]);

    const narratorModeOptions = useMemo<CustomSelectOption[]>(() => [
        { value: "normal", label: t('node.content.narratorMode.normal') },
        { value: "dual", label: t('node.content.narratorMode.dual') },
        { value: "first_person", label: t('node.content.narratorMode.first_person') },
    ], [t]);

    const handleSceneCountChange = (newValue: number) => {
        onUpdateValue({ numberOfScenes: Math.max(1, newValue) });
    };

    const handleResetSettings = (e: React.MouseEvent) => {
        e.stopPropagation();
        onUpdateValue({
            characterType: 'simple',
            useExistingCharacters: false,
            narratorEnabled: true,
            narratorMode: 'normal',
            isAdvancedMode: false,
            numberOfScenes: null,
            isDetailedPlot: false,
            genre: 'general',
            noCharacters: false,
            genre2: 'general',
            model: 'gemini-3-flash-preview',
            includeSubscribeScene: false,
            visualStyle: 'none',
            customVisualStyle: '',
            estimateFrames: true,
            safeGeneration: false,
            thinkingEnabled: false,
            scenelessMode: false,
            simpleActions: false,
            commercialSafe: false,
            smartConceptEnabled: true,
            atmosphericEntryEnabled: true,
            generateMainChars: true,
            createSecondaryChars: true,
            createKeyItems: true
        });
    };

    // Check if brick matches search filter
    const shouldShow = (text: string, label: string) => {
        if (!stackFilter) return true;
        const q = stackFilter.toLowerCase();
        return text.toLowerCase().includes(q) || label.toLowerCase().includes(q);
    };

    let stepCount = 0;

    return (
        <div className={`border border-gray-600 hover:border-gray-200 rounded-md bg-gray-900 overflow-hidden flex-shrink-0 flex flex-col transition-colors duration-200 ${uiState.isSettingsCollapsed ? '' : 'h-[400px]'}`}>
            <div 
                className="flex justify-between items-center p-2 bg-gray-800/50 cursor-pointer select-none hover:bg-gray-700/50 transition-colors flex-shrink-0"
                onClick={() => onUpdateUiState({ isSettingsCollapsed: !uiState.isSettingsCollapsed })}
            >
                <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-1.533 2.16-1.535.113-1.535 2.322 0 2.435 1.594.118 2.073 1.274 1.533 2.16-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.948c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.948c1.372.836 2.942-.734 2.106-2.106-.54-.886-.061-2.042 1.533-2.16 1.535-.113 1.535-2.322 0-2.435-1.594-.118-2.073-1.274-1.533-2.16.836-1.372-.734-2.942-2.106-2.106a1.533 1.533 0 01-2.287-.948zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                    </svg>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('node.content.parameters')}</h4>
                </div>
                
                <div className="flex items-center space-x-1">
                    <ActionButton title={t('toolbar.resetToDefault')} onClick={handleResetSettings} tooltipPosition="left">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </ActionButton>
                    
                    <div className="pl-1 border-l border-gray-700 ml-1">
                         <ActionButton tooltipPosition="left" title={uiState.isSettingsCollapsed ? t('node.action.expand') : t('node.action.collapse')} onClick={(e) => { e.stopPropagation(); onUpdateUiState({ isSettingsCollapsed: !uiState.isSettingsCollapsed }); }}>
                            {uiState.isSettingsCollapsed ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                            )}
                        </ActionButton>
                    </div>
                </div>
            </div>
            
            {!uiState.isSettingsCollapsed && (
                <div className="flex flex-row flex-grow min-h-0 bg-gray-800/50" onWheel={(e) => e.stopPropagation()}>
                        {/* LEFT COLUMN: Controls */}
                    <div className="w-1/2 p-2 space-y-3 border-r border-gray-600 overflow-y-auto custom-scrollbar">
                        {/* Row 1: Scene Count | Style */}
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label htmlFor={`num-scenes-${nodeId}`} className="block text-xs font-medium text-gray-400 truncate">{t('node.content.numberOfScenes')}</label>
                                    <SearchTrigger id="sg_scene_count" onClick={handleScrollToBrick} t={t} />
                                </div>
                                <div className="relative w-full h-9">
                                    <input
                                        id={`num-scenes-${nodeId}`}
                                        type="number"
                                        min="1"
                                        value={numberOfScenes ?? ''}
                                        onChange={e => onUpdateValue({ numberOfScenes: e.target.value ? parseInt(e.target.value) : null })}
                                        placeholder={t('node.content.numberOfScenes.auto')}
                                        className="w-full h-full pl-3 pr-6 bg-gray-700 border border-gray-600 text-white rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none appearance-none"
                                    />
                                    <div className="absolute right-0 top-0 bottom-0 w-6 flex flex-col border-l border-gray-600">
                                        <button onClick={() => handleSceneCountChange((numberOfScenes || 0) + 1)} className="h-1/2 hover:bg-gray-600 text-gray-400 hover:text-white flex items-center justify-center rounded-tr-md focus:outline-none" onMouseDown={(e) => e.stopPropagation()}><svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" /></svg></button>
                                        <button onClick={() => handleSceneCountChange((numberOfScenes || 0) - 1)} className="h-1/2 hover:bg-gray-600 text-gray-400 hover:text-white flex items-center justify-center rounded-br-md border-t border-gray-600 focus:outline-none" onMouseDown={(e) => e.stopPropagation()}><svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-xs font-medium text-gray-400 truncate">{t('node.content.style')}</label>
                                    <SearchTrigger id="sg_visual_style" onClick={handleScrollToBrick} t={t} />
                                </div>
                                <CustomSelect value={visualStyle} onChange={(val) => onUpdateValue({ visualStyle: val })} options={styleOptions} disabled={isLoading} id={`style-select-${nodeId}`} />
                            </div>
                        </div>

                        {/* Custom Style Input */}
                        {visualStyle === 'custom' && (
                            <div className="flex flex-col space-y-1 pt-1 border-t border-gray-700/50">
                                <label htmlFor={`custom-style-input-${nodeId}`} className="text-xs text-gray-400">{t('node.content.style.custom')}</label>
                                <textarea id={`custom-style-input-${nodeId}`} value={customVisualStyle} onChange={e => onUpdateValue({ customVisualStyle: e.target.value })} onMouseDown={e => e.stopPropagation()} onFocus={deselectAllNodes} rows={2} className="w-full p-1 bg-gray-800 text-white rounded-md text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none custom-scrollbar resize-none" placeholder="..." />
                            </div>
                        )}
                        
                        {/* Sceneless Mode Toggle */}
                        <div className="flex items-center space-x-2 h-6 bg-gray-800/50 rounded px-2 border border-gray-700">
                             <CustomCheckbox id={`sceneless-mode-${nodeId}`} checked={scenelessMode} onChange={(checked) => onUpdateValue({ scenelessMode: checked })} disabled={isLoading} className="h-3.5 w-3.5" />
                             <label className="text-xs text-emerald-400 font-bold select-none truncate cursor-pointer flex-grow" htmlFor={`sceneless-mode-${nodeId}`}>{t('node.content.scenelessMode')}</label>
                             <SearchTrigger id="sceneless_mode" onClick={handleScrollToBrick} t={t} />
                        </div>

                        {/* Row 2: Genre | Genre 2 */}
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className={`block text-xs font-medium text-gray-400 truncate ${scenelessMode ? 'opacity-50' : ''}`}>{t('node.content.genre')}</label>
                                    <SearchTrigger id="sg_genre" onClick={handleScrollToBrick} t={t} />
                                </div>
                                <CustomSelect value={genre} onChange={(val) => onUpdateValue({ genre: val })} options={genreOptions} id={`genre-select-${nodeId}`} disabled={scenelessMode} />
                            </div>
                            <div>
                                <label className={`block text-xs font-medium text-gray-400 mb-1 truncate ${scenelessMode ? 'opacity-50' : ''}`}>{t('node.content.genre2')}</label>
                                <CustomSelect value={genre2} onChange={(val) => onUpdateValue({ genre2: val })} options={genreOptions} id={`genre2-select-${nodeId}`} disabled={scenelessMode} />
                            </div>
                        </div>

                        {/* Row 3: Char Type | Narrator Mode */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-col">
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-xs text-gray-400 truncate">{t('node.content.characterType')}</label>
                                    <SearchTrigger id="sg_anthro" onClick={handleScrollToBrick} t={t} />
                                </div>
                                <CustomSelect value={characterType} onChange={(val) => onUpdateValue({ characterType: val })} options={charTypeOptions} disabled={isLoading} id={`char-type-select-${nodeId}`} />
                            </div>
                            <div className="flex flex-col">
                                <label className={`text-xs text-gray-400 mb-1 truncate transition-opacity ${narratorEnabled ? 'opacity-100' : 'opacity-50'}`}>{t('node.content.narratorMode')}</label>
                                <CustomSelect value={narratorMode} onChange={(val) => onUpdateValue({ narratorMode: val })} options={narratorModeOptions} disabled={!narratorEnabled || isLoading} id={`narrator-mode-${nodeId}`} />
                            </div>
                        </div>

                        {/* Toggles Grid */}
                        <div className="grid grid-cols-1 gap-y-1">
                            {/* Thinking Mode Toggle */}
                            <div className="flex items-center space-x-2 h-6">
                                <CustomCheckbox id={`thinking-enabled-${nodeId}`} checked={thinkingEnabled} onChange={(checked) => onUpdateValue({ thinkingEnabled: checked })} disabled={isLoading} className="h-3.5 w-3.5" />
                                <label className="text-xs text-gray-300 select-none truncate cursor-pointer hover:text-cyan-400 transition-colors flex-grow" htmlFor={`thinking-enabled-${nodeId}`}>{t('node.content.thinkingEnabled')}</label>
                                <SearchTrigger id="thinking_mode" onClick={handleScrollToBrick} t={t} />
                            </div>

                            {/* Safe Generation */}
                             <div className="flex items-center space-x-2 h-6">
                                <CustomCheckbox id={`safe-gen-${nodeId}`} checked={safeGeneration} onChange={(checked) => onUpdateValue({ safeGeneration: checked })} disabled={isLoading} className="h-3.5 w-3.5" />
                                <label className="text-xs text-gray-300 select-none truncate cursor-pointer hover:text-emerald-400 transition-colors flex-grow" htmlFor={`safe-gen-${nodeId}`}>{t('node.content.safeGeneration')}</label>
                                <SearchTrigger id="safe_gen" onClick={handleScrollToBrick} t={t} />
                            </div>
                            
                            {/* Commercial Safe */}
                             <div className="flex items-center space-x-2 h-6">
                                <CustomCheckbox id={`commercial-safe-${nodeId}`} checked={commercialSafe} onChange={(checked) => onUpdateValue({ commercialSafe: checked })} disabled={isLoading} className="h-3.5 w-3.5" />
                                <label className="text-xs text-gray-300 select-none truncate cursor-pointer hover:text-emerald-400 transition-colors flex-grow" htmlFor={`commercial-safe-${nodeId}`}>{t('node.content.commercialSafe')}</label>
                                <SearchTrigger id={SCRIPT_GENERATOR_INSTRUCTIONS.COMMERCIAL_SAFE.id} onClick={handleScrollToBrick} t={t} />
                            </div>

                            {/* Smart Concept Toggle */}
                            <div className="flex items-center space-x-2 h-6">
                                <CustomCheckbox id={`smart-concept-${nodeId}`} checked={smartConceptEnabled} onChange={(checked) => onUpdateValue({ smartConceptEnabled: checked })} disabled={isLoading} className="h-3.5 w-3.5" />
                                <label className="text-xs text-gray-300 select-none truncate cursor-pointer hover:text-cyan-400 transition-colors flex-grow" htmlFor={`smart-concept-${nodeId}`}>{t('node.content.smartConcept')}</label>
                                <SearchTrigger id="char_smart_concept" onClick={handleScrollToBrick} t={t} />
                            </div>

                            {/* Atmospheric Entry Toggle */}
                             <div className="flex items-center space-x-2 h-6">
                                <CustomCheckbox id={`atmospheric-entry-${nodeId}`} checked={atmosphericEntryEnabled} onChange={(checked) => onUpdateValue({ atmosphericEntryEnabled: checked })} disabled={isLoading || scenelessMode} className="h-3.5 w-3.5" />
                                <label className={`text-xs text-gray-300 select-none truncate cursor-pointer hover:text-emerald-400 transition-colors flex-grow ${scenelessMode ? 'opacity-50' : ''}`} htmlFor={`atmospheric-entry-${nodeId}`}>
                                    {t('instruction.sg_exposition')}
                                </label>
                                <SearchTrigger id={SCRIPT_GENERATOR_INSTRUCTIONS.EXPOSITION.id} onClick={handleScrollToBrick} t={t} />
                            </div>

                            <div className="flex items-center space-x-2 h-6">
                                <CustomCheckbox 
                                    id={`no-characters-${nodeId}`} 
                                    checked={noCharacters} 
                                    onChange={(checked) => { onUpdateValue({ noCharacters: checked, useExistingCharacters: checked ? false : useExistingCharacters }); }} 
                                    disabled={isLoading || isCharactersInputConnected} 
                                    className="h-3.5 w-3.5" 
                                />
                                <label className={`text-xs text-gray-300 select-none truncate cursor-pointer flex-grow ${isCharactersInputConnected ? 'opacity-50 cursor-not-allowed' : ''}`} htmlFor={`no-characters-${nodeId}`}>{t('node.content.noCharacters')}</label>
                                <SearchTrigger id="sg_no_chars" onClick={handleScrollToBrick} t={t} />
                            </div>

                            {/* Use Existing Characters Toggle */}
                            <div className="flex items-center space-x-2 h-6">
                                <CustomCheckbox 
                                    id={`use-existing-${nodeId}`} 
                                    checked={useExistingCharacters || isCharactersInputConnected} 
                                    onChange={(checked) => onUpdateValue({ useExistingCharacters: checked })} 
                                    disabled={isLoading || noCharacters || isCharactersInputConnected} 
                                    className="h-3.5 w-3.5" 
                                />
                                <label className={`text-xs text-gray-300 select-none truncate cursor-pointer flex-grow ${noCharacters ? 'opacity-50' : ''} ${isCharactersInputConnected ? 'cursor-not-allowed text-emerald-400' : ''}`} htmlFor={`use-existing-${nodeId}`}>
                                    {t('node.content.useExistingCharacters')}
                                    {isCharactersInputConnected && " (Locked by connection)"}
                                </label>
                                {isCharactersInputConnected && linkedCharactersCount > 0 && (
                                    <span className="text-[10px] text-emerald-400 font-mono bg-emerald-900/30 px-1.5 py-0.5 rounded ml-1" title="Connected Characters Count">
                                        {linkedCharactersCount}
                                    </span>
                                )}
                                <SearchTrigger id="no_duplicates" onClick={handleScrollToBrick} t={t} />
                            </div>
                            
                            <div className="flex items-center space-x-2 h-6">
                                <CustomCheckbox id={`narrator-enabled-${nodeId}`} checked={narratorEnabled} onChange={(checked) => onUpdateValue({ narratorEnabled: checked })} className="h-3.5 w-3.5" />
                                <label className="text-xs text-gray-300 select-none truncate cursor-pointer flex-grow" htmlFor={`narrator-enabled-${nodeId}`}>{t('node.content.narratorEnabled')}</label>
                                <SearchTrigger id="sg_narrator" onClick={handleScrollToBrick} t={t} />
                            </div>
                             <div className="flex items-center space-x-2 h-6">
                                <CustomCheckbox id={`simple-actions-${nodeId}`} checked={simpleActions} onChange={(checked) => onUpdateValue({ simpleActions: checked })} className="h-3.5 w-3.5" />
                                <label className="text-xs text-emerald-300 font-medium select-none truncate cursor-pointer flex-grow" htmlFor={`simple-actions-${nodeId}`}>{t('node.content.simpleActions')}</label>
                                <SearchTrigger id="sg_simple_actions" onClick={handleScrollToBrick} t={t} />
                            </div>

                            <div className="flex items-center space-x-2 h-6">
                                <CustomCheckbox id={`detailed-plot-${nodeId}`} checked={isDetailedPlot} onChange={(checked) => onUpdateValue({ isDetailedPlot: checked })} disabled={scenelessMode} className="h-3.5 w-3.5" />
                                <label className={`text-xs text-gray-300 select-none truncate cursor-pointer flex-grow ${scenelessMode ? 'opacity-50' : ''}`} htmlFor={`detailed-plot-${nodeId}`}>{t('node.content.detailedPlot')}</label>
                                <SearchTrigger id="sg_detailed_plot" onClick={handleScrollToBrick} t={t} />
                            </div>
                            <div className="flex items-center space-x-2 h-6">
                                <CustomCheckbox id={`subscribe-scene-${nodeId}`} checked={includeSubscribeScene} onChange={(checked) => onUpdateValue({ includeSubscribeScene: checked })} disabled={scenelessMode} className="h-3.5 w-3.5" />
                                <label className={`text-xs text-gray-300 select-none truncate cursor-pointer flex-grow ${scenelessMode ? 'opacity-50' : ''}`} htmlFor={`subscribe-scene-${nodeId}`}>{t('node.content.includeSubscribeScene')}</label>
                                <SearchTrigger id="sg_subscribe" onClick={handleScrollToBrick} t={t} />
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Instructions Stack */}
                    <div className="w-1/2 flex flex-col relative">
                        {/* Search Filter Header - STICKY */}
                        <div className="p-2 border-b border-gray-700 bg-gray-800/80 sticky top-0 z-10 flex items-center gap-2">
                             <div className="relative w-full">
                                <input
                                    type="text"
                                    value={stackFilter}
                                    onChange={(e) => setStackFilter(e.target.value)}
                                    placeholder={t('node.content.findStack')}
                                    className="w-full pl-7 pr-2 py-1 text-xs bg-gray-900/80 border border-gray-600 rounded-md focus:outline-none focus:border-emerald-500 text-gray-300 placeholder-gray-600"
                                />
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                {stackFilter && (
                                    <button onClick={() => setStackFilter('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                                        &times;
                                    </button>
                                )}
                             </div>
                        </div>

                        <div ref={scrollContainerRef} className="p-2 overflow-y-auto custom-scrollbar space-y-1 flex-grow relative">
                            {/* --- TOP: SCRIPT GENERATION STACK --- */}
                            <h5 className="text-[10px] text-gray-500 uppercase font-bold mb-1 border-b border-gray-700 pb-1">{t('node.content.scriptGenerationStack')}</h5>

                            <div className="space-y-1 pb-2 mb-2 border-b border-gray-700/30">
                                {shouldShow(model, t('node.content.model')) && (
                                    <InstructionBrick 
                                        ref={el => { brickRefs.current['model-brick'] = el; }}
                                        id="model-brick"
                                        label={t('node.content.model')} 
                                        text={getFormattedModelName(model)}
                                        isMandatory 
                                        color='gray'
                                        isHighlighted={highlightedId === 'model-brick'}
                                    />
                                )}

                                {shouldShow(t(`instruction.${SCRIPT_GENERATOR_INSTRUCTIONS.INPUTS_DATA.id}`), t(`instruction.${SCRIPT_GENERATOR_INSTRUCTIONS.INPUTS_DATA.id}`)) && (
                                     <InstructionBrick 
                                        label={t(`instruction.${SCRIPT_GENERATOR_INSTRUCTIONS.INPUTS_DATA.id}`)} 
                                        text={SCRIPT_GENERATOR_INSTRUCTIONS.INPUTS_DATA.text} 
                                        translatedText={t(`instruction.desc.${SCRIPT_GENERATOR_INSTRUCTIONS.INPUTS_DATA.id}`)} 
                                        isMandatory color='gray' index={++stepCount} 
                                    />
                                )}

                                {shouldShow(getNativeLanguageName(targetLanguage), t('node.content.targetLanguage')) && (
                                    <InstructionBrick 
                                        ref={el => { brickRefs.current['target_lang'] = el; }}
                                        id="target_lang"
                                        index={++stepCount}
                                        label={t('node.content.targetLanguage')} 
                                        text={`Target Language: ${getLanguageName(targetLanguage)}`} 
                                        translatedText={getNativeLanguageName(targetLanguage)} 
                                        isMandatory color='gray' 
                                        isHighlighted={highlightedId === 'target_lang'}
                                    />
                                )}

                                {/* Thinking Mode - Moved Here */}
                                {shouldShow("Thinking Mode", t('node.content.thinkingEnabled')) && (
                                    <InstructionBrick 
                                        ref={el => { brickRefs.current['thinking_mode'] = el; }}
                                        id="thinking_mode"
                                        index={thinkingEnabled ? ++stepCount : undefined}
                                        label={t('node.content.thinkingEnabled')} 
                                        text="Enable extended reasoning for deeper plot coherence." 
                                        translatedText="Включить расширенное мышление." 
                                        isEnabled={thinkingEnabled} 
                                        onToggle={() => onUpdateValue({ thinkingEnabled: !thinkingEnabled })} 
                                        color='cyan' 
                                        isHighlighted={highlightedId === 'thinking_mode'}
                                    />
                                )}
                            </div>

                            {/* 1. PRIMING & CONTEXT */}
                            <div className="space-y-1 mb-3">
                                <h6 className="text-[9px] font-bold text-gray-500 uppercase px-1 border-b border-gray-700/50 pb-0.5">{t('node.content.sg_stack.priming')}</h6>
                                
                                {/* Safe Generation */}
                                {shouldShow(SAFE_GENERATION_INSTRUCTIONS.text, t('node.content.safeGeneration')) && (
                                    <InstructionBrick 
                                        ref={el => { brickRefs.current['safe_gen'] = el; }}
                                        id="safe_gen"
                                        index={safeGeneration ? ++stepCount : undefined}
                                        label={t('node.content.safeGeneration')} 
                                        text={SAFE_GENERATION_INSTRUCTIONS.text} 
                                        translatedText={t('instruction.desc.safe_gen')} 
                                        isCritical 
                                        isEnabled={safeGeneration}
                                        onToggle={() => onUpdateValue({ safeGeneration: !safeGeneration })}
                                        isHighlighted={highlightedId === 'safe_gen'}
                                    />
                                )}
                                
                                {/* Commercial Safe */}
                                {shouldShow(SCRIPT_GENERATOR_INSTRUCTIONS.COMMERCIAL_SAFE.text, t('node.content.commercialSafe')) && (
                                    <InstructionBrick 
                                        ref={el => { brickRefs.current[SCRIPT_GENERATOR_INSTRUCTIONS.COMMERCIAL_SAFE.id] = el; }}
                                        id={SCRIPT_GENERATOR_INSTRUCTIONS.COMMERCIAL_SAFE.id}
                                        index={commercialSafe ? ++stepCount : undefined}
                                        label={t('node.content.commercialSafe')} 
                                        text={SCRIPT_GENERATOR_INSTRUCTIONS.COMMERCIAL_SAFE.text} 
                                        translatedText={t('instruction.desc.commercial_safe')} 
                                        isCritical
                                        isEnabled={commercialSafe}
                                        onToggle={() => onUpdateValue({ commercialSafe: !commercialSafe })}
                                        isHighlighted={highlightedId === SCRIPT_GENERATOR_INSTRUCTIONS.COMMERCIAL_SAFE.id}
                                    />
                                )}

                                {shouldShow(SCRIPT_GENERATOR_INSTRUCTIONS.CORE.text, t(`instruction.${SCRIPT_GENERATOR_INSTRUCTIONS.CORE.id}`)) && (
                                    <InstructionBrick 
                                        ref={el => { brickRefs.current[SCRIPT_GENERATOR_INSTRUCTIONS.CORE.id] = el; }}
                                        id={SCRIPT_GENERATOR_INSTRUCTIONS.CORE.id}
                                        index={++stepCount}
                                        label={t(`instruction.${SCRIPT_GENERATOR_INSTRUCTIONS.CORE.id}`)} 
                                        text={SCRIPT_GENERATOR_INSTRUCTIONS.CORE.text} 
                                        translatedText={t(`instruction.desc.${SCRIPT_GENERATOR_INSTRUCTIONS.CORE.id}`)} 
                                        isMandatory color='emerald' 
                                        isHighlighted={highlightedId === SCRIPT_GENERATOR_INSTRUCTIONS.CORE.id}
                                    />
                                )}
                                
                                {/* Anti-Compression - Mandatory Readonly */}
                                {shouldShow(SCRIPT_GENERATOR_INSTRUCTIONS.ANTI_COMPRESSION.text, t(`instruction.${SCRIPT_GENERATOR_INSTRUCTIONS.ANTI_COMPRESSION.id}`)) && (
                                    <InstructionBrick 
                                        ref={el => { brickRefs.current[SCRIPT_GENERATOR_INSTRUCTIONS.ANTI_COMPRESSION.id] = el; }}
                                        id={SCRIPT_GENERATOR_INSTRUCTIONS.ANTI_COMPRESSION.id}
                                        index={++stepCount}
                                        label={t(`instruction.${SCRIPT_GENERATOR_INSTRUCTIONS.ANTI_COMPRESSION.id}`)} 
                                        text={SCRIPT_GENERATOR_INSTRUCTIONS.ANTI_COMPRESSION.text} 
                                        translatedText={t(`instruction.desc.${SCRIPT_GENERATOR_INSTRUCTIONS.ANTI_COMPRESSION.id}`)} 
                                        isMandatory color='emerald'
                                        isHighlighted={highlightedId === SCRIPT_GENERATOR_INSTRUCTIONS.ANTI_COMPRESSION.id}
                                    />
                                )}
                                
                                {/* Sceneless Mode Brick - Moved here to be always visible and toggleable */}
                                {shouldShow(SCRIPT_GENERATOR_INSTRUCTIONS.SCENELESS_MODE.text, t('instruction.sceneless_mode')) && (
                                    <InstructionBrick 
                                        ref={el => { brickRefs.current['sceneless_mode'] = el; }}
                                        id="sceneless_mode"
                                        index={scenelessMode ? ++stepCount : undefined}
                                        label={t('instruction.sceneless_mode')} 
                                        text={SCRIPT_GENERATOR_INSTRUCTIONS.SCENELESS_MODE.text} 
                                        translatedText={t('instruction.desc.sceneless_mode')} 
                                        isEnabled={scenelessMode} 
                                        onToggle={() => onUpdateValue({ scenelessMode: !scenelessMode })} 
                                        color={scenelessMode ? 'emerald' : 'gray'}
                                        isHighlighted={highlightedId === 'sceneless_mode'}
                                    />
                                )}
                            </div>

                            {/* 2. NARRATIVE ENGINE */}
                            <div className="space-y-1 mb-3">
                                <h6 className="text-[9px] font-bold text-gray-500 uppercase px-1 border-b border-gray-700/50 pb-0.5">
                                    {t('node.content.sg_stack.narrative')}
                                </h6>
                                
                                {(!scenelessMode ? [
                                    SCRIPT_GENERATOR_INSTRUCTIONS.ANALYSIS,
                                    SCRIPT_GENERATOR_INSTRUCTIONS.IMPROVE_CONCEPT,
                                    SCRIPT_GENERATOR_INSTRUCTIONS.EXPOSITION,
                                    SCRIPT_GENERATOR_INSTRUCTIONS.VISUALS_FIRST,
                                    SCRIPT_GENERATOR_INSTRUCTIONS.SEAMLESS_FLOW,
                                    SCRIPT_GENERATOR_INSTRUCTIONS.ATMOSPHERE,
                                    SCRIPT_GENERATOR_INSTRUCTIONS.DELAYED_REVEAL,
                                    SCRIPT_GENERATOR_INSTRUCTIONS.VISUAL_METAPHOR,
                                    SCRIPT_GENERATOR_INSTRUCTIONS.PACING_RHYTHM,
                                    SCRIPT_GENERATOR_INSTRUCTIONS.SUBTEXT
                                ] : [
                                    // When Sceneless Mode is ON, only show relevant visual instructions
                                    SCRIPT_GENERATOR_INSTRUCTIONS.VISUALS_FIRST,
                                    SCRIPT_GENERATOR_INSTRUCTIONS.ATMOSPHERE
                                ]).map(instr => {
                                    // Special handling for EXPOSITION (Atmospheric Entry) toggle
                                    if (instr.id === SCRIPT_GENERATOR_INSTRUCTIONS.EXPOSITION.id) {
                                         return shouldShow(instr.text, t(`instruction.${instr.id}`)) && (
                                            <InstructionBrick 
                                                key={instr.id}
                                                ref={el => { brickRefs.current[instr.id] = el; }}
                                                id={instr.id}
                                                index={atmosphericEntryEnabled ? ++stepCount : undefined} 
                                                label={t(`instruction.${instr.id}`)} 
                                                text={instr.text} 
                                                translatedText={t(`instruction.desc.${instr.id}`)} 
                                                isEnabled={atmosphericEntryEnabled}
                                                onToggle={() => onUpdateValue({ atmosphericEntryEnabled: !atmosphericEntryEnabled })}
                                                color='emerald' 
                                                isHighlighted={highlightedId === instr.id}
                                            />
                                         );
                                    }

                                    return shouldShow(instr.text, t(`instruction.${instr.id}`)) && (
                                    <InstructionBrick 
                                        key={instr.id}
                                        ref={el => { brickRefs.current[instr.id] = el; }}
                                        id={instr.id}
                                        index={++stepCount} 
                                        label={t(`instruction.${instr.id}`) || instr.label} 
                                        text={instr.text} 
                                        translatedText={t(`instruction.desc.${instr.id}`)} 
                                        isMandatory 
                                        color={instr.id === 'rule_visuals' || instr.id === 'rule_flow' || instr.id === 'rule_atmosphere' ? 'gray' : 'emerald'} 
                                        isHighlighted={highlightedId === instr.id}
                                    />
                                )})}
                            </div>

                            {/* 3. VISUAL STYLE & WORLD */}
                            <div className="space-y-1 mb-3">
                                <h6 className="text-[9px] font-bold text-gray-500 uppercase px-1 border-b border-gray-700/50 pb-0.5">{t('node.content.sg_stack.world')}</h6>
                                 
                                {/* Living World */}
                                {shouldShow(SCRIPT_GENERATOR_INSTRUCTIONS.LIVING_WORLD.text, t('instruction.sg_living_world')) && (
                                    <InstructionBrick 
                                        ref={el => { brickRefs.current['sg_living_world'] = el; }}
                                        id="sg_living_world"
                                        index={++stepCount}
                                        label={t('instruction.sg_living_world')} 
                                        text={characterType === 'anthro' 
                                            ? "EXTRAS: Anthropomorphic animals of various species." 
                                            : "EXTRAS: Human crowd appropriate to setting."} 
                                        translatedText={characterType === 'anthro'
                                            ? t('instruction.desc.sg_living_world_anthro')
                                            : t('instruction.desc.sg_living_world_simple')
                                        }
                                        isMandatory
                                        color='emerald' 
                                        isHighlighted={highlightedId === 'sg_living_world'}
                                    />
                                )}
                                
                                {/* Smart Concept Toggle Brick */}
                                {shouldShow(CHAR_GEN_INSTRUCTIONS.SMART_CONCEPT.text, t(`instruction.${CHAR_GEN_INSTRUCTIONS.SMART_CONCEPT.id}`)) && (
                                     <InstructionBrick 
                                        key={CHAR_GEN_INSTRUCTIONS.SMART_CONCEPT.id} 
                                        ref={el => { brickRefs.current[CHAR_GEN_INSTRUCTIONS.SMART_CONCEPT.id] = el; }} 
                                        id={CHAR_GEN_INSTRUCTIONS.SMART_CONCEPT.id} 
                                        index={smartConceptEnabled ? ++stepCount : undefined} 
                                        label={t(`instruction.${CHAR_GEN_INSTRUCTIONS.SMART_CONCEPT.id}`)} 
                                        text={CHAR_GEN_INSTRUCTIONS.SMART_CONCEPT.text} 
                                        translatedText={t(`instruction.desc.${CHAR_GEN_INSTRUCTIONS.SMART_CONCEPT.id}`)} 
                                        isEnabled={smartConceptEnabled}
                                        onToggle={() => onUpdateValue({ smartConceptEnabled: !smartConceptEnabled })}
                                        color='gray'
                                        isHighlighted={highlightedId === CHAR_GEN_INSTRUCTIONS.SMART_CONCEPT.id} 
                                     />
                                )}

                                {[SCRIPT_GENERATOR_INSTRUCTIONS.VISUAL_DNA, CHAR_GEN_INSTRUCTIONS.DETAILED_STYLE].map(instr => shouldShow(instr.text, t(`instruction.${instr.id}`)) && (
                                     <InstructionBrick key={instr.id} ref={el => { brickRefs.current[instr.id] = el; }} id={instr.id} index={++stepCount} label={t(`instruction.${instr.id}`) || instr.label} text={instr.text} translatedText={t(`instruction.desc.${instr.id}`)} isMandatory color={instr.id === 'sg_visual_dna' ? 'cyan' : 'emerald'} isHighlighted={highlightedId === instr.id} />
                                ))}
                                
                                {/* Frame Estimation */}
                                {shouldShow(SCRIPT_GENERATOR_INSTRUCTIONS.FRAME_ESTIMATION.text, t('node.content.recommendedFrames')) && (
                                    <InstructionBrick 
                                        ref={el => { brickRefs.current['sg_frame_estimation'] = el; }}
                                        id="sg_frame_estimation"
                                        index={++stepCount}
                                        label={t('node.content.recommendedFrames')} 
                                        text={SCRIPT_GENERATOR_INSTRUCTIONS.FRAME_ESTIMATION.text} 
                                        translatedText={t('instruction.desc.sg_frame_estimation')} 
                                        isMandatory={true}
                                        color='emerald' 
                                        isHighlighted={highlightedId === 'sg_frame_estimation'}
                                    />
                                )}
                                
                                {/* Visual Style Selection */}
                                {shouldShow(t('instruction.sg_visual_style'), t('instruction.sg_visual_style')) && (
                                    <InstructionBrick 
                                        ref={el => { brickRefs.current['sg_visual_style'] = el; }}
                                        id="sg_visual_style"
                                        index={visualStyle && visualStyle !== 'none' ? ++stepCount : undefined}
                                        label={t('instruction.sg_visual_style')} 
                                        text={`Request: Generate visual style based on '${visualStyle === 'custom' ? customVisualStyle : getStyleEnglishName(visualStyle)}'.`} 
                                        translatedText={t('instruction.desc.sg_visual_style', { style: visualStyle === 'custom' ? customVisualStyle : t(`node.content.style.${visualStyle || 'none'}`) })} 
                                        isEnabled={!!visualStyle && visualStyle !== 'none'} 
                                        onToggle={() => onUpdateValue({ visualStyle: visualStyle !== 'none' ? '' : 'simple' })}
                                        color='cyan' 
                                        isHighlighted={highlightedId === 'sg_visual_style'}
                                    />
                                )}

                                {/* Anthro */}
                                {shouldShow(t('instruction.sg_anthro'), t('instruction.sg_anthro')) && (
                                    <InstructionBrick 
                                        ref={el => { brickRefs.current['sg_anthro'] = el; }}
                                        id="sg_anthro"
                                        index={characterType === 'anthro' ? ++stepCount : undefined}
                                        label={t('instruction.sg_anthro')} 
                                        text="Characters MUST be animals with human traits." 
                                        translatedText={t('instruction.desc.sg_anthro')} 
                                        isEnabled={characterType === 'anthro'} 
                                        onToggle={() => onUpdateValue({ characterType: characterType === 'anthro' ? 'simple' : 'anthro' })}
                                        color='cyan' 
                                        isHighlighted={highlightedId === 'sg_anthro'}
                                    />
                                )}

                                {/* Genre */}
                                {shouldShow(t('instruction.sg_genre'), t('instruction.sg_genre')) && (
                                    <InstructionBrick 
                                        ref={el => { brickRefs.current['sg_genre'] = el; }}
                                        id="sg_genre"
                                        index={!scenelessMode && (genre !== 'general' || genre2 !== 'general') ? ++stepCount : undefined}
                                        label={t('instruction.sg_genre')} 
                                        text={`Context: ${getGenreEnglishName(genre)}${genre2 !== 'general' ? ` + ${getGenreEnglishName(genre2)}` : ''}`} 
                                        translatedText={t('instruction.desc.sg_genre', { genre: `${t(`genre.${genre}`)} ${genre2 !== 'general' ? `+ ${t(`genre.${genre2}`)}` : ''}` })} 
                                        isEnabled={!scenelessMode && (genre !== 'general' || genre2 !== 'general')} 
                                        onToggle={() => {
                                            if (genre !== 'general' || genre2 !== 'general') {
                                                onUpdateValue({ genre: 'general', genre2: 'general' });
                                            } else {
                                                onUpdateValue({ genre: 'comedy' });
                                            }
                                        }}
                                        color='cyan' 
                                        isHighlighted={highlightedId === 'sg_genre'}
                                    />
                                )}
                            </div>

                            {/* 4. OUTPUT FORMAT & CONSTRAINTS */}
                            <div className="space-y-1 mb-3">
                                 <h6 className="text-[9px] font-bold text-gray-500 uppercase px-1 border-b border-gray-700/50 pb-0.5">{t('node.content.sg_stack.constraints')}</h6>
                                
                                 {/* Simple Actions */}
                                 {shouldShow(t('instruction.sg_simple_actions'), t('instruction.sg_simple_actions')) && (
                                     <InstructionBrick 
                                        ref={el => { brickRefs.current['sg_simple_actions'] = el; }}
                                        id="sg_simple_actions"
                                        index={simpleActions ? ++stepCount : undefined}
                                        label={t('instruction.sg_simple_actions')} 
                                        text={SCRIPT_GENERATOR_INSTRUCTIONS.SIMPLE_ACTIONS.text} 
                                        translatedText={t('instruction.desc.sg_simple_actions')} 
                                        isEnabled={simpleActions} 
                                        onToggle={() => onUpdateValue({ simpleActions: !simpleActions })}
                                        color='emerald'
                                        isCritical 
                                        isHighlighted={highlightedId === 'sg_simple_actions'}
                                    />
                                 )}

                                 {/* No Characters */}
                                 {shouldShow(t('instruction.sg_no_chars'), t('instruction.sg_no_chars')) && (
                                     <InstructionBrick 
                                        ref={el => { brickRefs.current['sg_no_chars'] = el; }}
                                        id="sg_no_chars"
                                        index={noCharacters ? ++stepCount : undefined}
                                        label={t('instruction.sg_no_chars')} 
                                        text="Focus on events/documentary style." 
                                        translatedText={t('instruction.desc.sg_no_chars')} 
                                        isEnabled={noCharacters} 
                                        onToggle={() => onUpdateValue({ noCharacters: !noCharacters })}
                                        color='emerald' 
                                        isHighlighted={highlightedId === 'sg_no_chars'}
                                    />
                                 )}

                                 {/* Use Existing Characters Toggle */}
                                 {!noCharacters && shouldShow(t('node.content.useExistingCharacters'), t('node.content.useExistingCharacters')) && (
                                    <InstructionBrick
                                        ref={el => { brickRefs.current['use_existing'] = el; }}
                                        id="use_existing"
                                        index={useExistingCharacters ? ++stepCount : undefined}
                                        label={t('node.content.useExistingCharacters')}
                                        text="Use connected character profiles."
                                        translatedText={t('node.content.useExistingCharactersInfo')}
                                        isEnabled={useExistingCharacters}
                                        onToggle={() => {
                                            if (!isCharactersInputConnected) {
                                                onUpdateValue({ useExistingCharacters: !useExistingCharacters });
                                            }
                                        }}
                                        color='cyan'
                                        isHighlighted={highlightedId === 'use_existing'}
                                    />
                                 )}

                                 {/* Use Existing Chars Rules (Visible if !noCharacters) */}
                                {!noCharacters && (
                                    <>
                                        {shouldShow(t(`instruction.${CHAR_GEN_INSTRUCTIONS.NO_DUPLICATES.id}`), t(`instruction.${CHAR_GEN_INSTRUCTIONS.NO_DUPLICATES.id}`)) && (
                                            <InstructionBrick 
                                                ref={el => { brickRefs.current['no_duplicates'] = el; }}
                                                id="no_duplicates"
                                                index={useExistingCharacters ? ++stepCount : undefined} 
                                                label={t(`instruction.${CHAR_GEN_INSTRUCTIONS.NO_DUPLICATES.id}`)} 
                                                text={CHAR_GEN_INSTRUCTIONS.NO_DUPLICATES.text} 
                                                translatedText={t(`instruction.desc.${CHAR_GEN_INSTRUCTIONS.NO_DUPLICATES.id}`)} 
                                                isEnabled={useExistingCharacters} 
                                                isMandatory={false} 
                                                color='emerald' 
                                                isHighlighted={highlightedId === 'no_duplicates'}
                                            />
                                        )}
                                        
                                        {/* SECONDARY/KEY ITEMS REMOVED FROM HERE */}
                                    </>
                                )}
                                
                                {/* Narrator */}
                                {shouldShow(t('node.content.narrator'), t('node.content.narrator')) && (
                                    <InstructionBrick 
                                        ref={el => { brickRefs.current['sg_narrator'] = el; }}
                                        id="sg_narrator"
                                        index={narratorEnabled ? ++stepCount : ++stepCount}
                                        label={t('node.content.narrator')} 
                                        text={narratorEnabled ? `Include Narrator voiceover text. Style: ${narratorMode}.` : "Do NOT include narrator text."} 
                                        translatedText={narratorEnabled ? "Включить текст рассказчика." : "НЕ включать текст рассказчика."} 
                                        isEnabled={narratorEnabled} 
                                        onToggle={() => onUpdateValue({ narratorEnabled: !narratorEnabled })}
                                        color='cyan' 
                                        isHighlighted={highlightedId === 'sg_narrator'}
                                    />
                                )}

                                {/* Scene Count */}
                                {shouldShow(t('node.content.numberOfScenes'), t('node.content.numberOfScenes')) && (
                                     <InstructionBrick 
                                        ref={el => { brickRefs.current['sg_scene_count'] = el; }}
                                        id="sg_scene_count"
                                        index={numberOfScenes ? ++stepCount : undefined}
                                        label={t('node.content.numberOfScenes')} 
                                        text={numberOfScenes ? `Exactly ${numberOfScenes} scenes.` : "Auto-determine scene count."} 
                                        translatedText={numberOfScenes ? `${t('node.content.numberOfScenes')}: ${numberOfScenes}` : t('node.content.numberOfScenes.auto')} 
                                        isEnabled={numberOfScenes !== null} 
                                        onToggle={() => onUpdateValue({ numberOfScenes: numberOfScenes ? null : 5 })}
                                        color='cyan' 
                                        isHighlighted={highlightedId === 'sg_scene_count'}
                                    />
                                )}
                                
                                {/* Detailed Plot */}
                                {shouldShow(t('instruction.sg_detailed_plot'), t('instruction.sg_detailed_plot')) && (
                                    <InstructionBrick 
                                        ref={el => { brickRefs.current['sg_detailed_plot'] = el; }}
                                        id="sg_detailed_plot"
                                        index={!scenelessMode && isDetailedPlot ? ++stepCount : undefined}
                                        label={t('instruction.sg_detailed_plot')} 
                                        text="Plot Detail: Provide highly detailed descriptions of actions and plot." 
                                        translatedText={t('instruction.desc.sg_detailed_plot')} 
                                        isEnabled={!scenelessMode && isDetailedPlot} 
                                        onToggle={() => onUpdateValue({ isDetailedPlot: !isDetailedPlot })}
                                        color='emerald' 
                                        isHighlighted={highlightedId === 'sg_detailed_plot'}
                                    />
                                )}

                                {/* Subscribe Scene */}
                                {shouldShow(t('instruction.sg_subscribe'), t('instruction.sg_subscribe')) && (
                                    <InstructionBrick 
                                        ref={el => { brickRefs.current['sg_subscribe'] = el; }}
                                        id="sg_subscribe"
                                        index={!scenelessMode && includeSubscribeScene ? ++stepCount : undefined}
                                        label={t('instruction.sg_subscribe')} 
                                        text="Include a scene asking audience to Subscribe/Like." 
                                        translatedText={t('instruction.desc.sg_subscribe')} 
                                        isEnabled={!scenelessMode && includeSubscribeScene} 
                                        onToggle={() => onUpdateValue({ includeSubscribeScene: !includeSubscribeScene })}
                                        color='emerald' 
                                        isHighlighted={highlightedId === 'sg_subscribe'}
                                    />
                                )}
                            </div>

                            {/* --- BOTTOM: ENTITY GENERATION STACK --- */}
                            <h5 className="text-[10px] text-gray-500 uppercase font-bold mb-1 pt-2 border-t border-gray-700">{t('node.content.entityGenerationStack')}</h5>
                            
                            <div className="space-y-1 mb-3">
                                <InstructionBrick 
                                    label="Entity Mode" 
                                    text="Focus: Generating Entities based on the story concept."
                                    translatedText="Фокус: Генерация сущностей на основе концепции истории."
                                    isMandatory color='purple'
                                />

                                {shouldShow(t('instruction.create_main_chars'), t('instruction.create_main_chars')) && (
                                    <InstructionBrick 
                                        ref={el => { brickRefs.current[CHAR_GEN_INSTRUCTIONS.MAIN_CHAR_LOGIC.id] = el; }}
                                        id={CHAR_GEN_INSTRUCTIONS.MAIN_CHAR_LOGIC.id}
                                        label={t('instruction.create_main_chars')} 
                                        text={CHAR_GEN_INSTRUCTIONS.MAIN_CHAR_LOGIC.text} 
                                        translatedText={t('instruction.desc.create_main_chars')} 
                                        isEnabled={generateMainChars} // Use prop
                                        onToggle={onToggleGenerateMainChars}
                                        color='emerald'
                                        isHighlighted={targetScrollId === CHAR_GEN_INSTRUCTIONS.MAIN_CHAR_LOGIC.id}
                                    />
                                )}

                                {shouldShow(t('instruction.create_secondary_chars'), t('instruction.create_secondary_chars')) && (
                                    <InstructionBrick 
                                        ref={el => { brickRefs.current[CHAR_GEN_INSTRUCTIONS.SECONDARY_CHARS.id] = el; }}
                                        id={CHAR_GEN_INSTRUCTIONS.SECONDARY_CHARS.id}
                                        label={t('instruction.create_secondary_chars')} 
                                        text={CHAR_GEN_INSTRUCTIONS.SECONDARY_CHARS.text} 
                                        translatedText={t('instruction.desc.create_secondary_chars')} 
                                        isEnabled={createSecondaryChars} // Use prop
                                        onToggle={onToggleCreateSecondaryChars}
                                        color='emerald'
                                        isHighlighted={targetScrollId === CHAR_GEN_INSTRUCTIONS.SECONDARY_CHARS.id}
                                    />
                                )}

                                {shouldShow(t('instruction.create_key_items'), t('instruction.create_key_items')) && (
                                    <InstructionBrick 
                                        ref={el => { brickRefs.current[CHAR_GEN_INSTRUCTIONS.KEY_ITEMS_LOGIC.id] = el; }}
                                        id={CHAR_GEN_INSTRUCTIONS.KEY_ITEMS_LOGIC.id}
                                        label={t('instruction.create_key_items')} 
                                        text={CHAR_GEN_INSTRUCTIONS.KEY_ITEMS_LOGIC.text} 
                                        translatedText={t('instruction.desc.create_key_items')} 
                                        isEnabled={createKeyItems}
                                        onToggle={onToggleCreateKeyItems}
                                        color='cyan' 
                                        isHighlighted={targetScrollId === CHAR_GEN_INSTRUCTIONS.KEY_ITEMS_LOGIC.id}
                                    />
                                )}
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
