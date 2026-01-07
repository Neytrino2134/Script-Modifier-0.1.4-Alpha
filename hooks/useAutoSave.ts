
import { useEffect, useRef } from 'react';
import { TabState } from '../types';

const DB_NAME = 'ScriptModifierDB';
const STORE_NAME = 'autosave';
const KEY = 'appState';

const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const saveToDB = async (data: any) => {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(data, KEY);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

const loadFromDB = async (): Promise<any> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(KEY);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const useAutoSave = (
    tabs: TabState[],
    activeTabIndex: number,
) => {
    const firstLoad = useRef(true);
    const tabsRef = useRef(tabs);

    // Keep tabsRef updated with the latest tabs state
    useEffect(() => {
        tabsRef.current = tabs;
    }, [tabs]);

    // Auto-save logic
    useEffect(() => {
        if (firstLoad.current) {
            firstLoad.current = false;
            return;
        }

        const handler = setTimeout(() => {
            const dataToSave = {
                tabs,
                activeTabIndex,
                timestamp: Date.now(),
            };
            
            // Try IndexedDB first for larger storage quota
            saveToDB(dataToSave).catch(err => {
                console.warn("IndexedDB save failed, attempting localStorage fallback", err);
                try {
                    localStorage.setItem('script-modifier-autosave', JSON.stringify(dataToSave));
                } catch (e) {
                    console.error("Failed to auto-save state:", e);
                }
            });
        }, 1000); // Debounce save by 1 second

        return () => clearTimeout(handler);
    }, [tabs, activeTabIndex]);

    // Prevent accidental exit logic
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            // Bypass prompt if the app is performing a deliberate hard reload
            if ((window as any).isReloading) return;

            // Check the ref current value to get the latest state without closure staleness
            const hasContent = tabsRef.current.some(tab => tab.nodes.length > 0);
            if (hasContent) {
                e.preventDefault();
                e.returnValue = ''; // Required for Chrome/Firefox/Edge to show the prompt
                return ''; // Required for some older browsers
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, []); // Empty dependency array ensures listener is attached only once
};

export const loadAutoSavedState = async (): Promise<{ tabs: TabState[], activeTabIndex: number } | null> => {
    try {
        // 1. Try IndexedDB
        const dbData = await loadFromDB().catch(() => null);
        if (dbData && Array.isArray(dbData.tabs)) {
            return {
                tabs: dbData.tabs,
                activeTabIndex: typeof dbData.activeTabIndex === 'number' ? dbData.activeTabIndex : 0
            };
        }

        // 2. Fallback to LocalStorage (migration path)
        const saved = localStorage.getItem('script-modifier-autosave');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && Array.isArray(parsed.tabs)) {
                return {
                    tabs: parsed.tabs,
                    activeTabIndex: typeof parsed.activeTabIndex === 'number' ? parsed.activeTabIndex : 0
                };
            }
        }
    } catch (e) {
        console.error("Failed to load auto-saved state:", e);
    }
    return null;
};
