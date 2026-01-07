
import React, { useMemo, useState } from 'react';
import type { NodeContentProps } from '../../types';
import { ActionButton } from '../ActionButton';

const ImagePreviewNode: React.FC<NodeContentProps> = ({ node, onValueChange, t, onExtractTextFromImage, isExtractingText, addToast, deselectAllNodes, setImageViewer }) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const isLoading = isExtractingText;

    const parsedValue = useMemo(() => {
        try {
            return JSON.parse(node.value || '{}');
        } catch {
            return { imageBase64: null, extractedText: '' };
        }
    }, [node.value]);

    const { imageBase64, extractedText } = parsedValue;

    const handleValueUpdate = (updates: Partial<typeof parsedValue>) => {
        onValueChange(node.id, JSON.stringify({ ...parsedValue, ...updates }));
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const result = event.target?.result as string;
                if (result) {
                    const base64String = result.split(',')[1];
                    handleValueUpdate({ imageBase64: base64String });
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleExtractText = () => {
        if (onExtractTextFromImage) {
            onExtractTextFromImage(node.id);
        }
    };

    const handleCopyText = () => {
        if (extractedText) {
            navigator.clipboard.writeText(extractedText);
            addToast(t('toast.copied'), 'success');
        }
    };

    const handleCopyImage = async () => {
        if (!imageBase64) return;
        try {
            const response = await fetch(`data:image/png;base64,${imageBase64}`);
            const blob = await response.blob();
            await navigator.clipboard.write([
                new ClipboardItem({ [blob.type]: blob })
            ]);
            addToast(t('toast.copied'), 'success');
        } catch (e) {
            console.error("Failed to copy image:", e);
            addToast("Failed to copy image", 'info');
        }
    };
    
    const handleImageClick = (e: React.MouseEvent) => {
        if (imageBase64 && setImageViewer) {
            e.stopPropagation();
            setImageViewer({
                sources: [{ src: `data:image/png;base64,${imageBase64}`, frameNumber: 0, prompt: node.title }],
                initialIndex: 0
            });
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
            if (imageBase64) {
                e.preventDefault();
                e.stopPropagation();
                handleCopyImage();
            }
        }
    };

    return (
        <div 
            tabIndex={0}
            onKeyDown={handleKeyDown}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex flex-col h-full rounded-md transition-all duration-200 outline-none ${isDragOver ? 'ring-2 ring-emerald-400' : 'focus:ring-1 focus:ring-emerald-500/50'}`}
        >
            <div 
                className="relative flex-grow bg-gray-900/50 rounded-md flex items-center justify-center overflow-hidden mb-2 group cursor-pointer"
                onClick={handleImageClick}
            >
                {imageBase64 ? (
                    <>
                        <img src={`data:image/png;base64,${imageBase64}`} alt="Preview" className="w-full h-full object-contain pointer-events-none" />
                        <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleCopyImage(); }}
                                className="p-1.5 bg-gray-800/80 rounded-full text-white hover:bg-emerald-600 transition-colors backdrop-blur-sm"
                                title={t('node.action.copy')}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleValueUpdate({ imageBase64: null, extractedText: '' }); }}
                                className="p-1.5 bg-gray-800/80 rounded-full text-white hover:bg-red-600 transition-colors backdrop-blur-sm"
                                title={t('node.action.clear')}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="text-center text-gray-500 p-4 pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <p className="text-sm">Drag & drop image here</p>
                    </div>
                )}
            </div>

            <button
                onClick={handleExtractText}
                disabled={isLoading || !imageBase64}
                className="w-full px-4 py-2 mb-2 font-bold text-white bg-cyan-600 rounded-md hover:bg-cyan-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            >
                {isLoading ? t('node.content.extracting') : t('node.content.imageToText')}
            </button>

            {extractedText && (
                <div className="flex flex-col flex-shrink-0 h-32">
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-medium text-gray-400">{t('node.content.extractedText')}</label>
                        <ActionButton title={t('node.action.copy')} onClick={handleCopyText}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        </ActionButton>
                    </div>
                    <textarea
                        readOnly
                        value={extractedText}
                        className="w-full flex-grow p-2 bg-gray-700 border-none rounded-md resize-none focus:border-emerald-500 focus:ring-0 focus:outline-none custom-scrollbar overflow-y-scroll"
                        onWheel={e => e.stopPropagation()}
                        onFocus={deselectAllNodes}
                    />
                </div>
            )}
        </div>
    );
};

export default ImagePreviewNode;
