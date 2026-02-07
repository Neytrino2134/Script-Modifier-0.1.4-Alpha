
import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import type { NodeContentProps } from '../../types';
import { ActionButton } from '../ActionButton';
import { generateSpeech } from '../../services/geminiService';
import CustomSelect, { CustomSelectOption } from '../ui/CustomSelect';
import CustomCheckbox from '../ui/CustomCheckbox';
import { CopyIcon } from '../icons/AppIcons';
import Tooltip from '../ui/Tooltip';

// Audio decoding utilities from Gemini documentation
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const downloadWav = (audioData: string, id: string | number, voiceName: string, intonation: string, title: string) => {
    if (!audioData) return;
    const writeString = (view: DataView, offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) { view.setUint8(offset + i, string.charCodeAt(i)); }
    };
    const pcmData = decode(audioData);
    const buffer = new ArrayBuffer(44 + pcmData.length);
    const view = new DataView(buffer);
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + pcmData.length, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, 24000, true);
    view.setUint32(28, 24000 * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, pcmData.length, true);
    new Uint8Array(buffer, 44).set(pcmData);
    
    let baseFilename: string;
    const idStr = String(id);

    if (idStr.startsWith('scene-')) {
        const sceneNumber = idStr.split('-')[1];
        baseFilename = `scene_${sceneNumber}`;
    } else if (idStr.startsWith('simple-')) {
        const simpleNumber = idStr.split('-')[1];
        baseFilename = `generated_audio_${simpleNumber}`;
    } else {
        baseFilename = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    }
    
    const finalFilename = `${baseFilename}_${voiceName}_${intonation}`;

    const blob = new Blob([view], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${finalFilename}.wav`;
    a.click();
    URL.revokeObjectURL(url);
};


interface AudioPlayerItemProps {
    id: string | number;
    title: string;
    text: string;
    audioData: string;
    voiceName: string;
    intonation: string;
    isSelected: boolean;
    onSelect: (id: string | number) => void;
    onDownload: (id: string | number) => void;
    onPlayRequest: (stopFn: () => void) => void;
    onCopyPrompt: (text: string) => void;
    t: (key: string) => string;
}

const AudioPlayerItem: React.FC<AudioPlayerItemProps> = ({ id, title, text, audioData, voiceName, intonation, isSelected, onSelect, onDownload, onPlayRequest, onCopyPrompt, t }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

    const intonationOptions = useMemo(() => [
        { value: 'standard', label: t('intonation.standard') },
        { value: 'cheerful', label: t('intonation.cheerful') },
        { value: 'angry', label: t('intonation.angry') },
        { value: 'sad', label: t('intonation.sad') },
        { value: 'excited', label: t('intonation.excited') },
        { value: 'announcer', label: t('intonation.announcer') },
        { value: 'whispering', label: t('intonation.whispering') },
    ], [t]);
    const intonationLabel = intonationOptions.find(opt => opt.value === intonation)?.label || intonation;

    const stopPlayback = useCallback(() => {
        if (audioSourceRef.current) {
            audioSourceRef.current.onended = null;
            audioSourceRef.current.stop();
            audioSourceRef.current.disconnect();
            audioSourceRef.current = null;
        }
        setIsPlaying(false);
    }, []);

    const playAudio = useCallback(async () => {
        if (!audioData) return;
        
        onPlayRequest(stopPlayback);

        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        const audioContext = audioContextRef.current;
        
        try {
            const decodedBytes = decode(audioData);
            const audioBuffer = await decodeAudioData(decodedBytes, audioContext, 24000, 1);
            
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            
            source.onended = () => {
                if (audioSourceRef.current === source) {
                    setIsPlaying(false);
                    audioSourceRef.current = null;
                }
            };

            source.start();
            audioSourceRef.current = source;
            setIsPlaying(true);
        } catch (error) {
            console.error("Error playing audio:", error);
            setIsPlaying(false);
        }
    }, [audioData, onPlayRequest, stopPlayback]);
    
    const handlePlayPauseClick = useCallback(() => {
        if (isPlaying) {
            stopPlayback();
        } else {
            playAudio();
        }
    }, [isPlaying, stopPlayback, playAudio]);

    useEffect(() => {
        return () => {
            stopPlayback();
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close();
            }
        };
    }, [stopPlayback]);

    return (
        <div className="bg-gray-700/50 p-2 rounded-lg space-y-2 flex items-center space-x-2">
            <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onSelect(id)}
                onClick={(e) => e.stopPropagation()}
                className="h-4 w-4 text-emerald-600 bg-gray-800 border-gray-600 rounded focus:ring-emerald-500"
            />
            <div className="flex-grow min-w-0">
                <p className="font-semibold text-sm text-gray-200 truncate" title={title}>{title} - <span className="text-emerald-400">{voiceName}</span> / <span className="text-cyan-400">{intonationLabel}</span></p>
                <p className="text-xs text-gray-400 line-clamp-2" title={text}>{text}</p>
            </div>
            <div className="flex items-center justify-center space-x-2 flex-shrink-0">
                 <button onClick={handlePlayPauseClick} className="p-2 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 transition-colors" aria-label={isPlaying ? "Stop" : "Play"}>
                    {isPlaying ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1zm4 0a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                    )}
                </button>
                <button 
                    onClick={(e) => { e.stopPropagation(); onCopyPrompt(text); }}
                    className="p-2 rounded-full bg-gray-600 text-gray-300 hover:bg-emerald-600 hover:text-white transition-colors"
                    title={t('node.action.copy')}
                >
                    <CopyIcon className="h-5 w-5" />
                </button>
                <button onClick={() => onDownload(id)} className="p-2 rounded-full bg-cyan-600 text-white hover:bg-cyan-700 transition-colors" aria-label="Download">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                </button>
            </div>
        </div>
    );
};


const SpeechSynthesizerNode: React.FC<NodeContentProps> = ({
    node, onValueChange, onGenerateSpeech, isGeneratingSpeech, isStopping, onStopGeneration, t, onReadData, isReadingData, connectedInputs, addToast, inputData
}) => {
    const isLoading = isGeneratingSpeech === node.id;
    const isRefreshing = isReadingData === node.id;
    const [isPreviewing, setIsPreviewing] = useState(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const previewSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const previewCache = useRef<Map<string, string>>(new Map());
    const [selectedAudio, setSelectedAudio] = useState<Set<string|number>>(new Set());
    const [collapsedScenes, setCollapsedScenes] = useState<Set<number>>(new Set());
    const isInputConnected = connectedInputs?.has(undefined);
    const activePlayerStopFn = useRef<(() => void) | null>(null);

    const parsedValue = useMemo(() => {
        try {
            const parsed = JSON.parse(node.value || '{}');
            return {
                inputText: parsed.inputText || '',
                voice: parsed.voice || 'Zephyr',
                audioFiles: Array.isArray(parsed.audioFiles) ? parsed.audioFiles : [],
                startSceneNumber: parsed.startSceneNumber || null,
                endSceneNumber: parsed.endSceneNumber || null,
                isAutoDownloadEnabled: parsed.isAutoDownloadEnabled || false,
                intonation: parsed.intonation || 'standard',
                mode: parsed.mode || 'simple',
                isMultiSpeaker: parsed.isMultiSpeaker || false,
                speaker1Name: parsed.speaker1Name || 'Man',
                speaker1Voice: parsed.speaker1Voice || 'Zephyr',
                speaker2Name: parsed.speaker2Name || 'Woman',
                speaker2Voice: parsed.speaker2Voice || 'Kore',
            };
        } catch {
            return { inputText: '', voice: 'Zephyr', audioFiles: [], startSceneNumber: null, endSceneNumber: null, isAutoDownloadEnabled: false, intonation: 'standard', mode: 'simple', isMultiSpeaker: false, speaker1Name: 'Man', speaker1Voice: 'Zephyr', speaker2Name: 'Woman', speaker2Voice: 'Kore' };
        }
    }, [node.value]);

    const { inputText, voice, audioFiles, startSceneNumber, endSceneNumber, isAutoDownloadEnabled, intonation, mode, isMultiSpeaker, speaker1Name, speaker1Voice, speaker2Name, speaker2Voice } = parsedValue;

    const handleValueUpdate = (updates: Partial<typeof parsedValue>) => {
        const newValue = { ...parsedValue, ...updates };
        onValueChange(node.id, JSON.stringify(newValue));
    };

    // Auto-update text from inputData
    useEffect(() => {
        if (isInputConnected && inputData) {
            onReadData(node.id);
        }
    }, [inputData, isInputConnected, onReadData, node.id]);
    
    const handlePlayRequest = useCallback((stopFn: () => void) => {
        if (activePlayerStopFn.current && activePlayerStopFn.current !== stopFn) {
            activePlayerStopFn.current();
        }
        activePlayerStopFn.current = stopFn;
    }, []);

    const stopPreview = useCallback(() => {
        if (previewSourceRef.current) {
            previewSourceRef.current.onended = null;
            previewSourceRef.current.stop();
            previewSourceRef.current.disconnect();
            previewSourceRef.current = null;
        }
        setIsPreviewing(false);
    }, []);
    
    useEffect(() => {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        return () => {
            stopPreview();
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close().catch(console.error);
            }
        };
    }, [stopPreview]);

    const handlePreviewVoice = useCallback(async (targetVoice: string) => {
        if (isPreviewing) {
            stopPreview();
            return;
        }

        setIsPreviewing(true);
        try {
            const previewText = t('node.content.voicePreviewText');
            let audioData = previewCache.current.get(`${targetVoice}-${intonation}`);

            if (!audioData) {
                audioData = await generateSpeech(previewText, targetVoice, intonation);
                if (audioData) {
                    previewCache.current.set(`${targetVoice}-${intonation}`, audioData);
                }
            }

            if (!audioData) {
                throw new Error("Failed to generate or retrieve audio data.");
            }
            
            if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            }
            const audioContext = audioContextRef.current;
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }
            
            const decodedBytes = decode(audioData);
            const audioBuffer = await decodeAudioData(decodedBytes, audioContext, 24000, 1);
            
            if (previewSourceRef.current) {
                previewSourceRef.current.stop();
            }
            
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            
            source.onended = () => {
                if (previewSourceRef.current === source) {
                    setIsPreviewing(false);
                    previewSourceRef.current = null;
                }
            };

            source.start();
            previewSourceRef.current = source;
        } catch (e: any) {
            console.error("Error previewing voice:", e);
            addToast(e.message || "Failed to preview voice.");
            setIsPreviewing(false);
        }
    }, [isPreviewing, stopPreview, t, intonation, addToast]);
    
    const handleDownloadSingle = useCallback((id: string|number) => {
        const file = audioFiles.find((f: any) => f.id === id);
        if (file) {
            downloadWav(file.audioData, file.id, file.voiceName, file.intonation || 'standard', file.title);
            addToast(t('toast.downloadComplete'), 'success');
        }
    }, [audioFiles, t, addToast]);

    const handleDownloadSelected = useCallback(async () => {
        const filesToDownload = audioFiles.filter((file: any) => selectedAudio.has(file.id));
        for (const file of filesToDownload) {
            downloadWav(file.audioData, file.id, file.voiceName, file.intonation || 'standard', file.title);
            await new Promise(resolve => setTimeout(resolve, 300));
        }
        if (filesToDownload.length > 0) {
             addToast(t('toast.downloadComplete'), 'success');
        }
    }, [audioFiles, selectedAudio, t, addToast]);
    
    const prevAudioFilesLength = useRef(audioFiles.length);
    useEffect(() => {
        if (isAutoDownloadEnabled && audioFiles.length > prevAudioFilesLength.current) {
            const newFiles = audioFiles.slice(0, audioFiles.length - prevAudioFilesLength.current);
            for (const file of newFiles) {
                downloadWav(file.audioData, file.id, file.voiceName, file.intonation || 'standard', file.title);
            }
             if (newFiles.length > 0) {
                 addToast(t('toast.downloadComplete'), 'success');
             }
        }
        prevAudioFilesLength.current = audioFiles.length;
    }, [audioFiles, isAutoDownloadEnabled, t, addToast]);

    const handleSelectAudio = (id: string|number) => {
        setSelectedAudio(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const handleCopyPrompt = useCallback((text: string) => {
        navigator.clipboard.writeText(text);
        addToast(t('toast.copied'), 'success');
    }, [addToast, t]);
    
    const handleToggleCollapse = (sceneNumber: number) => {
        setCollapsedScenes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(sceneNumber)) {
                newSet.delete(sceneNumber);
            } else {
                newSet.add(sceneNumber);
            }
            return newSet;
        });
    };

    const handleSelectAll = () => {
        const allIds = new Set<string | number>(audioFiles.map((f: any) => f.id));
        setSelectedAudio(allIds);
    };
    
    const handleDeselectAll = () => {
        setSelectedAudio(new Set());
    };
    
    const handleInvertSelection = () => {
        const allIds = new Set<string | number>(audioFiles.map((f: any) => f.id));
        const newSelected = new Set<string|number>();
        allIds.forEach(id => {
            if (!selectedAudio.has(id)) {
                newSelected.add(id);
            }
        });
        setSelectedAudio(newSelected);
    };

    const voices = useMemo(() => [
        { name: 'Aoede', apiName: 'aoede', gender: t('gender.female') }, { name: 'Autonoe', apiName: 'autonoe', gender: t('gender.female') },
        { name: 'Callirrhoe', apiName: 'callirrhoe', gender: t('gender.female') }, { name: 'Despina', apiName: 'despina', gender: t('gender.female') },
        { name: 'Erinome', apiName: 'erinome', gender: t('gender.female') }, { name: 'Kore', apiName: 'kore', gender: t('gender.female') },
        { name: 'Laomedeia', apiName: 'laomedeia', gender: t('gender.female') }, { name: 'Leda', apiName: 'leda', gender: t('gender.female') },
        { name: 'Pulcherrima', apiName: 'pulcherrima', gender: t('gender.female') }, { name: 'Sadachbia', apiName: 'sadachbia', gender: t('gender.female') },
        { name: 'Sadaltager', apiName: 'sadaltager', gender: t('gender.female') }, { name: 'Schedar', apiName: 'schedar', gender: t('gender.female') },
        { name: 'Sulafat', apiName: 'sulafat', gender: t('gender.female') }, { name: 'Vindemiatrix', apiName: 'vindemiatrix', gender: t('gender.female') },
        { name: 'Achernar', apiName: 'achernar', gender: t('gender.male') }, { name: 'Achird', apiName: 'achird', gender: t('gender.male') },
        { name: 'Algenib', apiName: 'algenib', gender: t('gender.male') }, { name: 'Algieba', apiName: 'algieba', gender: t('gender.male') },
        { name: 'Alnilam', apiName: 'alnilam', gender: t('gender.male') }, { name: 'Charon', apiName: 'charon', gender: t('gender.male') },
        { name: 'Enceladus', apiName: 'enceladus', gender: t('gender.male') }, { name: 'Fenrir', apiName: 'fenrir', gender: t('gender.male') },
        { name: 'Gacrux', apiName: 'gacrux', gender: t('gender.male') }, { name: 'Iapetus', apiName: 'iapetus', gender: t('gender.male') },
        { name: 'Orus', apiName: 'orus', gender: t('gender.male') }, { name: 'Puck', apiName: 'puck', gender: t('gender.male') },
        { name: 'Rasalgethi', apiName: 'rasalgethi', gender: t('gender.male') }, { name: 'Umbriel', apiName: 'umbriel', gender: t('gender.male') },
        { name: 'Zephyr', apiName: 'zephyr', gender: t('gender.male') }, { name: 'Zubenelgenubi', apiName: 'zubenelgenubi', gender: t('gender.male') },
    ], [t]);
    
    // Prepare options for CustomSelect
    const voiceOptions = useMemo(() => voices.map(v => ({
        value: v.apiName,
        label: `${v.name} (${v.gender})`
    })), [voices]);

    const intonationOptions = useMemo(() => [
        { value: 'standard', label: t('intonation.standard') }, { value: 'cheerful', label: t('intonation.cheerful') },
        { value: 'angry', label: t('intonation.angry') }, { value: 'sad', label: t('intonation.sad') },
        { value: 'excited', label: t('intonation.excited') }, { value: 'announcer', label: t('intonation.announcer') },
        { value: 'whispering', label: t('intonation.whispering') },
    ], [t]);

    const hasSSML = /\[style:.*?]/.test(typeof inputText === 'string' ? inputText : '');

    return (
        <div className="flex flex-col h-full space-y-4">
            <div className="flex-shrink-0 space-y-3">
                 <div className="flex items-center space-x-2">
                    <CustomCheckbox
                        id={`multi-speaker-${node.id}`} 
                        checked={isMultiSpeaker} 
                        onChange={e => handleValueUpdate({ isMultiSpeaker: e })} 
                        disabled={isLoading || isPreviewing} 
                        className="h-4 w-4"
                    />
                    <label htmlFor={`multi-speaker-${node.id}`} className="text-sm text-gray-300 select-none cursor-pointer">{t('speech_synthesizer.multiSpeaker')}</label>
                </div>
                 {isMultiSpeaker ? (
                    <div className="p-3 bg-gray-900/40 rounded-md border border-gray-700/50 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor={`speaker1-name-${node.id}`} className="text-xs font-medium text-emerald-400">{t('speech_synthesizer.speaker1Name')}</label>
                                <input 
                                    id={`speaker1-name-${node.id}`} 
                                    type="text" 
                                    value={speaker1Name} 
                                    onChange={e => handleValueUpdate({ speaker1Name: e.target.value })} 
                                    className="w-full p-2 bg-gray-900 border border-emerald-500/50 rounded-md text-xs focus:ring-1 focus:ring-emerald-500 outline-none text-gray-200"
                                    onMouseDown={(e) => e.stopPropagation()}
                                />
                                <label className="text-xs font-medium text-gray-400">{t('node.content.voice')}</label>
                                <CustomSelect 
                                    value={speaker1Voice}
                                    onChange={(val) => handleValueUpdate({ speaker1Voice: val })}
                                    options={voiceOptions}
                                    disabled={isLoading}
                                    id={`speaker1-voice-${node.id}`}
                                />
                            </div>
                             <div className="space-y-2">
                                <label htmlFor={`speaker2-name-${node.id}`} className="text-xs font-medium text-cyan-400">{t('speech_synthesizer.speaker2Name')}</label>
                                <input 
                                    id={`speaker2-name-${node.id}`} 
                                    type="text" 
                                    value={speaker2Name} 
                                    onChange={e => handleValueUpdate({ speaker2Name: e.target.value })} 
                                    className="w-full p-2 bg-gray-900 border border-emerald-500/50 rounded-md text-xs focus:ring-1 focus:ring-emerald-500 outline-none text-gray-200"
                                    onMouseDown={(e) => e.stopPropagation()}
                                />
                                <label className="text-xs font-medium text-gray-400">{t('node.content.voice')}</label>
                                <CustomSelect 
                                    value={speaker2Voice}
                                    onChange={(val) => handleValueUpdate({ speaker2Voice: val })}
                                    options={voiceOptions}
                                    disabled={isLoading}
                                    id={`speaker2-voice-${node.id}`}
                                />
                            </div>
                        </div>
                        <p className="text-[10px] text-gray-500 italic border-t border-gray-700/50 pt-1">{t('speech_synthesizer.multiSpeakerHint')}</p>
                    </div>
                ) : (
                    <div className="flex items-center space-x-2 h-10">
                        <div className="w-1/2">
                            <CustomSelect 
                                value={voice} 
                                onChange={(val) => handleValueUpdate({ voice: val })} 
                                options={voiceOptions} 
                                // Disable main voice selector when multi-speaker is active to avoid confusion
                                disabled={isLoading || isPreviewing || isMultiSpeaker} 
                                id={`voice-select-${node.id}`} 
                            />
                        </div>
                        <div className="w-1/2 relative">
                            <CustomSelect 
                                value={intonation} 
                                onChange={(val) => handleValueUpdate({ intonation: val })} 
                                options={intonationOptions} 
                                disabled={isLoading || isPreviewing || hasSSML || isMultiSpeaker} 
                                id={`intonation-select-${node.id}`} 
                            />
                            {hasSSML && <div className="absolute inset-0 bg-gray-700/80 rounded-md flex items-center justify-center text-xs text-gray-300 font-medium z-10 pointer-events-none" title={t('speech_synthesizer.ssmlHint')}>SSML Active</div>}
                        </div>
                        <div className="flex-shrink-0">
                            <ActionButton title={t('node.content.previewVoice')} onClick={() => handlePreviewVoice(voice)} disabled={isLoading || isStopping || isMultiSpeaker}>
                                {isPreviewing ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 animate-pulse text-red-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1zm4 0a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-500 hover:text-emerald-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                                )}
                            </ActionButton>
                        </div>
                    </div>
                )}
                
                <div className="flex-shrink-0 p-1 bg-gray-900/50 rounded-md flex items-center space-x-1 border border-gray-700/30">
                    <div className={`p-2 h-8 w-10 flex items-center justify-center rounded-md transition-colors ${isRefreshing ? 'bg-emerald-600/30 text-emerald-400' : 'text-gray-500 bg-transparent'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <button onClick={() => handleValueUpdate({ mode: 'simple' })} className={`flex-1 px-3 py-1 text-sm font-semibold rounded-md transition-colors h-8 ${mode === 'simple' ? 'bg-emerald-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>
                        {t('speech_synthesizer.mode.simple')}
                    </button>
                    <button onClick={() => handleValueUpdate({ mode: 'scene' })} className={`flex-1 px-3 py-1 text-sm font-semibold rounded-md transition-colors h-8 ${mode === 'scene' ? 'bg-emerald-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>
                        {t('speech_synthesizer.mode.scene')}
                    </button>
                </div>
            </div>
            
            {mode === 'scene' && (
            <div className="flex items-center justify-end gap-2 p-2 bg-gray-900/50 rounded-md flex-shrink-0 border border-gray-700/30">
                <div className="flex items-center space-x-1 text-xs text-gray-400">
                    <label htmlFor={`start-scene-${node.id}`} className="whitespace-nowrap">{t('node.content.analyzeFromScene')}</label>
                    <input id={`start-scene-${node.id}`} type="number" min="1" placeholder="1" value={startSceneNumber || ''} onChange={e => handleValueUpdate({ startSceneNumber: e.target.value ? parseInt(e.target.value, 10) : null })} className="w-14 p-1 bg-gray-800 text-white rounded-md text-center focus:ring-1 focus:ring-emerald-500 outline-none border border-transparent focus:border-emerald-500" onMouseDown={e => e.stopPropagation()}/>
                    <label htmlFor={`end-scene-${node.id}`} className="whitespace-nowrap">{t('node.content.analyzeUpToScene')}</label>
                    <input id={`end-scene-${node.id}`} type="number" min="1" placeholder={t('node.content.endPlaceholder')} value={endSceneNumber || ''} onChange={e => handleValueUpdate({ endSceneNumber: e.target.value ? parseInt(e.target.value, 10) : null })} className="w-16 p-1 bg-gray-800 text-white rounded-md text-center focus:ring-1 focus:ring-emerald-500 outline-none border border-transparent focus:border-emerald-500" onMouseDown={e => e.stopPropagation()}/>
                </div>
            </div>
            )}

            <button
                onClick={isLoading ? onStopGeneration : () => onGenerateSpeech(node.id)}
                disabled={isStopping || isPreviewing || (typeof inputText === 'string' && !inputText.trim() && mode === 'simple') || (Array.isArray(inputText) && inputText.length === 0 && mode === 'scene')}
                className={`w-full flex-shrink-0 px-4 py-2 font-bold text-white rounded-md transition-colors duration-200 whitespace-nowrap flex items-center justify-center space-x-2 ${isStopping ? 'bg-yellow-600' : (isLoading ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed')}`}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
                <span>
                    {isStopping ? t('node.action.stopping') : (isLoading ? t('node.content.generating') : t('node.content.generateSpeech'))}
                </span>
            </button>

            <div className="flex flex-row flex-grow min-h-0 space-x-2">
                <div onWheel={e => e.stopPropagation()} className="w-1/2 bg-gray-900/50 rounded p-2 overflow-y-auto custom-scrollbar border border-gray-700/30">
                    {mode === 'scene' ? (
                        Array.isArray(inputText) && inputText.length > 0 ? (
                            <div className="space-y-2">
                                {inputText.map((scene: {sceneNumber: number, text: string}) => {
                                    const isCollapsed = collapsedScenes.has(scene.sceneNumber);
                                    return (
                                        <div key={scene.sceneNumber} className="bg-gray-800/50 rounded-lg p-2 border border-gray-700/30 hover:border-gray-600 transition-colors">
                                            <h4 className="font-semibold text-gray-300 text-sm flex justify-between items-center cursor-pointer select-none" onClick={() => handleToggleCollapse(scene.sceneNumber)}>
                                                <span>{t('node.content.scene')} {scene.sceneNumber}</span>
                                                {isCollapsed ? <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>}
                                            </h4>
                                            {!isCollapsed && <p className="mt-2 text-sm text-gray-200 whitespace-pre-wrap select-text">{scene.text}</p>}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                             <div className="flex items-center justify-center h-full text-center text-xs text-gray-500 p-4">
                                <p>{t('node.content.connectNarratorData')}</p>
                            </div>
                        )
                    ) : (
                        <textarea
                            className="w-full h-full bg-transparent p-1 disabled:bg-transparent disabled:text-gray-500 custom-scrollbar resize-none focus:ring-1 focus:ring-emerald-500 focus:outline-none rounded text-sm text-gray-200 placeholder-gray-600"
                            placeholder={isInputConnected ? t('node.content.connectedPlaceholder') : t('node.content.textToSynthesize')}
                            value={typeof inputText === 'string' ? inputText : ''}
                            onChange={(e) => handleValueUpdate({ inputText: e.target.value })}
                            disabled={isInputConnected || isLoading}
                            onMouseDown={(e) => e.stopPropagation()}
                        />
                    )}
                </div>

                <div className="w-1/2 bg-gray-900/50 rounded p-2 flex flex-col space-y-2 border border-gray-700/30">
                    {audioFiles.length > 0 && (
                        <div className="flex-shrink-0 flex items-center justify-between border-b border-gray-700/50 pb-2">
                            <span className="text-sm text-gray-300 font-medium">{t('node.content.promptsGenerated', { count: audioFiles.length })}</span>
                            <div className="flex items-center space-x-1">
                                <ActionButton title={t('selection.selectAll')} onClick={handleSelectAll}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                    </svg>
                                </ActionButton>
                                <ActionButton title={t('selection.deselectAll')} onClick={handleDeselectAll}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M8 7h8M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-2" />
                                    </svg>
                                </ActionButton>
                                <ActionButton title={t('selection.invert')} onClick={handleInvertSelection}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                    </svg>
                                </ActionButton>
                            </div>
                        </div>
                    )}
                    <div onWheel={e => e.stopPropagation()} className="flex-grow overflow-y-auto custom-scrollbar space-y-2 pr-1 -mr-1">
                        {audioFiles.length > 0 ? audioFiles.map((file: any, index: number) => (
                           <AudioPlayerItem 
                                key={file.id || index} 
                                id={file.id}
                                title={file.title}
                                text={file.text} 
                                audioData={file.audioData}
                                voiceName={file.voiceName}
                                intonation={file.intonation || 'standard'}
                                isSelected={selectedAudio.has(file.id)}
                                onSelect={handleSelectAudio}
                                onDownload={handleDownloadSingle}
                                onPlayRequest={handlePlayRequest}
                                onCopyPrompt={handleCopyPrompt}
                                t={t}
                            />
                        )) : (
                             <div className="flex items-center justify-center h-full text-center text-xs text-gray-500">
                               <p>Generated audio files will appear here.</p>
                            </div>
                        )}
                    </div>
                     {audioFiles.length > 0 && (
                        <div className="flex-shrink-0 flex flex-col items-stretch space-y-2 pt-2 border-t border-gray-700/50">
                            <div className="flex items-center space-x-2 px-1">
                                <CustomCheckbox 
                                    id={`auto-download-${node.id}`} 
                                    checked={isAutoDownloadEnabled} 
                                    onChange={(checked) => handleValueUpdate({ isAutoDownloadEnabled: checked })} 
                                    className="h-4 w-4"
                                />
                                <label htmlFor={`auto-download-${node.id}`} className="text-xs text-gray-300 select-none cursor-pointer">{t('node.content.autoDownload')}</label>
                            </div>
                            <button onClick={handleDownloadSelected} disabled={selectedAudio.size === 0} className="w-full px-3 py-2 text-sm font-bold text-white bg-cyan-600 rounded-md hover:bg-cyan-700 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors">
                                {t('node.content.downloadSelected')}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SpeechSynthesizerNode;
