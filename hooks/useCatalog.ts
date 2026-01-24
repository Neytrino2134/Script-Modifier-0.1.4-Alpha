
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { CatalogItem, CatalogItemType, Node, Connection, Group } from '../types';

const DB_NAME = 'ScriptModifierCatalogDB';
const DB_VERSION = 1;

export const useContentCatalog = (storeName: string, rootName: string, t: any, catalogContext: string) => {
    const [items, setItems] = useState<CatalogItem[]>([]);
    const [navigationHistory, setNavigationHistory] = useState<Array<string | null>>([null]);
    const catalogFileInputRef = useRef<HTMLInputElement>(null);

    const openDB = (): Promise<IDBDatabase> => {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(storeName)) {
                    db.createObjectStore(storeName, { keyPath: 'id' });
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    };

    const loadFromDB = async () => {
        try {
            const db = await openDB();
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            request.onsuccess = () => setItems(request.result || []);
        } catch (e) {
            console.error(`Failed to load ${storeName} from IndexedDB`, e);
        }
    };

    const saveToDB = async (newItems: CatalogItem[]) => {
        try {
            const db = await openDB();
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            store.clear();
            newItems.forEach(item => store.put(item));
        } catch (e) {
            console.error(`Failed to save ${storeName} to IndexedDB`, e);
        }
    };

    useEffect(() => {
        loadFromDB();
    }, [storeName]);

    const persistItems = (newItems: CatalogItem[]) => {
        setItems(newItems);
        saveToDB(newItems);
    };

    const currentParentId = navigationHistory[navigationHistory.length - 1];

    const currentItems = useMemo(() => {
        return items
            .filter(item => item.parentId === currentParentId)
            .sort((a, b) => {
                if (a.type === b.type) return a.name.localeCompare(b.name);
                return a.type === CatalogItemType.FOLDER ? -1 : 1;
            });
    }, [items, currentParentId]);

    const catalogPath = useMemo(() => {
        const pathChain: { id: string | null, name: string }[] = [];
        let currentId = currentParentId;
        while (currentId) {
            const folder = items.find(item => item.id === currentId);
            if (folder) {
                pathChain.push({ id: folder.id, name: folder.name });
                currentId = folder.parentId;
            } else break;
        }
        return [{ id: null, name: rootName }, ...pathChain.reverse()];
    }, [currentParentId, items, rootName]);

    const navigateToFolder = useCallback((folderId: string | null) => {
        const historyIndex = navigationHistory.findIndex(id => id === folderId);
        if (historyIndex > -1) setNavigationHistory(prev => prev.slice(0, historyIndex + 1));
        else setNavigationHistory(prev => [...prev, folderId]);
    }, [navigationHistory]);

    const createFolder = useCallback(() => {
        const newItem: CatalogItem = {
            id: `folder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: CatalogItemType.FOLDER,
            name: t('library.actions.newFolder'),
            parentId: currentParentId,
        };
        persistItems([...items, newItem]);
    }, [currentParentId, items, t]);

    const renameItem = useCallback((itemId: string, newName: string) => {
        if (!newName.trim()) return;
        persistItems(items.map(item => item.id === itemId ? { ...item, name: newName.trim() } : item));
    }, [items]);

    const deleteItem = useCallback((itemId: string) => {
        const idsToDelete = new Set([itemId]);
        const queue = [itemId];
        while (queue.length > 0) {
            const currentId = queue.shift();
            items.forEach(item => {
                if (item.parentId === currentId) {
                    idsToDelete.add(item.id);
                    if (item.type === CatalogItemType.FOLDER) queue.push(item.id);
                }
            });
        }
        persistItems(items.filter(item => !idsToDelete.has(item.id)));
    }, [items]);

    const moveItem = useCallback((itemId: string, newParentId: string | null) => {
        if (itemId === newParentId) return;
        persistItems(items.map(item => item.id === itemId ? { ...item, parentId: newParentId } : item));
    }, [items]);

    const saveGroupToCatalog = useCallback((group: Group, allNodes: Node[], allConnections: Connection[]) => {
        const memberNodes = allNodes.filter(n => group.nodeIds.includes(n.id));
        const memberNodeIds = new Set(memberNodes.map(n => n.id));
        const internalConnections = allConnections.filter(c =>
            memberNodeIds.has(c.fromNodeId) && memberNodeIds.has(c.toNodeId)
        );

        const newItem: CatalogItem = {
            id: `item-${Date.now()}`,
            type: CatalogItemType.GROUP,
            name: group.title,
            parentId: currentParentId,
            nodes: JSON.parse(JSON.stringify(memberNodes)),
            connections: JSON.parse(JSON.stringify(internalConnections))
        };
        persistItems([...items, newItem]);
    }, [items, currentParentId]);

    const saveGenericItemToCatalog = useCallback((type: CatalogItemType, name: string, data: any) => {
        const newItem: CatalogItem = {
            id: `item-${Date.now()}`,
            type,
            name,
            parentId: currentParentId,
            data
        };
        persistItems([...items, newItem]);
    }, [items, currentParentId]);

    const saveCatalogItemToDisk = useCallback((itemId: string) => {
        const item = items.find(i => i.id === itemId);
        if (!item) return;
        const dataStr = JSON.stringify(item, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${item.name.replace(/\s+/g, '_')}_catalog_export.json`;
        a.click();
        URL.revokeObjectURL(url);
    }, [items]);

    const handleCatalogFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const text = evt.target?.result as string;
                if (!text) return;
                const data = JSON.parse(text);
                const newItem = {
                    ...data,
                    id: `item-${Date.now()}`,
                    parentId: currentParentId
                };
                persistItems([...items, newItem]);
            } catch (err) {
                console.error("Failed to load catalog item", err);
            }
            if (e.target) e.target.value = '';
        };
        reader.readAsText(file);
    }, [items, currentParentId]);

    const triggerLoadFromFile = useCallback(() => {
        catalogFileInputRef.current?.click();
    }, []);

    const importItemsData = useCallback((itemsToImport: any[]) => {
        setItems(prev => {
            const newItems = [...prev];
            itemsToImport.forEach(importData => {
                const existingIdx = newItems.findIndex(i => 
                    (importData.driveFileId && i.driveFileId === importData.driveFileId) ||
                    (i.name === importData.name && i.parentId === importData.parentId && i.type === importData.type)
                );
                if (existingIdx > -1) {
                    newItems[existingIdx] = { ...newItems[existingIdx], ...importData };
                } else {
                    newItems.push({
                        ...importData,
                        id: importData.id || `item-${Date.now()}`
                    });
                }
            });
            saveToDB(newItems);
            return newItems;
        });
    }, [storeName]);

    return {
        items,
        currentItems,
        catalogPath,
        currentParentId,
        navigateToFolder,
        createFolder,
        renameItem,
        deleteItem,
        moveItem,
        saveGroupToCatalog,
        saveGenericItemToCatalog,
        saveCatalogItemToDisk,
        catalogFileInputRef,
        handleCatalogFileChange,
        triggerLoadFromFile,
        importItemsData,
        persistItems,
        catalogContext
    };
};
