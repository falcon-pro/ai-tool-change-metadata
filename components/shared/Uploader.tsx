// /components/shared/Uploader.tsx
'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { CloudUpload, CheckCircle, AlertTriangle, File as FileIcon, X, Loader2, Sparkles, Scissors } from 'lucide-react';
import axios from 'axios';
import imageCompression from 'browser-image-compression';
import { useSWRConfig } from 'swr';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { platformPresets, groupedPresets, Preset } from '@/lib/platformPresets';
import { resizeImage } from '@/lib/imageResizer';

// --- TYPE DEFINITIONS for state management ---
interface ImagePayload { url: string; size: number; }
type ProcessingStep = 'idle' | 'compressing' | 'ready' | 'uploading' | 'processingAI' | 'success' | 'error';
interface ProcessedFile {
    originalFile: File;
    compressedFile: File;
    finalFile: File;
    status: ProcessingStep;
    progress: number;
    error?: string;
}

// --- MAIN UPLOADER COMPONENT ---
export function Uploader() {
  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>('original');
  const [isWorking, setIsWorking] = useState(false);
  const { mutate } = useSWRConfig();

  // --- STAGE 1: File Drop & Initial Compression ---
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setIsWorking(true);
    setFiles(prev => prev.map(f => ({ ...f, status: 'compressing' })));
    
    const newFiles: ProcessedFile[] = await Promise.all(
        acceptedFiles.map(async (file) => {
            const compressed = await imageCompression(file, { maxSizeMB: 2, maxWidthOrHeight: 1920, useWebWorker: true, fileType: 'image/webp' });
            const finalFileName = `${file.name.split('.').slice(0, -1).join('.') || 'image'}.webp`;
            const finalFile = new File([compressed], finalFileName, { type: 'image/webp' });

            return { originalFile: file, compressedFile: finalFile, finalFile: finalFile, status: 'ready', progress: 0 };
        })
    );
    setFiles(newFiles);
    setIsWorking(false);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'image/jpeg': [], 'image/png': [], 'image/webp': [] }, disabled: isWorking });
  
  // --- STAGE 2: Handle Preset Selection & Client-Side Resizing ---
  const handlePresetChange = async (presetKey: string) => {
      setSelectedPresetKey(presetKey);
      const preset = platformPresets.find(p => p.key === presetKey);
      if (!preset) return;

      setIsWorking(true);
      setFiles(prev => prev.map(f => ({ ...f, status: 'compressing' })));

      const resizedFiles = await Promise.all(
          files.map(async (f) => {
              const newFinalFile = preset.key === 'original'
                  ? f.compressedFile
                  : await resizeImage(f.compressedFile, preset);
              return { ...f, finalFile: newFinalFile, status: 'ready' };
          })
      );
      setFiles(resizedFiles);
      setIsWorking(false);
  };
  
  // --- STAGE 3: Handle Final Upload & AI Processing ---
  const startFullProcess = async () => {
    setIsWorking(true);
    const successfullyUploaded: ImagePayload[] = [];
    const filesToUpload = files.filter(f => f.status === 'ready');

    const uploadPromises = filesToUpload.map(async (fileToProcess) => {
      setFiles(current => current.map(f => f.originalFile === fileToProcess.originalFile ? { ...f, status: 'uploading' } : f));
      try {
        const signatureResponse = await axios.post('/api/sign-image');
        const { timestamp, signature } = signatureResponse.data;
        
        const finalFileName = `${fileToProcess.originalFile.name.split('.').slice(0, -1).join('.') || 'image'}_${selectedPresetKey}.webp`;
        const fileToUploadCloudinary = new File([fileToProcess.finalFile], finalFileName, { type: 'image/webp' });

        const formData = new FormData();
        formData.append('file', fileToUploadCloudinary);
        formData.append('api_key', process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY!);
        formData.append('signature', signature);
        formData.append('timestamp', timestamp);
        // This is now sent as an unsigned parameter and will work perfectly with our new backend.
        formData.append('folder', 'alchemy-uploads');

        const uploadUrl = `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!}/image/upload`;
        const cloudinaryResponse = await axios.post(uploadUrl, formData, {
          onUploadProgress: (e) => { if(e.total) { const p = Math.round((e.loaded*100)/e.total); setFiles(curr=>curr.map(f => f.originalFile === fileToProcess.originalFile ? {...f, progress: p}:f))}}
        });
        
        successfullyUploaded.push({ url: cloudinaryResponse.data.secure_url, size: fileToProcess.finalFile.size });
        setFiles(current => current.map(f => f.originalFile === fileToProcess.originalFile ? { ...f, status: 'processingAI' } : f));
      } catch (error) {
        setFiles(current => current.map(f => f.originalFile === fileToProcess.originalFile ? { ...f, status: 'error', error: 'Upload failed' } : f));
      }
    });
    
    await Promise.all(uploadPromises);

    if (successfullyUploaded.length > 0) {
      try {
        await axios.post('/api/process-now', { imagesToProcess: successfullyUploaded });
        setFiles(current => current.map(f => f.status === 'processingAI' ? { ...f, status: 'success' } : f));
        mutate('/api/images');
        setTimeout(() => setFiles([]), 3000);
      } catch (error) {
        setFiles(current => current.map(f => f.status === 'processingAI' ? { ...f, status: 'error', error: 'AI failed' } : f));
      }
    }
    setIsWorking(false);
  };
  
  // Helper functions
  const removeFile = (fileName: string) => { setFiles(current => current.filter(f => f.originalFile.name !== fileName)); };
  const formatBytes = (bytes: number) => { if (!+bytes) return '0 Bytes'; const k = 1024; const i = Math.floor(Math.log(bytes) / Math.log(k)); return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${['Bytes', 'KB', 'MB'][i]}`; };
  const getStatusComponent = (file: ProcessedFile) => {
    switch(file.status) {
      case 'compressing': return <div className='flex items-center gap-1 text-purple-600'><Loader2 className='w-4 h-4 animate-spin'/>Optimizing...</div>;
      case 'ready': return <div className='flex items-center gap-1 text-green-600'><CheckCircle className='w-4 h-4'/>Ready</div>;
      case 'uploading': return <p className='text-blue-500'>Uploading: {file.progress}%</p>;
      case 'processingAI': return <div className='flex items-center gap-1 text-purple-600'><Loader2 className='w-4 h-4 animate-spin'/>AI Processing...</div>;
      case 'success': return <div className='flex items-center gap-1 text-green-600'><CheckCircle className='w-4 h-4'/>Complete</div>;
      case 'error': return <div className='flex items-center gap-1 text-red-600' title={file.error}><AlertTriangle className='w-4 h-4'/>Failed</div>;
      default: return null;
    }
  };

  // --- JSX (THE VIEW) ---
  return (
    <div className="w-full">
      {files.length === 0 ? (
        <div {...getRootProps()} className={`w-full border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${isDragActive ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-gray-400'} ${isWorking ? 'opacity-50 cursor-not-allowed' : ''}`}>
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center text-gray-500">
            {isWorking ? (
              <><Loader2 className="w-16 h-16 mb-4 animate-spin text-purple-600" /><p className="text-lg font-semibold text-purple-600">Optimizing Images...</p><p className="text-sm text-muted-foreground mt-1">Please wait, this is ultra-fast!</p></>
            ) : (
              <><CloudUpload className="w-16 h-16 mb-4" /><p className="text-lg font-semibold">Drag & drop images here</p><p className="text-sm text-muted-foreground mt-1">or click to select</p></>
            )}
          </div>
        </div>
      ) : (
        <div className='space-y-6'>
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h2 className="text-xl font-bold flex items-center mb-4"><Scissors className="mr-3 text-purple-600" />Choose a Preset to Resize Images</h2>
            <Select onValueChange={handlePresetChange} defaultValue="original" disabled={isWorking}>
                <SelectTrigger className="w-full md:w-2/3 text-base py-6"><SelectValue placeholder="Select a format" /></SelectTrigger>
                <SelectContent>
                    {Object.entries(groupedPresets).map(([platform, presets]) => (
                        <SelectGroup key={platform}><SelectLabel>{platform}</SelectLabel>{presets.map(p => <SelectItem key={p.key} value={p.key}>{p.type} <span className="text-muted-foreground ml-2">({p.width}x{p.height})</span></SelectItem>)}</SelectGroup>
                    ))}
                </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-3">Your images will be instantly resized to the selected format before uploading.</p>
          </div>
          
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
            {files.map((f, i) => (
              <div key={i} className='border rounded-lg p-3 bg-white space-y-2'>
                <div className="flex justify-between items-start"><p className='text-sm font-medium truncate' title={f.originalFile.name}>{f.originalFile.name}</p><button onClick={() => removeFile(f.originalFile.name)} className='p-1 text-gray-400 hover:text-gray-700' disabled={isWorking}><X className='w-4 h-4' /></button></div>
                <div className='text-xs text-muted-foreground flex justify-between'><span>Original: {formatBytes(f.originalFile.size)}</span><span className="font-semibold text-green-600">Final: {formatBytes(f.finalFile.size)}</span></div>
                {f.status === 'uploading' && <Progress value={f.progress} className="h-2" />}
                <div className="h-5 flex items-center text-xs font-semibold">{getStatusComponent(f)}</div>
              </div>
            ))}
          </div>

          <div className='flex justify-end gap-4'>
            <Button variant="outline" onClick={() => {setFiles([]); setSelectedPresetKey('original');}} disabled={isWorking}>Clear All</Button>
            <Button onClick={startFullProcess} disabled={isWorking || files.some(f => f.status !== 'ready')}>
              {isWorking ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Processing...</> : <><Sparkles className="mr-2 h-4 w-4"/>Process {files.length} Files</>}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}