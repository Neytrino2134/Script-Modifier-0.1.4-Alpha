
const APP_FOLDER_NAME = 'Prompt Modifier Data';

export interface DriveFile {
    id: string;
    name: string;
    mimeType: string;
}

const getAccessToken = () => localStorage.getItem('google-drive-access-token');

export const googleDriveService = {
    async getOrCreateAppFolder(): Promise<string> {
        const token = getAccessToken();
        if (!token) throw new Error('No Google Drive token found');

        // Search for existing folder
        const searchResponse = await fetch(
            `https://www.googleapis.com/drive/v3/files?q=name='${APP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        const searchResult = await searchResponse.json();

        if (searchResult.files && searchResult.files.length > 0) {
            return searchResult.files[0].id;
        }

        // Create folder if not found
        const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: APP_FOLDER_NAME,
                mimeType: 'application/vnd.google-apps.folder',
            }),
        });
        const createResult = await createResponse.json();
        return createResult.id;
    },

    async listCatalogFiles(folderId: string): Promise<DriveFile[]> {
        const token = getAccessToken();
        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and name contains 'Catalog_' and trashed=false&fields=files(id, name, mimeType)`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        const result = await response.json();
        return result.files || [];
    },

    async uploadFile(folderId: string, name: string, content: any, existingFileId?: string): Promise<string> {
        const token = getAccessToken();
        const metadata = {
            name: name,
            parents: existingFileId ? undefined : [folderId],
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' }));

        const url = existingFileId 
            ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`
            : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

        const response = await fetch(url, {
            method: existingFileId ? 'PATCH' : 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: form,
        });

        const result = await response.json();
        return result.id;
    },

    async downloadFile(fileId: string): Promise<any> {
        const token = getAccessToken();
        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return await response.json();
    }
};
