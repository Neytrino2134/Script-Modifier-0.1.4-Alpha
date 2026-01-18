
import React, { useState } from 'react';
import { ChannelData } from './types';
import { ActionButton } from '../../ActionButton';
import CustomCheckbox from '../../ui/CustomCheckbox';

interface ChannelControlsProps {
    authorName: string;
    channels: ChannelData[];
    activeChannelId: string;
    activeChannel: ChannelData | undefined;
    aiSuggestedGoal?: string;
    t: (key: string, options?: any) => string;
    onUpdateValue: (updates: any) => void;
    onUpdateChannel: (id: string, updates: Partial<ChannelData>) => void;
    onAddChannel: () => void;
    onDeleteChannel: (e: React.MouseEvent, id: string) => void;
    onAcceptSuggestion: () => void;
    deselectAllNodes: () => void;
    nodeId: string;
}

export const ChannelControls: React.FC<ChannelControlsProps> = ({
    authorName, channels, activeChannelId, activeChannel, aiSuggestedGoal,
    t, onUpdateValue, onUpdateChannel, onAddChannel, onDeleteChannel, onAcceptSuggestion, deselectAllNodes, nodeId
}) => {
    const [isDescriptionCollapsed, setIsDescriptionCollapsed] = useState(false);
    const goalOptions = [
        "100 Subscribers", "1,000 Subscribers", "Monetization (4k hours / 1k subs)",
        "10,000 Subscribers", "Silver Play Button (100k)", "Gold Play Button (1M)",
        "High Retention", "Increase CTR", "Regular Upload Schedule"
    ];

    return (
        <>
            {/* AUTHOR NAME */}
            <div className="bg-gray-900 px-2 border-b border-gray-700 flex items-center space-x-2 flex-shrink-0 h-10">
                <label className="text-xs text-gray-400 whitespace-nowrap font-semibold">{t('youtube_analytics.authorName')}:</label>
                <input
                    type="text"
                    value={authorName}
                    onChange={(e) => onUpdateValue({ authorName: e.target.value })}
                    className="bg-gray-800 text-sm rounded p-1 border border-transparent focus:border-emerald-500 focus:ring-0 outline-none flex-grow text-emerald-300 font-medium transition-all"
                    onFocus={deselectAllNodes}
                    placeholder={t('youtube_analytics.authorName')}
                />
            </div>

            {/* TABS */}
            <div className="flex items-center bg-gray-900 p-1 gap-1 overflow-x-auto custom-scrollbar flex-shrink-0">
                {channels.map(channel => (
                    <div 
                        key={channel.id}
                        onClick={() => onUpdateValue({ activeChannelId: channel.id })}
                        className={`px-3 py-1.5 h-8 text-xs rounded-t-md cursor-pointer flex items-center gap-2 flex-shrink-0 transition-colors ${activeChannelId === channel.id ? 'bg-gray-800 text-emerald-400 font-bold' : 'bg-gray-900 hover:bg-gray-800 text-gray-400'}`}
                    >
                        {activeChannelId === channel.id ? (
                            <input 
                                type="text" 
                                value={channel.name} 
                                onChange={(e) => onUpdateChannel(channel.id, { name: e.target.value })}
                                className="bg-transparent border-none focus:ring-0 p-0 text-emerald-400 font-bold w-24 text-xs focus:outline-none"
                                onClick={e => e.stopPropagation()}
                                onFocus={deselectAllNodes}
                            />
                        ) : (
                            <span>{channel.name}</span>
                        )}
                        {channels.length > 1 && (
                            <button onClick={(e) => onDeleteChannel(e, channel.id)} className="text-gray-500 hover:text-red-400">
                                &times;
                            </button>
                        )}
                    </div>
                ))}
                <button onClick={onAddChannel} className="px-2 text-gray-400 hover:text-emerald-400 font-bold text-lg">+</button>
            </div>

            {/* CHANNEL DETAILS */}
            {activeChannel && (
                <div className="p-2 bg-gray-900/50 border-b border-gray-700 grid grid-cols-2 gap-2">
                        <div className="col-span-2">
                            <div className="flex justify-between items-center mb-1">
                                <label 
                                    className="text-[10px] text-gray-400 uppercase font-bold block cursor-pointer select-none hover:text-gray-300 transition-colors"
                                    onClick={() => setIsDescriptionCollapsed(!isDescriptionCollapsed)}
                                >
                                    {t('youtube_title_generator.description')}
                                </label>
                                <ActionButton 
                                    title={isDescriptionCollapsed ? t('node.action.expand') : t('node.action.collapse')} 
                                    onClick={(e) => { e.stopPropagation(); setIsDescriptionCollapsed(!isDescriptionCollapsed); }}
                                    tooltipPosition="left"
                                >
                                    {isDescriptionCollapsed ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                                    )}
                                </ActionButton>
                            </div>
                            {!isDescriptionCollapsed && (
                                <textarea 
                                    value={activeChannel.description || ''}
                                    onChange={(e) => onUpdateChannel(activeChannel.id, { description: e.target.value })}
                                    className="w-full bg-gray-800 text-xs rounded p-1 border border-transparent focus:border-emerald-500 focus:ring-0 outline-none text-white transition-all resize-none h-[60px] custom-scrollbar"
                                    placeholder={t('youtube_title_generator.channelDescription')}
                                    onFocus={deselectAllNodes}
                                    onWheel={(e) => e.stopPropagation()}
                                />
                            )}
                        </div>
                    <div className="col-span-2">
                        <label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">{t('youtube_analytics.goal')}</label>
                        <div className="flex gap-1">
                            <input 
                                list={`goal-options-${nodeId}`}
                                type="text" 
                                value={activeChannel.goal || ''}
                                onChange={(e) => onUpdateChannel(activeChannel.id, { goal: e.target.value })}
                                className="flex-grow bg-gray-800 text-xs rounded p-1 border border-transparent focus:border-emerald-500 focus:ring-0 outline-none text-white transition-all"
                                placeholder={t('youtube_analytics.goalPlaceholder')}
                                onFocus={deselectAllNodes}
                            />
                            <datalist id={`goal-options-${nodeId}`}>
                                {goalOptions.map(opt => <option key={opt} value={opt} />)}
                            </datalist>
                            {aiSuggestedGoal && activeChannel.goal !== aiSuggestedGoal && (
                                <button 
                                    onClick={onAcceptSuggestion} 
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold px-2 rounded animate-pulse"
                                    title={`Accept Suggestion: ${aiSuggestedGoal}`}
                                >
                                    {t('youtube_analytics.accept')}
                                </button>
                            )}
                        </div>
                        {aiSuggestedGoal && activeChannel.goal !== aiSuggestedGoal && (
                            <div className="text-[10px] text-emerald-400 mt-1">
                                {t('youtube_analytics.suggestion')}: {aiSuggestedGoal}
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">{t('youtube_analytics.currentSubs')}</label>
                        <input 
                            type="number" 
                            value={activeChannel.currentSubscribers || ''}
                            onChange={(e) => onUpdateChannel(activeChannel.id, { currentSubscribers: parseInt(e.target.value) || 0 })}
                            className="w-full bg-gray-800 text-xs rounded p-1 border border-transparent focus:border-emerald-500 focus:ring-0 outline-none text-white transition-all"
                            placeholder="0"
                            onFocus={deselectAllNodes}
                        />
                    </div>
                    <div className="flex flex-col justify-end">
                        <label className="flex items-center space-x-2 cursor-pointer bg-gray-800 p-1 rounded border border-gray-700 h-[26px]">
                            <CustomCheckbox
                                id={`monetization-${nodeId}`}
                                checked={activeChannel.isMonetized || false}
                                onChange={(checked) => onUpdateChannel(activeChannel.id, { isMonetized: checked })}
                                className="h-3.5 w-3.5"
                            />
                            <span className="text-[10px] text-gray-300 font-bold uppercase select-none">{t('youtube_analytics.monetization')}</span>
                        </label>
                    </div>
                </div>
            )}
        </>
    );
};
