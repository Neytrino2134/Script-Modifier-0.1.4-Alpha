
import React, { useMemo } from 'react';
import type { NodeContentProps } from '../../types'; 
import { ActionButton } from '../ActionButton'; 
import { SettingsPanel } from './youtube-title-generator/SettingsPanel';
import Tooltip from '../ui/Tooltip';
import CustomCheckbox from '../ui/CustomCheckbox';

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

const YouTubeTitleGeneratorNode: React.FC<NodeContentProps> = ({ 
    node, 
    onValueChange, 
    t, 
    deselectAllNodes, 
    connectedInputs,
    onGenerateYouTubeTitles,
    isGeneratingYouTubeTitles,
    onGenerateYouTubeChannelInfo,
    isGeneratingYouTubeChannelInfo,
    isStopping,
    onStopGeneration,
    addToast
}) => {
    const isLoading = isGeneratingYouTubeTitles || isGeneratingYouTubeChannelInfo;
    const isInputConnected = connectedInputs?.has(undefined);

    const parsedValue = useMemo(() => {
        try {
            const parsed = JSON.parse(node.value || '{}');
            const targetLanguages = parsed.targetLanguages || { ru: true, en: false };
            const languageSelectionOrder = parsed.languageSelectionOrder || Object.keys(targetLanguages).filter(k => targetLanguages[k]);

            return {
                mode: parsed.mode || 'title',
                idea: parsed.idea || '',
                targetLanguages,
                generatedTitleOutputs: parsed.generatedTitleOutputs || {},
                generatedChannelOutputs: parsed.generatedChannelOutputs || {},
                languageSelectionOrder,
                includeHashtags: parsed.includeHashtags !== false, // Default true
                generateThumbnail: parsed.generateThumbnail !== false, // Default true
                uiState: parsed.uiState || { isSettingsCollapsed: true }
            };
        } catch {
            return { 
                mode: 'title', 
                idea: '', 
                targetLanguages: { ru: true, en: false }, 
                generatedTitleOutputs: {}, 
                generatedChannelOutputs: {},
                languageSelectionOrder: ['ru'],
                includeHashtags: true,
                generateThumbnail: true,
                uiState: { isSettingsCollapsed: true }
            };
        }
    }, [node.value]);

    const { mode, idea, targetLanguages, generatedTitleOutputs, generatedChannelOutputs, languageSelectionOrder, includeHashtags, generateThumbnail, uiState } = parsedValue;

    const handleValueUpdate = (updates: Partial<typeof parsedValue>) => {
        onValueChange(node.id, JSON.stringify({ ...parsedValue, ...updates }));
    };
    
    const handleUiStateUpdate = (updates: any) => {
        handleValueUpdate({ uiState: { ...uiState, ...updates } });
    };

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
    
    const handleCopy = (text: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        addToast(t('toast.copied'), 'success');
    };

    const handleGenerate = () => {
        if (mode === 'title' && onGenerateYouTubeTitles) {
            onGenerateYouTubeTitles(node.id);
        } else if (onGenerateYouTubeChannelInfo) {
            onGenerateYouTubeChannelInfo(node.id);
        }
    };

    const selectedLangs = Object.entries(targetLanguages).filter(([, selected]) => selected).map(([lang]) => lang);

    const renderOutputColumn = (lang: string) => {
        const isTitleMode = mode === 'title';
        const data = isTitleMode ? (generatedTitleOutputs[lang] || {}) : (generatedChannelOutputs[lang] || {});
        const langName = LANGUAGE_NAMES[lang] || lang.toUpperCase();

        const fields = isTitleMode
            ? [
                { key: 'title', label: t('youtube_title_generator.title') },
                { key: 'description', label: t('youtube_title_generator.description') },
                { key: 'tags', label: t('youtube_title_generator.tags') },
                ...(generateThumbnail ? [{ key: 'thumbnailPrompt', label: t('node.content.thumbnailPrompt') }] : [])
              ]
            : [
                { key: 'channelName', label: t('youtube_title_generator.channelName') },
                { key: 'channelDescription', label: t('youtube_title_generator.channelDescription') },
                { key: 'channelKeywords', label: t('youtube_title_generator.channelKeywords') },
                { key: 'channelHandle', label: t('youtube_title_generator.channelHandle') },
              ];

        return (
            <div key={lang} className="flex flex-col flex-1 min-h-0 space-y-2 min-w-0">
                <h4 className="font-semibold text-gray-300 text-sm border-b border-gray-700/50 pb-1">{langName}</h4>
                <div className="flex-grow overflow-y-auto custom-scrollbar space-y-3 pr-1">
                    {fields.map(field => (
                        <div key={field.key} className="flex flex-col w-full">
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-xs font-medium text-gray-400">{field.label}</label>
                                <ActionButton title={t('node.action.copy')} onClick={() => handleCopy(data[field.key] || '')}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                </ActionButton>
                            </div>
                            <textarea 
                                readOnly 
                                value={data[field.key] || ''} 
                                className={`w-full p-2 bg-gray-900/50 rounded-md resize-none custom-scrollbar focus:border-emerald-500 focus:ring-0 focus:outline-none border border-transparent ${field.key === 'description' ? 'min-h-[100px]' : (field.key === 'thumbnailPrompt' ? 'min-h-[60px]' : 'min-h-[40px]')}`}
                                onMouseDown={(e) => e.stopPropagation()}
                                onFocus={deselectAllNodes}
                                rows={field.key === 'description' ? 4 : (field.key === 'tags' ? 3 : 2)}
                            />
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full space-y-2" onWheel={e => e.stopPropagation()}>
            <textarea
                value={idea}
                onChange={(e) => handleValueUpdate({ idea: e.target.value })}
                placeholder={isInputConnected ? t('node.content.connectedPlaceholder') : (mode === 'title' ? t('youtube_title_generator.ideaPlaceholder') : t('youtube_title_generator.channelIdeaPlaceholder'))}
                disabled={isInputConnected || isLoading}
                className="w-full p-2 bg-gray-700 border border-transparent rounded-md resize-y focus:border-emerald-500 focus:ring-0 focus:outline-none disabled:bg-gray-800 disabled:text-gray-500 custom-scrollbar min-h-[60px] max-h-[120px] flex-shrink-0"
                rows={2}
                onMouseDown={(e) => e.stopPropagation()}
                onFocus={deselectAllNodes}
            />
            
            <div className="flex-shrink-0 flex items-center space-x-2">
                <div className="flex items-center bg-gray-700 rounded-md p-1 space-x-1 h-10">
                    <button onClick={() => handleValueUpdate({ mode: 'title' })} className={`px-2 py-1 rounded text-xs font-semibold h-full ${mode === 'title' ? 'bg-emerald-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>{t('youtube_title_generator.mode.title')}</button>
                    <button onClick={() => handleValueUpdate({ mode: 'channel' })} className={`px-2 py-1 rounded text-xs font-semibold h-full ${mode === 'channel' ? 'bg-emerald-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>{t('youtube_title_generator.mode.channel')}</button>
                </div>
                
                {/* Thumbnail Toggle (Duplicate of Stack Logic) */}
                {mode === 'title' && (
                    <div className="flex items-center bg-gray-700 rounded-md px-2 space-x-2 h-10 border border-gray-600 flex-shrink-0" title={t('node.content.thumbnailPrompt')}>
                        <CustomCheckbox
                            id={`gen-thumb-${node.id}`}
                            checked={generateThumbnail}
                            onChange={(checked) => handleValueUpdate({ generateThumbnail: checked })}
                            disabled={isLoading}
                            className="h-4 w-4"
                        />
                        <label htmlFor={`gen-thumb-${node.id}`} className="text-xs text-gray-300 select-none cursor-pointer font-medium">Cover</label>
                    </div>
                )}

                <button
                    onClick={isLoading ? onStopGeneration : handleGenerate}
                    disabled={isStopping || (!isLoading && !idea.trim() && !isInputConnected)}
                    className={`flex-grow flex-shrink-0 h-10 px-4 py-2 font-bold text-white rounded-md transition-colors duration-200 flex items-center justify-center gap-2 ${
                        isStopping 
                        ? 'bg-yellow-600 hover:bg-yellow-500' 
                        : (isLoading 
                            ? 'bg-cyan-600 hover:bg-cyan-500' 
                            : 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-500')
                    }`}
                >
                    {isLoading ? (
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : !isStopping && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                             <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                    )}
                    <span>{isStopping ? t('node.action.stopping') : (isLoading ? t('node.content.generating') : t('node.content.generateText'))}</span>
                </button>
            </div>
            
            <SettingsPanel
                uiState={uiState}
                onUpdateUiState={handleUiStateUpdate}
                mode={mode as 'title' | 'channel'}
                t={t}
                includeHashtags={includeHashtags}
                onToggleHashtags={() => handleValueUpdate({ includeHashtags: !includeHashtags })}
                generateThumbnail={generateThumbnail}
                onToggleThumbnail={() => handleValueUpdate({ generateThumbnail: !generateThumbnail })}
            />

             {/* Language Selector Group */}
             <div className="flex-shrink-0 bg-gray-700/50 p-1 rounded-md border border-gray-600/30">
                <div className="flex flex-wrap gap-1">
                    {LANGUAGES.map((lang) => (
                        <Tooltip key={lang.code} title={t(`languages.${lang.code}`)} position="top" className="flex-1">
                            <button
                                onClick={() => handleLangChange(lang.code)}
                                className={`w-full min-w-[30px] py-1 rounded text-[10px] font-bold uppercase transition-colors ${
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

            <div className="flex flex-row flex-grow min-h-0 space-x-2">
                {selectedLangs.map(lang => renderOutputColumn(lang))}
            </div>
        </div>
    );
};

export default YouTubeTitleGeneratorNode;
