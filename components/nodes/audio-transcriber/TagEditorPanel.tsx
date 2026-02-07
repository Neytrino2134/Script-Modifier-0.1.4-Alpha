
import React, { useRef, useState, useEffect } from 'react';
import CustomCheckbox from '../../ui/CustomCheckbox';
import { Mp3File } from './types';
import { fileToArrayBuffer, getAudioFingerprint } from '../../../utils/audioUtils';
import { generateMp3Tags } from '../../../services/geminiService';
import { CopyIcon, PasteIcon, CloseIcon } from '../../icons/AppIcons';
// Fix for "does not provide an export named 'default'" error with browser-id3-writer
import * as ID3WriterModule from 'browser-id3-writer';
// @ts-ignore
const ID3Writer = ID3WriterModule.default || ID3WriterModule;

import Tooltip from '../../ui/Tooltip';

interface TagEditorPanelProps {
    t: (key: string, options?: any) => string;
    addToast: (msg: string, type: 'success' | 'info' | 'error') => void;
    initialFiles?: File[];
}

// Internal component for handling Cover Art Blob URLs efficiently
const CoverPreview: React.FC<{ 
    cover?: { data: ArrayBuffer; mimeType: string };
    onUpdate: (data: { data: ArrayBuffer; mimeType: string } | null) => void;
    addToast: (msg: string, type: 'success' | 'info' | 'error') => void;
}> = ({ cover, onUpdate, addToast }) => {
    const [url, setUrl] = useState<string | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);

    useEffect(() => {
        if (cover) {
            const blob = new Blob([cover.data], { type: cover.mimeType });
            const objectUrl = URL.createObjectURL(blob);
            setUrl(objectUrl);
            return () => URL.revokeObjectURL(objectUrl);
        } else {
            setUrl(null);
        }
    }, [cover]);

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        // 1. Check for internal app image drag (Base64)
        const draggedData = e.dataTransfer.getData('application/prompt-modifier-drag-image');
        if (draggedData) {
            try {
                // Remove header if present to get raw base64 for conversion
                const base64 = draggedData.replace(/^data:image\/\w+;base64,/, '');
                const binaryString = atob(base64);
                const len = binaryString.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                
                // Try to detect mime type from header if present, else default to png
                let mimeType = 'image/png';
                const match = draggedData.match(/^data:(image\/\w+);base64,/);
                if (match) {
                    mimeType = match[1];
                }

                onUpdate({ data: bytes.buffer, mimeType: mimeType });
                addToast("Cover updated from drop", 'success');
                return; 
            } catch (e) {
                console.error("Failed to process dragged image data", e);
                addToast("Failed to process dragged image", 'error');
            }
        }

        // 2. Check for File Drop
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
             try {
                const buffer = await fileToArrayBuffer(file);
                onUpdate({ data: buffer, mimeType: file.type });
                addToast("Cover updated from file", 'success');
            } catch (err) {
                addToast("Failed to load image file", 'error');
            }
        }
    };

    const handlePaste = async () => {
        try {
            const items = await navigator.clipboard.read();
            for (const item of items) {
                const type = item.types.find(t => t.startsWith('image/'));
                if (type) {
                    const blob = await item.getType(type);
                    const buffer = await blob.arrayBuffer();
                    onUpdate({ data: buffer, mimeType: type });
                    return;
                }
            }
            addToast("No image in clipboard", 'info');
        } catch (e) {
            addToast("Paste failed", 'error');
        }
    };

    const handleCopy = async () => {
        if (!cover) return;
        try {
            const blob = new Blob([cover.data], { type: cover.mimeType });
            await navigator.clipboard.write([
                new ClipboardItem({ [cover.mimeType]: blob })
            ]);
            addToast("Copied to clipboard", 'success');
        } catch (e) {
            addToast("Copy failed", 'error');
        }
    };

    const wrapperClasses = `w-32 h-32 rounded-lg border-2 overflow-hidden flex-shrink-0 shadow-md transition-colors relative group ${isDragOver ? 'border-emerald-400 bg-emerald-900/20' : 'border-gray-600 bg-gray-800/50'}`;

    if (!url && !isDragOver) {
        return (
            <div 
                className={wrapperClasses}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
            >
                <div className="flex flex-col items-center justify-center h-full text-gray-600">
                    <span className="text-[9px] uppercase font-bold tracking-widest mb-1">No Cover</span>
                    <Tooltip title="Paste Image from Clipboard" position="bottom">
                        <button onClick={handlePaste} className="p-1 hover:text-emerald-400 transition-colors">
                            <PasteIcon className="w-4 h-4" />
                        </button>
                    </Tooltip>
                </div>
            </div>
        );
    }

    return (
        <div 
            className={wrapperClasses}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
        >
             {url && <img src={url} alt="Cover" className="w-full h-full object-cover" draggable={false} />}
             
             {/* Overlay Actions */}
             <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-sm z-10">
                <Tooltip title="Copy Image" position="top">
                    <button onClick={handleCopy} className="p-1.5 bg-gray-700 hover:bg-emerald-600 text-white rounded shadow-sm">
                        <CopyIcon className="w-4 h-4" />
                    </button>
                </Tooltip>
                <Tooltip title="Paste Image" position="top">
                    <button onClick={handlePaste} className="p-1.5 bg-gray-700 hover:bg-cyan-600 text-white rounded shadow-sm">
                        <PasteIcon className="w-4 h-4" />
                    </button>
                </Tooltip>
                <Tooltip title="Clear" position="top">
                    <button onClick={() => onUpdate(null)} className="p-1.5 bg-gray-700 hover:bg-red-600 text-white rounded shadow-sm">
                        <CloseIcon className="w-4 h-4" />
                    </button>
                </Tooltip>
             </div>
        </div>
    );
};

// Internal component for a single row to keep the main component clean
const Mp3Row: React.FC<{
    mp3: Mp3File;
    onToggleCheck: (id: string) => void;
    onRemove: (id: string) => void;
    onUpdateTag: (id: string, field: keyof Mp3File['tags'], value: any) => void;
    onUpdateFilename: (id: string, value: string) => void;
    addToast: (msg: string, type: 'success' | 'info' | 'error') => void;
    t: (key: string) => string;
}> = ({ mp3, onToggleCheck, onRemove, onUpdateTag, onUpdateFilename, addToast, t }) => {
    return (
        <tr className={`hover:bg-gray-800/40 transition-colors border-b border-gray-800 last:border-0 group ${mp3.isDuplicate ? 'bg-red-900/10' : ''}`}>
            <td className="p-3 text-center align-top w-10 pt-4">
                <div className="flex justify-center">
                     <CustomCheckbox checked={!!mp3.isChecked} onChange={() => onToggleCheck(mp3.id)} className="h-5 w-5" />
                </div>
            </td>
            
            {/* Cover Art Column - Aligned Top */}
            <td className="p-3 align-top w-36">
                <CoverPreview 
                    cover={mp3.tags.cover} 
                    onUpdate={(data) => onUpdateTag(mp3.id, 'cover', data)}
                    addToast={addToast}
                />
            </td>

            {/* Main Data Column */}
            <td className="p-3 align-top">
                <div className="flex flex-col gap-2">
                    {/* Top Row: Filename & Track */}
                    <div className="flex gap-2">
                         <div className="relative flex-grow">
                             <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-mono select-none">FILE</span>
                            <input 
                                value={mp3.name} 
                                onChange={(e) => onUpdateFilename(mp3.id, e.target.value)} 
                                className="w-full bg-gray-900/50 border border-gray-700 rounded px-2 py-1.5 pl-10 text-xs text-gray-300 font-mono focus:border-emerald-500 outline-none transition-colors"
                                onMouseDown={(e) => e.stopPropagation()}
                            />
                             {mp3.isDuplicate && (
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] bg-red-600 text-white px-1.5 rounded-sm font-bold shadow-sm" title="Duplicate Content">DUP</span>
                            )}
                        </div>
                        <div className="relative w-16 flex-shrink-0">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-mono select-none">#</span>
                            <input 
                                value={mp3.tags.trackNumber || ''} 
                                onChange={(e) => onUpdateTag(mp3.id, 'trackNumber', e.target.value)} 
                                className="w-full bg-gray-900/50 border border-gray-700 rounded px-2 py-1.5 pl-6 text-xs text-gray-300 text-center focus:border-emerald-500 outline-none transition-colors"
                                onMouseDown={(e) => e.stopPropagation()}
                                placeholder="0"
                            />
                        </div>
                    </div>

                    {/* Middle Row: Title | Artist | Album in one line */}
                    <div className="flex gap-2">
                        <input 
                            value={mp3.tags.title} 
                            onChange={(e) => onUpdateTag(mp3.id, 'title', e.target.value)} 
                            className="flex-[1.5] bg-transparent border-b border-gray-700 focus:border-emerald-500 outline-none text-sm font-bold text-white placeholder-gray-600 px-1 py-1 transition-colors min-w-0"
                            onMouseDown={(e) => e.stopPropagation()}
                            placeholder="Title"
                        />
                        <input 
                            value={mp3.tags.artist} 
                            onChange={(e) => onUpdateTag(mp3.id, 'artist', e.target.value)} 
                            className="flex-1 bg-transparent border-b border-gray-700/50 focus:border-cyan-500 outline-none text-xs text-cyan-300 placeholder-gray-600 px-1 py-1 transition-colors min-w-0"
                            onMouseDown={(e) => e.stopPropagation()}
                            placeholder={t('node.content.tagEditor.artist') || "Artist"}
                        />
                        <input 
                            value={mp3.tags.album} 
                            onChange={(e) => onUpdateTag(mp3.id, 'album', e.target.value)} 
                            className="flex-1 bg-transparent border-b border-gray-700/50 focus:border-purple-500 outline-none text-xs text-purple-300 placeholder-gray-600 px-1 py-1 transition-colors min-w-0"
                            onMouseDown={(e) => e.stopPropagation()}
                            placeholder={t('node.content.tagEditor.album') || "Album"}
                        />
                    </div>

                    {/* Bottom Row: Genre (Prompt) - Large Textarea */}
                    <div className="relative w-full">
                         <textarea 
                            value={mp3.tags.genre} 
                            onChange={(e) => onUpdateTag(mp3.id, 'genre', e.target.value)} 
                            className="w-full bg-gray-900/30 border border-gray-700/50 focus:border-yellow-500 outline-none text-xs text-yellow-300 placeholder-gray-600 px-2 py-2 rounded resize-y min-h-[60px] custom-scrollbar"
                            onMouseDown={(e) => e.stopPropagation()}
                            placeholder="Genre (Prompt)"
                            rows={3}
                        />
                    </div>
                </div>
            </td>

            {/* Actions Column - Aligned Top */}
            <td className="p-3 align-top w-10 text-center pt-4">
                <Tooltip title={t('node.action.deleteItem') || "Remove File"} position="left">
                    <button 
                        onClick={() => onRemove(mp3.id)} 
                        className="p-2 text-gray-600 hover:text-red-400 hover:bg-red-900/20 rounded-full transition-all"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </Tooltip>
            </td>
        </tr>
    );
};

// Moved ToolButton outside to prevent re-creation on render (fixes flickering)
const ToolButton: React.FC<{ 
    onClick: () => void; 
    title: string; 
    icon: React.ReactNode; 
    disabled?: boolean;
    className?: string; 
    tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
}> = ({ onClick, title, icon, disabled, className = "bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white", tooltipPosition = "top" }) => (
    <Tooltip title={title} position={tooltipPosition}>
        <button 
            onClick={(e) => { e.stopPropagation(); onClick(); }} 
            disabled={disabled}
            className={`w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-md transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
            onMouseDown={(e) => e.stopPropagation()}
        >
            {icon}
        </button>
    </Tooltip>
);

export const TagEditorPanel: React.FC<TagEditorPanelProps> = ({ t, addToast, initialFiles }) => {
    const tagFileInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null); 
    const loadedInitialRef = useRef(false);
    
    const [mp3Files, setMp3Files] = useState<Mp3File[]>([]);
    
    // Batch State
    const [globalArtist, setGlobalArtist] = useState('');
    const [globalAlbum, setGlobalAlbum] = useState('');
    const [globalGenre, setGlobalGenre] = useState(''); // Prompt
    const [globalCover, setGlobalCover] = useState<{ data: ArrayBuffer, mimeType: string } | null>(null); 
    
    const [isProcessingTags, setIsProcessingTags] = useState(false);
    const [isAnalyzingDuplicates, setIsAnalyzingDuplicates] = useState(false);
    const [aiTagContext, setAiTagContext] = useState('');
    const [isGeneratingTags, setIsGeneratingTags] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);

    const addFiles = async (files: File[]) => {
        const processedFiles = await Promise.all(files.map(async (f: File) => {
            const defaultTags = {
                 title: f.name.replace(/\.mp3$/i, ''),
                 artist: '',
                 album: '',
                 year: '',
                 genre: '',
                 prompt: '',
                 trackNumber: ''
            };
            let coverData = undefined;

            try {
                // @ts-ignore
                if (window.jsmediatags) {
                    const tagData: any = await new Promise((resolve, reject) => {
                        // @ts-ignore
                        window.jsmediatags.read(f, {
                            onSuccess: (tag: any) => resolve(tag),
                            onError: (error: any) => reject(error)
                        });
                    });

                    if (tagData && tagData.tags) {
                        const t = tagData.tags;
                        if (t.title) defaultTags.title = t.title;
                        if (t.artist) defaultTags.artist = t.artist;
                        if (t.album) defaultTags.album = t.album;
                        if (t.year) defaultTags.year = t.year;
                        if (t.genre) defaultTags.genre = t.genre;
                        if (t.track) defaultTags.trackNumber = t.track;
                        if (t.TXXX) {
                             const promptFrame = t.TXXX.find((x: any) => x.description === 'Prompt');
                             if (promptFrame) defaultTags.prompt = promptFrame.data;
                        }

                        if (t.picture) {
                            const { data, format } = t.picture;
                            const uint8Array = new Uint8Array(data);
                            coverData = {
                                data: uint8Array.buffer,
                                mimeType: format
                            };
                        }
                    }
                }
            } catch (err) {
                console.warn("Failed to read tags for " + f.name, err);
            }

            return {
                 file: f,
                 name: f.name,
                 tags: { ...defaultTags, cover: coverData },
                 id: `mp3-${Date.now()}-${Math.random()}`,
                 isChecked: false,
                 isDuplicate: false
            };
        }));
        
        setMp3Files(prev => [...prev, ...processedFiles]);
    };

    // Load initial files
    useEffect(() => {
        if (initialFiles && initialFiles.length > 0 && !loadedInitialRef.current) {
            addFiles(initialFiles);
            loadedInitialRef.current = true;
        }
    }, [initialFiles]);

    const handleTagFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files).filter((f: any) => f.type === 'audio/mpeg' || f.name.endsWith('.mp3')) as File[];
            addFiles(files);
        }
        if (e.target) e.target.value = '';
    };

    const handleCoverFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.type.startsWith('image/')) {
                try {
                    const buffer = await fileToArrayBuffer(file);
                    setGlobalCover({ data: buffer, mimeType: file.type });
                    addToast('Cover art loaded for batch apply', 'success');
                } catch (err) {
                    console.error("Failed to load cover", err);
                    addToast('Failed to load cover art', 'error');
                }
            }
        }
        if (e.target) e.target.value = '';
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        const files = Array.from(e.dataTransfer.files).filter((f: any) => f.type === 'audio/mpeg' || f.name.endsWith('.mp3')) as File[];
        if (files.length > 0) addFiles(files);
    };

    const updateTag = (id: string, field: keyof Mp3File['tags'], value: any) => {
        setMp3Files(prev => prev.map(f => f.id === id ? { ...f, tags: { ...f.tags, [field]: value } } : f));
    };

    const updateFilename = (id: string, value: string) => {
        setMp3Files(prev => prev.map(f => f.id === id ? { ...f, name: value } : f));
    };

    const removeMp3File = (id: string) => {
        setMp3Files(prev => prev.filter(f => f.id !== id));
    };
    
    const toggleFileCheck = (id: string) => {
        setMp3Files(prev => prev.map(f => f.id === id ? { ...f, isChecked: !f.isChecked } : f));
    };
    
    const selectAll = () => {
        setMp3Files(prev => prev.map(f => ({ ...f, isChecked: true })));
    };
    
    const deselectAll = () => {
        setMp3Files(prev => prev.map(f => ({ ...f, isChecked: false })));
    };

    const invertSelection = () => {
        setMp3Files(prev => prev.map(f => ({ ...f, isChecked: !f.isChecked })));
    };
    
    const toggleAllCheck = () => {
        const allChecked = mp3Files.every(f => f.isChecked);
        setMp3Files(prev => prev.map(f => ({ ...f, isChecked: !allChecked })));
    };
    
    const deleteSelectedFiles = () => {
        setMp3Files(prev => prev.filter(f => !f.isChecked));
    };

    const deleteDuplicates = () => {
         setMp3Files(prev => prev.filter(f => !f.isDuplicate));
    };
    
    const deleteAllFiles = () => {
        setMp3Files([]);
    }

    const sortFilesByName = () => {
        setMp3Files(prev => {
            const sorted = [...prev].sort((a, b) => 
                a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
            );
            return sorted;
        });
        addToast('Files sorted by name', 'success');
    };

    const applyGlobalTags = () => {
        setMp3Files(prev => prev.map(f => {
            if (!f.isChecked && mp3Files.some(mf => mf.isChecked)) return f; 
            return {
                ...f,
                tags: {
                    ...f.tags,
                    artist: globalArtist || f.tags.artist,
                    album: globalAlbum || f.tags.album,
                    genre: globalGenre || f.tags.genre,
                    cover: globalCover || f.tags.cover 
                }
            };
        }));
        
        if (globalArtist || globalAlbum || globalCover || globalGenre) {
            addToast('Batch tags applied', 'success');
        }
    };

    const handleAiAutoTag = async () => {
        const selectedFiles = mp3Files.filter(f => f.isChecked);
        if (selectedFiles.length === 0) {
            addToast("Please select files to tag", 'info');
            return;
        }

        setIsGeneratingTags(true);
        try {
            const fileList = selectedFiles.map(f => ({
                id: f.id,
                name: f.name
            }));

            const generatedTags = await generateMp3Tags(fileList, aiTagContext);
            
            setMp3Files(prev => prev.map(file => {
                const generated = generatedTags.find(g => g.id === file.id);
                if (generated) {
                    const newTags = {
                        ...file.tags,
                        title: generated.title || file.tags.title,
                        artist: generated.artist || file.tags.artist,
                        album: generated.album || file.tags.album,
                        genre: generated.genre || file.tags.genre,
                        trackNumber: generated.trackNumber || file.tags.trackNumber
                    };

                    // Rename file: "Track - Title - Album.mp3"
                    let newFilename = file.name;
                    if (newTags.title) {
                        const parts: string[] = [];
                        
                        // Track
                        if (newTags.trackNumber) {
                             const num = parseInt(newTags.trackNumber);
                             if (!isNaN(num)) {
                                 parts.push(num.toString().padStart(2, '0'));
                             } else {
                                 parts.push(newTags.trackNumber);
                             }
                        }

                        // Title
                        parts.push(newTags.title);

                        // Album
                        if (newTags.album) {
                            parts.push(newTags.album);
                        }
                        
                        // Sanitize filename
                        const baseName = parts.join(' - ').replace(/[/\\?%*:|"<>]/g, '_');
                        newFilename = `${baseName}.mp3`;
                    }

                    return {
                        ...file,
                        name: newFilename,
                        tags: newTags
                    };
                }
                return file;
            }));
            
            addToast(t('node.content.tagEditor.aiSuccess'), 'success');
        } catch (e: any) {
            console.error("AI Tagging failed", e);
            addToast(t('node.content.tagEditor.aiFailed') + (e.message ? `: ${e.message}` : ''), 'error');
        } finally {
            setIsGeneratingTags(false);
        }
    };
    
    const handleAnalyzeDuplicates = async () => {
        if (mp3Files.length === 0) return;
        setIsAnalyzingDuplicates(true);
        
        try {
            const freshFiles = mp3Files.map(f => ({ ...f, isDuplicate: false, fingerprint: undefined }));
            setMp3Files(freshFiles);
            
            const processedFiles = [...freshFiles];
            const fingerprintMap = new Map<string, string>(); 
            
            for (let i = 0; i < processedFiles.length; i++) {
                const fileObj = processedFiles[i];
                const fingerprint = await getAudioFingerprint(fileObj.file);
                fileObj.fingerprint = fingerprint;
                
                if (fingerprintMap.has(fingerprint)) {
                    fileObj.isDuplicate = true;
                    fileObj.isChecked = true;
                } else {
                    fingerprintMap.set(fingerprint, fileObj.id);
                }
            }
            
            setMp3Files(processedFiles);
            
            const dupCount = processedFiles.filter(f => f.isDuplicate).length;
            if (dupCount > 0) {
                 addToast(t('node.content.tagEditor.duplicatesFound', { count: dupCount }), 'info');
            } else {
                 addToast(t('node.content.tagEditor.noDuplicates'), 'success');
            }
            
        } catch (e) {
            console.error("Duplicate Analysis Failed", e);
            addToast("Analysis failed", "error");
        } finally {
            setIsAnalyzingDuplicates(false);
        }
    };

    const downloadTaggedFiles = async (onlySelected: boolean = false) => {
        const filesToDownload = onlySelected 
            ? mp3Files.filter(f => f.isChecked) 
            : mp3Files;

        if (filesToDownload.length === 0) {
             addToast(t('node.content.tagEditor.noFiles'), 'info');
             return;
        }

        setIsProcessingTags(true);
        for (const mp3 of filesToDownload) {
            try {
                const arrayBuffer = await fileToArrayBuffer(mp3.file);
                const writer = new ID3Writer(arrayBuffer);
                
                if (mp3.tags.title) writer.setFrame('TIT2', mp3.tags.title);
                if (mp3.tags.artist) writer.setFrame('TPE1', [mp3.tags.artist]);
                if (mp3.tags.album) writer.setFrame('TALB', mp3.tags.album);
                if (mp3.tags.year) writer.setFrame('TYER', mp3.tags.year);
                if (mp3.tags.genre) writer.setFrame('TCON', [mp3.tags.genre]);
                if (mp3.tags.trackNumber) writer.setFrame('TRCK', mp3.tags.trackNumber);
                
                if (mp3.tags.prompt) {
                    writer.setFrame('TXXX', {
                        description: 'Prompt',
                        value: mp3.tags.prompt
                    });
                }
                
                if (mp3.tags.cover) {
                    writer.setFrame('APIC', {
                        type: 3, 
                        data: mp3.tags.cover.data,
                        description: 'Cover',
                        mimeType: mp3.tags.cover.mimeType 
                    });
                }
                
                writer.addTag();
                
                const taggedBlob = writer.getBlob();
                const url = URL.createObjectURL(taggedBlob);
                const a = document.createElement('a');
                a.href = url;
                const fileName = mp3.name.toLowerCase().endsWith('.mp3') ? mp3.name : `${mp3.name}.mp3`;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (e) {
                console.error("Failed to tag file", mp3.name, e);
                addToast(`Failed to tag ${mp3.name}`, 'info');
            }
        }
        setIsProcessingTags(false);
        addToast('Download started', 'success');
    };

    return (
        <div 
            className={`flex flex-col h-full gap-2 rounded-md transition-all duration-200 ${isDragOver ? 'ring-2 ring-blue-400 bg-gray-800/50' : ''}`}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
            onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); }}
            onDrop={handleDrop}
        >
             {/* 1. Control Panel - 2 Columns */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-2 shrink-0">
                 
                 {/* Column 1: AI Auto-Tagging */}
                 <div className="bg-gray-900/50 p-2 rounded border border-emerald-500/20 flex flex-col gap-2 shadow-sm">
                     <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1">
                         {t('node.content.tagEditor.aiTitle')}
                     </h4>
                     
                     <div className="flex flex-col gap-2">
                        <input 
                            type="text" 
                            placeholder={t('node.content.tagEditor.aiPlaceholder') || "Context (e.g. 80s Synthwave)"} 
                            className="bg-gray-800 text-xs p-2 rounded border border-gray-700 focus:border-emerald-500 outline-none text-white w-full"
                            value={aiTagContext}
                            onChange={(e) => setAiTagContext(e.target.value)}
                            onMouseDown={(e) => e.stopPropagation()}
                        />

                        <button 
                            onClick={handleAiAutoTag} 
                            disabled={isGeneratingTags || mp3Files.length === 0} 
                            className={`w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
                        >
                            {isGeneratingTags ? (
                                <>
                                    <svg className="animate-spin h-3 w-3 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                    {t('node.content.tagEditor.aiGenerate') || 'Generate Tags'}
                                </>
                            )}
                        </button>
                     </div>
                 </div>

                 {/* Column 2: Batch Apply */}
                 <div className="bg-gray-800/50 p-2 rounded border border-gray-700 flex flex-col gap-2 shadow-sm">
                     <div className="flex justify-between items-center mb-1">
                         <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{t('node.content.tagEditor.batch') || 'Batch Apply'}</h4>
                         
                         {/* Cover Upload Button */}
                         <div className="flex items-center gap-1">
                            <input
                                ref={coverInputRef}
                                type="file"
                                accept="image/jpeg,image/png"
                                className="hidden"
                                onChange={handleCoverFileSelect}
                            />
                            <Tooltip title="Set Global Cover for Selected Files" position="top">
                                <button 
                                    onClick={() => coverInputRef.current?.click()}
                                    className={`text-[9px] px-2 py-0.5 rounded border transition-colors ${globalCover ? 'bg-emerald-900/50 border-emerald-500 text-emerald-400' : 'bg-gray-900 border-gray-600 text-gray-400 hover:text-white'}`}
                                >
                                    {globalCover ? 'Cover Set' : 'Set Cover'}
                                </button>
                            </Tooltip>
                            {globalCover && (
                                <Tooltip title="Clear Global Cover" position="top">
                                    <button 
                                        onClick={() => setGlobalCover(null)}
                                        className="text-gray-500 hover:text-red-400 text-[10px]"
                                    >
                                        &times;
                                    </button>
                                </Tooltip>
                            )}
                         </div>
                     </div>
                     
                     <div className="flex flex-col gap-2">
                         <div className="flex gap-2">
                             <input 
                                type="text" 
                                placeholder={t('node.content.tagEditor.artist') || "Artist"} 
                                className="flex-1 bg-gray-900 text-xs p-1.5 rounded border border-gray-600 focus:border-emerald-500 outline-none text-white min-w-0"
                                value={globalArtist}
                                onChange={(e) => setGlobalArtist(e.target.value)}
                                onMouseDown={(e) => e.stopPropagation()}
                             />
                             <input 
                                type="text" 
                                placeholder={t('node.content.tagEditor.album') || "Album"} 
                                className="flex-1 bg-gray-900 text-xs p-1.5 rounded border border-gray-600 focus:border-emerald-500 outline-none text-white min-w-0"
                                value={globalAlbum}
                                onChange={(e) => setGlobalAlbum(e.target.value)}
                                onMouseDown={(e) => e.stopPropagation()}
                             />
                         </div>
                         <div className="flex gap-2">
                            {/* Larger textarea for Genre/Prompt batching */}
                            <textarea 
                                placeholder="Genre (Prompt)" 
                                className="flex-grow bg-gray-900 text-xs p-1.5 rounded border border-gray-600 focus:border-emerald-500 outline-none text-white min-w-0 resize-y min-h-[30px] custom-scrollbar"
                                value={globalGenre}
                                onChange={(e) => setGlobalGenre(e.target.value)}
                                onMouseDown={(e) => e.stopPropagation()}
                                rows={1}
                            />
                             <button onClick={applyGlobalTags} className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs px-3 rounded font-bold h-auto self-start py-1.5 transition-colors shadow-sm">
                                 Apply
                             </button>
                         </div>
                     </div>
                 </div>
             </div>

            {/* 3. Toolbar (Small Neat Icons) */}
            <div className="flex gap-1 items-center bg-gray-900/50 p-1 rounded border border-gray-700 flex-shrink-0 justify-between shadow-sm">
                <div className="flex gap-1">
                     {/* Add MP3s */}
                     <input 
                        ref={tagFileInputRef}
                        type="file" 
                        accept="audio/mpeg,.mp3" 
                        multiple 
                        className="hidden"
                        onChange={handleTagFileSelect}
                     />
                     <ToolButton 
                        onClick={() => tagFileInputRef.current?.click()} 
                        title={t('node.content.tagEditor.addFiles') || 'Add MP3s'} 
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>}
                        tooltipPosition="right"
                     />

                     {/* Download Selected */}
                     <ToolButton 
                        onClick={() => downloadTaggedFiles(true)} 
                        title={t('node.content.tagEditor.downloadSelected')} 
                        className="bg-gray-800 hover:bg-emerald-600/30 text-gray-400 hover:text-emerald-400"
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}
                        tooltipPosition="right"
                     />
                 </div>

                 <div className="flex gap-1">
                     {/* Find Duplicates */}
                     <ToolButton 
                        onClick={handleAnalyzeDuplicates} 
                        disabled={isAnalyzingDuplicates || mp3Files.length === 0} 
                        title={t('node.content.tagEditor.analyzeDuplicates')} 
                        className="bg-gray-800 hover:bg-emerald-600/30 text-gray-400 hover:text-emerald-400"
                        icon={isAnalyzingDuplicates ? <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
                        tooltipPosition="left"
                     />
                     
                     {/* Delete Duplicates */}
                     <ToolButton 
                        onClick={deleteDuplicates} 
                        title={t('node.content.tagEditor.deleteDuplicates')} 
                        className="bg-gray-800 hover:bg-red-900/30 text-gray-400 hover:text-red-400"
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
                        tooltipPosition="left"
                     />

                     {/* Delete Selected */}
                     <ToolButton 
                        onClick={deleteSelectedFiles} 
                        title={t('node.content.tagEditor.deleteSelected')} 
                        className="bg-gray-800 hover:bg-red-900/30 text-gray-400 hover:text-red-400"
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>}
                        tooltipPosition="left"
                     />
                     
                     {/* Delete All */}
                     <ToolButton 
                        onClick={deleteAllFiles} 
                        title={t('node.action.clear')} 
                        className="bg-gray-800 hover:bg-red-900/30 text-gray-400 hover:text-red-400"
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>}
                        tooltipPosition="left"
                     />
                 </div>
                 
                 <div className="flex gap-1 ml-auto border-l border-gray-700 pl-1">
                     {/* Sort Button */}
                     <ToolButton 
                        onClick={sortFilesByName} 
                        title="Sort by Name" 
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>}
                        tooltipPosition="left"
                     />

                     {/* Selection Tools (Right Aligned) */}
                     <ToolButton 
                        onClick={selectAll} 
                        title="Select All" 
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                        tooltipPosition="left"
                     />
                     <ToolButton 
                        onClick={deselectAll} 
                        title="Deselect All" 
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>}
                        tooltipPosition="left"
                     />
                     <ToolButton 
                        onClick={invertSelection} 
                        title="Invert Selection" 
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>}
                        tooltipPosition="left"
                     />
                 </div>
            </div>

            <div className="flex-grow overflow-y-auto custom-scrollbar bg-gray-900/30 rounded border border-gray-700" onWheel={(e) => e.stopPropagation()}>
                {mp3Files.length > 0 ? (
                    <table className="w-full text-xs text-left border-collapse">
                        <thead className="bg-gray-800 text-gray-400 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="p-2 w-10 text-center border-r border-gray-700">
                                    <CustomCheckbox checked={mp3Files.length > 0 && mp3Files.every(f => f.isChecked)} onChange={toggleAllCheck} className="h-4 w-4" />
                                </th>
                                <th className="p-2 font-medium w-36 text-center border-r border-gray-700">Cover</th>
                                <th className="p-2 font-medium text-left border-r border-gray-700">Metadata</th>
                                <th className="p-2 font-medium w-10 text-center"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {mp3Files.map(mp3 => (
                                <Mp3Row 
                                    key={mp3.id} 
                                    mp3={mp3} 
                                    onToggleCheck={toggleFileCheck} 
                                    onRemove={removeMp3File} 
                                    onUpdateTag={updateTag}
                                    onUpdateFilename={updateFilename}
                                    addToast={addToast}
                                    t={t}
                                />
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 text-xs p-4">
                        <p>{t('node.content.tagEditor.dragDrop') || 'Drag MP3s here or use Add'}</p>
                    </div>
                )}
            </div>

            <button 
                onClick={() => downloadTaggedFiles(false)}
                disabled={mp3Files.length === 0 || isProcessingTags}
                className={`w-full py-2 font-bold text-white rounded transition-colors text-xs flex items-center justify-center gap-2 flex-shrink-0 shadow-sm ${isProcessingTags ? 'bg-emerald-800 cursor-wait' : 'bg-emerald-600 hover:bg-emerald-500'}`}
            >
                {isProcessingTags ? (
                    <>
                        <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Processing...
                    </>
                ) : (
                    t('node.content.tagEditor.download') || 'Download Modified Files'
                )}
            </button>
        </div>
    );
};
