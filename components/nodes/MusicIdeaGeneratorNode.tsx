
import React, { useMemo } from 'react';
import type { NodeContentProps } from '../../types';
import { ActionButton } from '../ActionButton';
import Tooltip from '../ui/Tooltip';
import { SettingsPanel } from './music-idea-generator/SettingsPanel';

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

const MusicIdeaGeneratorNode: React.FC<NodeContentProps> = ({ 
    node, 
    onValueChange, 
    t, 
    deselectAllNodes, 
    connectedInputs,
    onGenerateMusicIdeas,
    isGeneratingMusicIdeas,
    isStopping,
    onStopGeneration,
    addToast
}) => {
    // Corrected: isGeneratingMusicIdeas is already a boolean from NodeView
    const isLoading = isGeneratingMusicIdeas; 
    const isInputConnected = connectedInputs?.has(undefined);

    const parsedValue = useMemo(() => {
        try {
            const parsed = JSON.parse(node.value || '{}');
            const targetLanguages = parsed.targetLanguages || { ru: true, en: false };
            const languageSelectionOrder = parsed.languageSelectionOrder || Object.keys(targetLanguages).filter(k => targetLanguages[k]);

            return {
                generateLyrics: parsed.generateLyrics ?? true,
                verseCount: parsed.verseCount || 2,
                idea: parsed.idea || '',
                targetLanguages,
                generatedLyrics: parsed.generatedLyrics || {},
                generatedMusicPrompts: parsed.generatedMusicPrompts || {},
                generatedTitles: parsed.generatedTitles || {},
                languageSelectionOrder,
                model: parsed.model || 'gemini-3-flash-preview',
                uiState: parsed.uiState || { isSettingsCollapsed: true }
            };
        } catch {
            return { 
                generateLyrics: true, 
                verseCount: 2,
                idea: '', 
                targetLanguages: { ru: true, en: false }, 
                generatedLyrics: {}, 
                generatedMusicPrompts: {}, 
                generatedTitles: {},
                languageSelectionOrder: ['ru'],
                model: 'gemini-3-flash-preview',
                uiState: { isSettingsCollapsed: true }
            };
        }
    }, [node.value]);

    const { generateLyrics, verseCount, idea, targetLanguages, generatedLyrics, generatedMusicPrompts, generatedTitles, languageSelectionOrder, model, uiState } = parsedValue;

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
        if (onGenerateMusicIdeas) {
            onGenerateMusicIdeas(node.id);
        }
    };

    const handleDownloadTxt = (lang: string) => {
        const title = generatedTitles[lang] || 'Untitled';
        const lyrics = generatedLyrics[lang] || '';
        const prompt = generatedMusicPrompts[lang] || '';

        if (!title && !lyrics && !prompt) return;

        const content = `Title: ${title}\n\n--- Music Prompt ---\n${prompt}\n\n--- Lyrics ---\n${lyrics}`;
        
        const now = new Date();
        const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
        const safeTitle = title.replace(/[^a-z0-9а-яё\s-_]/gi, '').trim().replace(/\s+/g, '_') || 'Song';
        
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${safeTitle}_${timestamp}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        addToast('TXT Saved', 'success');
    };

    const selectedLangs = Object.entries(targetLanguages).filter(([, selected]) => selected).map(([lang]) => lang);

    const renderOutputColumns = () => {
        if (selectedLangs.length === 0) return null;

        return (
            <div className="flex flex-row flex-grow min-h-0 space-x-2">
                {selectedLangs.map(lang => {
                    const lyricsData = generatedLyrics[lang] || '';
                    const musicPromptData = generatedMusicPrompts[lang] || '';
                    const titleData = generatedTitles[lang] || '';
                    const langName = LANGUAGE_NAMES[lang] || lang.toUpperCase();

                    return (
                        <div key={lang} className="flex flex-col flex-1 min-h-0 space-y-2">
                            <div className="flex justify-between items-center flex-shrink-0 border-b border-gray-700/50 pb-1">
                                <h4 className="font-semibold text-gray-300 text-sm">{langName}</h4>
                                <ActionButton title="Download TXT" onClick={() => handleDownloadTxt(lang)}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                </ActionButton>
                            </div>
                            
                            <div className="flex flex-col flex-shrink-0">
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-xs font-medium text-gray-400">{t('music_idea_generator.songTitle')}</label>
                                    <ActionButton title={t('node.action.copy')} onClick={() => handleCopy(titleData)}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                    </ActionButton>
                                </div>
                                <textarea
                                    readOnly
                                    value={titleData}
                                    placeholder={t('music_idea_generator.songTitlePlaceholder')}
                                    className="w-full p-2 bg-gray-900/50 rounded-md resize-none custom-scrollbar focus:outline-none focus:ring-1 focus:ring-emerald-500 selection:bg-emerald-500 selection:text-white"
                                    rows={1}
                                />
                            </div>

                            {generateLyrics && (
                                <div className="flex flex-col flex-1 min-h-0">
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-xs font-medium text-gray-400">{t('music_idea_generator.mode.lyrics')}</label>
                                        <ActionButton title={t('node.action.copy')} onClick={() => handleCopy(lyricsData)}>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                        </ActionButton>
                                    </div>
                                    <textarea
                                        readOnly
                                        value={lyricsData}
                                        placeholder={t('music_idea_generator.lyricsPlaceholder')}
                                        className="w-full flex-grow p-2 bg-gray-900/50 rounded-md resize-none custom-scrollbar focus:outline-none focus:ring-1 focus:ring-emerald-500 selection:bg-emerald-500 selection:text-white"
                                    />
                                </div>
                            )}

                            <div className="flex flex-col flex-1 min-h-0">
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-xs font-medium text-gray-400">{t('music_idea_generator.mode.music_prompt')}</label>
                                    <ActionButton title={t('node.action.copy')} onClick={() => handleCopy(musicPromptData)}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                    </ActionButton>
                                </div>
                                <textarea
                                    readOnly
                                    value={musicPromptData}
                                    placeholder={t('music_idea_generator.musicPromptPlaceholder')}
                                    className="w-full flex-grow p-2 bg-gray-900/50 rounded-md resize-none custom-scrollbar focus:outline-none focus:ring-1 focus:ring-emerald-500 selection:bg-emerald-500 selection:text-white"
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full space-y-2" onWheel={e => e.stopPropagation()}>
            {/* Input Area */}
            <textarea
                value={idea}
                onChange={(e) => handleValueUpdate({ idea: e.target.value })}
                placeholder={isInputConnected ? t('node.content.connectedPlaceholder') : t('music_idea_generator.ideaPlaceholder')}
                disabled={isInputConnected || isLoading}
                className="w-full p-2 bg-gray-700 border border-transparent rounded-md resize-y min-h-[60px] max-h-[120px] focus:border-emerald-500 focus:outline-none disabled:bg-gray-800 disabled:text-gray-500 custom-scrollbar selection:bg-emerald-500 selection:text-white flex-shrink-0 transition-colors"
                rows={2}
                onMouseDown={(e) => e.stopPropagation()}
                onFocus={deselectAllNodes}
            />
            
            {/* Control Bar */}
            <div className="flex items-center gap-2 flex-shrink-0 h-10">
                {/* Model Switcher */}
                <div className="flex w-36 flex-shrink-0 gap-1 select-none bg-gray-900/50 rounded-lg p-0.5 h-full">
                    <Tooltip title={t('tooltip.model.flash')} position="top" className="h-full flex-1">
                        <button 
                            onClick={() => handleValueUpdate({ model: 'gemini-3-flash-preview' })}
                            className={`w-full h-full text-[10px] font-bold text-center transition-colors rounded-md flex items-center justify-center ${
                                model === 'gemini-3-flash-preview' 
                                ? 'bg-emerald-600 text-white shadow-sm' 
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                            }`}
                        >
                            FLASH
                        </button>
                    </Tooltip>
                    <Tooltip title={t('tooltip.model.pro')} position="top" className="h-full flex-1">
                        <button 
                            onClick={() => handleValueUpdate({ model: 'gemini-3-pro-preview' })}
                            className={`w-full h-full text-[10px] font-bold text-center transition-colors rounded-md flex items-center justify-center ${
                                model === 'gemini-3-pro-preview' 
                                ? 'bg-emerald-600 text-white shadow-sm' 
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                            }`}
                        >
                            PRO
                        </button>
                    </Tooltip>
                </div>

                <Tooltip title={t('music_idea_generator.mode.lyrics')} position="top">
                    <button
                        onClick={() => handleValueUpdate({ generateLyrics: !generateLyrics })}
                        className={`w-10 h-10 rounded-md flex items-center justify-center transition-colors border ${
                            generateLyrics 
                                ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm' 
                                : 'bg-gray-700 border-gray-600 text-gray-400 hover:text-white hover:border-gray-500'
                        }`}
                        title={t('music_idea_generator.mode.lyrics')}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </button>
                </Tooltip>

                {generateLyrics && (
                    <div className="flex items-center bg-gray-900/50 rounded-lg p-0.5 border border-gray-700/50 h-full" title={t('node.content.verseCount')}>
                         <span className="text-[9px] text-gray-500 px-1 font-bold select-none">V:</span>
                         <input
                            type="number"
                            min="1"
                            max="12"
                            value={verseCount}
                            onChange={(e) => handleValueUpdate({ verseCount: Math.max(1, parseInt(e.target.value) || 1) })}
                            className="w-8 h-full bg-transparent text-center text-xs text-white outline-none font-mono"
                            onMouseDown={e => e.stopPropagation()}
                         />
                    </div>
                )}

                <button
                    onClick={isLoading ? onStopGeneration : handleGenerate}
                    disabled={isStopping || (!isLoading && !idea.trim() && !isInputConnected)}
                    className={`flex-grow h-10 px-4 py-2 font-bold text-white rounded-md transition-colors duration-200 flex items-center justify-center gap-2 ${isStopping ? 'bg-yellow-600' : (isLoading ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed')}`}
                >
                    {isLoading ? (
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : !isStopping && (
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 6l12-3" />
                        </svg>
                    )}
                    <span>{isStopping ? t('node.action.stopping') : (isLoading ? t('node.content.generating') : t('node.content.generateText'))}</span>
                </button>
            </div>
            
            {/* Active Parameter Stack */}
            <SettingsPanel 
                uiState={uiState}
                onUpdateUiState={handleUiStateUpdate}
                generateLyrics={generateLyrics}
                onToggleGenerateLyrics={() => handleValueUpdate({ generateLyrics: !generateLyrics })}
                verseCount={verseCount}
                onVerseCountChange={(count) => handleValueUpdate({ verseCount: count })}
                model={model}
                t={t}
            />

            {/* Language Selection */}
            <div className="flex-shrink-0 bg-gray-700/50 p-1.5 rounded-md border border-gray-600/30">
                <div className="flex flex-wrap gap-1">
                    {LANGUAGES.map((lang) => (
                        <button
                            key={lang.code}
                            onClick={() => handleLangChange(lang.code)}
                            className={`flex-1 min-w-[30px] py-1 px-2 rounded text-[10px] font-bold uppercase transition-colors ${
                                targetLanguages[lang.code] 
                                    ? 'bg-emerald-600 text-white shadow-sm' 
                                    : 'bg-gray-800 text-gray-400 hover:bg-gray-600 hover:text-gray-200'
                            }`}
                        >
                            {lang.label}
                        </button>
                    ))}
                </div>
            </div>

            {renderOutputColumns()}
        </div>
    );
};

export default MusicIdeaGeneratorNode;