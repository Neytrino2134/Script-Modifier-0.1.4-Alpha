
import React, { useMemo, useState, useEffect } from 'react';
import type { NodeContentProps } from '../../types';
import { TranscriberPanel } from './audio-transcriber/TranscriberPanel';
import { TagEditorPanel } from './audio-transcriber/TagEditorPanel';
import { TranscriberData } from './audio-transcriber/types';
import { useAppContext } from '../../contexts/Context';

const AudioTranscriberNode: React.FC<NodeContentProps> = ({
    node,
    onValueChange,
    t,
    onTranscribeAudio,
    isTranscribingAudio,
    isStopping,
    onStopGeneration,
    deselectAllNodes,
    addToast,
}) => {
    const isLoading = isTranscribingAudio === node.id;
    const { pendingFiles } = useAppContext();
    
    // Tab State - Initialize based on node value if available
    const [activeTab, setActiveTab] = useState<'transcribe' | 'tags'>(() => {
        try {
            const parsed = JSON.parse(node.value || '{}');
            return parsed.initialTab === 'tags' ? 'tags' : 'transcribe';
        } catch {
            return 'transcribe';
        }
    });

    // Check for pending files on mount
    const [initialFiles, setInitialFiles] = useState<File[]>([]);
    
    useEffect(() => {
        if (pendingFiles.current.has(node.id)) {
            const files = pendingFiles.current.get(node.id);
            if (files && files.length > 0) {
                setInitialFiles(files);
            }
            pendingFiles.current.delete(node.id); // Clear after claiming
        }
    }, []);

    const parsedValue = useMemo(() => {
        try {
            const parsed = JSON.parse(node.value || '{}');
            return {
                audioBase64: parsed.audioBase64 || null,
                mimeType: parsed.mimeType || null,
                transcription: parsed.transcription || '', // Plain text for display
                segments: parsed.segments || [], // Hidden structured data for SRT
                fileName: parsed.fileName || null,
                initialTab: parsed.initialTab,
                model: parsed.model || 'gemini-2.5-flash' // Default model
            };
        } catch {
            return { 
                audioBase64: null, 
                mimeType: null, 
                transcription: '', 
                segments: [], 
                fileName: null,
                model: 'gemini-2.5-flash' 
            };
        }
    }, [node.value]);

    const { transcription } = parsedValue;

    const handleValueUpdate = (updates: Partial<TranscriberData>) => {
        onValueChange(node.id, JSON.stringify({ ...parsedValue, ...updates }));
    };

    // Effect to normalize data after transcription if it comes back as raw segment JSON in the 'transcription' field
    useEffect(() => {
        if (transcription && typeof transcription === 'string' && transcription.trim().startsWith('[')) {
             try {
                 const potentialSegments = JSON.parse(transcription);
                 if (Array.isArray(potentialSegments) && potentialSegments.length > 0 && potentialSegments[0].startTime) {
                     const plainText = potentialSegments.map((s: any) => s.text).join(' ');
                     // Call update asynchronously to avoid render loop
                     setTimeout(() => {
                         handleValueUpdate({
                             transcription: plainText,
                             segments: potentialSegments
                         });
                     }, 0);
                 }
             } catch (e) {
                 // Not JSON, just normal text
             }
        }
    }, [transcription]);

    return (
        <div 
            className={`flex flex-col h-full rounded-md transition-all duration-200`}
        >
             {/* Tab Switcher - Styled as Folder Tabs */}
             <div className="flex items-end px-1 border-b border-gray-700/50 shrink-0 select-none gap-1">
                <button 
                    onClick={() => setActiveTab('transcribe')}
                    className={`flex-1 py-2 text-xs font-bold rounded-t-md rounded-b-none transition-all relative top-px ${
                        activeTab === 'transcribe' 
                        ? 'bg-gray-800 text-emerald-400 z-10' 
                        : 'bg-gray-900/30 text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
                    }`}
                >
                    {t('node.content.transcribe')}
                </button>
                <button 
                    onClick={() => setActiveTab('tags')}
                    className={`flex-1 py-2 text-xs font-bold rounded-t-md rounded-b-none transition-all relative top-px ${
                        activeTab === 'tags' 
                        ? 'bg-gray-800 text-emerald-400 z-10' 
                        : 'bg-gray-900/30 text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
                    }`}
                >
                    {t('node.content.mp3TagEditor') || 'MP3 Tag Editor'}
                </button>
            </div>

            {/* Content Area - Connected visually to tabs */}
            <div className="flex-grow flex flex-col min-h-0 overflow-hidden bg-gray-800 rounded-b-md border border-t-0 border-gray-700/50 p-2">
                {activeTab === 'transcribe' ? (
                    <TranscriberPanel 
                        data={parsedValue}
                        onUpdate={handleValueUpdate}
                        onTranscribe={() => onTranscribeAudio(node.id)}
                        isLoading={isLoading}
                        isStopping={isStopping}
                        onStop={onStopGeneration}
                        t={t}
                        addToast={addToast}
                        deselectAllNodes={deselectAllNodes}
                    />
                ) : (
                    <TagEditorPanel 
                        t={t} 
                        addToast={addToast}
                        initialFiles={initialFiles}
                    />
                )}
            </div>
        </div>
    );
};

export default AudioTranscriberNode;
