// /components/shared/Uploader.tsx
'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { CloudUpload } from 'lucide-react';

export function Uploader() {
  // For now, onDrop just logs the files to the console.
  // We will add the actual upload logic in the next step.
  const onDrop = useCallback((acceptedFiles: File[]) => {
    console.log("Files accepted:", acceptedFiles);
  }, []);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': [],
      'image/png': [],
      'image/webp': [],
    },
  });

  return (
    <div
      {...getRootProps()}
      className={`
        w-full border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
        transition-all duration-300 ease-in-out
        ${isDragActive ? 'border-green-500 bg-green-50 scale-105' : 'border-gray-300'}
        ${isDragReject ? 'border-red-500 bg-red-50' : ''}
      `}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center text-gray-500">
        <CloudUpload className={`w-16 h-16 mb-4 transition-transform duration-300 ${isDragActive ? 'scale-125' : ''}`} />
        
        {isDragReject ? (
          <p className="text-lg font-semibold text-red-600">Unsupported file type</p>
        ) : isDragActive ? (
          <p className="text-lg font-semibold text-green-600">Drop the files here!</p>
        ) : (
          <div>
            <p className="text-lg font-semibold">Drag & drop files here</p>
            <p className="text-sm text-muted-foreground mt-1">or click to select files</p>
            <p className="text-xs text-gray-400 mt-4">Supports: JPG, PNG, WEBP</p>
          </div>
        )}
      </div>
    </div>
  );
}