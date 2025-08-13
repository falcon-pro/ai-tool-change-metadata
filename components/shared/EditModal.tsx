// /components/shared/EditModal.tsx
'use client';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from 'lucide-react';
import { useSWRConfig } from 'swr';

// This is the full structure of our Image object from the API
interface Image {
  _id: string;
  cloudinaryUrl: string;
  link?: string;
  metadata: {
    title?: string;
    description?: string;
    // alt_text?: string;
    keywords?: string[];
    hashtags?: string[];
    pinterest_board?: string;
  }
}

interface EditModalProps {
  image: Image | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EditModal({ image, isOpen, onClose }: EditModalProps) {
    const [metadata, setMetadata] = useState(image?.metadata || {});
    const [link, setLink] = useState(image?.link || '');
    const [isSaving, setIsSaving] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);

    // This important hook resets the modal's state whenever a new image is selected
    useEffect(() => {
        if (image) {
            setMetadata(image.metadata || {});
            setLink(image.link || '');
        }
    }, [image]);
    
    const { mutate } = useSWRConfig(); // SWR hook to trigger data refreshes

    // Saves both manual edits to metadata and the new link field
    const handleSave = async () => {
        setIsSaving(true);
        await fetch(`/api/images/${image?._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ metadata, link }) // Send both parts to the API
        });
        mutate('/api/images'); // Refresh the dashboard data
        setIsSaving(false);
        onClose();
    };

    // Runs the AI again for the current image
    const handleRegenerate = async () => {
        setIsRegenerating(true);
        try {
          const response = await fetch(`/api/images/${image?._id}`, { method: 'POST' });
          if (!response.ok) throw new Error("Regeneration failed on the server.");
          
          const data = await response.json();
          if (data.success) {
            setMetadata(data.image.metadata); // Update the form with fresh AI data
            mutate('/api/images');
          }
        } catch(err) { console.error(err); } finally {
            setIsRegenerating(false);
        }
    };
    
    if (!image) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl h-[90vh]">
                <DialogHeader>
                    <DialogTitle>Edit & Refine Metadata</DialogTitle>
                    <DialogDescription>Manually edit the AI-generated content or regenerate it for new ideas.</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4 overflow-y-auto pr-4">
                    {/* --- Left Column: Image Preview & Essential SEO --- */}
                    <div className="flex flex-col gap-4">
                        <div className="rounded-lg overflow-hidden aspect-square">
                            <img src={image.cloudinaryUrl} className="object-cover w-full h-full" alt="Image preview"/>
                        </div>
                        <div>
                           <Label htmlFor="alt_text">Alt Text (Crucial for SEO)</Label>
                           <Textarea id="alt_text" value={metadata.alt_text || ''} onChange={e => setMetadata({...metadata, alt_text: e.target.value})} className="h-24 text-sm font-mono"/>
                        </div>
                        <div>
                           <Label htmlFor="link">Destination Link (Optional)</Label>
                           <Input id="link" placeholder="https://your-website.com/your-product" value={link} onChange={e => setLink(e.target.value)} className="font-mono text-sm"/>
                        </div>
                    </div>
                    {/* --- Right Column: AI-Generated Content --- */}
                    <div className="space-y-4">
                    <div>
                        <Label htmlFor="title">Viral Title</Label>
                        <Input id="title" value={metadata.title || ''} onChange={e => setMetadata({...metadata, title: e.target.value})}/>
                    </div>
    
    {/* THIS IS THE CORRECTED BLOCK */}
    <div>
        <Label htmlFor="description">Engaging Description</Label>
        <Textarea 
            id="description" 
            value={metadata.description || ''} // <-- FIX: Isse `description` se connect karein
            onChange={e => setMetadata({...metadata, description: e.target.value})} 
            className="h-40"
        />
    </div>
    {/* END OF FIX */}

    <div>
        <Label htmlFor="keywords">Keywords (comma-separated)</Label>
        <Textarea id="keywords" value={(metadata.keywords || []).join(', ')} onChange={e => setMetadata({...metadata, keywords: e.target.value.split(',').map(k => k.trim())})} className="h-20 font-mono text-sm"/>
    </div>
    <div>
        <Label htmlFor="pinterest_board">Pinterest Board</Label>
        <Input id="pinterest_board" value={metadata.pinterest_board || ''} onChange={e => setMetadata({...metadata, pinterest_board: e.target.value})}/>
    </div>
</div>
                </div>
                <DialogFooter className="flex justify-between w-full sm:justify-between pt-4 border-t">
                    <Button variant="outline" onClick={handleRegenerate} disabled={isRegenerating}>
                         {isRegenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Regenerate with AI
                    </Button>
                    <div className="flex gap-2">
                         <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                         <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Save Changes
                         </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}