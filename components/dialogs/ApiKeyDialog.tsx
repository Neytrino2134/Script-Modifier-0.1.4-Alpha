import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../localization';
import { useAppContext } from '../../contexts/Context';

interface ApiKeyDialogProps {
  isOpen: boolean;
  onSave: (apiKey: string, useFreeKey: boolean) => void;
  onClose: () => void;
  onClear: () => void;
  hasExistingKey: boolean;
  initialUseFreeKey: boolean;
}

const MASKED_KEY = '●●●●●●●●';

const ApiKeyDialog: React.FC<ApiKeyDialogProps> = ({ isOpen, onSave, onClose, onClear, hasExistingKey, initialUseFreeKey }) => {
  const { t } = useLanguage();
  const { addToast } = useAppContext();
  const [apiKey, setApiKey] = useState('');
  const [useFreeKey, setUseFreeKey] = useState(initialUseFreeKey);
  const [googleClientId, setGoogleClientId] = useState(() => localStorage.getItem('google-drive-client-id') || '');
  const [isGoogleConnected, setIsGoogleConnected] = useState(() => !!localStorage.getItem('google-drive-access-token'));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const storedKey = localStorage.getItem('gemini-api-key');
      setApiKey(storedKey ? MASKED_KEY : '');
      setUseFreeKey(initialUseFreeKey);
      setGoogleClientId(localStorage.getItem('google-drive-client-id') || '');
      setIsGoogleConnected(!!localStorage.getItem('google-drive-access-token'));
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, initialUseFreeKey]);

  const handleSave = () => {
    const keyToSend = apiKey.trim() === MASKED_KEY ? '' : apiKey.trim();
    
    // Save Google Client ID
    localStorage.setItem('google-drive-client-id', googleClientId.trim());
    
    onSave(keyToSend, useFreeKey);
  };

  const handleConnectGoogle = () => {
    if (!googleClientId.trim()) {
      addToast('Please enter a Google Client ID', 'error');
      return;
    }

    // Dynamic loading of Google Identity Services
    if (!(window as any).google) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = () => initiateGoogleAuth();
      document.body.appendChild(script);
    } else {
      initiateGoogleAuth();
    }
  };

  const initiateGoogleAuth = () => {
    try {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: googleClientId.trim(),
        scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly',
        callback: (response: any) => {
          if (response.access_token) {
            localStorage.setItem('google-drive-access-token', response.access_token);
            setIsGoogleConnected(true);
            addToast(t('toast.googleDriveConnected'), 'success');
          }
        },
      });
      client.requestAccessToken();
    } catch (e) {
      console.error("Google Auth failed", e);
      addToast('Google Auth failed. Check your Client ID.', 'error');
    }
  };

  const handleDisconnectGoogle = () => {
    localStorage.removeItem('google-drive-access-token');
    setIsGoogleConnected(false);
    addToast(t('toast.googleDriveDisconnected'), 'info');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 cursor-default"
      onMouseDown={onClose}
    >
      <div
        className="bg-gray-800 rounded-lg w-full max-w-md border border-gray-700 flex flex-col shadow-2xl"
        onMouseDown={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-lg font-bold text-emerald-400">{t('dialog.apiKey.title')}</h2>
        </div>
        <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
          {/* Gemini API Section */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">{t('toolbar.group.ai')}</h3>
            <p className="text-sm text-gray-300">
              {t('dialog.apiKey.description')}
            </p>
            <div>
              <label htmlFor="api-key-input" className="block text-sm font-medium text-gray-300 mb-2">
                {hasExistingKey ? t('dialog.apiKey.update') : t('dialog.settings.apiKeyLabel')}
              </label>
              <input
                id="api-key-input"
                ref={inputRef}
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder={t('dialog.settings.apiKeyPlaceholder')}
                disabled={useFreeKey}
                className="w-full px-3 py-2 bg-gray-900 text-white rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-800 disabled:text-gray-500"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                  id="use-free-key-checkbox"
                  type="checkbox"
                  checked={useFreeKey}
                  onChange={(e) => setUseFreeKey(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-500 text-emerald-600 focus:ring-emerald-500 bg-gray-700"
              />
              <label htmlFor="use-free-key-checkbox" className="text-sm text-gray-300 select-none">
                {t('dialog.apiKey.useFreeKey')}
              </label>
            </div>
          </section>

          <div className="h-px bg-gray-700 w-full"></div>

          {/* Google Drive Section */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">{t('dialog.googleDrive.title')}</h3>
            <div>
              <label htmlFor="google-client-id" className="block text-sm font-medium text-gray-300 mb-2">
                {t('dialog.googleDrive.clientIdLabel')}
              </label>
              <input
                id="google-client-id"
                type="text"
                value={googleClientId}
                onChange={e => setGoogleClientId(e.target.value)}
                placeholder={t('dialog.googleDrive.clientIdPlaceholder')}
                className="w-full px-3 py-2 bg-gray-900 text-white rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-md border border-gray-700">
               <div className="flex flex-col">
                  <span className="text-xs text-gray-400 uppercase font-bold tracking-tight">Status</span>
                  <span className={`text-sm font-bold ${isGoogleConnected ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isGoogleConnected ? t('dialog.googleDrive.statusConnected') : t('dialog.googleDrive.statusDisconnected')}
                  </span>
               </div>
               {isGoogleConnected ? (
                 <button 
                  onClick={handleDisconnectGoogle}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded transition-colors"
                 >
                   {t('dialog.googleDrive.disconnect')}
                 </button>
               ) : (
                 <button 
                  onClick={handleConnectGoogle}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded transition-colors flex items-center gap-2"
                 >
                   <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                     <path d="M12.527 15.273l2.51-4.346 5.921 10.248-5.921 10.248zM15.708 15.273l-2.51 4.346-5.921-10.248L13.198 4.75zM12.527 13.527l-5.02 0L1.586 23.775 6.606 34.023z" transform="scale(0.6) translate(8, 8)"/>
                   </svg>
                   {t('dialog.googleDrive.connect')}
                 </button>
               )}
            </div>
          </section>
        </div>
        <div className="p-3 border-t border-gray-700 flex justify-between items-center bg-gray-800/50 rounded-b-lg">
          {hasExistingKey ? (
            <button
              onClick={onClear}
              className="px-4 py-2 font-semibold text-white bg-gray-700 rounded-md hover:bg-red-700 transition-colors"
            >
              {t('dialog.apiKey.clear')}
            </button>
          ) : <div />}
          <div className="flex items-center space-x-3">
            <button onClick={onClose} className="px-4 py-2 font-semibold text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors">
                {t('dialog.rename.cancel')}
            </button>
            <button onClick={handleSave} className="px-4 py-2 font-bold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 transition-colors">
              {t('dialog.settings.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyDialog;