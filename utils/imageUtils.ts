
export const generateThumbnail = (base64Image: string, maxWidth: number, maxHeight: number): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width *= maxHeight / height;
                    height = maxHeight;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                resolve(dataUrl.split(',')[1]);
            } else {
                reject(new Error("Failed to get canvas context"));
            }
        };
        img.onerror = reject;
        img.src = base64Image.startsWith('data:') ? base64Image : `data:image/png;base64,${base64Image}`;
    });
};

export const cropImageTo1x1 = (base64Image: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const size = Math.min(img.width, img.height);
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                const x = (img.width - size) / 2;
                const y = (img.height - size) / 2;
                ctx.drawImage(img, x, y, size, size, 0, 0, size, size);
                const dataUrl = canvas.toDataURL('image/png');
                resolve(dataUrl.split(',')[1]);
            } else {
                reject(new Error("Failed to get canvas context"));
            }
        };
        img.onerror = reject;
        img.src = base64Image.startsWith('data:') ? base64Image : `data:image/png;base64,${base64Image}`;
    });
};

// YouTube Analytics Helpers

export const resizeThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error("Could not get canvas context"));
                return;
            }

            // Target dimensions for YouTube list thumbnail
            const TARGET_WIDTH = 128;
            const TARGET_HEIGHT = 72;

            canvas.width = TARGET_WIDTH;
            canvas.height = TARGET_HEIGHT;

            // Calculate scaling to cover the target area (like object-fit: cover)
            const scale = Math.max(TARGET_WIDTH / img.width, TARGET_HEIGHT / img.height);
            const x = (TARGET_WIDTH / 2) - (img.width / 2) * scale;
            const y = (TARGET_HEIGHT / 2) - (img.height / 2) * scale;

            ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
            resolve(canvas.toDataURL('image/png').split(',')[1]); // Return base64 without header
        };
        img.onerror = reject;
    });
};

export const processYouTubeScreenshot = (file: File): Promise<{ thumbnail: string, metadataImage: string }> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
            const CUT_X = 136; // Approximate width of the thumbnail in the screenshot
            
            // Safety check: If image is smaller than cut point, treat whole as thumb and return empty meta
            if (img.width <= CUT_X) {
                 const canvas = document.createElement('canvas');
                 canvas.width = img.width;
                 canvas.height = img.height;
                 const ctx = canvas.getContext('2d');
                 if (ctx) {
                    ctx.drawImage(img, 0, 0);
                    resolve({
                        thumbnail: canvas.toDataURL('image/png').split(',')[1],
                        metadataImage: '' // No metadata to extract
                    });
                 } else {
                    reject(new Error("Canvas error"));
                 }
                 return;
            }

            // Canvas 1: Thumbnail
            const cvsThumb = document.createElement('canvas');
            cvsThumb.width = CUT_X;
            cvsThumb.height = img.height;
            const ctxThumb = cvsThumb.getContext('2d');
            if (!ctxThumb) { reject("Canvas error"); return; }
            ctxThumb.drawImage(img, 0, 0, CUT_X, img.height, 0, 0, CUT_X, img.height);
            
            // Canvas 2: Metadata
            const cvsMeta = document.createElement('canvas');
            const metaWidth = img.width - CUT_X;
            cvsMeta.width = metaWidth;
            cvsMeta.height = img.height;
            const ctxMeta = cvsMeta.getContext('2d');
            if (!ctxMeta) { reject("Canvas error"); return; }
            ctxMeta.drawImage(img, CUT_X, 0, metaWidth, img.height, 0, 0, metaWidth, img.height);

            resolve({
                thumbnail: cvsThumb.toDataURL('image/png').split(',')[1],
                metadataImage: cvsMeta.toDataURL('image/png').split(',')[1]
            });
        };
        img.onerror = reject;
    });
};
