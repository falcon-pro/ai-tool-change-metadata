// /lib/imageUtils.ts
import imageCompression from 'browser-image-compression';

export async function compressAndConvertToWebp(file: File): Promise<File> {
  console.log(`Original: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    initialQuality: 0.8,
    fileType: 'image/webp',
  };

  try {
    // Step 1: Compress the file data.
    const compressedBlob = await imageCompression(file, options);

    // Step 2: Create a new, clean filename with the correct .webp extension.
    const originalName = file.name.split('.').slice(0, -1).join('.') || 'image';
    const newFileName = originalName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase() + '.webp';

    // Step 3: Create a new, perfect File object from the compressed data.
    const finalFile = new File([compressedBlob], newFileName, {
      type: 'image/webp',
      lastModified: Date.now(),
    });
    
    console.log(`Compressed: ${finalFile.name} (${(finalFile.size / 1024 / 1024).toFixed(2)} MB)`);
    return finalFile;

  } catch (error) {
    console.error("Image compression failed, returning original file:", error);
    return file;
  }
}