// /components/shared/ImageCard.tsx
'use client';
import { useState } from 'react';
import { CldImage } from 'next-cloudinary';
import { formatDistanceToNow } from 'date-fns';
import { CheckCircle, Edit, Clock, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { forceDownload } from '@/lib/downloadUtils'; // Import our new download engine

interface ImageCardProps {
  image: {
    _id: string;
    cloudinaryUrl: string;
    createdAt: string;
    size: number;
    metadata?: {
      title?: string;
      alt_text?: string;
    };
  };
  isSelected: boolean;
  onSelect: () => void;
  onEdit: (e: React.MouseEvent) => void;
}

const formatBytes = (bytes: number, decimals = 2) => { if (!+bytes) return '0 Bytes'; const k = 1024; const dm = decimals < 0 ? 0 : decimals; const sizes = ['Bytes', 'KB', 'MB', 'GB']; const i = Math.floor(Math.log(bytes) / Math.log(k)); return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`; }

export function ImageCard({ image, isSelected, onSelect, onEdit }: ImageCardProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  
  const getPublicId = (url: string) => {
      if (!url || !url.includes('alchemy-uploads')) return 'placeholder';
      return url.split('/').slice(url.split('/').indexOf('alchemy-uploads')).join('/').replace(/\.[^/.]+$/, "");
  }
  const publicId = getPublicId(image.cloudinaryUrl);

  const title = image.metadata?.title || "Processing Failed";
  const alt_text = image.metadata?.alt_text || title;
  
  const handleDownload = async (e: React.MouseEvent) => {
      e.stopPropagation(); // VERY IMPORTANT: Prevents the card from being selected when clicking the button.
      setIsDownloading(true);
      // Create a clean filename from the title, e.g., "My Viral Title!" -> "my-viral-title.webp"
      const cleanFilename = `${title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase().substring(0, 50)}.webp`;
      await forceDownload(image.cloudinaryUrl, cleanFilename);
      setIsDownloading(false);
  };

  return (
    <div className={`rounded-xl overflow-hidden shadow-sm bg-white transition-all relative border-2 group ${isSelected ? 'border-blue-500 shadow-xl' : 'border-transparent hover:shadow-lg'}`} onClick={onSelect}>
        <div className="absolute top-3 right-3 z-10">{isSelected ? <div className="bg-blue-500 text-white rounded-full p-1 shadow-lg"><CheckCircle className="h-5 w-5"/></div> : <div className="bg-white/50 backdrop-blur-sm border border-gray-300 rounded-full h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"></div>}</div>
      
        <div className="w-full aspect-[4/3] relative bg-gray-100">{publicId && <CldImage src={publicId} alt={alt_text} fill className="object-cover" />}</div>
        
        <div className="p-4"><p className="font-bold text-base h-12 overflow-hidden" title={title}>{title}</p></div>
        
        <div className="p-4 border-t flex justify-between items-center text-xs text-muted-foreground">
             <div className="space-y-1">
                <p className="font-semibold">{formatBytes(image.size)}</p>
                <div className="flex items-center gap-1.5" title="Expires approx. 3 hours from creation"><Clock className="h-3 w-3" /><span>{formatDistanceToNow(new Date(image.createdAt))} ago</span></div>
            </div>

            <div className="flex items-center gap-2">
                 <Button variant="ghost" size="icon" className="rounded-full h-9 w-9" onClick={handleDownload} title="Download Image" disabled={isDownloading}>
                      {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                 </Button>
                 <Button variant="ghost" size="icon" className="rounded-full h-9 w-9" onClick={onEdit} title="Edit Metadata">
                      <Edit className="h-4 w-4" />
                 </Button>
            </div>
        </div>
    </div>
  );
}