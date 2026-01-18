
import React, { useMemo, useRef, useEffect, useState, useLayoutEffect } from 'react';
import { NodeType, Point } from '../../types';
import { useLanguage } from '../../localization';
import { getInputHandleType } from '../../utils/nodeUtils';

interface ConnectionQuickAddMenuProps {
  isOpen: boolean;
  position: Point; 
  fromType: 'text' | 'image' | null;
  onClose: () => void;
  onSelect: (type: NodeType) => void;
}

const ConnectionQuickAddMenu: React.FC<ConnectionQuickAddMenuProps> = ({ 
  isOpen, 
  position, 
  fromType, 
  onClose, 
  onSelect 
}) => {
  const { t } = useLanguage();
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dragging State
  const [menuLocation, setMenuLocation] = useState<Point>(position);
  const [isVisible, setIsVisible] = useState(false);
  const isDraggingRef = useRef(false);
  const dragOffset = useRef<Point>({ x: 0, y: 0 });

  // Sync location when opened
  useLayoutEffect(() => {
    if (isOpen) {
        setMenuLocation(position);
        setSearchTerm('');
        // Animate in
        requestAnimationFrame(() => setIsVisible(true));
        // Focus input
        setTimeout(() => inputRef.current?.focus(), 50);
    } else {
        setIsVisible(false);
    }
  }, [isOpen, position]);

  // Update DOM position for drag
  useLayoutEffect(() => {
    if (menuRef.current) {
        menuRef.current.style.left = `${menuLocation.x}px`;
        menuRef.current.style.top = `${menuLocation.y}px`;
    }
  }, [menuLocation]);

  // Handle close on click outside, respecting pinned menus
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        // If dragging, don't close
        if (isDraggingRef.current) return;

        // Check if clicking inside a pinned menu (Context or Quick Add)
        const target = event.target as Element;
        if (target.closest('.pinned-menu')) {
            return; // Do not close connection menu if interacting with a pinned menu
        }
        
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Drag Handlers
  const handleWindowMouseMove = (e: MouseEvent) => {
    if (!isDraggingRef.current || !menuRef.current) return;
    e.preventDefault();
    const x = e.clientX - dragOffset.current.x;
    const y = e.clientY - dragOffset.current.y;
    menuRef.current.style.left = `${x}px`;
    menuRef.current.style.top = `${y}px`;
  };

  const handleWindowMouseUp = (e: MouseEvent) => {
    if (isDraggingRef.current && menuRef.current) {
         const x = e.clientX - dragOffset.current.x;
         const y = e.clientY - dragOffset.current.y;
         setMenuLocation({ x, y });
    }
    isDraggingRef.current = false;
    window.removeEventListener('mousemove', handleWindowMouseMove);
    window.removeEventListener('mouseup', handleWindowMouseUp);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation(); // Prevent canvas click

    const rect = menuRef.current?.getBoundingClientRect();
    if (rect) {
        isDraggingRef.current = true;
        dragOffset.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        window.addEventListener('mousemove', handleWindowMouseMove);
        window.addEventListener('mouseup', handleWindowMouseUp);
    }
  };
  
  useEffect(() => {
    return () => {
        window.removeEventListener('mousemove', handleWindowMouseMove);
        window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, []);


  const hotkeys: Record<string, string> = {
    [NodeType.TEXT_INPUT]: 'T',
    [NodeType.PROMPT_PROCESSOR]: 'P',
    [NodeType.PROMPT_ANALYZER]: 'A',
    [NodeType.GEMINI_CHAT]: 'G',
    [NodeType.TRANSLATOR]: 'L',
    [NodeType.NOTE]: 'N',
    [NodeType.IMAGE_GENERATOR]: 'O',
    [NodeType.IMAGE_PREVIEW]: 'I',
    [NodeType.IDEA_GENERATOR]: 'Shift+A',
    [NodeType.SCRIPT_GENERATOR]: 'Shift+S',
    [NodeType.SCRIPT_ANALYZER]: 'Shift+D',
    [NodeType.SCRIPT_PROMPT_MODIFIER]: 'Shift+F',
    [NodeType.CHARACTER_GENERATOR]: 'Shift+C',
    [NodeType.CHARACTER_CARD]: 'Ctrl+Shift+C',
    [NodeType.DATA_READER]: 'Shift+R',
    [NodeType.NARRATOR_TEXT_GENERATOR]: 'Shift+G',
    [NodeType.SPEECH_SYNTHESIZER]: 'Shift+N',
    [NodeType.AUDIO_TRANSCRIBER]: 'Shift+B',
    [NodeType.YOUTUBE_TITLE_GENERATOR]: 'Shift+T',
    [NodeType.YOUTUBE_ANALYTICS]: 'Shift+Y',
    [NodeType.MUSIC_IDEA_GENERATOR]: 'Shift+M',
  };

  const nodeGroups = useMemo(() => [
    {
        title: t('toolbar.group.prompting'),
        items: [
            { type: NodeType.PROMPT_PROCESSOR, title: t('node.title.prompt_processor'), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.562L16.25 22.5l-.648-1.938a3.375 3.375 0 00-2.672-2.672L11.25 18l1.938-.648a3.375 3.375 0 002.672-2.672L16.25 13l.648 1.938a3.375 3.375 0 002.672 2.672L21.75 18l-1.938.648a3.375 3.375 0 00-2.672 2.672z" /></svg> },
            { type: NodeType.PROMPT_ANALYZER, title: t('node.title.prompt_analyzer'), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /><path strokeLinecap="round" strokeLinejoin="round" d="M9 14h6M9 11h6M9 8h6" /></svg> },
        ]
    },
    {
        title: t('toolbar.group.scripting'),
        items: [
           { type: NodeType.IDEA_GENERATOR, title: t('node.title.idea_generator'), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.375 3.375 0 0112 18.375V19.5" /></svg> },
           { type: NodeType.SCRIPT_GENERATOR, title: t('node.title.script_generator'), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h.01M15 12h.01M10.5 16.5h3M15 19.5h-6a2.25 2.25 0 01-2.25-2.25V6.75A2.25 2.25 0 018.25 4.5h7.5a2.25 2.25 0 012.25 2.25v10.5A2.25 2.25 0 0115.75 19.5h-1.5" /></svg> },
           { type: NodeType.SCRIPT_ANALYZER, title: t('node.title.script_analyzer'), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V6A2.25 2.25 0 0018.75 3.75H5.25A2.25 2.25 0 003 6v6" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 15.75a.75.75 0 01.75-.75h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75-.75h-.008a.75.75 0 01-.75-.75v-.008z" /></svg> },
           { type: NodeType.SCRIPT_PROMPT_MODIFIER, title: t('node.title.script_prompt_modifier'), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /><path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.75l-1.125 1.125m1.125-1.125L16.125 11.5m2.25 1.25l1.125-1.125m-1.125 1.125l-1.125-1.125M15 6l-2.25 2.25" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 6l2.25-2.25M15 6l-2.25-2.25" /></svg> },
        ]
    },
    {
        title: t('toolbar.group.characters'),
        items: [
           { type: NodeType.CHARACTER_GENERATOR, title: t('node.title.character_generator'), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
           { type: NodeType.CHARACTER_CARD, title: t('node.title.character_card'), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 3.75H4.5A2.25 2.25 0 002.25 6v12A2.25 2.25 0 004.5 20.25h15A2.25 2.25 0 0021.75 18V6A2.25 2.25 0 0019.5 3.75z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 8.25a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 16.5c0-2.485 2.015-4.5 4.5-4.5s4.5 2.015 4.5 4.5" /></svg> },
           { type: NodeType.CHARACTER_ANALYZER, title: t('node.title.character_analyzer'), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 9a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 14.25c-3.1 0-5.88-1.5-7.5-3.75m15 3.75c-1.62-2.25-4.4-3.75-7.5-3.75S6.12 12 4.5 14.25" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" /></svg> },
        ]
    },
    {
        title: t('toolbar.group.images'),
        items: [
           { type: NodeType.IMAGE_GENERATOR, title: t('node.title.image_generator'), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
           { type: NodeType.IMAGE_PREVIEW, title: t('node.title.image_preview'), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg> },
        ]
    },
    {
        title: t('toolbar.group.ai'),
        items: [
           { type: NodeType.TRANSLATOR, title: t('node.title.translator'), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L12 6l6 12M8 14h8" /></svg> },
           { type: NodeType.GEMINI_CHAT, title: t('node.title.gemini_chat'), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
           { type: NodeType.ERROR_ANALYZER, title: t('node.title.error_analyzer'), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
        ]
    },
    {
        title: t('toolbar.group.audio'),
        items: [
          { type: NodeType.SPEECH_SYNTHESIZER, title: t('node.title.speech_synthesizer'), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg> },
          { type: NodeType.NARRATOR_TEXT_GENERATOR, title: t('node.title.narrator_text_generator'), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M3 12h3M18 12h3" /></svg> },
          { type: NodeType.AUDIO_TRANSCRIBER, title: t('node.title.audio_transcriber'), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12h5m-5 3h5m-5 3h5" /></svg> },
          { type: NodeType.MUSIC_IDEA_GENERATOR, title: t('node.title.music_idea_generator'), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 6l12-3" /></svg> },
        ]
      },
      {
        title: `${t('toolbar.group.general')} / ${t('toolbar.group.youtube')}`,
        items: [
            { type: NodeType.DATA_READER, title: t('node.title.data_reader'), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
            { type: NodeType.YOUTUBE_TITLE_GENERATOR, title: t('node.title.youtube_title_generator'), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-12v.75m0 3v.75m0 3v.75m0 3V18m-3 .75h18A2.25 2.25 0 0021 16.5V7.5A2.25 2.25 0 0018.75 5.25H5.25A2.25 2.25 0 003 7.5v9A2.25 2.25 0 005.25 18.75z" /></svg> },
            { type: NodeType.YOUTUBE_ANALYTICS, title: t('node.title.youtube_analytics'), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg> },
        ]
    },
  ], [t]);

  // Flatten groups to assign global index
  const allCompatibleItems = useMemo(() => {
      const flatList: { type: NodeType; title: string; icon: React.ReactNode; index: number; hotkey: string }[] = [];
      let counter = 1;

      nodeGroups.forEach(group => {
          group.items.forEach(item => {
              // Compatibility check
              const inputType = getInputHandleType({ type: item.type } as any);
              if (inputType === null) return;
              if (fromType === 'image' && inputType !== 'image') return;
              if (fromType === 'text' && inputType !== 'text') return;

              flatList.push({
                  ...item,
                  index: counter++,
                  hotkey: hotkeys[item.type] || ''
              });
          });
      });
      return flatList;
  }, [nodeGroups, fromType]);

  const filteredItems = useMemo(() => {
    if (!searchTerm) return allCompatibleItems;
    const lowerSearch = searchTerm.toLowerCase();
    return allCompatibleItems.filter(item => 
        item.title.toLowerCase().includes(lowerSearch) ||
        item.index.toString().startsWith(lowerSearch) || // Search by number
        (item.hotkey && item.hotkey.toLowerCase().includes(lowerSearch)) // Search by hotkey
    );
  }, [allCompatibleItems, searchTerm]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Escape') {
        onClose();
    } else if (e.key === 'Enter') {
        if (filteredItems.length > 0) {
            onSelect(filteredItems[0].type);
        }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className={`fixed bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-2xl border border-gray-700 p-2 flex flex-col space-y-2 max-h-[400px] w-72 cursor-default transition-[opacity,transform] duration-200 ease-out ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
      style={{ left: menuLocation.x, top: menuLocation.y, zIndex: 1000 }}
      onMouseDown={handleMouseDown}
      onWheel={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="px-2 py-1 border-b border-gray-700 flex justify-between items-center cursor-move" onMouseDown={handleMouseDown}>
          <span className="text-xs font-bold text-gray-500 uppercase select-none">{t('connectionMenu.title')}</span>
          <button 
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="text-gray-400 hover:text-white hover:bg-red-600/20 focus:outline-none p-1 rounded transition-colors"
            title="Close"
            onMouseDown={e => e.stopPropagation()}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
      </div>
      
      <input
        ref={inputRef}
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t('search.placeholder')}
        className="w-full px-2 py-1.5 bg-gray-900/50 text-white rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
        onMouseDown={e => e.stopPropagation()}
      />

      <div className="flex-grow overflow-y-auto custom-scrollbar space-y-1 min-h-0">
        {filteredItems.length === 0 ? (
            <div className="p-2 text-gray-400 text-sm text-center">{t('search.noResults')}</div>
        ) : (
            filteredItems.map((item) => (
                <button
                    key={item.type}
                    onClick={() => onSelect(item.type)}
                    className="flex items-center space-x-3 p-2 rounded-md text-left w-full text-gray-200 hover:bg-emerald-600 hover:text-white transition-colors group"
                    onMouseDown={e => e.stopPropagation()}
                >
                    <div className="flex-shrink-0 w-6 text-center text-gray-500 font-mono text-xs group-hover:text-emerald-200 select-none">
                        {item.index}
                    </div>
                    <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-gray-700 rounded text-gray-300 group-hover:text-white">
                        {item.icon}
                    </div>
                    <span className="text-sm font-semibold truncate flex-grow">{item.title}</span>
                    {item.hotkey && (
                        <span className="text-[10px] text-gray-500 font-mono px-1.5 py-0.5 bg-gray-800 rounded group-hover:bg-emerald-700 group-hover:text-emerald-100 select-none">
                            {item.hotkey}
                        </span>
                    )}
                </button>
            ))
        )}
      </div>
    </div>
  );
};

export default ConnectionQuickAddMenu;
