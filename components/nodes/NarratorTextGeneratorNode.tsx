
import React, { useMemo, useEffect } from 'react';
import type { NodeContentProps } from '../../types';
import { ActionButton } from '../ActionButton';
import CustomSelect, { CustomSelectOption } from '../ui/CustomSelect';
import CustomCheckbox from '../ui/CustomCheckbox';
import { SettingsPanel } from './narrator-text-generator/SettingsPanel';
import Tooltip from '../ui/Tooltip';

const LANGUAGES = [
    { code: 'ru', label: 'RU' },
    { code: 'en', label: 'EN' },
    { code: 'es', label: 'ES' },
    { code: 'fr', label: 'FR' },
    { code: 'de', label: 'DE' },
    { code: 'it', label: 'IT' },
    { code: 'pt', label: 'PT' },
    { code: 'zh', label: 'ZH' },
    { code: 'ja', label: 'JA' },
    { code: 'ko', label: 'KO' },
];

const LANGUAGE_NAMES: Record<string, string> = {
    ru: 'Русский', en: 'English', es: 'Español', fr: 'Français', de: 'Deutsch',
    it: 'Italiano', pt: 'Português', zh: '中文', ja: '日本語', ko: '한국어'
};

const NarratorTextGeneratorNode: React.FC<NodeContentProps> = ({
    node,
    onValueChange,
    t,
    deselectAllNodes,
    connectedInputs,
    onGenerateNarratorText,
    isGeneratingNarratorText,
    isStopping,
    onStopGeneration,
    getUpstreamTextValue,
    inputData,
    connections
}) => {
    const isLoading = isGeneratingNarratorText === node.id;
    const isInputConnected = connectedInputs?.has(undefined);

    const parsedValue = useMemo(() => {
        try {
            const parsed = JSON.parse(node.value || '{}');
            const targetLanguages = parsed.targetLanguages || { ru: true, en: false };
            const languageSelectionOrder = parsed.languageSelectionOrder || Object.keys(targetLanguages).filter(k => targetLanguages[k]);

            return {
                prompt: parsed.prompt || '',
                role: parsed.role || 'narrator',
                generatedTexts: parsed.generatedTexts || { ru: '', en: '' },
                targetLanguages,
                generateSSML: parsed.generateSSML || false,
                languageSelectionOrder,
                uiState: parsed.uiState || { isSettingsCollapsed: true }
            };
        } catch {
            return { 
                prompt: '', 
                role: 'narrator', 
                generatedTexts: { ru: '', en: '' }, 
                targetLanguages: { ru: true, en: false }, 
                generateSSML: false,
                languageSelectionOrder: ['ru'],
                uiState: { isSettingsCollapsed: true }
            };
        }
    }, [node.value]);

    const { prompt, role, generatedTexts, targetLanguages, generateSSML, languageSelectionOrder, uiState } = parsedValue;

    const roleOptions = useMemo<CustomSelectOption[]>(() => [
        { value: "narrator", label: t('node.content.role.narrator') },
        { value: "announcer", label: t('node.content.role.announcer') },
        { value: "first_person", label: t('node.content.role.first_person') },
        { value: "dual_narrator", label: t('node.content.role.dual_narrator') },
        { value: "dual_announcer", label: t('node.content.role.dual_announcer') },
    ], [t]);

    const handleValueUpdate = (updates: Partial<typeof parsedValue>) => {
        const newValue = { ...parsedValue, ...updates };
        onValueChange(node.id, JSON.stringify(newValue));
    };
    
    const handleUiStateUpdate = (updates: any) => {
        handleValueUpdate({ uiState: { ...uiState, ...updates } });
    };

    // Automatically fetch prompt if input changes
    useEffect(() => {
        if (isInputConnected && getUpstreamTextValue && connections) {
            const inputConnection = connections.find(c => c.toNodeId === node.id);
            if (inputConnection) {
                 const newPrompt = getUpstreamTextValue(inputConnection.fromNodeId, inputConnection.fromHandleId);
                 if (newPrompt !== prompt) {
                     handleValueUpdate({ prompt: newPrompt });
                 }
            }
        }
    }, [inputData, isInputConnected]);

    const handleLangChange = (lang: string) => {
        const isSelected = !!targetLanguages[lang];
        let newTargetLanguages = { ...targetLanguages };
        let newOrder = [...(languageSelectionOrder || [])];

        if (isSelected) {
            newTargetLanguages[lang] = false;
            newOrder = newOrder.filter(l => l !== lang);
        } else {
             // If we are adding a new language and hit the limit (2), remove the oldest one
             while (newOrder.length >= 2) {
                const removed = newOrder.shift();
                if (removed) newTargetLanguages[removed] = false;
            }
            newTargetLanguages[lang] = true;
            newOrder.push(lang);
        }

        handleValueUpdate({
            targetLanguages: newTargetLanguages,
            languageSelectionOrder: newOrder
        });
    };
    
    const handleGeneratedTextChange = (lang: string, newText: string) => {
        handleValueUpdate({
            generatedTexts: {
                ...generatedTexts,
                [lang]: newText,
            }
        });
    };

    return (
        <div className="flex flex-col h-full space-y-2">
            <textarea
                value={prompt}
                onChange={(e) => handleValueUpdate({ prompt: e.target.value })}
                placeholder={isInputConnected ? t('node.content.connectedPlaceholder') : t('node.content.scriptPromptPlaceholder')}
                disabled={isInputConnected || isLoading}
                className="w-full min-h-[80px] max-h-[140px] p-2 bg-gray-700 border border-transparent rounded-md resize-y focus:border-emerald-500 focus:ring-0 focus:outline-none disabled:bg-gray-800 disabled:text-gray-500 custom-scrollbar flex-shrink-0"
                onWheel={e => e.stopPropagation()}
                onFocus={deselectAllNodes}
            />

            <div className="flex-shrink-0 flex items-center space-x-2">
                <div className="w-40 flex-shrink-0">
                    <CustomSelect
                        value={role}
                        onChange={(val) => handleValueUpdate({ role: val })}
                        options={roleOptions}
                        disabled={isLoading}
                        id={`narrator-role-${node.id}`}
                    />
                </div>
                <div className="flex items-center bg-gray-700 rounded-md px-2 space-x-2 h-9 border border-gray-600 flex-shrink-0" title="Embed intonation tags for speech synthesis.">
                    <CustomCheckbox
                        id={`generate-ssml-${node.id}`}
                        checked={generateSSML}
                        onChange={(checked) => handleValueUpdate({ generateSSML: checked })}
                        disabled={isLoading}
                        className="h-4 w-4"
                    />
                    <label htmlFor={`generate-ssml-${node.id}`} className="text-xs text-gray-300 select-none cursor-pointer font-medium">SSML</label>
                </div>
                <button
                    onClick={isLoading ? onStopGeneration : () => onGenerateNarratorText(node.id)}
                    disabled={isStopping || (!isLoading && !prompt.trim() && !isInputConnected)}
                    className={`flex-grow h-9 px-4 py-2 font-bold text-white text-xs uppercase rounded-md transition-colors duration-200 flex-shrink-0 flex items-center justify-center ${isStopping ? 'bg-yellow-600' : (isLoading ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-500')}`}
                >
                    {!isLoading && !isStopping && (
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    )}
                    {isStopping ? t('node.action.stopping') : (isLoading ? t('node.content.generating') : t('node.content.generateText'))}
                </button>
            </div>
            
            <SettingsPanel 
                uiState={uiState}
                onUpdateUiState={handleUiStateUpdate}
                role={role}
                generateSSML={generateSSML}
                onToggleSSML={() => handleValueUpdate({ generateSSML: !generateSSML })}
                t={t}
            />

            {/* Language Selector Group */}
            <div className="flex-shrink-0 bg-gray-700/50 p-1 rounded-md">
                <div className="flex flex-wrap gap-1">
                    {LANGUAGES.map((lang) => (
                        <Tooltip key={lang.code} title={t(`languages.${lang.code}`)} position="top">
                            <button
                                onClick={() => handleLangChange(lang.code)}
                                className={`flex-1 min-w-[30px] py-1 rounded text-[10px] font-bold uppercase transition-colors ${
                                    targetLanguages[lang.code] 
                                        ? 'bg-emerald-600 text-white shadow-sm' 
                                        : 'bg-gray-800 text-gray-400 hover:bg-gray-600 hover:text-gray-200'
                                }`}
                            >
                                {lang.label}
                            </button>
                        </Tooltip>
                    ))}
                </div>
            </div>

            <div className="flex flex-col flex-grow min-h-0 space-y-2">
                {/* Render based on selection order logic, falling back to keys if order is somehow missing */}
                {(languageSelectionOrder && languageSelectionOrder.length > 0 ? languageSelectionOrder : Object.keys(targetLanguages)).map((lang) => {
                    // Check if actually selected (handle cases where order might contain deselected ones if logic drifted, though handleLangChange manages it)
                    if (!targetLanguages[lang]) return null;

                    const langName = LANGUAGE_NAMES[lang] || lang.toUpperCase();
                    const textValue = generatedTexts ? (generatedTexts[lang] || '') : '';

                    return (
                        <div key={lang} className="bg-gray-900/50 rounded-md p-2 flex flex-col flex-1 min-h-[120px]">
                             <div className="flex justify-between items-center mb-1 flex-shrink-0">
                                <h4 className="font-semibold text-gray-300 text-sm">{langName}</h4>
                                <ActionButton tooltipPosition="left" title={t('node.action.copy')} onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(textValue); }}>
                                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                </ActionButton>
                            </div>
                            <textarea
                                value={textValue}
                                onChange={(e) => handleGeneratedTextChange(lang, e.target.value)}
                                className="w-full text-sm p-2 bg-gray-800 border border-transparent rounded-md resize-y focus:border-emerald-500 focus:ring-0 focus:outline-none custom-scrollbar flex-grow"
                                onWheel={e => e.stopPropagation()}
                                onFocus={deselectAllNodes}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default NarratorTextGeneratorNode;
