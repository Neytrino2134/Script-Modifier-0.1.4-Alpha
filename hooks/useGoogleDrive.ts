
import { useState, useCallback } from 'react';
import { googleDriveService } from '../services/googleDriveService';
import { CatalogItem } from '../types';

interface CatalogHook {
    items: CatalogItem[];
    importItemsData: (items: any[]) => void;
    persistItems: (items: CatalogItem[]) => void;
    catalogContext: string;
}

export const useGoogleDrive = (catalogs: Record<string, CatalogHook>, addToast: any, t: any) => {
    const [isSyncing, setIsSyncing] = useState(false);

    const handleSyncCatalogs = useCallback(async () => {
        const token = localStorage.getItem('google-drive-access-token');
        if (!token) {
            addToast(t('error.apiKeyMissing'), 'error');
            return;
        }

        setIsSyncing(true);
        try {
            const folderId = await googleDriveService.getOrCreateAppFolder();
            const driveFiles = await googleDriveService.listCatalogFiles(folderId);

            const contextBatches: Record<string, any[]> = {};

            for (const file of driveFiles) {
                try {
                    const content = await googleDriveService.downloadFile(file.id);
                    const context = content.catalogContext;
                    if (context && catalogs[context]) {
                        if (!contextBatches[context]) contextBatches[context] = [];
                        contextBatches[context].push({
                            ...content.root,
                            driveFileId: file.id,
                            parentId: null // Imported items go to root of their category
                        });
                    }
                } catch (e) {
                    console.error(`Failed to download file ${file.name}`, e);
                }
            }

            // Apply batches to corresponding catalogs
            Object.entries(contextBatches).forEach(([context, items]) => {
                catalogs[context].importItemsData(items);
            });

            addToast(t('toast.projectLoaded'), 'success');
        } catch (error: any) {
            console.error('Sync failed', error);
            addToast(`Sync failed: ${error.message}`, 'error');
        } finally {
            setIsSyncing(false);
        }
    }, [catalogs, addToast, t]);

    const uploadCatalogItem = useCallback(async (item: CatalogItem, context: string) => {
        const token = localStorage.getItem('google-drive-access-token');
        if (!token) {
            addToast(t('error.apiKeyMissing'), 'error');
            return;
        }

        try {
            const folderId = await googleDriveService.getOrCreateAppFolder();
            
            const exportData = {
                appName: "Script_modifier",
                catalogContext: context,
                root: {
                    ...item,
                    id: undefined,
                    parentId: undefined,
                    driveFileId: undefined // Don't loop the ID
                }
            };

            const fileName = `Catalog_${context}_${item.name.replace(/\s+/g, '_')}_${Date.now()}.json`;
            const fileId = await googleDriveService.uploadFile(folderId, fileName, exportData, item.driveFileId);

            // Update item with driveFileId locally
            if (catalogs[context]) {
                const updatedItems = catalogs[context].items.map(i => 
                    i.id === item.id ? { ...i, driveFileId: fileId } : i
                );
                catalogs[context].persistItems(updatedItems);
            }

            addToast(t('toast.savedToCatalog'), 'success');
        } catch (error: any) {
            console.error('Upload failed', error);
            addToast(`Upload failed: ${error.message}`, 'error');
        }
    }, [catalogs, addToast, t]);

    return {
        isSyncing,
        handleSyncCatalogs,
        uploadCatalogItem
    };
};
