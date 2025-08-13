// /lib/imageResizer.ts
import { Preset } from './platformPresets';

/**
 * Resizes an image file to fit within the given preset dimensions while maintaining aspect ratio.
 * This runs entirely in the user's browser using the high-performance Canvas API.
 * @param file The image file to resize.
 * @param preset The target social media preset.
 * @returns A new, resized WebP File object.
 */
export async function resizeImage(file: File, preset: Preset): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      if (!event.target?.result) {
        return reject(new Error("FileReader did not return a result."));
      }
      const img = new Image();
      img.src = event.target.result as string;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error("Could not get canvas context."));

        const { width: maxWidth, height: maxHeight } = preset;
        let { width, height } = img;

        // Calculate new dimensions to fit inside the preset box while maintaining aspect ratio
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
        
        canvas.width = Math.round(width);
        canvas.height = Math.round(height);

        // Draw the resized image onto the canvas with high quality
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Convert the canvas to a WebP file-like Blob
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error("Canvas toBlob operation failed."));

            // Create a new, perfect File object from the Blob with the correct mime type
            const resizedFile = new File([blob], file.name, {
              type: 'image/webp',
              lastModified: Date.now(),
            });

            console.log(`Resized "${file.name}" for preset "${preset.type}" to ${canvas.width}x${canvas.height}`);
            resolve(resizedFile);
          },
          'image/webp',
          0.9 // Use 90% quality for resized images
        );
      };
      
      img.onerror = (err) => reject(new Error(`Image could not be loaded: ${err}`));
    };
    
    reader.onerror = (err) => reject(new Error(`FileReader failed: ${err}`));
  });
}