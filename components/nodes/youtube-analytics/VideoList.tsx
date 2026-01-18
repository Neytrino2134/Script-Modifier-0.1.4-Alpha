
import React, { useState, useMemo } from 'react';
import { ChannelData, VideoEntry } from './types';
import CustomCheckbox from '../../ui/CustomCheckbox';
import { resizeThumbnail, processYouTubeScreenshot } from '../../../utils/imageUtils';
import { extractYouTubeMetadata } from '../../../services/geminiService';
import { PasteIcon } from '../../icons/AppIcons';

interface VideoListProps {
    activeChannel: ChannelData | undefined;
    onUpdateChannel: (id: string, updates: Partial<ChannelData>) => void;
    onUpdatePoints: (points: number) => void;
    disciplinePoints: number;
    t: (key: string) => string;
    deselectAllNodes: () => void;
    addToast: (msg: string, type: 'success' | 'info') => void;
    incomingVideoData: { title: string, description: string } | null;
    refreshIncomingData: () => void;
    setJustEarned: (points: number) => void;
}

export const VideoList: React.FC<VideoListProps> = ({ 
    activeChannel, onUpdateChannel, onUpdatePoints, disciplinePoints, t, deselectAllNodes, addToast, incomingVideoData, refreshIncomingData, setJustEarned
}) => {
    const [videoFilter, setVideoFilter] = useState<'all' | 'long' | 'shorts'>('all');
    const [isDragOver, setIsDragOver] = useState(false);

    const updateVideo = (videoId: string, updates: Partial<VideoEntry>) => {
        if (!activeChannel) return;
        const updatedVideos = activeChannel.videos.map(v => v.id === videoId ? { ...v, ...updates } : v);
        onUpdateChannel(activeChannel.id, { videos: updatedVideos });
    };

    const deleteVideo = (videoId: string) => {
        if (!activeChannel) return;
        const updatedVideos = activeChannel.videos.filter(v => v.id !== videoId);
        onUpdateChannel(activeChannel.id, { videos: updatedVideos });
    };

    const filteredVideos = useMemo(() => {
        if (!activeChannel) return [];
        if (videoFilter === 'all') return activeChannel.videos;
        const wantShorts = videoFilter === 'shorts';
        return activeChannel.videos.filter(v => !!v.isShort === wantShorts);
    }, [activeChannel, videoFilter]);

    const handleAddIncomingVideo = () => {
        if (!incomingVideoData || !activeChannel) return;
        const newVideo: VideoEntry = {
            id: `vid-${Date.now()}`,
            thumbnailBase64: null,
            uploadDate: new Date().toISOString(),
            title: incomingVideoData.title,
            description: incomingVideoData.description,
            views: 0,
            likes: 0,
            isShort: false
        };
        const updatedVideos = [newVideo, ...activeChannel.videos];
        onUpdateChannel(activeChannel.id, { videos: updatedVideos });
        
        // Award points
        const reward = 50;
        setJustEarned(reward);
        onUpdatePoints(disciplinePoints + reward);
        setTimeout(() => setJustEarned(0), 1500);

        addToast(t('youtube_analytics.videoAdded'), 'success');
    };

    const processFileForDrop = (file: File) => {
        if (!activeChannel) return;
        processYouTubeScreenshot(file).then(async ({ thumbnail, metadataImage }) => {
            const newVideoId = `vid-${Date.now()}`;
            const newVideo: VideoEntry = {
                id: newVideoId,
                thumbnailBase64: thumbnail,
                uploadDate: new Date().toISOString(),
                title: "Processing...",
                views: 0,
                likes: 0,
                isShort: false
            };
            
            // 1. Create a local copy of the list including the new video
            // This ensures we have the correct list structure for subsequent updates within this closure
            let currentVideos = [newVideo, ...activeChannel.videos];
            
            // 2. Commit the first update (Adding the row)
            onUpdateChannel(activeChannel.id, { videos: currentVideos });
            
            // Award points
            const reward = 50;
            setJustEarned(reward);
            onUpdatePoints(disciplinePoints + reward);
            setTimeout(() => setJustEarned(0), 1500);
            
            addToast(t('toast.videoPasted'), 'success');

            // 3. Process metadata if image is available
            if (metadataImage) {
                try {
                    const meta = await extractYouTubeMetadata(metadataImage);
                    
                    // 4. Update the LOCAL list with metadata
                    // We modify 'currentVideos' which we know contains our new video
                    const vidIndex = currentVideos.findIndex(v => v.id === newVideoId);
                    
                    if (vidIndex !== -1) {
                         const updatedList = [...currentVideos];
                         updatedList[vidIndex] = {
                             ...updatedList[vidIndex],
                             title: meta.title || "Untitled",
                             description: meta.description || "",
                             views: meta.views || 0,
                             uploadDate: meta.uploadDate || updatedList[vidIndex].uploadDate
                         };
                         
                         // 5. Commit the second update (Metadata)
                         onUpdateChannel(activeChannel.id, { videos: updatedList });
                         addToast("Title and description extracted!", "success");
                    }
    
                } catch (err) {
                    console.error("Failed to extract metadata", err);
                    addToast("Failed to extract text from image", "info");
                }
            }

        }).catch(err => {
            console.error("Failed to process screenshot", err);
            addToast("Failed to process image", 'info');
        });
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        if (!activeChannel) return;

        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
            processFileForDrop(file);
        }
    };
    
    const handlePasteImage = async () => {
        if (!activeChannel) return;
        try {
            const items = await navigator.clipboard.read();
            for (const item of items) {
                const imageType = item.types.find(t => t.startsWith('image/'));
                if (imageType) {
                    const blob = await item.getType(imageType);
                    const file = new File([blob], "pasted_screenshot.png", { type: blob.type });
                    processFileForDrop(file);
                    return;
                }
            }
            addToast("No image in clipboard", 'info');
        } catch (err) {
            console.error(err);
            addToast("Paste failed or not supported", 'info');
        }
    };
    
    const handleVideoItemDrop = (e: React.DragEvent<HTMLDivElement>, videoId: string) => {
        e.preventDefault();
        e.stopPropagation();
        
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
            resizeThumbnail(file).then((base64String) => {
                updateVideo(videoId, { thumbnailBase64: base64String });
                addToast(t('youtube_analytics.thumbnailUpdated'), 'success');
            });
        }
    };

    return (
        <div className="flex-grow flex flex-col p-2 min-h-0 bg-gray-800/30">
            {/* FILTER BAR */}
             <div className="flex space-x-1 mb-2">
                {(['all', 'long', 'shorts'] as const).map(filter => (
                    <button
                        key={filter}
                        onClick={() => setVideoFilter(filter)}
                        className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${videoFilter === filter ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-white'}`}
                    >
                        {filter}
                    </button>
                ))}
            </div>

            {/* INCOMING DATA PANEL */}
            {incomingVideoData && (
                <div className="bg-gray-900/80 border border-emerald-500/30 rounded-md p-2 mb-2 flex flex-col gap-2 shadow-lg flex-shrink-0">
                    <div className="flex justify-between items-center">
                        <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">{t('youtube_analytics.incomingData')}</h4>
                        <button onClick={refreshIncomingData} className="text-gray-400 hover:text-white" title={t('node.action.refreshData')}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        </button>
                    </div>
                    <div className="text-sm text-white font-semibold truncate" title={incomingVideoData.title}>{incomingVideoData.title}</div>
                    {incomingVideoData.description && <div className="text-xs text-gray-400 line-clamp-2">{incomingVideoData.description}</div>}
                    <button onClick={handleAddIncomingVideo} className="w-full bg-emerald-700 hover:bg-emerald-600 text-white text-xs py-1 rounded font-bold transition-colors">
                        {t('youtube_analytics.addToChannel')} (+50 pts)
                    </button>
                </div>
            )}

            {/* DROP ZONE */}
            <div 
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); }}
                onDrop={handleDrop}
                className={`flex-shrink-0 h-16 border-2 border-dashed rounded-lg flex flex-col items-center justify-center mb-2 transition-colors relative group ${isDragOver ? 'border-emerald-400 bg-emerald-900/20' : 'border-gray-600 hover:border-gray-500 bg-gray-800/50'}`}
            >
                <p className="text-xs text-gray-400 pointer-events-none text-center px-2">{t('youtube_analytics.dragDrop')}</p>
                <button 
                    onClick={handlePasteImage}
                    className="absolute right-2 bottom-2 bg-gray-700 hover:bg-emerald-600 text-white text-[10px] py-1 px-2 rounded font-bold shadow transition-colors flex items-center gap-1 opacity-80 hover:opacity-100"
                    title={t('contextMenu.paste')}
                >
                    <PasteIcon className="h-3 w-3" />
                    Paste
                </button>
            </div>

            {/* LIST */}
            <div className="flex-grow overflow-y-auto custom-scrollbar space-y-2" onWheel={e => e.stopPropagation()}>
                {filteredVideos.map((video) => (
                    <div 
                        key={video.id} 
                        className="flex gap-2 bg-gray-900/50 p-2 rounded-md group relative hover:bg-gray-800 transition-colors"
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onDrop={(e) => handleVideoItemDrop(e, video.id)}
                    >
                        <div className="w-20 h-12 bg-black flex-shrink-0 rounded overflow-hidden relative group/thumb">
                            {video.thumbnailBase64 ? (
                                <img src={`data:image/png;base64,${video.thumbnailBase64}`} className="w-full h-full object-cover" alt="Thumb" />
                            ) : <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-600 text-[9px]">No Image</div>}
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity pointer-events-none">
                                <span className="text-[8px] text-white">Drop Image</span>
                            </div>
                            {video.isShort && (
                                 <div className="absolute bottom-0 right-0 bg-red-600 text-white text-[8px] px-1 font-bold">SHORTS</div>
                            )}
                        </div>
                        <div className="flex-grow min-w-0 flex flex-col justify-between">
                            <div className="flex justify-between items-start gap-1">
                                 <input 
                                    type="text" 
                                    value={video.title} 
                                    onChange={(e) => updateVideo(video.id, { title: e.target.value })}
                                    placeholder={t('youtube_analytics.videoTitle')}
                                    className="bg-transparent border border-transparent focus:border-emerald-500 focus:ring-0 rounded p-0.5 -ml-1 text-sm text-white font-medium focus:bg-gray-800 w-full transition-all outline-none"
                                    onFocus={deselectAllNodes}
                                />
                                <div className="mt-1">
                                    <CustomCheckbox
                                        id={`is-short-${video.id}`}
                                        checked={!!video.isShort}
                                        onChange={(checked) => updateVideo(video.id, { isShort: checked })}
                                        className="h-3 w-3 text-red-500"
                                        title="Mark as Shorts"
                                    />
                                </div>
                            </div>

                            <textarea
                                value={video.description || ''}
                                onChange={(e) => updateVideo(video.id, { description: e.target.value })}
                                placeholder={t('youtube_analytics.videoDescriptionPlaceholder')}
                                className="bg-transparent border border-transparent focus:border-emerald-500 focus:ring-0 rounded p-0.5 -ml-1 text-xs text-gray-400 w-full resize-none focus:bg-gray-800 focus:text-gray-300 transition-all outline-none"
                                rows={1}
                                onFocus={deselectAllNodes}
                            />
                            <div className="flex justify-between items-end mt-1">
                                <span className="text-xs text-gray-500">{new Date(video.uploadDate).toLocaleString()}</span>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <input 
                                        type="number" 
                                        placeholder={t('youtube_analytics.views')}
                                        value={video.views || ''} 
                                        onChange={(e) => updateVideo(video.id, { views: parseInt(e.target.value) || 0 })}
                                        className="w-16 bg-gray-800 text-xs p-0.5 rounded text-right text-gray-300 border border-gray-700 focus:ring-0 focus:border-emerald-500 outline-none transition-all"
                                        onFocus={deselectAllNodes}
                                    />
                                    <button onClick={() => deleteVideo(video.id)} className="text-gray-500 hover:text-red-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                {filteredVideos.length === 0 && <p className="text-center text-xs text-gray-500 mt-4">{t('youtube_analytics.noVideos')}</p>}
            </div>
        </div>
    );
};
