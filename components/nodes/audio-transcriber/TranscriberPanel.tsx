
import React, { useRef, useState, useMemo } from 'react';
import { fileToArrayBuffer, audioBufferToWav } from '../../../utils/audioUtils';
import { TranscriberData } from './types';
import Tooltip from '../../ui/Tooltip';

interface TranscriberPanelProps {
    data: TranscriberData;
    onUpdate: (updates: Partial<TranscriberData>) => void;
    onTranscribe: () => void;
    isLoading: boolean;
    isStopping: boolean;
    onStop: () => void;
    t: (key: string) => string;
    addToast: (msg: string, type: 'success' | 'info') => void;
    deselectAllNodes: () => void;
}

export const TranscriberPanel: React.FC<TranscriberPanelProps> = ({
    data, onUpdate, onTranscribe, isLoading, isStopping, onStop, t, addToast, deselectAllNodes
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isConverting, setIsConverting] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const { audioBase64, transcription, fileName, segments, mimeType, model } = data;

    const handleFile = async (file: File) => {
        if (file.type.startsWith('video/mp4')) {
            setIsConverting(true);
            try {
                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                const arrayBuffer = await fileToArrayBuffer(file);
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                const wavBlob = audioBufferToWav(audioBuffer);
                
                const reader = new FileReader();
                reader.onload = (e) => {
                    const base64String = (e.target?.result as string).split(',')[1];
                    onUpdate({
                        audioBase64: base64String,
                        mimeType: 'audio/wav',
                        fileName: file.name,
                        transcription: '',
                        segments: [],
                    });
                    setIsConverting(false);
                };
                 reader.onerror = () => {
                   setIsConverting(false);
                   addToast(t('error.fileReadError'), 'info'); 
                };
                reader.readAsDataURL(wavBlob);

            } catch (error) {
                console.error('Error converting video to audio:', error);
                addToast(t('error.videoConversionError'), 'info');
                setIsConverting(false);
            }
        } else if (file.type.startsWith('audio/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64String = (e.target?.result as string).split(',')[1];
                onUpdate({
                    audioBase64: base64String,
                    mimeType: file.type,
                    fileName: file.name,
                    transcription: '',
                    segments: [],
                });
            };
            reader.readAsDataURL(file);
        } else {
             addToast(t('error.unsupportedFile'), 'info');
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        handleFile(file);
        if (event.target) event.target.value = '';
    };

    const handleDownloadSRT = () => {
        let srtContent = '';
        const segs = segments || [];
        
        if (segs.length > 0) {
            srtContent = segs.map((s, index) => {
                const start = s.startTime.replace('.', ',');
                const end = s.endTime.replace('.', ',');
                return `${index + 1}\n${start} --> ${end}\n${s.text}\n`;
            }).join('\n');
        } else {
             srtContent = `1\n00:00:00,000 --> 00:00:05,000\n${transcription}`;
        }

        const blob = new Blob([srtContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const name = fileName ? fileName.replace(/\.[^/.]+$/, "") : "transcription";
        a.download = `${name}.srt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Helper to determine icon based on mime type
    const getMediaIcon = () => {
        if (!mimeType) return null;
        if (fileName?.endsWith('.mp4') || mimeType.startsWith('video/')) {
             return <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-cyan-400" viewBox="0 0 20 20" fill="currentColor"><path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" /></svg>;
        }
        return <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-cyan-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.414z" clipRule="evenodd" /></svg>;
    };

    return (
        <div 
            className={`flex flex-col h-full rounded-md transition-all duration-200 ${isDragOver ? 'ring-2 ring-blue-400 bg-gray-800/50' : ''}`}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
            onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); }}
            onDrop={(e) => {
                e.preventDefault(); e.stopPropagation(); setIsDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file && (file.type.startsWith('audio/') || file.type === 'video/mp4')) handleFile(file);
            }}
        >
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="audio/*,video/mp4"
                className="hidden"
            />
            
            <div className="flex flex-col gap-1 flex-shrink-0">
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading || isConverting}
                    className="w-full px-4 py-2 font-bold text-white bg-cyan-600 hover:bg-cyan-500 rounded-md disabled:bg-gray-700 disabled:text-gray-500 transition-colors text-sm flex items-center justify-center gap-2"
                >
                    {isConverting ? (
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                    )}
                    {isConverting ? t('node.content.convertingVideo') : t('node.content.uploadAudio')}
                </button>
                
                <div className={`text-center text-[10px] p-1 bg-gray-900/30 rounded truncate flex items-center justify-between gap-1 h-6 relative ${fileName ? 'text-cyan-400 font-medium' : 'text-gray-500'}`}>
                    <div className="flex items-center justify-center w-full gap-1 truncate px-4">
                        {fileName && getMediaIcon()}
                        <span className="truncate">
                            {isConverting ? t('node.content.convertingVideo') : (fileName ? `${fileName}` : t('node.content.noAudioLoaded'))}
                        </span>
                    </div>
                    {fileName && !isConverting && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onUpdate({ audioBase64: null, mimeType: null, fileName: null }); }}
                            className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 hover:text-red-400 text-gray-500 rounded-full transition-colors flex items-center justify-center"
                            title="Remove file"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* Model Selector */}
            <div className="flex w-full flex-shrink-0 gap-1 select-none bg-gray-900/50 rounded-lg p-0.5 h-8 mt-1">
                <Tooltip title={t('tooltip.model.flash')} position="top" className="h-full flex-1">
                    <button 
                        onClick={() => onUpdate({ model: 'gemini-2.5-flash' })}
                        className={`w-full h-full text-[10px] font-bold text-center transition-colors rounded-md flex items-center justify-center ${
                            model === 'gemini-2.5-flash' || !model
                            ? 'bg-emerald-600 text-white shadow-sm' 
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                        }`}
                    >
                        FLASH
                    </button>
                </Tooltip>
                <Tooltip title={t('tooltip.model.pro')} position="top" className="h-full flex-1">
                    <button 
                        onClick={() => onUpdate({ model: 'gemini-2.5-pro' })}
                        className={`w-full h-full text-[10px] font-bold text-center transition-colors rounded-md flex items-center justify-center ${
                            model === 'gemini-2.5-pro' 
                            ? 'bg-emerald-600 text-white shadow-sm' 
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                        }`}
                    >
                        PRO
                    </button>
                </Tooltip>
            </div>
            
            <button
                onClick={isLoading ? onStop : onTranscribe}
                disabled={isStopping || !audioBase64 || isConverting}
                className={`w-full px-4 py-2 font-bold text-white rounded-md transition-colors duration-200 flex-shrink-0 flex items-center justify-center gap-2 mt-1 ${
                    isStopping 
                    ? 'bg-yellow-600' 
                    : (isLoading 
                        ? 'bg-cyan-600 hover:bg-cyan-500' 
                        : 'bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500')
                }`}
            >
                {isLoading && !isStopping ? (
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                )}
                {isStopping ? t('node.action.stopping') : (isLoading ? t('node.content.transcribing') : t('node.content.transcribe'))}
            </button>

            <textarea
                value={transcription}
                onChange={(e) => onUpdate({ transcription: e.target.value })}
                onMouseDown={e => e.stopPropagation()}
                onFocus={deselectAllNodes}
                placeholder={t('node.content.transcriptionPlaceholder')}
                className="w-full flex-grow p-2 bg-gray-700 border border-transparent rounded-md resize-none focus:border-emerald-500 focus:ring-0 focus:outline-none custom-scrollbar mt-2"
                onWheel={e => e.stopPropagation()}
            />
            
            {transcription && (
                <button
                    onClick={handleDownloadSRT}
                    className="w-full px-4 py-2 font-bold text-white bg-cyan-600 rounded-md hover:bg-cyan-700 transition-colors duration-200 flex items-center justify-center gap-2 flex-shrink-0 mt-2"
                    title={t('node.action.downloadSRT')}
                >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>{t('node.action.downloadSRT')}</span>
                </button>
            )}
        </div>
    );
};
