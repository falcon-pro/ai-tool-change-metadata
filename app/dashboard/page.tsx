// /app/dashboard/page.tsx
'use client';
import { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import Link from 'next/link';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Loader2, Trash2, LayoutGrid, List, Download } from 'lucide-react';
import { ImageCard } from '@/components/shared/ImageCard';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { EditModal } from '@/components/shared/EditModal';
import { DataTable } from '@/components/shared/DataTable';
import { columns } from '@/components/shared/data-table-columns';

interface ApiData { success: boolean; images: any[]; totalSize: number; userQuota: number; }
const fetcher = (url: string): Promise<ApiData> => fetch(url).then(res => res.json());
const formatBytes = (bytes: number, decimals = 2) => { if (!+bytes) return '0 Bytes'; const k = 1024; const dm = decimals < 0 ? 0 : decimals; const sizes = ['Bytes', 'KB', 'MB', 'GB']; const i = Math.floor(Math.log(bytes) / Math.log(k)); return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;}

export default function DashboardPage() {
  const { data, error, isLoading, mutate } = useSWR<ApiData>('/api/images', fetcher);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [activeImage, setActiveImage] = useState<any | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
        await fetch('/api/images/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageIds: selectedImageIds }) });
        mutate();
        setSelectedImageIds([]);
    } catch (error) { console.error("Failed to delete images:", error); } 
    finally { setIsDeleteAlertOpen(false); setIsDeleting(false); }
  };
  
  const handleExportCsv = () => {
    if (!data || !data.images.length) return;
    const imagesToExport = selectedImageIds.length > 0 ? data.images.filter(img => selectedImageIds.includes(img._id)) : data.images;

    const headers = ['Title', 'Media URL', 'Pinterest board', 'Thumbnail', 'Description', 'Link', 'Publish date', 'Keywords'];
    let csvContent = headers.join(',') + '\n';
    
    imagesToExport.forEach(img => {
      const rowData = [ `"${img.metadata?.title?.replace(/"/g, '""') || ''}"`, img.cloudinaryUrl, `"${img.metadata?.pinterest_board || ''}"`, img.cloudinaryUrl, `"${img.metadata?.description?.replace(/"/g, '""') || ''}"`, `"${img.link || ''}"`, format(new Date(img.createdAt), "yyyy-MM-dd HH:mm:ss"), `"${(img.metadata?.keywords || []).join(', ')}"`, ];
      csvContent += rowData.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `content_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const openEditModal = (image: any, e?: React.MouseEvent) => { e?.stopPropagation(); setActiveImage(image); };
  
  if (isLoading) return <div className="flex justify-center items-center h-screen"><Loader2 className="w-16 h-16 animate-spin text-gray-300" /></div>;
  if (error || !data) return <div className="text-center p-20"><h3>Error</h3><p>Failed to load dashboard data.</p></div>;

  const { images, totalSize, userQuota } = data;
  const quotaUsedPercent = (totalSize / userQuota) * 100;
  const isQuotaFull = quotaUsedPercent >= 100;

  return (
    <main className="container mx-auto p-4 md:p-8">
      <div className="flex flex-wrap gap-4 justify-between items-center mb-6"><h1 className="text-4xl font-bold tracking-tight">Your Content Dashboard</h1><div className="flex gap-4"><Button asChild><Link href="/scheduler">AI Scheduler</Link></Button>{!isQuotaFull && <Button variant="outline" asChild><Link href="/">Process More</Link></Button>}</div></div>
      <div className="mb-8 p-6 border rounded-lg bg-white shadow-sm"><div className="flex justify-between items-center mb-2"><Label className="font-semibold text-lg">Storage Quota</Label><span className="text-sm font-medium text-muted-foreground">{formatBytes(totalSize)} / {formatBytes(userQuota)}</span></div><Progress value={quotaUsedPercent} />{isQuotaFull && (<p className="text-sm font-semibold text-orange-600 mt-2">Storage full. Delete images to process more.</p>)}</div>
      
      <div className="flex items-center justify-between mb-6 p-4 border rounded-lg bg-white shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleExportCsv} disabled={images.length === 0}><Download className="mr-2 h-4 w-4"/>{selectedImageIds.length > 0 ? `Export Selected (${selectedImageIds.length})` : `Export All (${images.length})`}</Button>
          {selectedImageIds.length > 0 && (<span className="text-sm text-muted-foreground">{selectedImageIds.length} of {images.length} selected</span>)}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => {setViewMode('grid'); setSelectedImageIds([])}} disabled={viewMode==='grid'}><LayoutGrid className="h-5 w-5"/></Button>
          <Button variant="ghost" size="icon" onClick={() => {setViewMode('table'); setSelectedImageIds([])}} disabled={viewMode==='table'}><List className="h-5 w-5"/></Button>
          {selectedImageIds.length > 0 && (<Button variant="destructive" size="sm" onClick={() => setIsDeleteAlertOpen(true)}><Trash2 className="h-4 w-4 mr-2"/>Delete ({selectedImageIds.length})</Button>)}
        </div>
      </div>
      
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {images.map(image => ( <ImageCard key={image._id} image={image} isSelected={selectedImageIds.includes(image._id)} onSelect={() => setSelectedImageIds(prev => prev.includes(image._id) ? prev.filter(i => i !== image._id) : [...prev, image._id])} onEdit={(e) => openEditModal(image, e)} /> ))}
        </div>
      )}
      
      {viewMode === 'table' && ( <DataTable columns={columns} data={images} onRowSelectionChange={setSelectedImageIds} onRowClick={(row) => openEditModal(row)} /> )}
      
      {images.length === 0 && !isLoading && <div className="text-center p-20 bg-gray-50 rounded-lg"><h2 className="text-2xl font-bold">Your dashboard is empty!</h2><p className="text-muted-foreground mt-2">Click "Process More" to get started.</p><Button asChild className="mt-6"><Link href="/">Process More</Link></Button></div>}
      
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone and will permanently delete {selectedImageIds.length} image(s).</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} disabled={isDeleting}>{isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Confirm Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      {activeImage && <EditModal image={activeImage} isOpen={!!activeImage} onClose={() => setActiveImage(null)} />}
    </main>
  );
}