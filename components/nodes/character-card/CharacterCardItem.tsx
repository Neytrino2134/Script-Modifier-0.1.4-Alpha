
import React, { useRef, useState } from 'react';
import { CharacterData } from './types';
import { ActionButton } from '../../ActionButton';
import { Tooltip } from '../../ui/Tooltip';
import { CopyIcon, DetachIcon, PromptIcon, StarIcon, StarFilledIcon } from '../../icons/AppIcons';
import { InputWithSpinners } from './InputWithSpinners';
import { DescriptionFields } from './DescriptionFields';

// Optimized width to fit 420px node (380 card + 24 gap + border padding)
const SINGLE_CARD_WIDTH = 380; 

interface CharacterCardItemProps {
    char: CharacterData;
    index: number;
    nodeId: string;
    isDragging: boolean;
    isDuplicate: boolean;
    t: (key: string) => string;
    
    // Callbacks
    onUpdate: (updates: Partial<CharacterData>) => void;
    onRemove: () => void;
    onSetOutput: () => void;
    onDragStart: (e: React.DragEvent) => void;
    onGenerateImage: () => void;
    isGeneratingImage: boolean;
    onSyncFromConnection: () => void;
    onCopyImageToClipboard: (src: string) => void;
    onDetach: () => void;
    onSaveCharacter: () => void;
    onLoadCharacter: () => void;
    onSaveToCatalog: () => void;
    onCopyCard: () => void;
    onPasteToCard: () => void;
    onOpenInEditor: () => void;
    onOpenInRasterEditor: () => void;
    
    // Image Handling
    onRatioChange: (newRatio: string) => void;
    onCrop1x1: () => void;
    onRatioExpand: (ratio: string) => void;
    onPasteImageToSlot: () => void;
    onClearImage: () => void;
    onViewImage: () => void;
    onUploadImage: () => void; // New callback
    onImageDrop: (e: React.DragEvent) => void;
    
    transformingRatio: string | null;
    deselectAllNodes: () => void;
    
    // Async/Op States
    isModifying: boolean;
    isUpdatingDescription: boolean;
    onModifyRequest: (req: string) => void;
    onUpdateDescriptionRequest: () => void;
    
    secondaryLanguage: string;
}

export const CharacterCardItem: React.FC<CharacterCardItemProps> = ({
    char, index, nodeId, isDragging, isDuplicate, t,
    onUpdate, onRemove, onSetOutput, onDragStart,
    onGenerateImage, isGeneratingImage, onSyncFromConnection,
    onCopyImageToClipboard, onDetach, onSaveCharacter, onLoadCharacter,
    onSaveToCatalog, onCopyCard, onPasteToCard, onOpenInEditor, onOpenInRasterEditor,
    onRatioChange, onCrop1x1, onRatioExpand, onPasteImageToSlot, onClearImage, onViewImage, onUploadImage, onImageDrop,
    transformingRatio, deselectAllNodes,
    isModifying, isUpdatingDescription, onModifyRequest, onUpdateDescriptionRequest,
    secondaryLanguage
}) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const [modificationRequest, setModificationRequest] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const hasImage = !!(char.thumbnails[char.selectedRatio] || char.image);

    // Smart Drag Logic: Highlights lines when hovering over card content
    const handleSmartCardDragOver = (e: React.DragEvent) => {
         if (!e.dataTransfer.types.includes('application/prompt-modifier-card')) return;
         e.preventDefault();
         // The parent component handles the visual drop zone indicators based on mouse position relative to card centers
         // But we need to allow drop here to prevent flicker
    };

    return (
            <div 
                className="flex flex-col h-full border border-gray-700/50 rounded-xl bg-gray-800/40 p-2.5 overflow-hidden shadow-xl hover:border-gray-600 transition-colors flex-shrink-0"
                style={{ width: `${SINGLE_CARD_WIDTH}px`, opacity: isDragging ? 0.4 : 1, transform: isDragging ? 'scale(0.95)' : 'none' }}
                onDragOver={handleSmartCardDragOver}
            >
                {/* Header - NOW DRAGGABLE */}
                <div 
                    className="h-8 bg-gray-900/60 rounded-t-lg border-b border-gray-700/50 flex items-center px-3 cursor-grab active:cursor-grabbing hover:bg-gray-800 transition-colors mb-2 group/handle relative flex-shrink-0 gap-2"
                    draggable
                    onDragStart={onDragStart}
                    onMouseDown={(e) => e.stopPropagation()} 
                >
                     <div className="flex items-center gap-1 overflow-hidden flex-grow">
                        <span className="text-xs font-bold truncate">
                            <span className="text-emerald-400">{char.index || 'ENT'}:</span> <span className="text-gray-200 ml-1">{char.name || 'Unnamed'}</span>
                            <span className="text-[9px] text-gray-500 font-mono ml-2 opacity-50">#{char.id}</span>
                        </span>
                     </div>

                     <div className="flex items-center gap-1 shrink-0">
                        <Tooltip title={t('node.action.markPrimary')}>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onSetOutput(); }}
                                className={`p-0.5 rounded hover:bg-gray-700 transition-colors ${char.isOutput ? 'text-emerald-400' : 'text-gray-500 hover:text-gray-300'}`}
                                onMouseDown={e => e.stopPropagation()} 
                            >
                                {char.isOutput ? <StarFilledIcon className="h-4 w-4" /> : <StarIcon className="h-4 w-4" />}
                            </button>
                        </Tooltip>
                        <Tooltip title={t('node.action.deleteItem')}>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                                className="p-0.5 rounded hover:bg-red-900/50 text-gray-500 hover:text-red-400 transition-colors"
                                onMouseDown={e => e.stopPropagation()} 
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path d="M6 18L18 6M6 6l12 12" strokeWidth={2.5} strokeLinecap="round" />
                                </svg>
                            </button>
                        </Tooltip>
                     </div>
                </div>

                <div className="flex gap-2 flex-shrink-0 items-center mb-2 h-[32px]">
                    <input type="text" value={char.name} onChange={(e) => onUpdate({ name: e.target.value })} placeholder={t('node.content.character')} className="flex-grow min-w-0 px-2 bg-gray-700 border border-gray-600 rounded-md text-sm text-white focus:ring-1 focus:ring-emerald-500 outline-none h-[32px] transition-colors hover:border-gray-500" onMouseDown={e => e.stopPropagation()} onFocus={deselectAllNodes} />
                    <InputWithSpinners 
                        value={char.index} 
                        onChange={(val) => onUpdate({ index: val })} 
                        placeholder="Index" 
                        onFocus={deselectAllNodes} 
                        className={`w-28 shrink-0 ${isDuplicate ? '!border-red-500 !ring-1 !ring-red-500' : ''}`} 
                    />
                </div>

                <div className="flex flex-col flex-shrink-0 mb-1">
                    {/* Image Header / Ratio Selector - Clickable Area */}
                    <div 
                        className="flex items-end justify-between pr-2 h-7 z-0 cursor-pointer hover:bg-gray-700/30 transition-colors rounded-t-md select-none"
                        onClick={(e) => { e.stopPropagation(); onUpdate({ isImageCollapsed: !char.isImageCollapsed }); }}
                    >
                         <div className="flex items-end pl-2 gap-1 h-full">
                            {['1:1', '16:9', '9:16'].map(r => (
                                <button 
                                    key={r} 
                                    onClick={(e) => { e.stopPropagation(); onRatioChange(r); }} 
                                    onDragEnter={(e) => { e.stopPropagation(); onRatioChange(r); }}
                                    className={`px-3 py-1 text-[10px] font-bold outline-none transition-colors rounded-t-md ${char.selectedRatio === r ? 'bg-gray-700/80 text-emerald-400 h-full shadow-inner' : 'bg-gray-700/40 text-gray-500 h-[80%] hover:bg-gray-700/60'}`}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>
                        <button 
                             className="p-1 mb-0.5 text-gray-500 hover:text-emerald-400 transition-colors"
                             title={char.isImageCollapsed ? "Show Image" : "Hide Image"}
                        >
                            {char.isImageCollapsed ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                            )}
                        </button>
                    </div>
                    
                    {!char.isImageCollapsed && (
                        <div 
                            onClick={(e) => {
                                e.stopPropagation();
                                if (hasImage) onViewImage();
                                else onUploadImage();
                            }}
                            // UPDATED Drag Handlers to ignore card dragging
                            onDragEnter={(e) => { 
                                if (e.dataTransfer.types.includes('application/prompt-modifier-card')) return;
                                e.preventDefault(); e.stopPropagation(); setIsDragOver(true); 
                            }}
                            onDragOver={(e) => { 
                                if (e.dataTransfer.types.includes('application/prompt-modifier-card')) return;
                                e.preventDefault(); e.stopPropagation(); setIsDragOver(true); 
                            }}
                            style={{ cursor: hasImage ? 'zoom-in' : 'pointer' }}
                            className={`flex-shrink-0 h-[256px] bg-gray-700/50 rounded-xl flex items-center justify-center transition-all group relative overflow-hidden z-10 hover:z-20 hover:bg-gray-600/70 ${isDragOver ? 'border-2 border-emerald-500 ring-2 ring-emerald-500/20' : ''}`} 
                            onDragLeave={() => setIsDragOver(false)} 
                            onDrop={(e) => { 
                                 if (e.dataTransfer.types.includes('application/prompt-modifier-card')) return;
                                 e.preventDefault(); e.stopPropagation(); setIsDragOver(false); 
                                 onImageDrop(e);
                            }}
                        >
                            {char.thumbnails[char.selectedRatio] || char.image ? (
                                <>
                                    <img src={`data:image/png;base64,${char.thumbnails[char.selectedRatio] || char.image!}`} className="object-contain w-full h-full" style={{ imageRendering: 'auto' }} draggable={true} onDragStart={(e) => { 
                                        const src = char.imageSources?.[char.selectedRatio] || char.image;
                                        if(src) { e.dataTransfer.setData('application/prompt-modifier-drag-image', src); e.stopPropagation(); } 
                                    }} />
                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                        <ActionButton title={t('node.action.paste')} onClick={(e) => { e.stopPropagation(); onPasteImageToSlot(); }} className="bg-black/60 p-1.5 rounded text-emerald-400 hover:text-white" tooltipPosition="left">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 012-2h2a2 2 0 012 2" />
                                            </svg>
                                        </ActionButton>
                                        <ActionButton title={t('node.action.copy')} onClick={(e) => { 
                                            e.stopPropagation(); 
                                            const src = char.imageSources?.[char.selectedRatio] || char.image; 
                                            if(src) onCopyImageToClipboard(src); 
                                        }} className="bg-black/60 p-1.5 rounded text-emerald-400 hover:text-white" tooltipPosition="left"><CopyIcon className="h-4 w-4" /></ActionButton>
                                        <ActionButton title={t('node.action.clear')} onClick={(e) => { e.stopPropagation(); onClearImage(); }} className="bg-black/60 p-1.5 rounded text-red-400 hover:text-white" tooltipPosition="left"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" strokeWidth={2} strokeLinecap="round" /></svg></ActionButton>
                                    </div>
                                </>
                            ) : <div className="flex flex-col items-center justify-center w-full h-full gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                                    <span className="text-[10px] text-gray-500 uppercase font-bold text-center px-4 leading-tight">
                                        {t('node.content.imagePromptPlaceholder')}
                                    </span>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onPasteImageToSlot(); }}
                                        className="mt-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white text-xs font-bold rounded border border-gray-600 transition-colors flex items-center gap-1.5"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                        {t('node.action.paste')}
                                    </button>
                                </div>}
                        </div>
                    )}
                    {!char.isImageCollapsed && <div className="h-4"></div>}
                </div>
                
                <div className="flex gap-1 flex-shrink-0 mb-2 items-center px-1">
                    <button 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            onGenerateImage(); 
                        }} 
                        disabled={!!isGeneratingImage || !char.prompt} 
                        className={`flex-grow h-8 font-bold rounded text-[10px] uppercase transition-all shadow-sm flex items-center justify-center gap-2
                            ${isGeneratingImage 
                                ? 'bg-gray-600 text-gray-300 cursor-not-allowed opacity-75' 
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            }
                            disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {isGeneratingImage && (
                            <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        )}
                        {isGeneratingImage ? t('node.content.generating') : t('node.content.generateImage')}
                    </button>
                </div>

                {/* Prompt Section */}
                <div className="flex flex-col gap-1 mb-2 shrink-0">
                    <div className="flex justify-between items-center mb-0.5">
                        <div className="flex items-center gap-1.5">
                            <span className="text-gray-400"><PromptIcon className="h-3 w-3" /></span>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{t('node.content.prompt')}</label>
                        </div>
                        <div className="flex gap-1">
                            <ActionButton title={t('node.action.sync')} onClick={onSyncFromConnection} tooltipPosition="left">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            </ActionButton>
                            <ActionButton title={t('node.action.copy')} onClick={() => navigator.clipboard.writeText(char.prompt)} tooltipPosition="left">
                                <CopyIcon className="h-3 w-3" />
                            </ActionButton>
                        </div>
                    </div>
                    <textarea 
                        value={char.prompt} 
                        onChange={e => onUpdate({ prompt: e.target.value })} 
                        className="w-full p-2 bg-gray-900/60 border border-gray-700 rounded text-xs text-gray-200 resize-y focus:border-emerald-500 outline-none min-h-[60px] max-h-[120px] custom-scrollbar" 
                        onMouseDown={e => e.stopPropagation()} 
                        onFocus={deselectAllNodes} 
                    />
                </div>
                
                {/* Additional Prompt Input */}
                <div className="flex flex-col gap-1 mb-2 shrink-0">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Suffix</label>
                    <input
                        type="text"
                        value={char.additionalPrompt || ''}
                        onChange={e => onUpdate({ additionalPrompt: e.target.value })}
                        className="w-full p-1 bg-gray-900/60 border border-gray-700 rounded text-xs text-gray-400 focus:border-emerald-500 outline-none"
                        onMouseDown={e => e.stopPropagation()}
                        onFocus={deselectAllNodes}
                    />
                </div>

                {/* Modification Request Section */}
                <div className="flex flex-col gap-1 border-b border-gray-700/50 pb-3 mb-2 flex-shrink-0">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{t('node.content.modificationPromptPlaceholder')}</label>
                    <div className="flex gap-2 h-[32px]">
                        <input value={modificationRequest} onChange={e => setModificationRequest(e.target.value)} placeholder="..." className="flex-grow bg-gray-900/60 border border-gray-700 rounded px-2 text-xs text-white focus:border-emerald-500 outline-none h-full" onMouseDown={e => e.stopPropagation()} onFocus={deselectAllNodes} />
                        <div className="flex items-center bg-gray-700 rounded p-0.5 h-full space-x-0.5 justify-center min-w-[50px]">
                            {/* Language Switcher */}
                             {[
                                { code: 'en', label: 'EN' },
                                { code: secondaryLanguage, label: secondaryLanguage.toUpperCase() }
                             ].map((l, idx) => (
                                <button 
                                    key={l.code + idx} 
                                    onClick={(e) => { e.stopPropagation(); onUpdate({ targetLanguage: l.code }); }} 
                                    className={`h-full flex-1 rounded px-1.5 text-[10px] font-bold transition-colors flex items-center justify-center ${char.targetLanguage === l.code ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
                                >
                                    {l.label}
                                </button>
                             ))}
                        </div>
                         {/* Swapped Buttons */}
                        <div className="flex gap-1 h-full">
                            <Tooltip title="Modify">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onModifyRequest(modificationRequest); setModificationRequest(''); }} 
                                    disabled={!modificationRequest.trim() || isModifying} 
                                    className="w-8 bg-emerald-600 hover:bg-emerald-500 text-white rounded flex items-center justify-center disabled:opacity-50 h-full"
                                >
                                    {isModifying ? (
                                         <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                                    )}
                                </button>
                            </Tooltip>

                            <Tooltip title="Update Desc">
                                <button 
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        onUpdateDescriptionRequest(); 
                                    }} 
                                    disabled={isUpdatingDescription || !char.prompt} 
                                    className="w-8 bg-cyan-600 hover:bg-cyan-500 text-white rounded flex items-center justify-center disabled:opacity-50 h-full transition-colors"
                                >
                                    {isUpdatingDescription ? (
                                        <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                    )}
                                </button>
                            </Tooltip>
                        </div>
                    </div>
                </div>

                {/* Character Description Header */}
                <div 
                    className="flex-grow min-h-0 mt-2 relative p-0 border border-gray-700/50 rounded-xl bg-gray-900/20 shadow-inner overflow-hidden flex flex-col overflow-x-hidden"
                >
                    <div 
                        className="px-4 py-2 bg-gray-800 border-b border-gray-700 flex items-center justify-between cursor-pointer hover:bg-gray-750 transition-colors select-none flex-shrink-0"
                        onClick={() => onUpdate({ isDescriptionCollapsed: !char.isDescriptionCollapsed })}
                    >
                        <div className="flex items-center gap-2">
                            <div className={`transform transition-transform duration-200 ${char.isDescriptionCollapsed ? '-rotate-90' : ''}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{t('node.content.fullDescription')}</span>
                        </div>
                        <div className="flex gap-1">
                            <ActionButton 
                                title={t('node.action.copy')} 
                                onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(char.fullDescription); }}
                                className="p-1 text-gray-500 hover:text-emerald-400 transition-colors"
                                tooltipPosition="left"
                            >
                                <CopyIcon className="h-3 w-3" />
                            </ActionButton>
                        </div>
                    </div>

                    {/* Scrollable Content (Inside the boxed area) */}
                    {!char.isDescriptionCollapsed && (
                        <div 
                            className="overflow-y-auto custom-scrollbar flex-grow overflow-x-hidden"
                            onWheel={e => e.stopPropagation()}
                            style={{ scrollbarGutter: 'stable', overscrollBehaviorY: 'contain' }}
                        >
                            <DescriptionFields 
                                fullDescription={char.fullDescription || ''} 
                                onDescriptionChange={(val) => onUpdate({ fullDescription: val })}
                                t={t}
                                onFocus={deselectAllNodes}
                            />
                        </div>
                    )}
                </div>

                {/* FIXED FOOTER BUTTONS */}
                <div className="flex gap-1.5 pt-2.5 mt-auto border-t border-gray-700/50 flex-shrink-0 bg-gray-800/20 backdrop-blur-sm">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onLoadCharacter(); }} 
                        className="flex-1 h-9 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded text-[10px] uppercase tracking-tighter transition-colors"
                    >
                        {t('node.action.loadCharacter')}
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onSaveCharacter(); }} 
                        className="flex-1 h-9 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded text-[10px] uppercase tracking-tighter transition-colors"
                    >
                        {t('node.action.saveCharacter')}
                    </button>
                    
                    <div className="flex gap-1.5 ml-auto">
                        <ActionButton title={t('group.saveToCatalog')} onClick={(e) => { e.stopPropagation(); onSaveToCatalog(); }}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        </ActionButton>
                        <ActionButton title={t('node.action.copy')} onClick={(e) => { e.stopPropagation(); onCopyCard(); }}>
                            <CopyIcon className="h-4 w-4" />
                        </ActionButton>
                        <ActionButton title={t('node.action.paste')} onClick={(e) => { e.stopPropagation(); onPasteToCard(); }}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        </ActionButton>
                        <ActionButton title="Detach" onClick={(e) => { e.stopPropagation(); onDetach(); }}>
                            <DetachIcon className="h-4 w-4" />
                        </ActionButton>
                    </div>
                </div>
            </div>
    );
};
