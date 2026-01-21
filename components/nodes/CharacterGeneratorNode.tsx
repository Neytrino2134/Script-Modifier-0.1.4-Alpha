
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { NodeContentProps } from '../../types';
import { ActionButton } from '../ActionButton';
import CustomSelect, { CustomSelectOption } from '../ui/CustomSelect';
import { CopyIcon, CloseIcon } from '../icons/AppIcons';

const LANGUAGES = [
    { code: 'ru', label: 'RU' },
    { code: 'en', label: 'EN' },
    { code: 'es', label: 'ES' },
    { code: 'de', label: 'DE' },
    { code: 'fr', label: 'FR' },
    { code: 'it', label: 'IT' },
    { code: 'pt', label: 'PT' },
    { code: 'zh', label: 'ZH' },
    { code: 'ja', label: 'JA' },
    { code: 'ko', label: 'KO' },
];

const EditableCharacterDescription: React.FC<{
    fullDescription: string;
    onDescriptionChange: (newDescription: string) => void;
    t: (key: string) => string;
    onFocus?: () => void;
}> = ({ fullDescription, onDescriptionChange, t, onFocus }) => {
    const [sections, setSections] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        const parsed: { [key: string]: string } = { 'Appearance': '', 'Personality': '', 'Clothing': '' };
        // Use lowercase keys for mapping to handle potential case differences from AI or Regex
        const keyMap: { [key: string]: 'Appearance' | 'Personality' | 'Clothing' } = {
            'внешность': 'Appearance',
            'личность': 'Personality',
            'характер': 'Personality',
            'одежда': 'Clothing',
            'appearance': 'Appearance',
            'personality': 'Personality',
            'clothing': 'Clothing'
        };
        const sectionRegex = /####\s*(Appearance|Personality|Clothing|Внешность|Личность|Характер|Одежда)\s*([\s\S]*?)(?=####|$)/gi;

        let match;
        let foundMatch = false;
        while ((match = sectionRegex.exec(fullDescription)) !== null) {
            foundMatch = true;
            const header = match[1].trim().toLowerCase(); // Normalize
            const key = keyMap[header];
            const value = match[2].trim();
            if (key) {
                parsed[key] = value;
            }
        }

        if (!foundMatch && fullDescription.trim()) {
            parsed['Appearance'] = fullDescription.trim();
        }

        setSections(parsed);
    }, [fullDescription]);

    const handleSectionChange = (key: string, value: string) => {
        const newSections = { ...sections, [key]: value };
        setSections(newSections);
        const newFullDescription = `#### Appearance\n${newSections['Appearance'] || ''}\n\n#### Personality\n${newSections['Personality'] || ''}\n\n#### Clothing\n${newSections['Clothing'] || ''}`;
        onDescriptionChange(newFullDescription);
    };

    return (
        <div className="space-y-2 text-sm">
            {(['Appearance', 'Personality', 'Clothing'] as const).map(key => (
                <div key={key}>
                    <h5 className="font-semibold text-gray-400 text-xs uppercase tracking-wider">{t(`node.content.${key.toLowerCase()}` as any) || key}</h5>
                    <textarea
                        value={sections[key] || ''}
                        onChange={e => handleSectionChange(key, e.target.value)}
                        className="w-full text-sm p-2 bg-gray-800 border border-transparent rounded-md resize-y min-h-[60px] focus:outline-none focus:border-emerald-500 focus:ring-0 custom-scrollbar overflow-y-scroll"
                        onWheel={e => e.stopPropagation()}
                        onFocus={onFocus}
                    />
                </div>
            ))}
        </div>
    );
};


const CharacterGeneratorNode: React.FC<NodeContentProps> = ({
    node, onValueChange, onGenerateCharacters, isGeneratingCharacters, isStopping, onStopGeneration, t, deselectAllNodes,
    connectedInputs, clearSelectionsSignal, onGenerateCharacterImage,
    isGeneratingCharacterImage, onDetachCharacter, setImageViewer, onCopyImageToClipboard
}) => {
    const isLoading = isGeneratingCharacters === node.id;
    const isInputConnected = connectedInputs?.has(undefined);

    const [selectedCharacters, setSelectedCharacters] = useState<Set<string>>(new Set());
    const [collapsedCharacters, setCollapsedCharacters] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (clearSelectionsSignal > 0) {
            setSelectedCharacters(new Set());
        }
    }, [clearSelectionsSignal]);

    const parsedValue = useMemo(() => {
        try {
            const parsed = JSON.parse(node.value || '{}');
            return {
                prompt: parsed.prompt || '',
                numberOfCharacters: parsed.numberOfCharacters || 1,
                targetLanguage: parsed.targetLanguage || 'ru',
                characterType: parsed.characterType || 'simple',
                style: parsed.style || 'simple',
                customStyle: parsed.customStyle || '',
                characters: Array.isArray(parsed.characters) ? parsed.characters : [],
                error: parsed.error || null,
            };
        } catch {
            return { prompt: '', numberOfCharacters: 1, targetLanguage: 'ru', characterType: 'simple', style: 'simple', customStyle: '', characters: [], error: null };
        }
    }, [node.value]);

    const { prompt, numberOfCharacters, targetLanguage, characterType, style, customStyle, characters, error } = parsedValue;

    const handleValueUpdate = useCallback((updates: Partial<typeof parsedValue>) => {
        const newValue = { ...parsedValue, ...updates };
        onValueChange(node.id, JSON.stringify(newValue));
    }, [node.id, onValueChange, parsedValue]);

    // --- Options for CustomSelect ---
    const charTypeOptions = useMemo<CustomSelectOption[]>(() => [
        { value: "simple", label: t('node.content.characterType.simple') },
        { value: "anthro", label: t('node.content.characterType.anthro') },
        { value: "chibi", label: t('node.content.characterType.chibi') },
        { value: "key_item", label: t('node.content.characterType.key_item') },
    ], [t]);

    const styleOptions = useMemo<CustomSelectOption[]>(() => [
        { value: "simple", label: t('node.content.style.simple') },
        { value: "realistic", label: t('node.content.style.realistic') },
        { value: "3d_cartoon", label: t('node.content.style.3d_cartoon') },
        { value: "3d_realistic", label: t('node.content.style.3d_realistic') },
        { value: "2d_animation", label: t('node.content.style.2d_animation') },
        { value: "anime", label: t('node.content.style.anime') },
        { value: "comics", label: t('node.content.style.comics') },
        { value: "custom", label: t('node.content.style.custom') },
    ], [t]);

    const languageOptions = useMemo<CustomSelectOption[]>(() =>
        LANGUAGES.map(lang => ({ value: lang.code, label: lang.label })),
        []);

    const handleCharacterClick = (e: React.MouseEvent, id: string) => {
        const target = e.target as HTMLElement;
        if (target.closest('textarea, input, button')) return;
        if (document.activeElement && (document.activeElement instanceof HTMLTextAreaElement || document.activeElement instanceof HTMLInputElement)) {
            (document.activeElement as HTMLElement).blur();
        }
        setSelectedCharacters(prev => {
            const newSet = new Set(e.shiftKey ? prev : []);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };
    const handleToggleCharacterCollapse = (id: string) => {
        setCollapsedCharacters(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    const updateCharacter = (idToUpdate: string, field: 'name' | 'fullDescription' | 'index' | 'prompt' | 'additionalPrompt', value: string) => {
        const newChars = characters.map((c: any) =>
            c.id === idToUpdate ? { ...c, [field]: value } : c
        );
        handleValueUpdate({ characters: newChars });
    };

    const deleteCharacter = (idToDelete: string) => {
        handleValueUpdate({ characters: characters.filter((c: any) => c.id !== idToDelete) });
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const handleClearImage = (charId: string) => {
        const newChars = characters.map((c: any) =>
            c.id === charId ? { ...c, imageBase64: null } : c
        );
        handleValueUpdate({ characters: newChars });
    };

    const handleSaveCharacter = (char: any) => {
        // Construct imageSources if image exists (default 1:1 for generated images)
        const imageSources: Record<string, string | null> = {};
        if (char.imageBase64) {
            imageSources['1:1'] = `data:image/png;base64,${char.imageBase64}`;
        }

        const characterData = {
            type: 'character-card',
            name: char.name,
            index: char.index || char.alias || 'Entity-1', // Save index, fallback to Entity default
            image: char.imageBase64 ? `data:image/png;base64,${char.imageBase64}` : null,
            selectedRatio: '1:1',
            prompt: char.prompt,
            additionalPrompt: char.additionalPrompt,
            fullDescription: char.fullDescription,
            imageSources: imageSources
        };
        const dataStr = JSON.stringify(characterData, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${(char.name || 'character').replace(/ /g, '_')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // MANUAL ADDITION
    const handleManualAddCharacter = () => {
        let maxNameNum = 0;
        const nameRegex = /^New Entity\s*(\d*)$/i;
        characters.forEach((c: any) => {
            const match = (c.name || '').match(nameRegex);
            if (match) {
                const num = match[1] ? parseInt(match[1], 10) : 1;
                if (num > maxNameNum) maxNameNum = num;
            }
        });
        const nextName = `New Entity ${maxNameNum + 1}`;

        // Calculate next Entity-N index
        let maxIndexNum = 0;
        const indexRegex = /^(?:Entity|Character)-(\d+)$/i;
        characters.forEach((c: any) => {
            const match = (c.index || c.alias || '').match(indexRegex);
            if (match) {
                const num = parseInt(match[1], 10);
                if (num > maxIndexNum) maxIndexNum = num;
            }
        });
        const nextIndex = `Entity-${maxIndexNum + 1}`;

        const newChar = {
            id: `char-manual-${Date.now()}`,
            name: nextName,
            index: nextIndex,
            fullDescription: '',
            prompt: '',
            additionalPrompt: "Full body character concept on a gray background",
            originalName: nextName
        };

        handleValueUpdate({ characters: [...characters, newChar] });
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex-shrink-0 space-y-2 mb-2">
                <textarea
                    value={prompt}
                    onChange={(e) => handleValueUpdate({ prompt: e.target.value })}
                    placeholder={isInputConnected ? t('node.content.connectedPlaceholder') : t('character_generator.promptPlaceholder')}
                    disabled={isInputConnected || isLoading}
                    className="w-full p-2 bg-gray-700 border border-transparent rounded-md resize-y min-h-[80px] focus:border-emerald-500 focus:ring-0 focus:outline-none disabled:bg-gray-800 disabled:text-gray-500 custom-scrollbar overflow-y-scroll"
                    rows={2}
                    onWheel={e => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onFocus={deselectAllNodes}
                />

                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                        <label className="text-xs text-gray-400 font-medium pl-1">{t('node.content.characterType')}</label>
                        <CustomSelect
                            id={`char-type-select-${node.id}`}
                            value={characterType}
                            onChange={(val) => handleValueUpdate({ characterType: val })}
                            options={charTypeOptions}
                            disabled={isLoading}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-gray-400 font-medium pl-1">{t('node.content.style')}</label>
                        <CustomSelect
                            id={`char-style-select-${node.id}`}
                            value={style}
                            onChange={(val) => handleValueUpdate({ style: val })}
                            options={styleOptions}
                            disabled={isLoading}
                        />
                    </div>
                </div>

                {/* Additional controls row */}
                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                        <label className="text-xs text-gray-400 font-medium pl-1">{t('node.content.numberOfCharactersShort')}</label>
                        <div className="relative h-9">
                            <input
                                id={`char-count-${node.id}`}
                                type="number"
                                min="1"
                                max="10"
                                value={numberOfCharacters}
                                onChange={e => handleValueUpdate({ numberOfCharacters: parseInt(e.target.value, 10) || 1 })}
                                className="w-full h-full pl-3 pr-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm focus:ring-1 focus:ring-emerald-500 focus:outline-none appearance-none"
                                onMouseDown={e => e.stopPropagation()}
                                onFocus={deselectAllNodes}
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-gray-400 font-medium pl-1">{t('node.content.targetLanguage')}</label>
                        <CustomSelect
                            id={`char-lang-select-${node.id}`}
                            value={targetLanguage}
                            onChange={(val) => handleValueUpdate({ targetLanguage: val })}
                            options={languageOptions}
                            disabled={isLoading}
                        />
                    </div>
                </div>

                {style === 'custom' && (
                    <div className="space-y-1">
                        <label htmlFor={`custom-style-input-${node.id}`} className="text-xs text-gray-400 font-medium pl-1">{t('node.content.style.custom')}</label>
                        <textarea
                            id={`custom-style-input-${node.id}`}
                            value={customStyle}
                            onChange={e => handleValueUpdate({ customStyle: e.target.value })}
                            onMouseDown={e => e.stopPropagation()}
                            onFocus={deselectAllNodes}
                            rows={2}
                            className="w-full p-2 bg-gray-700 border border-transparent text-white rounded-md text-xs focus:border-emerald-500 focus:ring-0 focus:outline-none custom-scrollbar"
                            placeholder="..."
                        />
                    </div>
                )}

                <button
                    onClick={isLoading ? onStopGeneration : () => onGenerateCharacters(node.id)}
                    disabled={isStopping || (!isLoading && (!isInputConnected && !prompt.trim()))}
                    className={`w-full h-10 px-4 py-2 font-bold text-white rounded-md transition-colors duration-200 ${isStopping ? 'bg-yellow-600' : (isLoading ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed')}`}
                >
                    {isStopping ? t('node.action.stopping') : (isLoading ? t('node.action.stop') : t('node.content.generateCharacters'))}
                </button>
            </div>
            {error && (
                <div className="bg-red-900/50 border border-red-700 text-red-200 text-sm p-2 rounded-md mb-2">
                    {error}
                </div>
            )}
            <div className="flex-grow overflow-y-auto overflow-x-hidden space-y-3 pr-1 custom-scrollbar" onWheel={e => e.stopPropagation()}>
                {characters.map((char: any, index: number) => {
                    const isSelected = selectedCharacters.has(char.id);
                    const isCollapsed = collapsedCharacters.has(char.id);
                    const isImgLoading = isGeneratingCharacterImage === `${node.id}-${char.id}`;
                    return (
                        <div
                            key={char.id || index}
                            className={`bg-gray-700 rounded-lg p-3 space-y-2 border-2 ${isSelected ? 'border-emerald-500' : 'border-transparent'} transition-colors`}
                            onClick={(e) => handleCharacterClick(e, char.id)}
                        >
                            <div className="flex justify-between items-center">
                                <div className="flex items-center flex-grow min-w-0">
                                    <ActionButton tooltipPosition="left" title={isCollapsed ? t('node.action.expand') : t('node.action.collapse')} onClick={(e) => { e.stopPropagation(); handleToggleCharacterCollapse(char.id); }}>
                                        {isCollapsed ? (<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>) : (<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>)}
                                    </ActionButton>
                                    <input
                                        type="text"
                                        value={char.name}
                                        onChange={e => updateCharacter(char.id, 'name', e.target.value)}
                                        className="font-semibold text-white bg-gray-800 w-32 focus:bg-gray-900 rounded px-1"
                                        onFocus={deselectAllNodes}
                                        onMouseDown={e => e.stopPropagation()}
                                    />
                                </div>
                                <div className="flex items-center space-x-1 flex-shrink-0">
                                    <label className="text-xs text-gray-400 whitespace-nowrap">{t('node.content.characterIndex')}:</label>
                                    <input
                                        type="text"
                                        value={char.index || char.alias || ''}
                                        onChange={e => updateCharacter(char.id, 'index', e.target.value)}
                                        className="font-semibold text-white bg-gray-800 w-24 rounded px-1 text-xs py-0.5 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                                        onFocus={deselectAllNodes}
                                        onMouseDown={e => e.stopPropagation()}
                                    />
                                    <ActionButton tooltipPosition="left" title="Copy All Text" onClick={(e) => { e.stopPropagation(); copyToClipboard(`Name: ${char.name}\n\n${char.fullDescription}`); }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                                    </ActionButton>
                                    <ActionButton tooltipPosition="left" title="Save Character to File" onClick={(e) => { e.stopPropagation(); handleSaveCharacter(char); }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                    </ActionButton>
                                    <ActionButton tooltipPosition="left" title="Detach to Character Card Node" onClick={(e) => { e.stopPropagation(); onDetachCharacter(char, node); }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                    </ActionButton>
                                    <ActionButton tooltipPosition="left" title={t('node.action.deleteItem')} onClick={(e) => { e.stopPropagation(); deleteCharacter(char.id); }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </ActionButton>
                                </div>
                            </div>
                            {!isCollapsed && (
                                <div className="flex flex-col space-y-3">
                                    {/* Top Row: Image (Left) + Prompts (Right) */}
                                    <div className="flex gap-3">

                                        {/* Left Column: Image Area */}
                                        <div className="w-40 flex-shrink-0 space-y-2">
                                            <div className="relative w-full aspect-square bg-gray-900/50 rounded-md flex items-center justify-center overflow-hidden group">
                                                {isImgLoading ? (
                                                    <div className="flex items-center space-x-2">
                                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
                                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
                                                    </div>
                                                ) : char.imageBase64 ? (
                                                    <>
                                                        <img
                                                            src={`data:image/png;base64,${char.imageBase64}`}
                                                            alt={char.name || "Character"}
                                                            className="w-full h-full object-contain cursor-pointer transition-transform hover:scale-105"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (setImageViewer) {
                                                                    setImageViewer({
                                                                        sources: [{
                                                                            src: `data:image/png;base64,${char.imageBase64}`,
                                                                            frameNumber: 0,
                                                                            prompt: char.prompt
                                                                        }],
                                                                        initialIndex: 0
                                                                    });
                                                                }
                                                            }}
                                                        />
                                                        {/* Overlay Actions */}
                                                        <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded p-0.5">
                                                            <button
                                                                className="p-1 hover:bg-gray-700 rounded text-gray-200"
                                                                title="Copy Image"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (onCopyImageToClipboard && char.imageBase64) {
                                                                        onCopyImageToClipboard(char.imageBase64);
                                                                    }
                                                                }}
                                                            >
                                                                <CopyIcon className="w-3 h-3" />
                                                            </button>
                                                            <button
                                                                className="p-1 hover:bg-red-900/50 rounded text-red-300"
                                                                title="Clear Image"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleClearImage(char.id);
                                                                }}
                                                            >
                                                                <CloseIcon className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="text-center text-gray-500 p-2 pointer-events-none">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                                                        <p className="text-xs">No Image</p>
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onGenerateCharacterImage(node.id, char.id); }}
                                                disabled={isImgLoading || (!char.prompt && !char.additionalPrompt && char.additionalPrompt !== undefined)}
                                                className="w-full px-2 py-1 text-xs font-bold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:bg-gray-500 disabled:cursor-not-allowed"
                                            >
                                                {isImgLoading ? '...' : t('node.content.generateImage')}
                                            </button>
                                        </div>

                                        {/* Right Column: Prompts */}
                                        <div className="flex-grow min-w-0 flex flex-col gap-2">
                                            {/* Main Prompt */}
                                            <div className="space-y-1">
                                                <div className="flex justify-between items-center">
                                                    <label className="text-xs font-medium text-gray-400">{t('node.content.imagePrompt')}</label>
                                                    <div className="flex items-center gap-1">
                                                        <ActionButton tooltipPosition="left" title={t('node.action.copy')} onClick={(e) => { e.stopPropagation(); copyToClipboard(char.prompt || ''); }}>
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                                        </ActionButton>
                                                    </div>
                                                </div>
                                                <textarea
                                                    value={char.prompt || ''}
                                                    onChange={e => updateCharacter(char.id, 'prompt', e.target.value)}
                                                    className="w-full text-xs p-2 bg-gray-800 border border-transparent rounded-md resize-y min-h-[80px] focus:outline-none focus:border-emerald-500 focus:ring-0 custom-scrollbar overflow-y-scroll"
                                                    onWheel={e => e.stopPropagation()}
                                                    onFocus={deselectAllNodes}
                                                    placeholder="Main prompt..."
                                                />
                                            </div>

                                            {/* Suffix / Additional Prompt */}
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter block">{t('node.content.suffix')}</label>
                                                <input
                                                    type="text"
                                                    value={char.additionalPrompt !== undefined ? char.additionalPrompt : "Full body character concept on a gray background"}
                                                    onChange={e => updateCharacter(char.id, 'additionalPrompt', e.target.value)}
                                                    className="w-full p-1.5 bg-gray-800 border border-transparent rounded text-xs text-gray-400 focus:border-emerald-500 outline-none"
                                                    onMouseDown={e => e.stopPropagation()}
                                                    onFocus={deselectAllNodes}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bottom Row: Full Description Group */}
                                    <div className="border border-gray-700/30 rounded bg-gray-800/20 p-2 mt-2">
                                        <h5 className="font-semibold text-gray-400 text-xs uppercase tracking-wider mb-2 border-b border-gray-700/50 pb-1">Full Character Description</h5>
                                        <EditableCharacterDescription
                                            fullDescription={char.fullDescription || ''}
                                            onDescriptionChange={newDesc => updateCharacter(char.id, 'fullDescription', newDesc)}
                                            t={t}
                                            onFocus={deselectAllNodes}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}

                {/* Add Character Button */}
                <div className="flex justify-center pt-2 pb-1">
                    <button
                        onClick={handleManualAddCharacter}
                        className="flex items-center gap-1 px-4 py-1.5 bg-gray-800 hover:bg-emerald-700/50 border border-gray-600 hover:border-emerald-500 rounded-full transition-colors text-xs font-bold text-gray-300 hover:text-white"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Add Manual Entity
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CharacterGeneratorNode;
