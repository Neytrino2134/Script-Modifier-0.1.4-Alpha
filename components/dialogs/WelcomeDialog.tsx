
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useLanguage, supportedLanguages, LanguageCode } from '../../localization';

interface WelcomeDialogProps {
  isOpen: boolean;
  onSave: (apiKey: string, useFreeKey: boolean) => void;
  isFirstRun: boolean;
}

const WelcomeDialog: React.FC<WelcomeDialogProps> = ({ isOpen, onSave, isFirstRun }) => {
  const { t, language, setLanguage } = useLanguage();
  const [apiKey, setApiKey] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Animation States
  const [isVisible, setIsVisible] = useState(false);
  // Single exit state for smoother, simultaneous animations
  const [isExiting, setIsExiting] = useState(false);

  // Custom Dropdown State
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // State to track if we are waiting for language switch to complete before saving (Developer Mode)
  const [pendingDevSave, setPendingDevSave] = useState(false);
  
  // Reload Confirmation State
  const [isReloadConfirmOpen, setIsReloadConfirmOpen] = useState(false);

  // Filter out 'sys' language for the welcome screen
  const displayLanguages = useMemo(() => supportedLanguages.filter(l => l.code !== 'sys'), []);
  const currentLangObj = displayLanguages.find(l => l.code === language) || displayLanguages[0];

  useEffect(() => {
    if (isOpen) {
      setApiKey('');
      setIsExiting(false);
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
        setIsVisible(false);
        setIsDropdownOpen(false);
        setIsReloadConfirmOpen(false);
    }
  }, [isOpen]);

  // Click outside listener for dropdown
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
              setIsDropdownOpen(false);
          }
      };
      if (isDropdownOpen) {
          document.addEventListener('mousedown', handleClickOutside);
      }
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  // Effect to trigger save after language switch (Developer Mode)
  useEffect(() => {
      if (pendingDevSave && language === 'ru') {
          setPendingDevSave(false);
          // Trigger save sequence now that language context has updated and propagated
          triggerSaveSequence('', true);
      }
  }, [language, pendingDevSave]);

  const triggerSaveSequence = (key: string, isFree: boolean) => {
      // Trigger animations
      setIsExiting(true);

      // Wait for animations to complete before unmounting/saving
      // The content launch animation takes 0.8s. The background fade starts at 0.5s and takes 0.7s.
      // Total visual time approx 1.2s.
      setTimeout(() => {
         setIsVisible(false);
         // Small buffer to ensure visual cleanup
         setTimeout(() => {
             onSave(key, isFree);
         }, 50); 
      }, 1000); 
  };

  const handleSave = () => {
    triggerSaveSequence(apiKey.trim(), false);
  };

  const handleDeveloperClick = () => {
    setLanguage('ru');
    setPendingDevSave(true);
  };
  
  const handleReloadClick = () => {
    setIsReloadConfirmOpen(true);
  };

  const handleConfirmReload = async () => {
    // 1. Clear LocalStorage AutoSave
    localStorage.removeItem('script-modifier-autosave');

    // 2. Clear IndexedDB (Best Effort)
    const deleteDB = () => {
        return new Promise<void>((resolve) => {
            const req = indexedDB.deleteDatabase('ScriptModifierDB');
            req.onsuccess = () => resolve();
            req.onerror = () => resolve();
            req.onblocked = () => resolve();
        });
    };
    
    await deleteDB();

    // 3. Set flag to bypass beforeunload check and Reload Application
    (window as any).isReloading = true;
    window.location.reload();
  };

  const cycleLanguage = (direction: 'prev' | 'next') => {
      const currentIndex = displayLanguages.findIndex(l => l.code === language);
      const total = displayLanguages.length;
      let newIndex;

      if (currentIndex === -1) {
           setLanguage(displayLanguages[0].code as LanguageCode);
           return;
      }
      
      if (direction === 'next') {
          newIndex = (currentIndex + 1) % total;
      } else {
          newIndex = (currentIndex - 1 + total) % total;
      }
      
      setLanguage(displayLanguages[newIndex].code as LanguageCode);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isReloadConfirmOpen) {
      handleSave();
      return;
    }

    const isInputFocused = document.activeElement === inputRef.current;
    const hasText = apiKey.length > 0;

    if (isInputFocused && hasText) {
        return;
    }
    
    if (isReloadConfirmOpen) {
        if (e.key === 'Escape') setIsReloadConfirmOpen(false);
        return;
    }

    if (e.key === 'ArrowLeft') {
        cycleLanguage('prev');
    } else if (e.key === 'ArrowRight') {
        cycleLanguage('next');
    }
  };
  
  const handleLanguageSelect = (code: string) => {
      setLanguage(code as LanguageCode);
      setIsDropdownOpen(false);
  };
  
  const handleBackgroundClick = () => {
      if (!isDropdownOpen && !isReloadConfirmOpen) {
          inputRef.current?.focus();
      }
  };

  if (!isOpen) {
    return null;
  }

  // Animation Classes
  const backgroundOpacityClass = (isVisible && !isExiting) ? 'opacity-100' : 'opacity-0';
  
  // Styles injected via style tag
  const animationStyles = `
    @keyframes launchSequence {
        0% { transform: scale(1) translateY(0); opacity: 1; }
        /* Phase 1: Preparation (Breathing in / Anticipation) - Scales UP slightly */
        35% { transform: scale(1.03) translateY(5px); opacity: 1; }
        /* Phase 2: Launch (Spring out) - Shoots UP and zooms away */
        100% { transform: scale(0.8) translateY(-120vh); opacity: 0; }
    }
    @keyframes textShimmer {
        0% { background-position: 100% 50%; }
        100% { background-position: -100% 50%; }
    }
    @keyframes rotate-ring {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
  `;

  return (
    <div
      className={`fixed inset-0 bg-gray-900 z-[200] flex flex-col items-center justify-center overflow-hidden font-sans cursor-default transition-opacity duration-700 ease-in-out ${backgroundOpacityClass}`}
      style={{ transitionDelay: isExiting ? '0.5s' : '0s' }}
      onMouseDown={e => e.stopPropagation()}
      onKeyDown={handleKeyDown}
      onClick={handleBackgroundClick}
    >
      <style>{animationStyles}</style>

      {/* Top Right Badges Container */}
      <div className={`absolute top-4 right-4 z-50 flex items-center gap-4 transition-opacity duration-300 ${isExiting ? 'opacity-0' : ''}`}>
          {/* Reload App Button */}
          <button 
            onClick={(e) => { e.stopPropagation(); handleReloadClick(); }}
            className="flex items-center gap-2 px-3 py-1 bg-gray-800 hover:bg-red-900/50 border border-gray-600 hover:border-red-500 rounded-full text-xs text-gray-400 hover:text-red-400 transition-all group"
            title={t('welcome.reload')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transition-transform group-hover:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden sm:inline">{t('welcome.reload')}</span>
          </button>
          
          <div className="h-4 w-px bg-gray-700 mx-1"></div>

          {/* GitHub Badge */}
          <a
            href="https://github.com/Neytrino2134/Script-Modifier"
            target="_blank"
            rel="noopener noreferrer"
            className="opacity-70 hover:opacity-100 transition-opacity"
            title="View on GitHub"
          >
             <svg width="32" height="32" viewBox="0 0 98 96" xmlns="http://www.w3.org/2000/svg" className="text-white fill-current">
                <path fillRule="evenodd" clipRule="evenodd" d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z" />
             </svg>
          </a>

          {/* Netlify Badge */}
          <a 
            href="https://www.netlify.com" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="opacity-70 hover:opacity-100 transition-opacity"
          >
            <img src="https://www.netlify.com/assets/badges/netlify-badge-color-accent.svg" alt="Deploys by Netlify" />
          </a>
      </div>

      {/* Background Icon */}
      <div className="absolute bottom-0 right-0 text-emerald-900/20 pointer-events-none select-none transition-transform duration-1000" style={{ transform: isExiting ? 'scale(1.5) rotate(-30deg)' : 'scale(1) rotate(-20deg)' }}>
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="w-[50vw] h-[50vw] transform translate-x-1/5 translate-y-1/5"
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="0.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
        >
           <path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
        </svg>
      </div>

      {/* Reload Confirmation Overlay */}
      {isReloadConfirmOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={(e) => { e.stopPropagation(); setIsReloadConfirmOpen(false); }}>
            <div className="bg-gray-800 border border-gray-600 p-6 rounded-xl shadow-2xl max-w-sm w-full mx-4 transform transition-all scale-100" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-white mb-2">{t('welcome.reloadTitle')}</h3>
                <p className="text-gray-300 text-sm mb-6 leading-relaxed">{t('welcome.reloadMessage')}</p>
                <div className="flex justify-end gap-3">
                    <button 
                        onClick={() => setIsReloadConfirmOpen(false)}
                        className="px-4 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-700 transition-colors text-sm font-semibold"
                    >
                        {t('dialog.rename.cancel')}
                    </button>
                    <button 
                        onClick={handleConfirmReload}
                        className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/30 transition-colors text-sm font-bold flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        {t('welcome.confirmReload')}
                    </button>
                </div>
            </div>
        </div>
      )}

      <div 
        className={`z-10 w-full flex flex-col items-center ${isReloadConfirmOpen ? 'blur-sm pointer-events-none' : ''}`}
        style={{
            // Use ease-in for the launch to simulate acceleration
            animation: isExiting ? 'launchSequence 0.8s cubic-bezier(0.5, 0, 0.2, 1) forwards' : 'none'
        }}
      >
        
        {/* Title Area with Navigation Arrows */}
        <div className="w-full px-4 mb-4 flex items-center justify-center gap-6 md:gap-12 relative z-20">
            {/* Left Arrow */}
             <button 
                onClick={() => cycleLanguage('prev')}
                className={`mt-3 w-12 h-12 md:w-16 md:h-16 flex-shrink-0 rounded-full bg-gray-800/40 hover:bg-emerald-600/80 border border-gray-600/50 hover:border-emerald-400 backdrop-blur-md flex items-center justify-center transition-all duration-300 transform hover:scale-110 group focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${isExiting ? 'opacity-0 scale-75' : 'opacity-100 scale-100'}`}
                aria-label="Previous Language"
             >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 md:w-8 md:h-8 text-gray-400 group-hover:text-white transition-colors">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
             </button>

             {/* Massive Animated Title Container */}
             <div 
                className="flex flex-col items-center justify-center -space-y-4 md:-space-y-6 mb-2"
                style={{
                    transform: isExiting ? 'scale(0.9) translateY(10px)' : 'scale(1) translateY(0)',
                    opacity: isExiting ? 0 : 1,
                    filter: isExiting ? 'blur(4px)' : 'none',
                    transition: 'all 0.5s ease-out'
                }}
             >
                 <h1 
                    className="font-black tracking-tighter select-none leading-tight whitespace-nowrap text-center text-transparent bg-clip-text px-4"
                    style={{ 
                        fontSize: 'clamp(2.5rem, 10vw, 8rem)', 
                        backgroundImage: 'linear-gradient(90deg, #34d399, #22d3ee, #34d399)',
                        backgroundSize: '200% auto',
                        animation: 'textShimmer 3s linear infinite',
                        paddingBottom: '0.1em', 
                        paddingRight: '0.2em', // Add explicit padding for bg-clip-text
                        marginRight: '-0.2em', // Compensate to keep centered visually
                    }}
                 >
                  {t('dialog.welcome.heading')}
                </h1>
                <h1 
                    className="font-black tracking-tighter select-none leading-tight whitespace-nowrap text-center text-transparent bg-clip-text px-4"
                    style={{ 
                        fontSize: 'clamp(2.5rem, 10vw, 8rem)', 
                        backgroundImage: 'linear-gradient(90deg, #34d399, #22d3ee, #34d399)',
                        backgroundSize: '200% auto',
                        animation: 'textShimmer 3s linear infinite reverse',
                        paddingBottom: '0.1em',
                        paddingRight: '0.2em', // Add explicit padding for bg-clip-text
                        marginRight: '-0.2em', // Compensate to keep centered visually
                    }}
                 >
                  {t('app.title')}
                </h1>
             </div>

            {/* Right Arrow */}
            <button 
                onClick={() => cycleLanguage('next')}
                className={`mt-3 w-12 h-12 md:w-16 md:h-16 flex-shrink-0 rounded-full bg-gray-800/40 hover:bg-emerald-600/80 border border-gray-600/50 hover:border-emerald-400 backdrop-blur-md flex items-center justify-center transition-all duration-300 transform hover:scale-110 group focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${isExiting ? 'opacity-0 scale-75' : 'opacity-100 scale-100'}`}
                aria-label="Next Language"
             >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 md:w-8 md:h-8 text-gray-400 group-hover:text-white transition-colors">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
             </button>
        </div>

        {/* Wrapper for Card + Ring - Fixed width/height */}
        <div className="relative w-[850px] h-[550px] mx-auto max-w-[95vw] max-h-[85vh]">
            {/* Animated Ring - Speed increased */}
            <div className="welcome-ring" style={{ '--ring-speed': '10s' } as React.CSSProperties}></div>
            
            {/* Main Content Card */}
            <div 
                className="relative w-full h-full bg-gray-800/90 backdrop-blur-2xl rounded-3xl border border-gray-700 shadow-2xl overflow-visible z-10 flex flex-col justify-center"
                onClick={(e) => e.stopPropagation()} 
            >
                <div className="p-8 md:p-12 space-y-8 flex flex-col h-full justify-between">
                    
                    <div className="space-y-6 flex flex-col flex-grow justify-center">
                        
                        {/* Intro Text */}
                        <div className="space-y-4 w-full text-left">
                            <p className="text-lg md:text-xl text-gray-300 leading-relaxed font-normal">
                                {t('dialog.welcome.intro1')} {t('dialog.welcome.intro2')}
                            </p>
                        </div>

                        <div className="h-px w-full bg-gray-700"></div>

                        {/* Stacked Layout: Language then API Key */}
                        <div className="w-full space-y-5">
                            
                            {/* 1. Language Selection */}
                            <div className="space-y-2 relative" ref={dropdownRef}>
                                <label className="block text-sm font-semibold text-gray-400 uppercase tracking-wider text-left pl-1">
                                    SELECT YOUR PRIMARY LANGUAGE
                                </label>
                                <button
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    className={`w-full p-2.5 bg-gray-900/80 border ${isDropdownOpen ? 'border-emerald-500' : 'border-gray-600 hover:border-gray-500'} rounded-xl text-white focus:outline-none focus:ring-0 transition-colors shadow-inner flex justify-between items-center group`}
                                >
                                    <div className="flex items-center gap-3">
                                        {/* Icon */}
                                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border border-gray-600 bg-gray-800 text-gray-400">
                                            {currentLangObj.label}
                                        </div>
                                        {/* Text */}
                                        <span className="font-semibold tracking-wide text-sm">
                                            {currentLangObj.name} <span className="text-gray-500 ml-1">({currentLangObj.englishName})</span>
                                        </span>
                                    </div>
                                    <svg 
                                        xmlns="http://www.w3.org/2000/svg" 
                                        className={`h-5 w-5 text-gray-400 group-hover:text-emerald-400 transition-all duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} 
                                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                
                                {isDropdownOpen && (
                                    <div className="absolute top-full left-0 w-full mt-2 bg-gray-900 border border-cyan-800/50 rounded-xl overflow-hidden shadow-2xl z-50 animate-slide-down max-h-60 overflow-y-auto custom-scrollbar">
                                        {displayLanguages.map((lang) => {
                                            const isSelected = language === lang.code;
                                            return (
                                            <div 
                                                key={lang.code} 
                                                onClick={() => handleLanguageSelect(lang.code)}
                                                className={`p-2.5 px-4 cursor-pointer transition-colors flex justify-between items-center ${isSelected ? 'bg-cyan-900/30 text-cyan-400' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    {/* Icon */}
                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition-colors ${isSelected ? 'border-cyan-500 bg-cyan-900/50 text-cyan-400' : 'border-gray-600 bg-gray-800 text-gray-400'}`}>
                                                        {lang.label}
                                                    </div>
                                                    <span className="font-medium text-sm">
                                                        {lang.name} <span className={`ml-1 ${isSelected ? 'text-cyan-600/70' : 'text-gray-600'}`}>({lang.englishName})</span>
                                                    </span>
                                                </div>
                                                {isSelected && <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-cyan-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                                            </div>
                                        )})}
                                    </div>
                                )}
                            </div>

                            {/* 2. API Key Input */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-baseline px-1">
                                    <label htmlFor="welcome-api-key" className="block text-sm font-semibold text-gray-300">
                                        {t('dialog.settings.apiKeyLabel')}
                                    </label>
                                    <a 
                                        href="https://aistudio.google.com/app/apikey" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-xs text-emerald-400 hover:text-emerald-300 hover:underline transition-colors"
                                    >
                                        {t('dialog.settings.getApiKeyLink')}
                                    </a>
                                </div>
                                
                                <div className="relative group">
                                    <input
                                        type="password"
                                        id="welcome-api-key"
                                        ref={inputRef}
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        placeholder={t('dialog.settings.apiKeyPlaceholder')}
                                        className="w-full p-3.5 text-lg bg-gray-900/80 border border-gray-600 rounded-xl text-white focus:outline-none focus:border-emerald-500 focus:ring-0 placeholder-gray-500 transition-colors shadow-inner block hover:border-gray-500"
                                    />
                                </div>
                                <p className="text-xs text-gray-500 px-1 text-center">
                                    {t('dialog.welcome.apiKeyExplanation')}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Actions Footer */}
                    <div className="flex flex-col-reverse justify-center items-center gap-2 w-full pt-4 border-t border-gray-700/50">
                        <button
                            onClick={handleDeveloperClick}
                            className="w-full py-3 text-sm font-bold text-gray-500 hover:text-gray-300 hover:bg-white/5 rounded-xl transition-all duration-200"
                        >
                            {t('welcome.iAmDeveloper')}
                        </button>
                        
                        <button
                            onClick={handleSave}
                            className={`
                                w-full px-12 py-3.5 text-xl font-bold text-white 
                                rounded-xl 
                                shadow-lg shadow-emerald-900/40 
                                transition-all duration-300 ease-out
                                flex items-center justify-center gap-2
                                relative overflow-hidden group
                                ${!isExiting ? 'hover:scale-105 active:scale-95' : ''}
                            `}
                            style={{
                                backgroundImage: 'linear-gradient(90deg, #059669, #34d399, #059669)',
                                backgroundSize: '200% auto',
                                animation: 'textShimmer 3s linear infinite'
                            }}
                        >
                            {/* Content wrapper handles the slide-out animation */}
                            <div className={`flex items-center gap-2 transition-all duration-500 transform ${isExiting ? 'translate-x-[150%] opacity-0' : 'translate-x-0 opacity-100'}`}>
                                <span>{isFirstRun ? t('welcome.letsGo') : t('welcome.resume')}</span>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                </svg>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {/* Go to Prompt Modifier Button */}
        <a
          href="https://promptmodifier2.netlify.app/"
          target="_blank"
          rel="noopener noreferrer"
          className={`
            mt-8 px-6 py-2 rounded-full
            bg-gray-800/50 hover:bg-gray-700/80
            border border-gray-600/50 hover:border-emerald-500/50
            text-gray-400 hover:text-emerald-400
            text-sm font-semibold tracking-wide
            transition-all duration-300
            flex items-center gap-2
            backdrop-blur-sm
            z-50
            ${isExiting ? 'opacity-0 translate-y-4' : 'opacity-100'}
          `}
          style={{ transitionDelay: '0.1s' }}
        >
          <span>Go to Prompt Modifier</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>
  );
};

export default WelcomeDialog;
