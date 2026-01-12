
import React, { useState, useRef, useEffect } from 'react';
import { PROMPT_MODIFIER_INSTRUCTIONS, LAYERED_CONSTRUCTION_NO_STYLE_TEXT, LAYERED_CONSTRUCTION_NO_CHAR_TEXT } from '../../../utils/prompts/promptModifier';
import { SAFE_GENERATION_INSTRUCTIONS } from '../../../utils/prompts/common';
import { InstructionBrick } from './InstructionBrick';
import { ModifierUiState } from './types';
import { ActionButton } from '../../ActionButton';
import CustomCheckbox from '../../ui/CustomCheckbox';
import Tooltip from '../../ui/Tooltip';
import { getLanguageName } from '../../../utils/languageUtils';

interface SettingsPanelProps {
    uiState: ModifierUiState;
    localSettingsHeight: number;
    setLocalSettingsHeight: (h: number) => void;
    onUpdateUiState: (updates: Partial<ModifierUiState>) => void;
    onUpdateValue: (updates: any) => void;
    
    // Data Props
    disabledInstructionIds: string[];
    t: (key: string) => string;
    targetLanguage: string;
    scale: number;
    maxHeight: number; 
    charDescMode: 'none' | 'general' | 'full';
    safeGeneration?: boolean;
    thinkingEnabled?: boolean;
    model: string;
    targetScrollId: string | null;
    onSetTargetScrollId: (id: string | null) => void;
    propEnhancementEnabled?: boolean;
    isProcessWholeScene?: boolean;
    onToggleProcessWholeScene?: (checked: boolean) => void;
    isSaturationEnabled?: boolean;
    onToggleSaturation?: (checked: boolean) => void;
    onTogglePropEnhancement?: () => void;
    nodeId: string; // Added nodeId
}

// Defined outside to prevent re-mounting and flickering during renders
const SearchTrigger: React.FC<{ id: string; onClick: (e: React.MouseEvent, id: string) => void; t: any }> = React.memo(({ id, onClick, t }) => (
    <Tooltip title={t('node.action.locateInStack')} position="left">
        <button 
            onClick={(e) => { e.stopPropagation(); onClick(e, id); }}
            className="ml-auto p-0.5 text-gray-500 hover:text-emerald-400 opacity-50 hover:opacity-100 transition-all focus:outline-none"
            type="button"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
        </button>
    </Tooltip>
));

export const SettingsPanel: React.FC<SettingsPanelProps> = React.memo(({ 
    uiState, localSettingsHeight, setLocalSettingsHeight, onUpdateUiState, onUpdateValue, 
    disabledInstructionIds, t, targetLanguage, scale, maxHeight, charDescMode, 
    safeGeneration = false, thinkingEnabled = false, model, targetScrollId, onSetTargetScrollId,
    propEnhancementEnabled = true, isProcessWholeScene, onToggleProcessWholeScene,
    isSaturationEnabled, onToggleSaturation, onTogglePropEnhancement, nodeId
}) => {
    const [isResizerHovered, setIsResizerHovered] = useState(false);
    const [stackFilter, setStackFilter] = useState('');
    const brickRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    
    // Internal state for smooth dragging
    const [height, setHeight] = useState(localSettingsHeight || 380);

    // Sync internal state with prop
    useEffect(() => {
        if (Math.abs(localSettingsHeight - height) > 1) {
            setHeight(localSettingsHeight || 380);
        }
    }, [localSettingsHeight]);

    // Scroll effect
    useEffect(() => {
        if (targetScrollId) {
             setStackFilter(''); // Clear filter to ensure target is visible
             // Delay scroll to allow render update
             setTimeout(() => {
                if (brickRefs.current[targetScrollId]) {
                    if (!uiState.isSettingsCollapsed) {
                        const el = brickRefs.current[targetScrollId];
                        const container = scrollContainerRef.current;
                        
                        if (el && container) {
                            const topPos = el.offsetTop;
                            const targetScroll = Math.max(0, topPos - (container.clientHeight / 2) + (el.clientHeight / 2));
                            
                            container.scrollTo({
                                top: targetScroll,
                                behavior: 'smooth'
                            });
                        }
                    }
                }
             }, 50);

            const timer = setTimeout(() => {
                onSetTargetScrollId(null);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [targetScrollId, uiState.isSettingsCollapsed, onSetTargetScrollId]);


    const handleSettingsResize = (e: React.MouseEvent) => {
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
            setLocalSettingsHeight(currentHeight);
        };

        const handleMouseUp = (upEvent: MouseEvent) => {
            upEvent.preventDefault();
            upEvent.stopPropagation();
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            onUpdateValue({ settingsPaneHeight: currentHeight }); 
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const handleResetSettings = (e: React.MouseEvent) => {
        e.stopPropagation();
        onUpdateValue({
             disabledInstructionIds: ['break_paragraphs', 'pm_anthro', 'pm_subscribe', 'rule_saturation'], 
             charDescMode: 'none', // Reset to none as per new default
             safeGeneration: false,
             thinkingEnabled: false,
             propEnhancementEnabled: true
        });
    };
    
    // --- HELPER FOR INSTRUCTION TOGGLING ---
    // This removes the need for parent handlers
    const toggleInstruction = (id: string) => {
        const isDisabled = disabledInstructionIds.includes(id);
        let newDisabledIds;
        if (isDisabled) {
            // Enable it (remove from disabled list)
            newDisabledIds = disabledInstructionIds.filter((existingId: string) => existingId !== id);
        } else {
            // Disable it (add to disabled list)
            newDisabledIds = [...disabledInstructionIds, id];
        }

        // Synchronize 'Img->Vid Flow' with 'Video Prompt'
        // If Video Prompt is toggled, toggle Consistency to match.
        const VIDEO_PROMPT_ID = PROMPT_MODIFIER_INSTRUCTIONS.GENERATE_VIDEO_PROMPT.id;
        const CONSISTENCY_ID = PROMPT_MODIFIER_INSTRUCTIONS.IMG_VID_CONSISTENCY.id;

        if (id === VIDEO_PROMPT_ID) {
            if (isDisabled) {
                // Video Prompt is being ENABLED -> Enable Consistency
                newDisabledIds = newDisabledIds.filter(pid => pid !== CONSISTENCY_ID);
            } else {
                // Video Prompt is being DISABLED -> Disable Consistency
                if (!newDisabledIds.includes(CONSISTENCY_ID)) {
                    newDisabledIds.push(CONSISTENCY_ID);
                }
            }
        }

        onUpdateValue({ disabledInstructionIds: newDisabledIds });
    };

    const isInstructionEnabled = (id: string) => !disabledInstructionIds.includes(id);
    const isVideoPromptEnabled = isInstructionEnabled(PROMPT_MODIFIER_INSTRUCTIONS.GENERATE_VIDEO_PROMPT.id);
    
    const getFormattedModelName = (modelId: string) => {
        if (modelId === 'gemini-3-flash-preview') return 'Gemini 3 Flash Preview';
        if (modelId === 'gemini-3-pro-preview') return 'Gemini 3 Pro Preview';
        return modelId;
    };

    let stepCount = 0;

    const handleSearchClick = (e: React.MouseEvent, id: string) => {
        onSetTargetScrollId(id);
    };

    const shouldShow = (text: string, label: string) => {
        if (!stackFilter) return true;
        const q = stackFilter.toLowerCase();
        return text.toLowerCase().includes(q) || label.toLowerCase().includes(q);
    };

    const getLayeredText = () => {
        if (charDescMode === 'none') return LAYERED_CONSTRUCTION_NO_CHAR_TEXT;
        if (!isInstructionEnabled(PROMPT_MODIFIER_INSTRUCTIONS.VISUAL_SATURATION.id)) return LAYERED_CONSTRUCTION_NO_STYLE_TEXT;
        return PROMPT_MODIFIER_INSTRUCTIONS.LAYERED_CONSTRUCTION.text;
    };
    
    const getLayeredDescKey = () => {
        if (charDescMode === 'none') return 'instruction.desc.layered_no_char'; 
        if (!isInstructionEnabled(PROMPT_MODIFIER_INSTRUCTIONS.VISUAL_SATURATION.id)) return 'instruction.desc.layered_no_style';
        return 'instruction.desc.layered';
    };

    return (
        <div 
            className={`border ${isResizerHovered ? 'border-emerald-500' : 'border-gray-600'} hover:border-gray-400 rounded-md bg-gray-900 overflow-hidden mb-2 flex-shrink-0 flex flex-col relative transition-colors duration-200`}
            style={{ height: uiState.isSettingsCollapsed ? 'auto' : `${height}px` }}
            onWheel={(e) => e.stopPropagation()}
        >
            <div 
                className="flex justify-between items-center p-2 bg-gray-800/50 cursor-pointer select-none hover:bg-gray-700/50 transition-colors flex-shrink-0"
                onClick={() => onUpdateUiState({ isSettingsCollapsed: !uiState.isSettingsCollapsed })}
            >
                <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-1.533 2.16-1.535.113-1.535 2.322 0 2.435 1.594.118 2.073 1.274 1.533 2.16-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.948c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.948c1.372.836 2.942-.734 2.106-2.106-.54-.886-.061-2.042 1.533-2.16 1.535-.113 1.535-2.322 0-2.435-1.594-.118-2.073-1.274-1.533-2.16.836-1.372-.734-2.942-2.106-2.106a1.533 1.533 0 01-2.287-.948zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                    </svg>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('node.content.activePromptStack')}</h4>
                </div>
                <div className="flex items-center space-x-1">
                    <ActionButton 
                        title={t('toolbar.resetToDefault')} 
                        onClick={handleResetSettings}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </ActionButton>
                    <div className="pl-1 border-l border-gray-700 ml-1">
                         <ActionButton title={uiState.isSettingsCollapsed ? t('node.action.expand') : t('node.action.collapse')} onClick={(e) => { e.stopPropagation(); onUpdateUiState({ isSettingsCollapsed: !uiState.isSettingsCollapsed }); }}>
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
                <>
                {/* Top Quick Toggles Bar - Consolidated */}
                <div className="px-2 py-2 border-b border-gray-700 bg-gray-800/30 flex flex-wrap gap-x-3 gap-y-2">
                    
                    {/* Safe Generation */}
                    <div className="flex items-center gap-2 bg-gray-800/50 px-1.5 py-0.5 rounded border border-gray-700 group">
                        <CustomCheckbox
                            id={`quick-safe-${nodeId}`}
                            checked={safeGeneration} 
                            onChange={(checked) => onUpdateValue({ safeGeneration: checked })} 
                            className="h-3.5 w-3.5"
                        />
                        <label htmlFor={`quick-safe-${nodeId}`} className="text-xs text-gray-300 select-none cursor-pointer group-hover:text-emerald-400 transition-colors whitespace-nowrap">
                            {t('node.content.safeGeneration')}
                        </label>
                        <SearchTrigger id="safe-gen-brick" onClick={handleSearchClick} t={t} />
                    </div>

                    {/* Thinking Mode */}
                    <div className="flex items-center gap-2 bg-gray-800/50 px-1.5 py-0.5 rounded border border-gray-700 group">
                         <CustomCheckbox
                            id={`quick-thinking-${nodeId}`}
                            checked={thinkingEnabled} 
                            onChange={(checked) => onUpdateValue({ thinkingEnabled: checked })} 
                            className="h-3.5 w-3.5"
                        />
                        <label htmlFor={`quick-thinking-${nodeId}`} className="text-xs text-gray-300 select-none cursor-pointer group-hover:text-cyan-400 transition-colors whitespace-nowrap">
                            {t('node.content.thinkingEnabled')}
                        </label>
                        <SearchTrigger id="thinking-brick" onClick={handleSearchClick} t={t} />
                    </div>

                    {/* Anthro */}
                    <div className="flex items-center gap-2 bg-gray-800/50 px-1.5 py-0.5 rounded border border-gray-700 group">
                        <CustomCheckbox
                            id={`quick-anthro-${nodeId}`}
                            checked={isInstructionEnabled(PROMPT_MODIFIER_INSTRUCTIONS.ANTHRO_REINFORCEMENT.id)} 
                            onChange={() => toggleInstruction(PROMPT_MODIFIER_INSTRUCTIONS.ANTHRO_REINFORCEMENT.id)} 
                            className="h-3.5 w-3.5"
                        />
                        <label htmlFor={`quick-anthro-${nodeId}`} className="text-xs text-gray-300 select-none cursor-pointer group-hover:text-cyan-400 transition-colors whitespace-nowrap">
                            {t('node.content.anthroEnabled')}
                        </label>
                        <SearchTrigger id={PROMPT_MODIFIER_INSTRUCTIONS.ANTHRO_REINFORCEMENT.id} onClick={handleSearchClick} t={t} />
                    </div>

                    {/* Formatting */}
                    <div className="flex items-center gap-2 bg-gray-800/50 px-1.5 py-0.5 rounded border border-gray-700 group">
                         <CustomCheckbox
                            id={`quick-format-${nodeId}`}
                            checked={isInstructionEnabled(PROMPT_MODIFIER_INSTRUCTIONS.BREAK_PARAGRAPHS.id)} 
                            onChange={() => toggleInstruction(PROMPT_MODIFIER_INSTRUCTIONS.BREAK_PARAGRAPHS.id)} 
                            className="h-3.5 w-3.5"
                        />
                        <label htmlFor={`quick-format-${nodeId}`} className="text-xs text-gray-300 select-none cursor-pointer group-hover:text-white transition-colors whitespace-nowrap">
                            {t('instruction.formatting')}
                        </label>
                        <SearchTrigger id={PROMPT_MODIFIER_INSTRUCTIONS.BREAK_PARAGRAPHS.id} onClick={handleSearchClick} t={t} />
                    </div>

                    {/* General Char Desc */}
                    <div className="flex items-center gap-2 bg-gray-800/50 px-1.5 py-0.5 rounded border border-gray-700 group">
                        <CustomCheckbox
                            id={`quick-general-char-${nodeId}`}
                            checked={charDescMode === 'general'} 
                            onChange={() => onUpdateValue({ charDescMode: charDescMode === 'general' ? 'none' : 'general' })} 
                            className="h-3.5 w-3.5"
                        />
                        <label htmlFor={`quick-general-char-${nodeId}`} className="text-xs text-gray-300 select-none cursor-pointer group-hover:text-emerald-400 transition-colors whitespace-nowrap">
                            {t('node.content.includeGeneralCharDesc')}
                        </label>
                        <SearchTrigger id={PROMPT_MODIFIER_INSTRUCTIONS.GENERAL_CHAR_DESC.id} onClick={handleSearchClick} t={t} />
                    </div>

                    {/* Video Prompt */}
                    <div className="flex items-center gap-2 bg-gray-800/50 px-1.5 py-0.5 rounded border border-gray-700 group">
                        <CustomCheckbox
                            id={`quick-video-prompt-${nodeId}`}
                            checked={isVideoPromptEnabled}
                            onChange={() => toggleInstruction(PROMPT_MODIFIER_INSTRUCTIONS.GENERATE_VIDEO_PROMPT.id)} 
                            className="h-3.5 w-3.5"
                        />
                        <label htmlFor={`quick-video-prompt-${nodeId}`} className="text-xs text-gray-300 select-none cursor-pointer group-hover:text-cyan-400 transition-colors whitespace-nowrap">
                            {t('instruction.video')}
                        </label>
                        <SearchTrigger id={PROMPT_MODIFIER_INSTRUCTIONS.GENERATE_VIDEO_PROMPT.id} onClick={handleSearchClick} t={t} />
                    </div>
                </div>

                {/* Search Filter Header */}
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

                <div 
                    ref={scrollContainerRef}
                    className="p-2 overflow-y-auto custom-scrollbar flex-grow bg-gray-800/20 space-y-2 pb-4 relative" 
                    onWheel={(e) => e.stopPropagation()}
                >
                    
                    {/* Model Display */}
                    {shouldShow(getFormattedModelName(model), t('node.content.model')) && (
                        <InstructionBrick 
                            ref={el => { brickRefs.current['model-brick'] = el; }}
                            id="model-brick"
                            label={t('node.content.model')} 
                            originalText={getFormattedModelName(model)}
                            isMandatory 
                            color='gray'
                            className="h-auto"
                            isHighlighted={targetScrollId === 'model-brick'}
                        />
                    )}
                    
                    {/* INPUTS Brick */}
                    {shouldShow(PROMPT_MODIFIER_INSTRUCTIONS.INPUTS.text, t(`instruction.${PROMPT_MODIFIER_INSTRUCTIONS.INPUTS.id}`)) && (
                        <InstructionBrick 
                            ref={el => { brickRefs.current[PROMPT_MODIFIER_INSTRUCTIONS.INPUTS.id] = el; }}
                            id={PROMPT_MODIFIER_INSTRUCTIONS.INPUTS.id}
                            index={++stepCount}
                            label={t(`instruction.${PROMPT_MODIFIER_INSTRUCTIONS.INPUTS.id}`)}
                            originalText={PROMPT_MODIFIER_INSTRUCTIONS.INPUTS.text}
                            translatedText={t(`instruction.desc.${PROMPT_MODIFIER_INSTRUCTIONS.INPUTS.id}`)}
                            isMandatory
                            color='gray'
                            className="h-auto"
                            isHighlighted={targetScrollId === PROMPT_MODIFIER_INSTRUCTIONS.INPUTS.id}
                        />
                    )}
                    
                    {/* Target Language */}
                    {shouldShow(getLanguageName(targetLanguage), t('node.content.targetLanguage')) && (
                        <InstructionBrick 
                            id="target-lang-brick"
                            index={++stepCount}
                            label={t('node.content.targetLanguage')} 
                            originalText={getLanguageName(targetLanguage)}
                            translatedText={t('instruction.desc.target_lang')}
                            isMandatory 
                            color='gray'
                            className="h-auto"
                        />
                    )}

                    {/* Thinking Mode - Moved Here */}
                    {shouldShow("Enable extended reasoning", t('node.content.thinkingEnabled')) && (
                        <InstructionBrick 
                           ref={el => { brickRefs.current['thinking-brick'] = el; }}
                           id="thinking-brick"
                           index={thinkingEnabled ? ++stepCount : undefined}
                           label={t('node.content.thinkingEnabled')} 
                           originalText="Enable extended reasoning for deeper plot coherence." 
                           translatedText="Включить расширенное мышление для улучшения сюжета." 
                           isEnabled={thinkingEnabled} 
                           onToggle={() => onUpdateValue({ thinkingEnabled: !thinkingEnabled })} 
                           color='cyan'
                           className="h-auto" 
                           isHighlighted={targetScrollId === 'thinking-brick'}
                       />
                   )}

                    {/* 1. PRIMING & ROLE */}
                    <div className="space-y-1 flex-none mb-3">
                        <h6 className="text-[9px] font-bold text-gray-500 uppercase px-1 border-b border-gray-700/50 pb-0.5">{t('node.content.spm_stack.priming')}</h6>

                         {/* Safe Generation */}
                         {shouldShow(SAFE_GENERATION_INSTRUCTIONS.text, t('node.content.safeGeneration')) && (
                             <InstructionBrick 
                                ref={el => { brickRefs.current['safe-gen-brick'] = el; }}
                                id="safe-gen-brick"
                                index={safeGeneration ? ++stepCount : undefined}
                                label={t('node.content.safeGeneration')}
                                originalText={SAFE_GENERATION_INSTRUCTIONS.text}
                                translatedText={t('instruction.desc.safe_gen')}
                                isCritical
                                isEnabled={safeGeneration}
                                onToggle={() => onUpdateValue({ safeGeneration: !safeGeneration })}
                                className="h-auto"
                                isHighlighted={targetScrollId === 'safe-gen-brick'}
                            />
                        )}

                        {shouldShow(PROMPT_MODIFIER_INSTRUCTIONS.ROLE.text, t('instruction.role')) && (
                            <InstructionBrick 
                                ref={el => { brickRefs.current[PROMPT_MODIFIER_INSTRUCTIONS.ROLE.id] = el; }}
                                id={PROMPT_MODIFIER_INSTRUCTIONS.ROLE.id} 
                                index={++stepCount}
                                label={t('instruction.role')} 
                                originalText={PROMPT_MODIFIER_INSTRUCTIONS.ROLE.text} 
                                translatedText={t('instruction.desc.role')}
                                isMandatory
                                className="h-auto"
                                isHighlighted={targetScrollId === PROMPT_MODIFIER_INSTRUCTIONS.ROLE.id}
                            />
                        )}
                    </div>

                    {/* 2. CORE PHYSICS & RULES */}
                    <div className="space-y-1 flex-none mb-3">
                         <h6 className="text-[9px] font-bold text-gray-500 uppercase px-1 border-b border-gray-700/50 pb-0.5">{t('node.content.spm_stack.physics')}</h6>
                        
                        {/* NO POV INSTRUCTION */}
                        {shouldShow(PROMPT_MODIFIER_INSTRUCTIONS.NO_POV.text, t('instruction.no_pov')) && (
                            <InstructionBrick 
                                ref={el => { brickRefs.current[PROMPT_MODIFIER_INSTRUCTIONS.NO_POV.id] = el; }}
                                id={PROMPT_MODIFIER_INSTRUCTIONS.NO_POV.id} 
                                index={++stepCount}
                                label={t('instruction.no_pov')} 
                                originalText={PROMPT_MODIFIER_INSTRUCTIONS.NO_POV.text} 
                                translatedText={t('instruction.desc.no_pov')}
                                isMandatory
                                isCritical
                                className="h-auto"
                                isHighlighted={targetScrollId === PROMPT_MODIFIER_INSTRUCTIONS.NO_POV.id}
                            />
                        )}

                        {shouldShow(PROMPT_MODIFIER_INSTRUCTIONS.STATIC_STATE.text, t('instruction.rule_static')) && (
                            <InstructionBrick 
                                ref={el => { brickRefs.current[PROMPT_MODIFIER_INSTRUCTIONS.STATIC_STATE.id] = el; }}
                                id={PROMPT_MODIFIER_INSTRUCTIONS.STATIC_STATE.id} 
                                index={++stepCount}
                                label={t('instruction.rule_static')} 
                                originalText={PROMPT_MODIFIER_INSTRUCTIONS.STATIC_STATE.text} 
                                translatedText={t('instruction.desc.rule_static')}
                                isMandatory
                                className="h-auto"
                                isHighlighted={targetScrollId === PROMPT_MODIFIER_INSTRUCTIONS.STATIC_STATE.id}
                            />
                        )}
                        {shouldShow(PROMPT_MODIFIER_INSTRUCTIONS.ATMOSPHERIC_FIX.text, t('instruction.atmosphere_fix')) && (
                            <InstructionBrick 
                                ref={el => { brickRefs.current[PROMPT_MODIFIER_INSTRUCTIONS.ATMOSPHERIC_FIX.id] = el; }}
                                id={PROMPT_MODIFIER_INSTRUCTIONS.ATMOSPHERIC_FIX.id} 
                                index={++stepCount}
                                label={t('instruction.atmosphere_fix')} 
                                originalText={PROMPT_MODIFIER_INSTRUCTIONS.ATMOSPHERIC_FIX.text} 
                                translatedText={t('instruction.desc.atmosphere_fix')}
                                isMandatory
                                className="h-auto"
                                isHighlighted={targetScrollId === PROMPT_MODIFIER_INSTRUCTIONS.ATMOSPHERIC_FIX.id}
                            />
                        )}
                        {shouldShow(PROMPT_MODIFIER_INSTRUCTIONS.STATELESS.text, t('instruction.stateless')) && (
                            <InstructionBrick 
                                ref={el => { brickRefs.current[PROMPT_MODIFIER_INSTRUCTIONS.STATELESS.id] = el; }}
                                id={PROMPT_MODIFIER_INSTRUCTIONS.STATELESS.id} 
                                index={++stepCount}
                                label={t('instruction.stateless')} 
                                originalText={PROMPT_MODIFIER_INSTRUCTIONS.STATELESS.text} 
                                translatedText={t('instruction.desc.stateless')}
                                isMandatory
                                isCritical
                                className="h-auto"
                                isHighlighted={targetScrollId === PROMPT_MODIFIER_INSTRUCTIONS.STATELESS.id}
                            />
                        )}
                        {shouldShow(PROMPT_MODIFIER_INSTRUCTIONS.ALWAYS_ENV.text, t('instruction.always_env')) && (
                            <InstructionBrick 
                                ref={el => { brickRefs.current[PROMPT_MODIFIER_INSTRUCTIONS.ALWAYS_ENV.id] = el; }}
                                id={PROMPT_MODIFIER_INSTRUCTIONS.ALWAYS_ENV.id} 
                                index={++stepCount}
                                label={t('instruction.always_env')} 
                                originalText={PROMPT_MODIFIER_INSTRUCTIONS.ALWAYS_ENV.text} 
                                translatedText={t('instruction.desc.always_env')}
                                isCritical
                                isMandatory
                                className="h-auto"
                                isHighlighted={targetScrollId === PROMPT_MODIFIER_INSTRUCTIONS.ALWAYS_ENV.id}
                            />
                        )}
                    </div>

                    {/* 3. SUBJECT HIERARCHY */}
                    <div className="space-y-1 flex-none mb-3">
                         <h6 className="text-[9px] font-bold text-gray-500 uppercase px-1 border-b border-gray-700/50 pb-0.5">{t('node.content.spm_stack.hierarchy')}</h6>
                         
                         {shouldShow(PROMPT_MODIFIER_INSTRUCTIONS.SUBJECT_FOCUS.text, t('instruction.subject_focus')) && (
                             <InstructionBrick 
                                ref={el => { brickRefs.current[PROMPT_MODIFIER_INSTRUCTIONS.SUBJECT_FOCUS.id] = el; }}
                                id={PROMPT_MODIFIER_INSTRUCTIONS.SUBJECT_FOCUS.id} 
                                index={++stepCount}
                                label={t('instruction.subject_focus')} 
                                originalText={PROMPT_MODIFIER_INSTRUCTIONS.SUBJECT_FOCUS.text} 
                                translatedText={t('instruction.desc.subject_focus')}
                                isMandatory
                                className="h-auto"
                                isHighlighted={targetScrollId === PROMPT_MODIFIER_INSTRUCTIONS.SUBJECT_FOCUS.id}
                            />
                        )}

                        {/* ANATOMICAL STRICTNESS */}
                        {shouldShow(PROMPT_MODIFIER_INSTRUCTIONS.ANATOMICAL_STRICTNESS.text, t('instruction.anatomical_strictness')) && (
                            <InstructionBrick 
                                ref={el => { brickRefs.current[PROMPT_MODIFIER_INSTRUCTIONS.ANATOMICAL_STRICTNESS.id] = el; }}
                                id={PROMPT_MODIFIER_INSTRUCTIONS.ANATOMICAL_STRICTNESS.id} 
                                index={isInstructionEnabled(PROMPT_MODIFIER_INSTRUCTIONS.ANATOMICAL_STRICTNESS.id) ? ++stepCount : undefined}
                                label={t('instruction.anatomical_strictness')} 
                                originalText={PROMPT_MODIFIER_INSTRUCTIONS.ANATOMICAL_STRICTNESS.text} 
                                translatedText={t('instruction.desc.anatomical_strictness')}
                                onToggle={() => toggleInstruction(PROMPT_MODIFIER_INSTRUCTIONS.ANATOMICAL_STRICTNESS.id)}
                                isEnabled={isInstructionEnabled(PROMPT_MODIFIER_INSTRUCTIONS.ANATOMICAL_STRICTNESS.id)}
                                isCritical
                                color='emerald'
                                className="h-auto"
                                isHighlighted={targetScrollId === PROMPT_MODIFIER_INSTRUCTIONS.ANATOMICAL_STRICTNESS.id}
                            />
                        )}

                         {/* PROP ENHANCEMENT */}
                        {shouldShow(PROMPT_MODIFIER_INSTRUCTIONS.PROP_ENHANCEMENT.text, PROMPT_MODIFIER_INSTRUCTIONS.PROP_ENHANCEMENT.label) && (
                            <InstructionBrick 
                                ref={el => { brickRefs.current[PROMPT_MODIFIER_INSTRUCTIONS.PROP_ENHANCEMENT.id] = el; }}
                                id={PROMPT_MODIFIER_INSTRUCTIONS.PROP_ENHANCEMENT.id} 
                                index={propEnhancementEnabled ? ++stepCount : undefined}
                                label={PROMPT_MODIFIER_INSTRUCTIONS.PROP_ENHANCEMENT.label} 
                                originalText={PROMPT_MODIFIER_INSTRUCTIONS.PROP_ENHANCEMENT.text} 
                                translatedText={t('instruction.desc.prop_enhancement')}
                                isEnabled={propEnhancementEnabled}
                                onToggle={() => onUpdateValue({ propEnhancementEnabled: !propEnhancementEnabled })}
                                color='emerald'
                                className="h-auto"
                                isHighlighted={targetScrollId === PROMPT_MODIFIER_INSTRUCTIONS.PROP_ENHANCEMENT.id}
                            />
                        )}

                        {shouldShow(PROMPT_MODIFIER_INSTRUCTIONS.STRICT_CHAR_INDEX.text, t('instruction.strict_char_index')) && (
                            <InstructionBrick 
                                ref={el => { brickRefs.current[PROMPT_MODIFIER_INSTRUCTIONS.STRICT_CHAR_INDEX.id] = el; }}
                                id={PROMPT_MODIFIER_INSTRUCTIONS.STRICT_CHAR_INDEX.id} 
                                index={++stepCount}
                                label={t('instruction.strict_char_index')} 
                                originalText={PROMPT_MODIFIER_INSTRUCTIONS.STRICT_CHAR_INDEX.text} 
                                translatedText={t('instruction.desc.strict_char_index')}
                                isMandatory
                                className="h-auto"
                                isHighlighted={targetScrollId === PROMPT_MODIFIER_INSTRUCTIONS.STRICT_CHAR_INDEX.id}
                            />
                        )}
                        {shouldShow(PROMPT_MODIFIER_INSTRUCTIONS.NO_NAMES.text, t('instruction.no_names')) && (
                            <InstructionBrick 
                                ref={el => { brickRefs.current[PROMPT_MODIFIER_INSTRUCTIONS.NO_NAMES.id] = el; }}
                                id={PROMPT_MODIFIER_INSTRUCTIONS.NO_NAMES.id} 
                                index={++stepCount}
                                label={t('instruction.no_names')} 
                                originalText={PROMPT_MODIFIER_INSTRUCTIONS.NO_NAMES.text} 
                                translatedText={t('instruction.desc.no_names')}
                                isCritical
                                isMandatory
                                className="h-auto"
                                isHighlighted={targetScrollId === PROMPT_MODIFIER_INSTRUCTIONS.NO_NAMES.id}
                            />
                        )}

                        {/* Optional Enhancements */}
                        <div className="grid grid-cols-1 gap-1">
                            {shouldShow(PROMPT_MODIFIER_INSTRUCTIONS.ANTHRO_REINFORCEMENT.text, t('node.content.anthroEnabled')) && (
                                <InstructionBrick 
                                    ref={el => { brickRefs.current[PROMPT_MODIFIER_INSTRUCTIONS.ANTHRO_REINFORCEMENT.id] = el; }}
                                    id={PROMPT_MODIFIER_INSTRUCTIONS.ANTHRO_REINFORCEMENT.id} 
                                    index={isInstructionEnabled(PROMPT_MODIFIER_INSTRUCTIONS.ANTHRO_REINFORCEMENT.id) ? ++stepCount : undefined}
                                    label={t('node.content.anthroEnabled')} 
                                    originalText={PROMPT_MODIFIER_INSTRUCTIONS.ANTHRO_REINFORCEMENT.text} 
                                    translatedText={t('instruction.desc.pm_anthro')}
                                    onToggle={() => toggleInstruction(PROMPT_MODIFIER_INSTRUCTIONS.ANTHRO_REINFORCEMENT.id)}
                                    isEnabled={isInstructionEnabled(PROMPT_MODIFIER_INSTRUCTIONS.ANTHRO_REINFORCEMENT.id)}
                                    color='cyan'
                                    className="h-auto"
                                    isHighlighted={targetScrollId === PROMPT_MODIFIER_INSTRUCTIONS.ANTHRO_REINFORCEMENT.id}
                                />
                            )}
                            {shouldShow(PROMPT_MODIFIER_INSTRUCTIONS.SUBSCRIBE_REINFORCEMENT.text, t('node.content.subscribeEnhancement')) && (
                                <InstructionBrick 
                                    ref={el => { brickRefs.current[PROMPT_MODIFIER_INSTRUCTIONS.SUBSCRIBE_REINFORCEMENT.id] = el; }}
                                    id={PROMPT_MODIFIER_INSTRUCTIONS.SUBSCRIBE_REINFORCEMENT.id} 
                                    index={isInstructionEnabled(PROMPT_MODIFIER_INSTRUCTIONS.SUBSCRIBE_REINFORCEMENT.id) ? ++stepCount : undefined}
                                    label={t('node.content.subscribeEnhancement')} 
                                    originalText={PROMPT_MODIFIER_INSTRUCTIONS.SUBSCRIBE_REINFORCEMENT.text} 
                                    translatedText={t('instruction.desc.pm_subscribe')}
                                    onToggle={() => toggleInstruction(PROMPT_MODIFIER_INSTRUCTIONS.SUBSCRIBE_REINFORCEMENT.id)}
                                    isEnabled={isInstructionEnabled(PROMPT_MODIFIER_INSTRUCTIONS.SUBSCRIBE_REINFORCEMENT.id)}
                                    color='cyan'
                                    className="h-auto"
                                    isHighlighted={targetScrollId === PROMPT_MODIFIER_INSTRUCTIONS.SUBSCRIBE_REINFORCEMENT.id}
                                />
                            )}
                        </div>

                        {/* Char Detail Toggle - Radio Group */}
                         <div className="grid grid-cols-3 gap-1 mt-1">
                            {shouldShow(t('node.content.noCharDesc'), t('node.content.noCharDesc')) && (
                                <InstructionBrick 
                                    id="no-char-desc"
                                    index={charDescMode === 'none' ? ++stepCount : undefined}
                                    label={t('node.content.noCharDesc')}
                                    originalText="Excludes character visual descriptions."
                                    translatedText={t('instruction.desc.layered_no_char')}
                                    isEnabled={charDescMode === 'none'}
                                    onToggle={() => onUpdateValue({ charDescMode: 'none' })}
                                    color='gray'
                                />
                            )}
                            {shouldShow(PROMPT_MODIFIER_INSTRUCTIONS.GENERAL_CHAR_DESC.text, t('node.content.includeGeneralCharDesc')) && (
                                <InstructionBrick 
                                    ref={el => { brickRefs.current[PROMPT_MODIFIER_INSTRUCTIONS.GENERAL_CHAR_DESC.id] = el; }}
                                    id={PROMPT_MODIFIER_INSTRUCTIONS.GENERAL_CHAR_DESC.id}
                                    index={charDescMode === 'general' ? ++stepCount : undefined}
                                    label={t('node.content.includeGeneralCharDesc')}
                                    originalText={PROMPT_MODIFIER_INSTRUCTIONS.GENERAL_CHAR_DESC.text}
                                    translatedText={t('instruction.desc.general_char_desc')}
                                    isEnabled={charDescMode === 'general'}
                                    onToggle={() => onUpdateValue({ charDescMode: 'general' })}
                                    color='emerald'
                                    isHighlighted={targetScrollId === PROMPT_MODIFIER_INSTRUCTIONS.GENERAL_CHAR_DESC.id}
                                />
                            )}
                            {shouldShow(PROMPT_MODIFIER_INSTRUCTIONS.FULL_CHAR_DESC.text, t('node.content.includeFullCharDesc')) && (
                                <InstructionBrick 
                                    ref={el => { brickRefs.current[PROMPT_MODIFIER_INSTRUCTIONS.FULL_CHAR_DESC.id] = el; }}
                                    id={PROMPT_MODIFIER_INSTRUCTIONS.FULL_CHAR_DESC.id}
                                    index={charDescMode === 'full' ? ++stepCount : undefined}
                                    label={t('node.content.includeFullCharDesc')}
                                    originalText={PROMPT_MODIFIER_INSTRUCTIONS.FULL_CHAR_DESC.text}
                                    translatedText={t('instruction.desc.full_char_desc')}
                                    isEnabled={charDescMode === 'full'}
                                    onToggle={() => onUpdateValue({ charDescMode: 'full' })}
                                    color='emerald'
                                    isHighlighted={targetScrollId === PROMPT_MODIFIER_INSTRUCTIONS.FULL_CHAR_DESC.id}
                                />
                            )}
                        </div>
                    </div>

                    {/* 4. CONSTRUCTION & FORMAT */}
                    <div className="space-y-1 flex-none">
                         <h6 className="text-[9px] font-bold text-gray-500 uppercase px-1 border-b border-gray-700/50 pb-0.5">{t('node.content.spm_stack.construction')}</h6>
                        
                        {/* Process Whole Scene */}
                         {shouldShow(PROMPT_MODIFIER_INSTRUCTIONS.PROCESS_WHOLE_SCENE.text, t('instruction.process_whole_scene')) && (
                             <InstructionBrick 
                                ref={el => { brickRefs.current[PROMPT_MODIFIER_INSTRUCTIONS.PROCESS_WHOLE_SCENE.id] = el; }}
                                id={PROMPT_MODIFIER_INSTRUCTIONS.PROCESS_WHOLE_SCENE.id} 
                                index={isInstructionEnabled(PROMPT_MODIFIER_INSTRUCTIONS.PROCESS_WHOLE_SCENE.id) ? ++stepCount : undefined}
                                label={t('instruction.process_whole_scene')} 
                                originalText={PROMPT_MODIFIER_INSTRUCTIONS.PROCESS_WHOLE_SCENE.text} 
                                translatedText={t('instruction.desc.process_whole_scene')}
                                onToggle={() => toggleInstruction(PROMPT_MODIFIER_INSTRUCTIONS.PROCESS_WHOLE_SCENE.id)}
                                isEnabled={isInstructionEnabled(PROMPT_MODIFIER_INSTRUCTIONS.PROCESS_WHOLE_SCENE.id)}
                                color='cyan'
                                className="h-auto"
                                isHighlighted={targetScrollId === PROMPT_MODIFIER_INSTRUCTIONS.PROCESS_WHOLE_SCENE.id}
                            />
                        )}

                        {/* Layered Construction - Adaptive Text */}
                        {shouldShow(getLayeredText(), t('instruction.layered')) && (
                            <InstructionBrick 
                                ref={el => { brickRefs.current[PROMPT_MODIFIER_INSTRUCTIONS.LAYERED_CONSTRUCTION.id] = el; }}
                                id={PROMPT_MODIFIER_INSTRUCTIONS.LAYERED_CONSTRUCTION.id} 
                                index={++stepCount}
                                label={t('instruction.layered')} 
                                originalText={getLayeredText()}
                                translatedText={t(getLayeredDescKey())}
                                onToggle={() => toggleInstruction(PROMPT_MODIFIER_INSTRUCTIONS.LAYERED_CONSTRUCTION.id)}
                                isEnabled={isInstructionEnabled(PROMPT_MODIFIER_INSTRUCTIONS.LAYERED_CONSTRUCTION.id)}
                                color='emerald'
                                className="h-auto"
                                isHighlighted={targetScrollId === PROMPT_MODIFIER_INSTRUCTIONS.LAYERED_CONSTRUCTION.id}
                            />
                        )}

                        {/* Visual Saturation */}
                         {shouldShow(PROMPT_MODIFIER_INSTRUCTIONS.VISUAL_SATURATION.text, t('instruction.visuals')) && (
                             <InstructionBrick 
                                ref={el => { brickRefs.current[PROMPT_MODIFIER_INSTRUCTIONS.VISUAL_SATURATION.id] = el; }}
                                id={PROMPT_MODIFIER_INSTRUCTIONS.VISUAL_SATURATION.id} 
                                index={isInstructionEnabled(PROMPT_MODIFIER_INSTRUCTIONS.VISUAL_SATURATION.id) ? ++stepCount : undefined}
                                label={t('instruction.visuals')} 
                                originalText={PROMPT_MODIFIER_INSTRUCTIONS.VISUAL_SATURATION.text} 
                                translatedText={t('instruction.desc.visuals')}
                                onToggle={() => toggleInstruction(PROMPT_MODIFIER_INSTRUCTIONS.VISUAL_SATURATION.id)}
                                isEnabled={isInstructionEnabled(PROMPT_MODIFIER_INSTRUCTIONS.VISUAL_SATURATION.id)}
                                color='cyan'
                                className="h-auto"
                                isHighlighted={targetScrollId === PROMPT_MODIFIER_INSTRUCTIONS.VISUAL_SATURATION.id}
                            />
                        )}

                        {/* Formatting */}
                        {shouldShow(PROMPT_MODIFIER_INSTRUCTIONS.BREAK_PARAGRAPHS.text, t('instruction.formatting')) && (
                            <InstructionBrick 
                                ref={el => { brickRefs.current[PROMPT_MODIFIER_INSTRUCTIONS.BREAK_PARAGRAPHS.id] = el; }}
                                id={PROMPT_MODIFIER_INSTRUCTIONS.BREAK_PARAGRAPHS.id} 
                                index={isInstructionEnabled(PROMPT_MODIFIER_INSTRUCTIONS.BREAK_PARAGRAPHS.id) ? ++stepCount : undefined}
                                label={t('instruction.formatting')} 
                                originalText={PROMPT_MODIFIER_INSTRUCTIONS.BREAK_PARAGRAPHS.text} 
                                translatedText={t('instruction.desc.formatting')}
                                onToggle={() => toggleInstruction(PROMPT_MODIFIER_INSTRUCTIONS.BREAK_PARAGRAPHS.id)}
                                isEnabled={isInstructionEnabled(PROMPT_MODIFIER_INSTRUCTIONS.BREAK_PARAGRAPHS.id)}
                                color='gray'
                                className="h-auto"
                                isHighlighted={targetScrollId === PROMPT_MODIFIER_INSTRUCTIONS.BREAK_PARAGRAPHS.id}
                            />
                        )}

                        {/* Video Prompt */}
                        {shouldShow(PROMPT_MODIFIER_INSTRUCTIONS.GENERATE_VIDEO_PROMPT.text, t('instruction.video')) && (
                            <InstructionBrick 
                                ref={el => { brickRefs.current[PROMPT_MODIFIER_INSTRUCTIONS.GENERATE_VIDEO_PROMPT.id] = el; }}
                                id={PROMPT_MODIFIER_INSTRUCTIONS.GENERATE_VIDEO_PROMPT.id} 
                                index={isVideoPromptEnabled ? ++stepCount : undefined}
                                label={t('instruction.video')} 
                                originalText={PROMPT_MODIFIER_INSTRUCTIONS.GENERATE_VIDEO_PROMPT.text} 
                                translatedText={t('instruction.desc.video')}
                                onToggle={() => toggleInstruction(PROMPT_MODIFIER_INSTRUCTIONS.GENERATE_VIDEO_PROMPT.id)}
                                isEnabled={isVideoPromptEnabled}
                                color='cyan'
                                className="h-auto"
                                isHighlighted={targetScrollId === PROMPT_MODIFIER_INSTRUCTIONS.GENERATE_VIDEO_PROMPT.id}
                            />
                        )}

                        {/* NEW: IMAGE-VIDEO CONSISTENCY */}
                        {shouldShow(PROMPT_MODIFIER_INSTRUCTIONS.IMG_VID_CONSISTENCY.text, t('instruction.img_vid_consistency')) && (
                            <InstructionBrick 
                                ref={el => { brickRefs.current[PROMPT_MODIFIER_INSTRUCTIONS.IMG_VID_CONSISTENCY.id] = el; }}
                                id={PROMPT_MODIFIER_INSTRUCTIONS.IMG_VID_CONSISTENCY.id} 
                                index={isInstructionEnabled(PROMPT_MODIFIER_INSTRUCTIONS.IMG_VID_CONSISTENCY.id) ? ++stepCount : undefined}
                                label={t('instruction.img_vid_consistency')} 
                                originalText={PROMPT_MODIFIER_INSTRUCTIONS.IMG_VID_CONSISTENCY.text} 
                                translatedText={t('instruction.desc.img_vid_consistency')}
                                onToggle={() => toggleInstruction(PROMPT_MODIFIER_INSTRUCTIONS.IMG_VID_CONSISTENCY.id)}
                                isEnabled={isInstructionEnabled(PROMPT_MODIFIER_INSTRUCTIONS.IMG_VID_CONSISTENCY.id)}
                                color='emerald'
                                className="h-auto"
                                isHighlighted={targetScrollId === PROMPT_MODIFIER_INSTRUCTIONS.IMG_VID_CONSISTENCY.id}
                            />
                        )}
                    </div>
                </div>
                <div 
                    className="absolute bottom-0 inset-x-0 h-3 cursor-ns-resize bg-transparent z-20"
                    onMouseDown={handleSettingsResize}
                    onMouseEnter={() => setIsResizerHovered(true)}
                    onMouseLeave={() => setIsResizerHovered(false)}
                />
                </>
            )}
        </div>
    );
});
