
import React from 'react';
import { InstructionBrick } from './InstructionBrick';
import { YOUTUBE_GENERATOR_INSTRUCTIONS } from '../../../utils/prompts/youtubeGenerator';
import { YouTubeUiState } from './types';
import { ActionButton } from '../../ActionButton';

interface SettingsPanelProps {
    uiState: YouTubeUiState;
    onUpdateUiState: (updates: Partial<YouTubeUiState>) => void;
    mode: 'title' | 'channel';
    t: (key: string) => string;
    // New Props
    includeHashtags?: boolean;
    onToggleHashtags?: () => void;
    generateThumbnail?: boolean;
    onToggleThumbnail?: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ 
    uiState, onUpdateUiState, mode, t,
    includeHashtags = true, onToggleHashtags,
    generateThumbnail = false, onToggleThumbnail
}) => {
    let stepCount = 0;

    return (
        <div className="border border-gray-600 hover:border-gray-400 rounded-md bg-gray-900 overflow-hidden flex-shrink-0 flex flex-col transition-colors duration-200">
            <div 
                className="flex justify-between items-center p-2 bg-gray-800/50 cursor-pointer select-none hover:bg-gray-700/50 transition-colors flex-shrink-0"
                onClick={() => onUpdateUiState({ isSettingsCollapsed: !uiState.isSettingsCollapsed })}
            >
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('node.content.activePromptStack')}</h4>
                <div className="text-gray-400">
                     {uiState.isSettingsCollapsed ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                    )}
                </div>
            </div>
            
            {!uiState.isSettingsCollapsed && (
                <div className="p-2 bg-gray-800/20 flex flex-col gap-1 overflow-y-auto custom-scrollbar max-h-64" onWheel={(e) => e.stopPropagation()}>
                    
                    {/* 1. INPUT CONTEXT */}
                    <div className="space-y-1 mb-3">
                         <h6 className="text-[9px] font-bold text-gray-500 uppercase px-1 border-b border-gray-700/50 pb-0.5">1. Context</h6>
                         <InstructionBrick 
                            label={t(`instruction.${YOUTUBE_GENERATOR_INSTRUCTIONS.ROLE.id}`)} 
                            text={YOUTUBE_GENERATOR_INSTRUCTIONS.ROLE.text} 
                            translatedText={t(`instruction.desc.${YOUTUBE_GENERATOR_INSTRUCTIONS.ROLE.id}`)} 
                            isMandatory 
                            color='red' 
                            index={++stepCount}
                        />
                         <InstructionBrick 
                            label={t(`instruction.${YOUTUBE_GENERATOR_INSTRUCTIONS.INPUT_CONTEXT.id}`)} 
                            text={YOUTUBE_GENERATOR_INSTRUCTIONS.INPUT_CONTEXT.text} 
                            translatedText={t(`instruction.desc.${YOUTUBE_GENERATOR_INSTRUCTIONS.INPUT_CONTEXT.id}`)} 
                            isMandatory 
                            color='gray' 
                            index={++stepCount}
                        />
                    </div>
                    
                    {/* 2. GENERATION RULES */}
                    <div className="space-y-1 mb-3">
                         <h6 className="text-[9px] font-bold text-gray-500 uppercase px-1 border-b border-gray-700/50 pb-0.5">2. Strategy</h6>
                         
                         {mode === 'title' && (
                             <>
                                 <InstructionBrick 
                                    label={t(`instruction.${YOUTUBE_GENERATOR_INSTRUCTIONS.TITLE_MODE_RULES.id}`)} 
                                    text={YOUTUBE_GENERATOR_INSTRUCTIONS.TITLE_MODE_RULES.text} 
                                    translatedText={t(`instruction.desc.${YOUTUBE_GENERATOR_INSTRUCTIONS.TITLE_MODE_RULES.id}`)} 
                                    isMandatory 
                                    color='cyan' 
                                    index={++stepCount}
                                />
                                {/* Hashtag Toggle */}
                                <InstructionBrick 
                                    label={t(`instruction.${YOUTUBE_GENERATOR_INSTRUCTIONS.HASHTAGS.id}`)} 
                                    text={YOUTUBE_GENERATOR_INSTRUCTIONS.HASHTAGS.text} 
                                    translatedText={t(`instruction.desc.${YOUTUBE_GENERATOR_INSTRUCTIONS.HASHTAGS.id}`)} 
                                    isEnabled={includeHashtags}
                                    onToggle={onToggleHashtags}
                                    color='emerald' 
                                    index={includeHashtags ? ++stepCount : undefined}
                                />
                                {/* Thumbnail Prompt Toggle */}
                                <InstructionBrick 
                                    label={t(`instruction.${YOUTUBE_GENERATOR_INSTRUCTIONS.THUMBNAIL.id}`)} 
                                    text={YOUTUBE_GENERATOR_INSTRUCTIONS.THUMBNAIL.text} 
                                    translatedText={t(`instruction.desc.${YOUTUBE_GENERATOR_INSTRUCTIONS.THUMBNAIL.id}`)} 
                                    isEnabled={generateThumbnail}
                                    onToggle={onToggleThumbnail}
                                    color='emerald' 
                                    index={generateThumbnail ? ++stepCount : undefined}
                                />
                            </>
                         )}

                         {mode === 'channel' && (
                            <InstructionBrick 
                                label={t(`instruction.${YOUTUBE_GENERATOR_INSTRUCTIONS.CHANNEL_MODE_RULES.id}`)} 
                                text={YOUTUBE_GENERATOR_INSTRUCTIONS.CHANNEL_MODE_RULES.text} 
                                translatedText={t(`instruction.desc.${YOUTUBE_GENERATOR_INSTRUCTIONS.CHANNEL_MODE_RULES.id}`)} 
                                isMandatory
                                color='cyan' 
                                index={++stepCount}
                            />
                         )}
                    </div>
                    
                     {/* 3. FORMAT */}
                     <div className="space-y-1">
                         <h6 className="text-[9px] font-bold text-gray-500 uppercase px-1 border-b border-gray-700/50 pb-0.5">3. Output Format</h6>
                          <InstructionBrick 
                            label={t(`instruction.${YOUTUBE_GENERATOR_INSTRUCTIONS.FORMAT.id}`)} 
                            text={YOUTUBE_GENERATOR_INSTRUCTIONS.FORMAT.text} 
                            translatedText={t(`instruction.desc.${YOUTUBE_GENERATOR_INSTRUCTIONS.FORMAT.id}`)} 
                            isMandatory 
                            color='gray' 
                            index={++stepCount}
                        />
                     </div>
                </div>
            )}
        </div>
    );
};
