// components/shared/ImageUploader.tsx
'use client';

import { useDropzone } from 'react-dropzone';

// This component is now ONLY for the UI and dropzone interaction
export default function ImageUploader({ onUploadClick }: { onUploadClick: () => void }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
        // We'll let the parent handle the click, this can be for visual feedback
        console.log('Files dropped, but click handler will open widget.');
    },
    noClick: true, // We disable the default click behavior
    accept: { 'image/*': [] },
  });

  return (
    <div
      {...getRootProps()}
      onClick={onUploadClick} // We use the click handler passed from the parent
      className={`w-full h-64 flex items-center justify-center text-center cursor-pointer transition-colors border-2 border-dashed rounded-lg ${
        isDragActive ? 'bg-blue-100' : 'bg-gray-100'
      }`}
    >
      <input {...getInputProps()} />
      {isDragActive ? (
        <p className="text-lg text-blue-600">Drop the files here ...</p>
      ) : (
        <p className="text-lg text-gray-500">
          Drag 'n' drop some files here, or click to select files
        </p>
      )}
    </div>
  );
}