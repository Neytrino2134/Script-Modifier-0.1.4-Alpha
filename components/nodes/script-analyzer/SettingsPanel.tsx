


import React, { useState, useRef, useEffect } from 'react';
import { InstructionBrick } from './InstructionBrick';
import { SCRIPT_ANALYZER_INSTRUCTIONS } from '../../../utils/prompts/scriptAnalyzer';
import { SAFE_GENERATION_INSTRUCTIONS } from '../../../utils/prompts/common';
import { AnalyzerUiState } from './types';
import { getLanguageName } from '../../../utils/languageUtils';
import { ActionButton } from '../../ActionButton';
import Tooltip from '../../ui/Tooltip';

interface SettingsPanelProps {
    uiState: AnalyzerUiState;
    onUpdateUiState: (updates: Partial<AnalyzerUiState>) => void;
    onUpdateValue: (updates: any) => void;

    // Instruction States
    hierarchyEnabled: boolean;
    mandatoryBgEnabled: boolean;
    statePersistenceEnabled: boolean;
    livingWorldEnabled: boolean;
    extendedAnalysis: boolean;
    microActionBreakdown: boolean;
    batchProcessing: boolean;

    professionalStoryboard: boolean;
    cinematographyEnabled: boolean;

    safeGeneration?: boolean;
    thinkingEnabled?: boolean;
    shotFilter?: 'all' | 'wideOnly';
    anthroEnabled?: boolean;
    subscribeEnhancement?: boolean;
    anatomicalStrictness?: boolean;
    propConsistency?: boolean; // New

    t: (key: string) => string;
    initialHeight: number;
    onHeightChange: (h: number) => void;
    scale: number;
    model: string;
    targetLanguage: string;
    minFrames?: number | null;
    maxFrames?: number | null;
    framesPerScene?: number | null;
    targetScrollId: string | null;
    onSetTargetScrollId: (id: string | null) => void;
}

// Defined outside to prevent re-mounting and flickering during renders
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

export const SettingsPanel: React.FC<SettingsPanelProps> = React.memo(({
    uiState, onUpdateUiState, onUpdateValue,
    hierarchyEnabled, mandatoryBgEnabled, statePersistenceEnabled, livingWorldEnabled,
    extendedAnalysis, microActionBreakdown, batchProcessing,
    professionalStoryboard, cinematographyEnabled,
    safeGeneration = false, thinkingEnabled = false,
    shotFilter = 'all', anthroEnabled = false, subscribeEnhancement = false, anatomicalStrictness = true, propConsistency = true,
    t, initialHeight, onHeightChange, scale, model, targetLanguage, minFrames, maxFrames, framesPerScene,
    targetScrollId, onSetTargetScrollId
}) => {
    const [isResizerHovered, setIsResizerHovered] = useState(false);
    const [stackFilter, setStackFilter] = useState('');
    const brickRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Internal state for smooth dragging
    const [height, setHeight] = useState(initialHeight || 380);

    // Sync internal state with prop
    useEffect(() => {
        if (Math.abs(initialHeight - height) > 1) {
            setHeight(initialHeight || 380);
        }
    }, [initialHeight]);

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
        };

        const handleMouseUp = (upEvent: MouseEvent) => {
            upEvent.preventDefault();
            upEvent.stopPropagation();
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            onHeightChange(currentHeight); // Save persistence on release
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const handleResetSettings = (e: React.MouseEvent) => {
        e.stopPropagation();
        onUpdateValue({
            hierarchyEnabled: true,
            mandatoryBgEnabled: true,
            statePersistenceEnabled: true,
            livingWorldEnabled: true,
            extendedAnalysis: false,
            microActionBreakdown: false,
            batchProcessing: true,
            professionalStoryboard: true,
            cinematographyEnabled: true,
            safeGeneration: false,
            thinkingEnabled: false,
            shotFilter: 'all',
            anthroEnabled: false,
            subscribeEnhancement: false,
            anatomicalStrictness: true, // Reset to True
            propConsistency: true, // Reset to True
            minFrames: null,
            maxFrames: null
        });
    };

    const getFormattedModelName = (modelId: string) => {
        if (modelId === 'gemini-3-flash-preview') return 'Gemini 3 Flash Preview';
        if (modelId === 'gemini-3-pro-preview') return 'Gemini 3 Pro Preview';
        return modelId;
    };

    // Determine adaptive instructions based on Filter
    const isWideOnly = shotFilter === 'wideOnly';

    const storyboardRuleId = isWideOnly ? SCRIPT_ANALYZER_INSTRUCTIONS.STORYBOARD_RULES_WIDE.id : SCRIPT_ANALYZER_INSTRUCTIONS.STORYBOARD_RULES.id;
    const storyboardRuleText = isWideOnly ? SCRIPT_ANALYZER_INSTRUCTIONS.STORYBOARD_RULES_WIDE.text : SCRIPT_ANALYZER_INSTRUCTIONS.STORYBOARD_RULES.text;
    const storyboardRuleDescKey = isWideOnly ? 'instruction.desc.storyboard_rules_wide' : 'instruction.desc.storyboard_rules';

    const cinemaId = isWideOnly ? SCRIPT_ANALYZER_INSTRUCTIONS.CINEMATOGRAPHY_WIDE.id : SCRIPT_ANALYZER_INSTRUCTIONS.CINEMATOGRAPHY.id;
    const cinemaText = isWideOnly ? SCRIPT_ANALYZER_INSTRUCTIONS.CINEMATOGRAPHY_WIDE.text : SCRIPT_ANALYZER_INSTRUCTIONS.CINEMATOGRAPHY.text;
    const cinemaDescKey = isWideOnly ? 'instruction.desc.ana_cinema_wide' : 'instruction.desc.ana_cinema';

    const techId = isWideOnly ? SCRIPT_ANALYZER_INSTRUCTIONS.TECHNICAL_DIRECTIVES_WIDE.id : SCRIPT_ANALYZER_INSTRUCTIONS.TECHNICAL_DIRECTIVES.id;
    const techText = isWideOnly ? SCRIPT_ANALYZER_INSTRUCTIONS.TECHNICAL_DIRECTIVES_WIDE.text : SCRIPT_ANALYZER_INSTRUCTIONS.TECHNICAL_DIRECTIVES.text;
    const techDescKey = isWideOnly ? 'instruction.desc.tech_directives_wide' : 'instruction.desc.tech_directives';

    // Adaptive Extended Analysis
    const extendedId = isWideOnly ? SCRIPT_ANALYZER_INSTRUCTIONS.EXTENDED_VISUALS_WIDE.id : SCRIPT_ANALYZER_INSTRUCTIONS.EXTENDED_VISUALS.id;
    const extendedText = isWideOnly ? SCRIPT_ANALYZER_INSTRUCTIONS.EXTENDED_VISUALS_WIDE.text : SCRIPT_ANALYZER_INSTRUCTIONS.EXTENDED_VISUALS.text;
    const extendedDescKey = isWideOnly ? 'instruction.desc.extended_visuals_wide' : 'instruction.desc.extended_visuals';
    const extendedLabel = t(isWideOnly ? 'instruction.extended_visuals_wide' : 'node.content.extendedAnalysis');

    // Adaptive Mandatory BG - Fix: Change text based on filter
    const mandatoryBgId = isWideOnly ? 'rule_mandatory_bg_wide' : SCRIPT_ANALYZER_INSTRUCTIONS.MANDATORY_BG.id;
    const mandatoryBgText = isWideOnly ? SCRIPT_ANALYZER_INSTRUCTIONS.MANDATORY_BG_WIDE.text : SCRIPT_ANALYZER_INSTRUCTIONS.MANDATORY_BG.text;
    const mandatoryBgDescKey = isWideOnly ? 'instruction.desc.rule_mandatory_bg_wide' : 'instruction.desc.rule_mandatory_bg';

    let stepCount = 0;

    const handleSearchClick = (e: React.MouseEvent, id: string) => {
        onSetTargetScrollId(id);
    };

    const shouldShow = (text: string, label: string) => {
        if (!stackFilter) return true;
        const q = stackFilter.toLowerCase();
        return text.toLowerCase().includes(q) || label.toLowerCase().includes(q);
    };

    return (
        <div
            className={`border ${isResizerHovered ? 'border-emerald-500' : 'border-gray-600'} hover:border-gray-400 rounded-md bg-gray-900 overflow-hidden mb-2 flex-shrink-0 flex flex-col relative transition-colors duration-200`}
            style={{ height: uiState.isSettingsCollapsed ? 'auto' : `${height}px` }}
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

                    <div ref={scrollContainerRef} className="p-2 bg-gray-800/20 flex flex-col gap-1 overflow-y-auto custom-scrollbar flex-grow pb-4 relative" onWheel={(e) => e.stopPropagation()}>

                        {shouldShow(getFormattedModelName(model), t('node.content.model')) && (
                            <InstructionBrick
                                id="model-brick"
                                label={t('node.content.model')}
                                originalText={getFormattedModelName(model)}
                                isMandatory
                                color='gray'
                                className="mb-2"
                            />
                        )}

                        {shouldShow(SCRIPT_ANALYZER_INSTRUCTIONS.INPUTS.text, t(`instruction.${SCRIPT_ANALYZER_INSTRUCTIONS.INPUTS.id}`)) && (
                            <InstructionBrick
                                ref={el => { brickRefs.current[SCRIPT_ANALYZER_INSTRUCTIONS.INPUTS.id] = el; }}
                                id={SCRIPT_ANALYZER_INSTRUCTIONS.INPUTS.id}
                                index={++stepCount}
                                label={t(`instruction.${SCRIPT_ANALYZER_INSTRUCTIONS.INPUTS.id}`)}
                                originalText={SCRIPT_ANALYZER_INSTRUCTIONS.INPUTS.text}
                                translatedText={t(`instruction.desc.${SCRIPT_ANALYZER_INSTRUCTIONS.INPUTS.id}`)}
                                isMandatory
                                color='gray'
                                isHighlighted={targetScrollId === SCRIPT_ANALYZER_INSTRUCTIONS.INPUTS.id}
                            />
                        )}

                        {shouldShow(getLanguageName(targetLanguage), t('node.content.targetLanguage')) && (
                            <InstructionBrick
                                id="target-lang-brick"
                                index={++stepCount}
                                label={t('node.content.targetLanguage')}
                                originalText={getLanguageName(targetLanguage)}
                                translatedText={t('instruction.desc.target_lang')}
                                isMandatory
                                color='gray'
                            />
                        )}

                        {/* Thinking Mode - Moved to Top */}
                        {shouldShow("Enable extended reasoning", t('node.content.thinkingEnabled')) && (
                            <InstructionBrick
                                ref={el => { brickRefs.current['thinking_mode'] = el; }}
                                id="thinking_mode"
                                index={thinkingEnabled ? ++stepCount : undefined}
                                label={t('node.content.thinkingEnabled')}
                                originalText="Enable extended reasoning for deeper plot coherence."
                                translatedText="Включить расширенное мышление для улучшения сюжета."
                                isEnabled={thinkingEnabled}
                                onToggle={() => onUpdateValue({ thinkingEnabled: !thinkingEnabled })}
                                color='cyan'
                                isHighlighted={targetScrollId === 'thinking_mode'}
                            />
                        )}

                        {/* 1. SYSTEM & CONTEXT */}
                        <div className="space-y-1 mb-3">
                            <h6 className="text-[9px] font-bold text-gray-500 uppercase px-1 border-b border-gray-700/50 pb-0.5">{t('node.content.stack.system')}</h6>

                            {/* Safety Brick */}
                            {shouldShow(SAFE_GENERATION_INSTRUCTIONS.text, t('node.content.safeGeneration')) && (
                                <InstructionBrick
                                    ref={el => { brickRefs.current['safe_gen'] = el; }}
                                    id="safe_gen"
                                    index={safeGeneration ? ++stepCount : undefined}
                                    label={t('node.content.safeGeneration')}
                                    originalText={SAFE_GENERATION_INSTRUCTIONS.text}
                                    translatedText={t('instruction.desc.safe_gen')}
                                    isCritical
                                    isEnabled={safeGeneration}
                                    onToggle={() => onUpdateValue({ safeGeneration: !safeGeneration })}
                                    isHighlighted={targetScrollId === 'safe_gen'}
                                />
                            )}

                            {shouldShow(SCRIPT_ANALYZER_INSTRUCTIONS.BATCH_PROCESSING.text, t('instruction.batch_processing')) && (
                                <InstructionBrick
                                    ref={el => { brickRefs.current[SCRIPT_ANALYZER_INSTRUCTIONS.BATCH_PROCESSING.id] = el; }}
                                    id={SCRIPT_ANALYZER_INSTRUCTIONS.BATCH_PROCESSING.id}
                                    index={batchProcessing ? ++stepCount : undefined}
                                    label={t('instruction.batch_processing')}
                                    originalText={SCRIPT_ANALYZER_INSTRUCTIONS.BATCH_PROCESSING.text}
                                    translatedText={t('instruction.desc.batch_processing')}
                                    isEnabled={batchProcessing}
                                    onToggle={() => onUpdateValue({ batchProcessing: !batchProcessing })}
                                    color='emerald'
                                    isHighlighted={targetScrollId === SCRIPT_ANALYZER_INSTRUCTIONS.BATCH_PROCESSING.id}
                                />
                            )}
                        </div>

                        {/* 2. ROLE & CORE LOGIC */}
                        <div className="space-y-1 mb-3">
                            <h6 className="text-[9px] font-bold text-gray-500 uppercase px-1 border-b border-gray-700/50 pb-0.5">{t('node.content.stack.role')}</h6>
                            {shouldShow(SCRIPT_ANALYZER_INSTRUCTIONS.ROLE.text, t('instruction.ana_role')) && (
                                <InstructionBrick
                                    ref={el => { brickRefs.current[SCRIPT_ANALYZER_INSTRUCTIONS.ROLE.id] = el; }}
                                    id={SCRIPT_ANALYZER_INSTRUCTIONS.ROLE.id}
                                    index={++stepCount}
                                    label={t('instruction.ana_role')}
                                    originalText={SCRIPT_ANALYZER_INSTRUCTIONS.ROLE.text}
                                    translatedText={t('instruction.desc.ana_role')}
                                    isMandatory
                                    color='emerald'
                                    isHighlighted={targetScrollId === SCRIPT_ANALYZER_INSTRUCTIONS.ROLE.id}
                                />
                            )}
                            {/* CRITICAL CORE LOGIC STACK (RED) */}
                            {shouldShow(SCRIPT_ANALYZER_INSTRUCTIONS.STATIC_FRAME_LOGIC.text, SCRIPT_ANALYZER_INSTRUCTIONS.STATIC_FRAME_LOGIC.label) && (
                                <InstructionBrick
                                    ref={el => { brickRefs.current[SCRIPT_ANALYZER_INSTRUCTIONS.STATIC_FRAME_LOGIC.id] = el; }}
                                    id={SCRIPT_ANALYZER_INSTRUCTIONS.STATIC_FRAME_LOGIC.id}
                                    index={++stepCount}
                                    label={t('instruction.static_frame_logic')}
                                    originalText={SCRIPT_ANALYZER_INSTRUCTIONS.STATIC_FRAME_LOGIC.text}
                                    translatedText={t('instruction.desc.static_frame_logic')}
                                    isMandatory
                                    isCritical
                                    isHighlighted={targetScrollId === SCRIPT_ANALYZER_INSTRUCTIONS.STATIC_FRAME_LOGIC.id}
                                />
                            )}
                            {shouldShow(SCRIPT_ANALYZER_INSTRUCTIONS.ANATOMICAL_POSING.text, SCRIPT_ANALYZER_INSTRUCTIONS.ANATOMICAL_POSING.label) && (
                                <InstructionBrick
                                    ref={el => { brickRefs.current[SCRIPT_ANALYZER_INSTRUCTIONS.ANATOMICAL_POSING.id] = el; }}
                                    id={SCRIPT_ANALYZER_INSTRUCTIONS.ANATOMICAL_POSING.id}
                                    index={++stepCount}
                                    label={t('instruction.anatomical_posing')}
                                    originalText={SCRIPT_ANALYZER_INSTRUCTIONS.ANATOMICAL_POSING.text}
                                    translatedText={t('instruction.desc.anatomical_posing')}
                                    isMandatory
                                    isCritical
                                    isHighlighted={targetScrollId === SCRIPT_ANALYZER_INSTRUCTIONS.ANATOMICAL_POSING.id}
                                />
                            )}
                            {shouldShow(SCRIPT_ANALYZER_INSTRUCTIONS.ANATOMICAL_STRICTNESS.text, SCRIPT_ANALYZER_INSTRUCTIONS.ANATOMICAL_STRICTNESS.label) && (
                                <InstructionBrick
                                    ref={el => { brickRefs.current[SCRIPT_ANALYZER_INSTRUCTIONS.ANATOMICAL_STRICTNESS.id] = el; }}
                                    id={SCRIPT_ANALYZER_INSTRUCTIONS.ANATOMICAL_STRICTNESS.id}
                                    index={++stepCount}
                                    label={t('instruction.anatomical_strictness')}
                                    originalText={SCRIPT_ANALYZER_INSTRUCTIONS.ANATOMICAL_STRICTNESS.text}
                                    translatedText={t('instruction.desc.anatomical_strictness')}
                                    isEnabled={anatomicalStrictness}
                                    onToggle={() => onUpdateValue({ anatomicalStrictness: !anatomicalStrictness })}
                                    color='emerald'
                                    isCritical // Keep critical style but allow toggle
                                    isHighlighted={targetScrollId === SCRIPT_ANALYZER_INSTRUCTIONS.ANATOMICAL_STRICTNESS.id}
                                />
                            )}
                            {/* PROP CONSISTENCY (Object Specificity) */}
                            {shouldShow(SCRIPT_ANALYZER_INSTRUCTIONS.PROP_CONSISTENCY.text, SCRIPT_ANALYZER_INSTRUCTIONS.PROP_CONSISTENCY.label) && (
                                <InstructionBrick
                                    ref={el => { brickRefs.current[SCRIPT_ANALYZER_INSTRUCTIONS.PROP_CONSISTENCY.id] = el; }}
                                    id={SCRIPT_ANALYZER_INSTRUCTIONS.PROP_CONSISTENCY.id}
                                    index={++stepCount}
                                    label={t('instruction.prop_consistency')}
                                    originalText={SCRIPT_ANALYZER_INSTRUCTIONS.PROP_CONSISTENCY.text}
                                    translatedText={t('instruction.desc.prop_consistency')}
                                    isEnabled={propConsistency}
                                    onToggle={() => onUpdateValue({ propConsistency: !propConsistency })}
                                    color='emerald'
                                    isHighlighted={targetScrollId === SCRIPT_ANALYZER_INSTRUCTIONS.PROP_CONSISTENCY.id}
                                />
                            )}

                            {shouldShow(SCRIPT_ANALYZER_INSTRUCTIONS.MOTION_DYNAMICS.text, SCRIPT_ANALYZER_INSTRUCTIONS.MOTION_DYNAMICS.label) && (
                                <InstructionBrick
                                    ref={el => { brickRefs.current[SCRIPT_ANALYZER_INSTRUCTIONS.MOTION_DYNAMICS.id] = el; }}
                                    id={SCRIPT_ANALYZER_INSTRUCTIONS.MOTION_DYNAMICS.id}
                                    index={++stepCount}
                                    label={t('instruction.motion_dynamics')}
                                    originalText={SCRIPT_ANALYZER_INSTRUCTIONS.MOTION_DYNAMICS.text}
                                    translatedText={t('instruction.desc.motion_dynamics')}
                                    isMandatory
                                    isCritical
                                    isHighlighted={targetScrollId === SCRIPT_ANALYZER_INSTRUCTIONS.MOTION_DYNAMICS.id}
                                />
                            )}
                            {/* NEW: Subject Hierarchy / Context Hierarchy */}
                            {shouldShow(SCRIPT_ANALYZER_INSTRUCTIONS.SUBJECT_HIERARCHY.text, SCRIPT_ANALYZER_INSTRUCTIONS.SUBJECT_HIERARCHY.label) && (
                                <InstructionBrick
                                    ref={el => { brickRefs.current[SCRIPT_ANALYZER_INSTRUCTIONS.SUBJECT_HIERARCHY.id] = el; }}
                                    id={SCRIPT_ANALYZER_INSTRUCTIONS.SUBJECT_HIERARCHY.id}
                                    index={++stepCount}
                                    label={t('instruction.subject_hierarchy')}
                                    originalText={SCRIPT_ANALYZER_INSTRUCTIONS.SUBJECT_HIERARCHY.text}
                                    translatedText={t('instruction.desc.subject_hierarchy')}
                                    isMandatory
                                    isCritical
                                    isHighlighted={targetScrollId === SCRIPT_ANALYZER_INSTRUCTIONS.SUBJECT_HIERARCHY.id}
                                />
                            )}
                            {shouldShow(SCRIPT_ANALYZER_INSTRUCTIONS.RULE_ISOLATION.text, SCRIPT_ANALYZER_INSTRUCTIONS.RULE_ISOLATION.label) && (
                                <InstructionBrick
                                    ref={el => { brickRefs.current[SCRIPT_ANALYZER_INSTRUCTIONS.RULE_ISOLATION.id] = el; }}
                                    id={SCRIPT_ANALYZER_INSTRUCTIONS.RULE_ISOLATION.id}
                                    index={++stepCount}
                                    label={t('instruction.rule_isolation')}
                                    originalText={SCRIPT_ANALYZER_INSTRUCTIONS.RULE_ISOLATION.text}
                                    translatedText={t('instruction.desc.rule_isolation')}
                                    isMandatory
                                    isCritical
                                    isHighlighted={targetScrollId === SCRIPT_ANALYZER_INSTRUCTIONS.RULE_ISOLATION.id}
                                />
                            )}
                            {shouldShow(SCRIPT_ANALYZER_INSTRUCTIONS.SENSORY_SATURATION.text, SCRIPT_ANALYZER_INSTRUCTIONS.SENSORY_SATURATION.label) && (
                                <InstructionBrick
                                    ref={el => { brickRefs.current[SCRIPT_ANALYZER_INSTRUCTIONS.SENSORY_SATURATION.id] = el; }}
                                    id={SCRIPT_ANALYZER_INSTRUCTIONS.SENSORY_SATURATION.id}
                                    index={++stepCount}
                                    label={t('instruction.sensory_saturation')}
                                    originalText={SCRIPT_ANALYZER_INSTRUCTIONS.SENSORY_SATURATION.text}
                                    translatedText={t('instruction.desc.sensory_saturation')}
                                    isMandatory
                                    isCritical
                                    isHighlighted={targetScrollId === SCRIPT_ANALYZER_INSTRUCTIONS.SENSORY_SATURATION.id}
                                />
                            )}
                        </div>

                        {/* 3. CINEMATOGRAPHY & FRAMING */}
                        <div className="space-y-1 mb-3">
                            <h6 className="text-[9px] font-bold text-gray-500 uppercase px-1 border-b border-gray-700/50 pb-0.5">{t('node.content.stack.cinematography')}</h6>

                            {shouldShow(SCRIPT_ANALYZER_INSTRUCTIONS.SHOT_FILTER_WIDE.text, t('node.content.shotFilter.wideOnly')) && (
                                <InstructionBrick
                                    ref={el => { brickRefs.current[SCRIPT_ANALYZER_INSTRUCTIONS.SHOT_FILTER_WIDE.id] = el; }}
                                    id={SCRIPT_ANALYZER_INSTRUCTIONS.SHOT_FILTER_WIDE.id}
                                    index={isWideOnly ? ++stepCount : undefined}
                                    label={t('node.content.shotFilter.wideOnly')}
                                    originalText={SCRIPT_ANALYZER_INSTRUCTIONS.SHOT_FILTER_WIDE.text}
                                    translatedText={t('instruction.desc.shot_filter_wide')}
                                    isEnabled={isWideOnly}
                                    onToggle={() => onUpdateValue({ shotFilter: isWideOnly ? 'all' : 'wideOnly' })}
                                    color='cyan'
                                    isHighlighted={targetScrollId === SCRIPT_ANALYZER_INSTRUCTIONS.SHOT_FILTER_WIDE.id}
                                />
                            )}

                            {shouldShow(cinemaText, t(isWideOnly ? 'instruction.ana_cinema_wide' : 'instruction.ana_cinema')) && (
                                <InstructionBrick
                                    ref={el => { brickRefs.current[cinemaId] = el; }}
                                    id={cinemaId}
                                    index={cinematographyEnabled ? ++stepCount : undefined}
                                    label={t(isWideOnly ? 'instruction.ana_cinema_wide' : 'instruction.ana_cinema')}
                                    originalText={cinemaText}
                                    translatedText={t(cinemaDescKey)}
                                    isEnabled={cinematographyEnabled}
                                    onToggle={() => onUpdateValue({ cinematographyEnabled: !cinematographyEnabled })}
                                    color='emerald'
                                    isHighlighted={targetScrollId === cinemaId}
                                />
                            )}

                            {shouldShow(storyboardRuleText, t(isWideOnly ? 'instruction.storyboard_rules_wide' : 'instruction.storyboard_rules')) && (
                                <InstructionBrick
                                    ref={el => { brickRefs.current[storyboardRuleId] = el; }}
                                    id={storyboardRuleId}
                                    index={professionalStoryboard ? ++stepCount : undefined}
                                    label={t(isWideOnly ? 'instruction.storyboard_rules_wide' : 'instruction.storyboard_rules')}
                                    originalText={storyboardRuleText}
                                    translatedText={t(storyboardRuleDescKey)}
                                    isEnabled={professionalStoryboard}
                                    onToggle={() => onUpdateValue({ professionalStoryboard: !professionalStoryboard })}
                                    color='emerald'
                                    isHighlighted={targetScrollId === storyboardRuleId}
                                />
                            )}
                            {shouldShow(techText, t(isWideOnly ? 'instruction.tech_directives_wide' : 'instruction.tech_directives')) && (
                                <InstructionBrick
                                    ref={el => { brickRefs.current[techId] = el; }}
                                    id={techId}
                                    index={++stepCount}
                                    label={t(isWideOnly ? 'instruction.tech_directives_wide' : 'instruction.tech_directives')}
                                    originalText={techText}
                                    translatedText={t(techDescKey)}
                                    isEnabled={true}
                                    isMandatory={true}
                                    color='emerald'
                                    className="opacity-100"
                                    isHighlighted={targetScrollId === techId}
                                />
                            )}

                            {shouldShow(mandatoryBgText, t('instruction.rule_mandatory_bg')) && (
                                <InstructionBrick
                                    ref={el => { brickRefs.current[mandatoryBgId] = el; }}
                                    id={mandatoryBgId}
                                    index={mandatoryBgEnabled ? ++stepCount : undefined}
                                    label={t('instruction.rule_mandatory_bg')}
                                    originalText={mandatoryBgText}
                                    translatedText={t(mandatoryBgDescKey)}
                                    isCritical
                                    isEnabled={mandatoryBgEnabled}
                                    onToggle={() => onUpdateValue({ mandatoryBgEnabled: !mandatoryBgEnabled })}
                                    isHighlighted={targetScrollId === mandatoryBgId}
                                />
                            )}

                            {shouldShow(extendedText, extendedLabel) && (
                                <InstructionBrick
                                    ref={el => { brickRefs.current[extendedId] = el; }}
                                    id={extendedId}
                                    index={extendedAnalysis ? ++stepCount : undefined}
                                    label={extendedLabel}
                                    originalText={extendedText}
                                    translatedText={t(extendedDescKey)}
                                    isEnabled={extendedAnalysis}
                                    onToggle={() => onUpdateValue({ extendedAnalysis: !extendedAnalysis })}
                                    color='cyan'
                                    isHighlighted={targetScrollId === extendedId}
                                />
                            )}

                            {shouldShow(SCRIPT_ANALYZER_INSTRUCTIONS.ACTION_PHASE_BREAKDOWN.text, t('node.content.microActionBreakdown')) && (
                                <InstructionBrick
                                    ref={el => { brickRefs.current[SCRIPT_ANALYZER_INSTRUCTIONS.ACTION_PHASE_BREAKDOWN.id] = el; }}
                                    id={SCRIPT_ANALYZER_INSTRUCTIONS.ACTION_PHASE_BREAKDOWN.id}
                                    index={microActionBreakdown ? ++stepCount : undefined}
                                    label={t('node.content.microActionBreakdown')}
                                    originalText={SCRIPT_ANALYZER_INSTRUCTIONS.ACTION_PHASE_BREAKDOWN.text}
                                    translatedText={t('instruction.desc.action_phase_breakdown')}
                                    isEnabled={microActionBreakdown}
                                    onToggle={() => onUpdateValue({ microActionBreakdown: !microActionBreakdown })}
                                    color='cyan'
                                    isHighlighted={targetScrollId === SCRIPT_ANALYZER_INSTRUCTIONS.ACTION_PHASE_BREAKDOWN.id}
                                />
                            )}

                            {shouldShow(t('node.content.recommendedFrames'), t('node.content.recommendedFrames')) && (
                                <InstructionBrick
                                    id="framing-logic"
                                    index={++stepCount}
                                    label={t('node.content.recommendedFrames')}
                                    originalText={
                                        (minFrames || maxFrames)
                                            ? `GLOBAL FRAME COUNT: Generate between ${minFrames || 1} and ${maxFrames || 'unlimited'} frames per scene.`
                                            : (framesPerScene
                                                ? `GLOBAL MINIMUM FRAMES: Generate at least ${framesPerScene} frames per scene.`
                                                : `PER-SCENE FRAMING: Check 'recommendedFrames' property per scene. Generate enough shots to cover narrative pacing.`)
                                    }
                                    translatedText={
                                        (minFrames || maxFrames)
                                            ? `Глобальный диапазон: от ${minFrames || 1} до ${maxFrames || 'беск.'} кадров.`
                                            : (framesPerScene
                                                ? `Глобальный минимум: ${framesPerScene} кадров на цену.`
                                                : `Посегментная раскадровка на основе рекомендаций генератора.`)
                                    }
                                    isMandatory
                                    color='gray'
                                />
                            )}
                        </div>

                        {/* 4. WORLD & CONTINUITY */}
                        <div className="space-y-1 mb-1">
                            <h6 className="text-[9px] font-bold text-gray-500 uppercase px-1 border-b border-gray-700/50 pb-0.5">{t('node.content.stack.world')}</h6>

                            {shouldShow(SCRIPT_ANALYZER_INSTRUCTIONS.HIERARCHY.text, t('instruction.rule_hierarchy')) && (
                                <InstructionBrick
                                    ref={el => { brickRefs.current[SCRIPT_ANALYZER_INSTRUCTIONS.HIERARCHY.id] = el; }}
                                    id={SCRIPT_ANALYZER_INSTRUCTIONS.HIERARCHY.id}
                                    index={hierarchyEnabled ? ++stepCount : undefined}
                                    label={t('instruction.rule_hierarchy')}
                                    originalText={SCRIPT_ANALYZER_INSTRUCTIONS.HIERARCHY.text}
                                    translatedText={t('instruction.desc.rule_hierarchy')}
                                    isEnabled={hierarchyEnabled}
                                    onToggle={() => onUpdateValue({ hierarchyEnabled: !hierarchyEnabled })}
                                    color='emerald'
                                    isHighlighted={targetScrollId === SCRIPT_ANALYZER_INSTRUCTIONS.HIERARCHY.id}
                                />
                            )}
                            {shouldShow(SCRIPT_ANALYZER_INSTRUCTIONS.LIVING_WORLD.text, t('instruction.rule_living_world')) && (
                                <InstructionBrick
                                    ref={el => { brickRefs.current[SCRIPT_ANALYZER_INSTRUCTIONS.LIVING_WORLD.id] = el; }}
                                    id={SCRIPT_ANALYZER_INSTRUCTIONS.LIVING_WORLD.id}
                                    index={livingWorldEnabled ? ++stepCount : undefined}
                                    label={t('instruction.rule_living_world')}
                                    // Adaptive text for UI visualization
                                    originalText={anthroEnabled
                                        ? "**LIVING WORLD & EXTRAS (ANTHRO):** Describe background extras/crowds as **Anthropomorphic Animals** of diverse species."
                                        : SCRIPT_ANALYZER_INSTRUCTIONS.LIVING_WORLD.text}
                                    translatedText={anthroEnabled
                                        ? t('instruction.desc.rule_living_world_anthro')
                                        : t('instruction.desc.rule_living_world')}
                                    isEnabled={livingWorldEnabled}
                                    onToggle={() => onUpdateValue({ livingWorldEnabled: !livingWorldEnabled })}
                                    color='emerald'
                                    isHighlighted={targetScrollId === SCRIPT_ANALYZER_INSTRUCTIONS.LIVING_WORLD.id}
                                />
                            )}
                            {shouldShow(SCRIPT_ANALYZER_INSTRUCTIONS.STATE_PERSISTENCE.text, t('instruction.rule_persistence')) && (
                                <InstructionBrick
                                    ref={el => { brickRefs.current[SCRIPT_ANALYZER_INSTRUCTIONS.STATE_PERSISTENCE.id] = el; }}
                                    id={SCRIPT_ANALYZER_INSTRUCTIONS.STATE_PERSISTENCE.id}
                                    index={statePersistenceEnabled ? ++stepCount : undefined}
                                    label={t('instruction.rule_persistence')}
                                    originalText={SCRIPT_ANALYZER_INSTRUCTIONS.STATE_PERSISTENCE.text}
                                    translatedText={t('instruction.desc.rule_persistence')}
                                    isEnabled={statePersistenceEnabled}
                                    onToggle={() => onUpdateValue({ statePersistenceEnabled: !statePersistenceEnabled })}
                                    color='emerald'
                                    isHighlighted={targetScrollId === SCRIPT_ANALYZER_INSTRUCTIONS.STATE_PERSISTENCE.id}
                                />
                            )}

                            {shouldShow(SCRIPT_ANALYZER_INSTRUCTIONS.USE_ALIASES.text, t('instruction.use_aliases')) && (
                                <InstructionBrick
                                    ref={el => { brickRefs.current[SCRIPT_ANALYZER_INSTRUCTIONS.USE_ALIASES.id] = el; }}
                                    id={SCRIPT_ANALYZER_INSTRUCTIONS.USE_ALIASES.id}
                                    index={++stepCount}
                                    label={t('instruction.use_aliases')}
                                    originalText={SCRIPT_ANALYZER_INSTRUCTIONS.USE_ALIASES.text}
                                    translatedText={t('instruction.desc.use_aliases')}
                                    isMandatory
                                    color='gray'
                                    isHighlighted={targetScrollId === SCRIPT_ANALYZER_INSTRUCTIONS.USE_ALIASES.id}
                                />
                            )}

                            {/* NEW: Character Array Integrity */}
                            {shouldShow(SCRIPT_ANALYZER_INSTRUCTIONS.CHARACTER_ARRAY_INTEGRITY.text, t('instruction.character_array_integrity')) && (
                                <InstructionBrick
                                    ref={el => { brickRefs.current[SCRIPT_ANALYZER_INSTRUCTIONS.CHARACTER_ARRAY_INTEGRITY.id] = el; }}
                                    id={SCRIPT_ANALYZER_INSTRUCTIONS.CHARACTER_ARRAY_INTEGRITY.id}
                                    index={++stepCount}
                                    label={t('instruction.character_array_integrity')}
                                    originalText={SCRIPT_ANALYZER_INSTRUCTIONS.CHARACTER_ARRAY_INTEGRITY.text}
                                    translatedText={t('instruction.desc.character_array_integrity')}
                                    isMandatory
                                    isCritical
                                    isHighlighted={targetScrollId === SCRIPT_ANALYZER_INSTRUCTIONS.CHARACTER_ARRAY_INTEGRITY.id}
                                />
                            )}

                            {/* ENTITY LIMIT */}
                            {shouldShow(SCRIPT_ANALYZER_INSTRUCTIONS.ENTITY_LIMIT.text, t('instruction.entity_limit')) && (
                                <InstructionBrick
                                    ref={el => { brickRefs.current[SCRIPT_ANALYZER_INSTRUCTIONS.ENTITY_LIMIT.id] = el; }}
                                    id={SCRIPT_ANALYZER_INSTRUCTIONS.ENTITY_LIMIT.id}
                                    index={++stepCount}
                                    label={t('instruction.entity_limit')}
                                    originalText={SCRIPT_ANALYZER_INSTRUCTIONS.ENTITY_LIMIT.text}
                                    translatedText={t('instruction.desc.entity_limit')}
                                    isMandatory
                                    isCritical
                                    isHighlighted={targetScrollId === SCRIPT_ANALYZER_INSTRUCTIONS.ENTITY_LIMIT.id}
                                />
                            )}

                            {shouldShow(SCRIPT_ANALYZER_INSTRUCTIONS.ANTHRO_LOGIC.text, t('node.content.anthroEnabled')) && (
                                <InstructionBrick
                                    ref={el => { brickRefs.current[SCRIPT_ANALYZER_INSTRUCTIONS.ANTHRO_LOGIC.id] = el; }}
                                    id={SCRIPT_ANALYZER_INSTRUCTIONS.ANTHRO_LOGIC.id}
                                    index={anthroEnabled ? ++stepCount : undefined}
                                    label={t('node.content.anthroEnabled')}
                                    originalText={SCRIPT_ANALYZER_INSTRUCTIONS.ANTHRO_LOGIC.text}
                                    translatedText={t('instruction.desc.ana_anthro_logic')}
                                    isEnabled={anthroEnabled}
                                    onToggle={() => onUpdateValue({ anthroEnabled: !anthroEnabled })}
                                    color='cyan'
                                    isHighlighted={targetScrollId === SCRIPT_ANALYZER_INSTRUCTIONS.ANTHRO_LOGIC.id}
                                />
                            )}
                            {shouldShow(SCRIPT_ANALYZER_INSTRUCTIONS.SUBSCRIBE_LOGIC.text, t('node.content.subscribeEnhancement')) && (
                                <InstructionBrick
                                    ref={el => { brickRefs.current[SCRIPT_ANALYZER_INSTRUCTIONS.SUBSCRIBE_LOGIC.id] = el; }}
                                    id={SCRIPT_ANALYZER_INSTRUCTIONS.SUBSCRIBE_LOGIC.id}
                                    index={subscribeEnhancement ? ++stepCount : undefined}
                                    label={t('node.content.subscribeEnhancement')}
                                    originalText={SCRIPT_ANALYZER_INSTRUCTIONS.SUBSCRIBE_LOGIC.text}
                                    translatedText={t('instruction.desc.ana_subscribe_logic')}
                                    isEnabled={subscribeEnhancement}
                                    onToggle={() => onUpdateValue({ subscribeEnhancement: !subscribeEnhancement })}
                                    color='cyan'
                                    isHighlighted={targetScrollId === SCRIPT_ANALYZER_INSTRUCTIONS.SUBSCRIBE_LOGIC.id}
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