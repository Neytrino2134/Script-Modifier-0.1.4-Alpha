
import React, { forwardRef, useState } from 'react';

interface InstructionBrickProps {
    label: string;
    text: string;
    translatedText?: string;
    isCritical?: boolean;
    isEnabled?: boolean;
    isMandatory?: boolean;
    onToggle?: () => void;
    color?: 'emerald' | 'cyan' | 'gray' | 'purple';
    className?: string;
    index?: number;
    isHighlighted?: boolean;
    id?: string; // Add ID prop for reference
}

export const InstructionBrick = forwardRef<HTMLDivElement, InstructionBrickProps>(({ 
    label, text, translatedText, isCritical, isEnabled = true, isMandatory = false, onToggle, color = 'emerald', className = "", index, isHighlighted
}, ref) => {
    const [isCopied, setIsCopied] = useState(false);
    
    let bgClass = '';
    let borderClass = '';
    let headerTextClass = '';
    let indicatorClass = '';
    let contentTextClass = '';
    let badgeBgClass = '';
    
    if (!isEnabled) {
        bgClass = 'bg-gray-800/20'; // Dimmer background
        borderClass = 'border-gray-700';
        headerTextClass = 'text-gray-500';
        indicatorClass = 'bg-gray-700';
        contentTextClass = 'text-gray-500';
        badgeBgClass = 'bg-gray-800 text-gray-600';
    } else if (isCritical) {
        bgClass = 'bg-red-900/20';
        borderClass = 'border-red-800/50';
        headerTextClass = 'text-red-400';
        indicatorClass = 'bg-red-500';
        contentTextClass = 'text-gray-300';
        badgeBgClass = 'bg-red-900/50 text-red-200';
    } else if (isMandatory) {
        bgClass = 'bg-gray-800';
        borderClass = 'border-gray-600';
        headerTextClass = 'text-emerald-400';
        indicatorClass = 'bg-gray-500';
        contentTextClass = 'text-gray-300';
        badgeBgClass = 'bg-gray-700 text-gray-400';
    } else {
        contentTextClass = 'text-gray-300';
        switch (color) {
            case 'cyan':
                bgClass = 'bg-cyan-900/20';
                borderClass = 'border-cyan-700/50';
                headerTextClass = 'text-cyan-400';
                indicatorClass = 'bg-cyan-500';
                badgeBgClass = 'bg-cyan-900/50 text-cyan-200';
                break;
            case 'purple':
                bgClass = 'bg-purple-900/20';
                borderClass = 'border-purple-700/50';
                headerTextClass = 'text-purple-400';
                indicatorClass = 'bg-purple-500';
                badgeBgClass = 'bg-purple-900/50 text-purple-200';
                break;
            default: // emerald
                bgClass = 'bg-emerald-900/20';
                borderClass = 'border-emerald-700/50';
                headerTextClass = 'text-emerald-400';
                indicatorClass = 'bg-emerald-500';
                badgeBgClass = 'bg-emerald-900/50 text-emerald-200';
        }
    }

    // Highlighting override
    if (isHighlighted) {
        borderClass = 'border-yellow-400 ring-1 ring-yellow-400/50';
        bgClass = 'bg-yellow-900/30';
    }

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 1500);
    };

    return (
        <div 
            ref={ref}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => !isMandatory && onToggle && onToggle()}
            className={`flex flex-row p-2 rounded border text-xs transition-all relative overflow-hidden group select-none items-stretch gap-3 ${bgClass} ${borderClass} ${className} flex-shrink-0 ${!isMandatory ? 'cursor-pointer hover:border-opacity-100 hover:shadow-sm' : ''} duration-300`}
        >
            {/* Number Badge */}
            {index !== undefined && (
                <div className={`flex-shrink-0 w-6 flex flex-col items-center justify-start pt-0.5`}>
                    <div className={`text-[9px] font-mono font-bold w-5 h-5 flex items-center justify-center rounded-full ${badgeBgClass}`}>
                        {index}
                    </div>
                    {/* Vertical line connector visualization */}
                    <div className={`w-px flex-grow mt-1 ${isEnabled ? 'bg-gray-700' : 'bg-transparent'}`}></div>
                </div>
            )}

            <div className="flex flex-col flex-grow min-w-0">
                <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                        {/* Dot indicator if no index, or supplementary */}
                        {index === undefined && <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${indicatorClass}`} />}
                        <div className={`font-bold uppercase tracking-wider text-[10px] leading-tight ${headerTextClass}`}>{label}</div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleCopy}
                            className={`p-0.5 rounded transition-colors ${isEnabled ? 'text-gray-500 hover:text-white' : 'text-gray-600 hover:text-gray-400'}`}
                            title="Copy Prompt Text"
                        >
                            {isCopied ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            )}
                        </button>

                        {!isMandatory && (
                            <div className={`text-[9px] uppercase font-mono px-1 rounded ${isEnabled ? 'text-white bg-white/10' : 'text-gray-600 bg-black/20'}`}>
                                {isEnabled ? 'ON' : 'OFF'}
                            </div>
                        )}
                    </div>
                </div>
                
                <div className={`leading-tight ${isEnabled ? 'text-gray-300' : 'text-gray-600'} text-[10px] mb-1`}>
                    {text}
                </div>
                
                {translatedText && (
                    <>
                        <div className="border-t border-gray-600/30 my-1 w-full" />
                        <div className={`text-[9px] italic leading-tight ${contentTextClass} opacity-70`}>
                            {translatedText}
                        </div>
                    </>
                )}
            </div>
            
            {/* Bottom Accent Line/Separator for style */}
            <div className={`absolute bottom-0 left-0 w-full h-[2px] opacity-30 ${indicatorClass}`} />
        </div>
    );
});