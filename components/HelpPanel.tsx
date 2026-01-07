
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../localization';
import Tooltip from './Tooltip';
import { CopyIcon } from './icons/AppIcons';

interface LinkGroup {
  category: string;
  links: {
    label: string;
    url: string;
    subLabel?: string;
    iconType: 'youtube' | 'telegram' | 'google' | 'netlify' | 'github' | 'linktree';
  }[];
}

const HelpPanel: React.FC = () => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'hotkeys' | 'links'>('hotkeys');
  const buttonRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({
    opacity: 0,
    pointerEvents: 'none',
    position: 'fixed'
  });

  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setPanelStyle({
          position: 'fixed',
          top: `${rect.bottom + 8}px`,
          left: `${rect.left}px`,
          opacity: 1,
          pointerEvents: 'auto',
          transition: 'opacity 150ms ease-in-out',
        });
      }
    } else {
      setPanelStyle(prev => ({ ...prev, opacity: 0, pointerEvents: 'none' }));
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleCopyLink = (url: string) => {
      navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 1500);
  };

  const linkGroups: LinkGroup[] = useMemo(() => [
      {
          category: t('help.category.socials'),
          links: [
              { label: t('help.link.youtube'), subLabel: "@MurcelloNovaes", url: "https://www.youtube.com/@MurcelloNovaes", iconType: 'youtube' },
              { label: "Linktree", subLabel: "meowmasterart", url: "https://linktr.ee/meowmasterart", iconType: 'linktree' },
              { label: t('help.link.telegram_channel'), subLabel: t('help.sub.news'), url: "https://t.me/+h0YEu0nx9QdhMDNi", iconType: 'telegram' },
              { label: t('help.link.telegram_chat'), subLabel: t('help.sub.discussion'), url: "https://t.me/+tyQLGFxiEbRhMDdi", iconType: 'telegram' },
          ]
      },
      {
          category: t('help.category.stable'),
          links: [
              { label: "Prompt Modifier 0.1.7", subLabel: t('help.sub.stable'), url: "https://ai.studio/apps/drive/1YCO0DaA4BTm9p0j5XqvpBhX_XTg9ClwC?fullscreenApplet=true", iconType: 'google' },
              { label: "Script Modifier 0.1.3", subLabel: t('help.sub.stable'), url: "https://ai.studio/apps/drive/1enTmQ5Wz9RBArkZMZm5s5nYQcKxQ9L8M?fullscreenApplet=true", iconType: 'google' },
          ]
      },
      {
          category: t('help.category.alpha'),
          links: [
               { label: "Prompt Modifier 0.1.8", subLabel: t('help.sub.alpha'), url: "https://aistudio.google.com/apps/drive/1OJfPP9wUKlnjvZ5_2_Fxq_v1dW0iftlW?showAssistant=true&resourceKey=&showPreview=true", iconType: 'google' },
               { label: "Script Modifier 0.1.5", subLabel: t('help.sub.alpha'), url: "https://aistudio.google.com/apps/drive/1y9CSUmlVQK2xq7ckses7fpM6wpbZdBnB?showAssistant=true&resourceKey=&showPreview=true", iconType: 'google' },
          ]
      },
      {
          category: t('help.category.web'),
          links: [
              { label: "Script Modifier Web", subLabel: "scriptmodifier2.netlify.app", url: "https://scriptmodifier2.netlify.app/", iconType: 'netlify' },
              { label: "Prompt Modifier Web", subLabel: "promptmodifier2.netlify.app", url: "https://promptmodifier2.netlify.app/", iconType: 'netlify' },
          ]
      },
      {
          category: t('help.category.github'),
          links: [
              { label: "Script Modifier Repo", subLabel: "v0.1.5 Alpha", url: "https://github.com/Neytrino2134/Script-Modifier", iconType: 'github' },
              { label: "Prompt Modifier Repo", subLabel: "v0.1.8 Alpha", url: "https://github.com/Neytrino2134/Prompt-Modifier", iconType: 'github' },
          ]
      }
  ], [t]);

  const getIcon = (type: string) => {
      switch (type) {
          case 'youtube': return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-red-500"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>;
          case 'telegram': return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-sky-400"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 11.944 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>;
          case 'google': return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-blue-500"><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/></svg>;
          case 'netlify': return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-cyan-400"><path d="M6.48 2.81L2.09 10.42 5.54 21.19zM11.66 21.19L8.21 10.42 12.6 2.81 17 10.42zM18.46 21.19L21.91 10.42 17.52 2.81z"/></svg>;
          case 'github': return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-gray-200"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>;
          case 'linktree': return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-green-500"><path d="M13.736 5.853L12 2 10.264 5.853H2v2.836l6.632 2.65L2.35 17.65l1.836 1.837 6.945-6.946v9.433h1.738v-9.433l6.945 6.946 1.836-1.837-6.281-6.282 6.631-2.65V5.853h-8.264z"/></svg>;
          default: return <div className="w-5 h-5 bg-gray-500 rounded-full" />;
      }
  };

  const hotkeySections = {
    tools: [
      { key: 'V', description: t('hotkeys.tools.edit') },
      { key: 'C', description: t('hotkeys.tools.cutter') },
      { key: 'S', description: t('hotkeys.tools.selection') },
      { key: 'R', description: t('hotkeys.tools.reroute') },
      { key: 'Z', description: t('hotkeys.tools.zoom') },
      { key: 'H', description: t('node.action.collapse') },
      { key: 'Shift + W', description: t('hotkeys.tools.snapToGrid') },
      { key: 'Shift + E', description: t('hotkeys.tools.toggleLineStyle') },
      { key: 'G', description: t('hotkeys.tools.group') },
      { key: 'D', description: t('node.action.duplicateEmpty') },
      { key: 'Ctrl + D', description: t('hotkeys.tools.duplicate') },
      { key: 'X / Del', description: t('hotkeys.tools.closeNode') },
      { key: 'Ctrl + A', description: t('hotkeys.tools.selectAll') },
      { key: 'Alt + A', description: t('hotkeys.tools.deselectAll') },
      { key: 'Shift+Click', description: t('hotkeys.tools.deleteGroup') },
    ],
    windows: [
      { key: 'F', description: t('hotkeys.windows.search') },
      { key: 'Space', description: t('hotkeys.windows.quickAdd') },
      { key: 'Ctrl+Space', description: t('hotkeys.windows.catalog') },
      { key: 'F1', description: t('hotkeys.show') },
    ],
    file: [
      { key: 'Ctrl + S', description: t('hotkeys.file.save') },
      { key: 'Ctrl + Shift + S', description: t('hotkeys.file.saveProject') },
      { key: 'Ctrl + O', description: t('hotkeys.file.load') },
    ],
    createNode: [
      { key: 'T', description: t('node.title.text_input') },
      { key: 'P', description: t('node.title.prompt_processor') },
      { key: 'A', description: t('node.title.prompt_analyzer') },
      { key: 'M', description: t('node.title.gemini_chat') },
      { key: 'L', description: t('node.title.translator') },
      { key: 'N', description: t('node.title.note') },
      { key: 'O', description: t('node.title.image_generator') },
      { key: 'I', description: t('node.title.image_preview') },
      { key: 'Shift+A', description: t('node.title.idea_generator') },
      { key: 'Shift+C', description: t('node.title.character_generator') },
      { key: 'Ctrl+Shift+C', description: t('node.title.character_card') },
      { key: 'Shift+S', description: t('node.title.script_generator') },
      { key: 'Shift+D', description: t('node.title.script_analyzer') },
      { key: 'Shift+F', description: t('node.title.script_prompt_modifier') },
      { key: 'Shift+R', description: t('node.title.data_reader') },
      { key: 'Shift+G', description: t('node.title.narrator_text_generator') },
      { key: 'Shift+N', description: t('node.title.speech_synthesizer') },
      { key: 'Shift+B', description: t('node.title.audio_transcriber') },
      { key: 'Shift+T', description: t('node.title.youtube_title_generator') },
      { key: 'Shift+Y', description: t('node.title.youtube_analytics') },
      { key: 'Shift+M', description: t('node.title.music_idea_generator') },
    ],
  };

  const renderHotkeySection = (title: string, keys: { key: string, description: string }[]) => (
    <div>
      <h4 className="font-bold text-gray-300 mb-2 border-b border-gray-600 pb-1 select-none">{title}</h4>
      <ul className="space-y-1.5">
        {keys.map(({ key, description }) => (
          <li key={key} className="flex justify-between items-center select-none">
            <span>{description}</span>
            <kbd className="font-mono bg-gray-700 px-2 py-1 rounded-md text-gray-300 text-xs">{key}</kbd>
          </li>
        ))}
      </ul>
    </div>
  );

  const renderLinks = () => (
      <div className="space-y-4">
          {linkGroups.map(group => (
              <div key={group.category} className="space-y-2">
                  <h4 className="font-bold text-xs text-gray-400 uppercase tracking-wider pl-1 select-none border-b border-gray-700/50 pb-1">{group.category}</h4>
                  <div className="grid grid-cols-1 gap-2">
                      {group.links.map((link, idx) => (
                          <div 
                              key={idx} 
                              onClick={() => window.open(link.url, '_blank')}
                              className="bg-gray-900/50 hover:bg-gray-800 border border-gray-700 hover:border-emerald-500/50 rounded-lg p-2.5 flex items-center justify-between transition-all group cursor-pointer relative"
                          >
                              <div className="flex items-center gap-3 overflow-hidden">
                                  <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0 group-hover:bg-gray-700 transition-colors">
                                      {getIcon(link.iconType)}
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                      <span className="font-semibold text-gray-200 text-sm truncate select-none">{link.label}</span>
                                      <span className="text-[10px] text-gray-500 truncate select-none">{link.subLabel || link.url}</span>
                                  </div>
                              </div>
                              <div className="flex items-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                  <Tooltip title={copiedUrl === link.url ? t('app.error.copied') : "Copy URL"} position="top">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleCopyLink(link.url); }}
                                        className="p-1.5 rounded-md hover:bg-gray-700 text-gray-500 hover:text-white transition-colors"
                                    >
                                        {copiedUrl === link.url ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                        ) : (
                                            <CopyIcon className="h-4 w-4" />
                                        )}
                                    </button>
                                  </Tooltip>
                                  
                                  {/* Merged Open Link Indicator - Just an icon now */}
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600 group-hover:text-emerald-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          ))}
      </div>
  );

  const panelContent = (
    <div 
      ref={panelRef}
      className="bg-gray-800 rounded-lg w-[450px] h-[600px] border border-gray-700 z-[60] flex flex-col shadow-2xl select-none"
      style={panelStyle}
      onMouseDown={e => e.stopPropagation()}
      onWheel={e => e.stopPropagation()}
    >
      <div className="flex flex-col border-b border-gray-700 flex-shrink-0">
          <div className="flex justify-between items-center p-3">
            <h2 className="text-lg font-bold text-emerald-400 select-none">{t('help.title')}</h2>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1 text-gray-400 rounded-full hover:bg-gray-600 hover:text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="flex px-3 gap-2">
              <button 
                onClick={() => setActiveTab('hotkeys')}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'hotkeys' ? 'border-emerald-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
              >
                  {t('help.tabs.hotkeys')}
              </button>
              <button 
                onClick={() => setActiveTab('links')}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'links' ? 'border-emerald-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
              >
                  {t('help.tabs.links')}
              </button>
          </div>
      </div>

      <div className="p-4 overflow-y-auto text-sm text-gray-400 flex-grow min-h-0 custom-scrollbar">
        {activeTab === 'hotkeys' ? (
            <div className="flex flex-col gap-6">
                {renderHotkeySection(t('hotkeys.tools.title'), hotkeySections.tools)}
                {renderHotkeySection(t('hotkeys.createNode.title'), hotkeySections.createNode)}
                {renderHotkeySection(t('hotkeys.windows.title'), hotkeySections.windows)}
                {renderHotkeySection(t('hotkeys.file.title'), hotkeySections.file)}
            </div>
        ) : (
            renderLinks()
        )}
      </div>
      
      {/* License & Author Footer */}
      <div className="p-3 bg-gray-900 border-t border-gray-700 text-xs text-gray-500 flex flex-col gap-2 rounded-b-lg select-none">
          <div className="flex justify-between items-center">
             <span>Script Modifier</span>
             <span className="font-mono">Licensed under GNU GPLv3</span>
          </div>
          <div className="flex justify-between items-end border-t border-gray-800 pt-2 text-gray-400">
              <div className="flex flex-col gap-1">
                <span>Author: MeowMaster</span>
                <span>Email: MeowMasterart@gmail.com</span>
                <a href="https://github.com/Neytrino2134/Script-Modifier" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 transition-colors">
                    GitHub: Neytrino2134/Script-Modifier
                </a>
              </div>
              <a href="https://www.netlify.com" target="_blank" rel="noopener noreferrer" className="opacity-70 hover:opacity-100 transition-opacity">
                <img src="https://www.netlify.com/assets/badges/netlify-badge-color-accent.svg" alt="Deploys by Netlify" style={{ height: '32px' }} />
              </a>
          </div>
      </div>
    </div>
  );

  return (
    <div ref={buttonRef}>
      <Tooltip title={t('hotkeys.show')} position="bottom">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1.5 rounded-md transition-colors duration-200 focus:outline-none flex items-center justify-center h-9 w-9 bg-gray-700 hover:bg-emerald-600 text-gray-300 hover:text-white"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </Tooltip>
      {isOpen && createPortal(panelContent, document.body)}
    </div>
  );
};

export default HelpPanel;
