
import React, { useState, useMemo, useRef } from 'react';
import { ChannelData } from './types';
import CustomCheckbox from '../../ui/CustomCheckbox';
import { StatsChart } from './StatsChart';

interface StatsPanelProps {
    activeChannel: ChannelData | undefined;
    onUpdateChannel: (id: string, updates: Partial<ChannelData>) => void;
    channels: ChannelData[];
    t: (key: string) => string;
    addToast: (msg: string, type: 'success' | 'info') => void;
    deselectAllNodes: () => void;
    // File Ops
    onSaveToDisk: () => void;
    onSaveToCatalog: () => void;
    onLoadFromFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
    nodeId: string;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({ 
    activeChannel, onUpdateChannel, channels, t, addToast, deselectAllNodes, onSaveToDisk, onSaveToCatalog, onLoadFromFile, nodeId
}) => {
    const [todaySubscribers, setTodaySubscribers] = useState<string>('');
    const [todayLongViews, setTodayLongViews] = useState<string>('');
    const [todayShortViews, setTodayShortViews] = useState<string>('');
    const [showSubs, setShowSubs] = useState(true);
    const [showViews, setShowViews] = useState(false);
    const [showVideos, setShowVideos] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Collapsible State
    const [isCollapsed, setIsCollapsed] = useState(false);

    const currentDateTimeStr = useMemo(() => new Date().toLocaleString(), []);

    const handleAddDailyStat = () => {
        if (!activeChannel) return;
        
        const now = new Date();
        const today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
        
        const subs = parseInt(todaySubscribers) || 0;
        const longV = parseInt(todayLongViews) || 0;
        const shortV = parseInt(todayShortViews) || 0;
        const totalV = longV + shortV;

        if (subs === 0 && totalV === 0) return;

        const existingStatIndex = activeChannel.stats.findIndex(s => s.date === today);
        let newStats = [...activeChannel.stats];
        
        const newStatEntry = { 
            date: today, 
            subscribers: subs, 
            totalViews: totalV, 
            shortsViews: shortV,
            longViews: longV
        };

        if (existingStatIndex >= 0) {
            newStats[existingStatIndex] = newStatEntry;
        } else {
            newStats.push(newStatEntry);
            newStats.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        }

        onUpdateChannel(activeChannel.id, { stats: newStats });
        setTodaySubscribers('');
        setTodayLongViews('');
        setTodayShortViews('');
        addToast(t('youtube_analytics.statsUpdated'), 'success');
    };

    const getSummary = (channel: ChannelData) => {
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const videosWeek = channel.videos.filter(v => new Date(v.uploadDate) >= oneWeekAgo).length;
        const videosMonth = channel.videos.filter(v => new Date(v.uploadDate) >= oneMonthAgo).length;

        let growth = "0";
        if (channel.stats.length >= 2) {
            const latest = channel.stats[channel.stats.length - 1];
            const previous = channel.stats[channel.stats.length - 2];
            const diff = latest.subscribers - previous.subscribers;
            growth = diff > 0 ? `+${diff}` : `${diff}`;
        }

        return { videosWeek, videosMonth, growth };
    };

    const activeSummary = activeChannel ? getSummary(activeChannel) : { videosWeek: 0, videosMonth: 0, growth: "0" };

    const totalVideosWeek = channels.reduce((acc, ch) => acc + getSummary(ch).videosWeek, 0);
    const totalVideosMonth = channels.reduce((acc, ch) => acc + getSummary(ch).videosMonth, 0);

    return (
        <div className="bg-gray-900 border-t border-gray-700 flex-shrink-0 mt-auto flex flex-col transition-all duration-300">
            {/* Collapse Header */}
            <div 
                className="flex items-center justify-between px-2 py-1 cursor-pointer hover:bg-gray-800 transition-colors select-none bg-gray-900"
                onClick={() => setIsCollapsed(!isCollapsed)}
            >
                <div className="flex items-center gap-2 text-xs text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                    </svg>
                    <span className="font-bold uppercase tracking-wider text-[10px]">
                        {t('youtube_analytics.statsTrend')} & {t('toolbar.group.file')}
                    </span>
                </div>
            </div>

            {!isCollapsed && (
                <div className="p-2 flex flex-col gap-2 animate-fade-in-up">
                    {/* Merged Chart Section */}
                    <div className="bg-gray-800/50 p-2 rounded-md border border-gray-700/50">
                        <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                <h4 className="text-xs font-bold text-gray-400">{t('youtube_analytics.statsTrend')}</h4>
                                <div className="text-[10px] text-gray-500 font-mono bg-gray-800 px-1 rounded">{currentDateTimeStr}</div>
                                </div>
                            <div className="flex gap-2">
                                <label className="flex items-center text-[10px] text-emerald-400 space-x-1 cursor-pointer">
                                    <CustomCheckbox id={`chart-subs-${nodeId}`} checked={showSubs} onChange={setShowSubs} className="h-3 w-3" />
                                    <span>{t('youtube_analytics.subs')}</span>
                                </label>
                                <label className="flex items-center text-[10px] text-cyan-400 space-x-1 cursor-pointer">
                                    <CustomCheckbox id={`chart-views-${nodeId}`} checked={showViews} onChange={setShowViews} className="h-3 w-3" />
                                    <span>{t('youtube_analytics.views_short')}</span>
                                </label>
                                <label className="flex items-center text-[10px] text-purple-400 space-x-1 cursor-pointer">
                                    <CustomCheckbox id={`chart-vids-${nodeId}`} checked={showVideos} onChange={setShowVideos} className="h-3 w-3" />
                                    <span>{t('youtube_analytics.vids_short')}</span>
                                </label>
                            </div>
                        </div>
                        <StatsChart 
                            stats={activeChannel?.stats || []} 
                            videos={activeChannel?.videos || []} 
                            showSubs={showSubs} 
                            showViews={showViews} 
                            showVideos={showVideos}
                        />
                    </div>

                     {/* Log Daily Stats Inputs */}
                     <div className="bg-gray-900/50 p-2 rounded-md space-y-2 border border-emerald-500/20">
                        <h4 className="text-xs font-bold text-emerald-400 uppercase">{t('youtube_analytics.logDailyStats')}</h4>
                        <div className="flex gap-2">
                             <div className="flex-1">
                                <input 
                                    type="number" 
                                    value={todaySubscribers} 
                                    onChange={e => setTodaySubscribers(e.target.value)}
                                    className="w-full bg-gray-800 text-sm rounded p-1 border border-gray-700 focus:border-emerald-500 focus:ring-0 outline-none"
                                    onFocus={deselectAllNodes}
                                    placeholder={t('youtube_analytics.subscribers')}
                                />
                            </div>
                            <div className="flex-1">
                                 <input 
                                    type="number" 
                                    value={todayLongViews} 
                                    onChange={e => setTodayLongViews(e.target.value)}
                                    className="w-full bg-gray-800 text-sm rounded p-1 border border-gray-700 focus:border-emerald-500 focus:ring-0 outline-none"
                                    onFocus={deselectAllNodes}
                                    placeholder={t('youtube_analytics.longViews')}
                                />
                            </div>
                            <div className="flex-1">
                                <input 
                                    type="number" 
                                    value={todayShortViews} 
                                    onChange={e => setTodayShortViews(e.target.value)}
                                    className="w-full bg-gray-800 text-sm rounded p-1 border border-gray-700 focus:border-emerald-500 focus:ring-0 outline-none"
                                    onFocus={deselectAllNodes}
                                    placeholder={t('youtube_analytics.shortsViews')}
                                />
                            </div>
                        </div>
                        <button onClick={handleAddDailyStat} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-1 rounded transition-colors">{t('youtube_analytics.updateStats')}</button>
                    </div>

                    {/* Stats Row */}
                    <div className="flex justify-between items-center text-xs text-gray-400 px-2">
                        <div className="flex gap-4">
                            <div>
                                <span className="block text-[10px] text-gray-500 uppercase">{t('youtube_analytics.currentChannel')}</span>
                                <span className="text-white font-bold">{activeSummary.videosWeek} {t('youtube_analytics.videos_wk')}</span>
                            </div>
                            <div>
                                <span className="block text-[10px] text-gray-500 uppercase">{t('youtube_analytics.growth')}</span>
                                <span className={`${parseInt(activeSummary.growth) > 0 ? 'text-green-400' : 'text-gray-300'}`}>{activeSummary.growth} {t('youtube_analytics.subs_short')}</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="block text-[10px] text-gray-500 uppercase">{t('youtube_analytics.allChannels')}</span>
                            <span className="text-emerald-400 font-bold">{totalVideosWeek} {t('youtube_analytics.vids_wk')}  |  {totalVideosMonth} {t('youtube_analytics.vids_mo')}</span>
                        </div>
                    </div>

                    {/* File Actions Row */}
                    <div className="flex gap-2 border-t border-gray-800 pt-2">
                        <button onClick={onSaveToDisk} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold py-1 rounded transition-colors">
                            {t('youtube_analytics.saveDisk')}
                        </button>
                        <button onClick={onSaveToCatalog} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold py-1 rounded transition-colors">
                            {t('youtube_analytics.saveCatalog')}
                        </button>
                        <label className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold py-1 rounded transition-colors text-center cursor-pointer">
                            {t('youtube_analytics.loadDisk')}
                            <input type="file" accept=".json" onChange={onLoadFromFile} className="hidden" ref={fileInputRef} />
                        </label>
                    </div>
                </div>
            )}
        </div>
    );
};
