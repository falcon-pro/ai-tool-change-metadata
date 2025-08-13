// /components/shared/data-table-columns.tsx
'use client';

import { useState } from 'react';
import { ColumnDef, Row } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import { CldImage } from 'next-cloudinary';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ArrowUpDown, MoreHorizontal, Edit, Download, Loader2 } from 'lucide-react';
import { forceDownload } from '@/lib/downloadUtils';

// Define the data structure for one row in our table
export type ImageRow = {
  _id: string;
  cloudinaryUrl: string;
  createdAt: string;
  link?: string;
  metadata: {
    title?: string;
    description?: string;
    alt_text?: string;
    keywords?: string[];
    pinterest_board?: string;
  }
}

// Helper to get a clean public ID from a Cloudinary URL
const getPublicId = (url: string) => {
    if (!url || !url.includes('alchemy-uploads')) return 'placeholder';
    return url.split('/').slice(url.split('/').indexOf('alchemy-uploads')).join('/').replace(/\.[^/.]+$/, "");
}

// --- The New "Actions" Cell Component ---
// We create this as a separate component to manage its own "isDownloading" state
const ActionsCell = ({ row, table }: { row: Row<ImageRow>, table: any }) => {
    const [isDownloading, setIsDownloading] = useState(false);
    const image = row.original;
    
    const handleDownload = async () => {
        setIsDownloading(true);
        const title = image.metadata?.title || 'download';
        const cleanFilename = `${title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase().substring(0, 50)}.webp`;
        await forceDownload(image.cloudinaryUrl, cleanFilename);
        setIsDownloading(false);
    }
    
    const handleEdit = () => {
        // This calls the onEdit function passed from our main dashboard page
        (table.options.meta as any)?.onEdit(image);
    }

    return (
         <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={handleEdit}>
                    <Edit className="mr-2 h-4 w-4" /> Edit Metadata
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownload} disabled={isDownloading}>
                    {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    Download
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

// --- The Main Column Definitions ---
export const columns: ColumnDef<ImageRow>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")} onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)} aria-label="Select all" />
    ),
    cell: ({ row }) => (
      <Checkbox checked={row.getIsSelected()} onCheckedChange={(value) => row.toggleSelected(!!value)} aria-label="Select row" onClick={(e) => e.stopPropagation()}/>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'cloudinaryUrl',
    header: 'Thumbnail',
    cell: ({ row }) => {
      const url = row.getValue('cloudinaryUrl') as string;
      const title = row.original.metadata?.alt_text || 'Image';
      return <div className="w-16 h-16 min-w-[64px] rounded-md bg-gray-100 overflow-hidden"><CldImage src={getPublicId(url)} alt={title} width="64" height="64" className="object-cover h-full w-full" /></div>;
    },
  },
  {
    accessorKey: 'metadata.title',
    header: 'Title',
    cell: ({ row }) => {
        const title = row.original.metadata?.title || 'Processing Failed';
        return <div className="font-medium max-w-sm" title={title}>{title}</div>
    },
  },
   {
    accessorKey: 'metadata.pinterest_board',
    header: 'Pinterest Board',
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>Date <ArrowUpDown className="ml-2 h-4 w-4" /></Button>
    ),
    cell: ({ row }) => <div className="pl-4 font-mono">{format(new Date(row.getValue('createdAt')), "yyyy-MM-dd")}</div>,
  },
  {
    accessorKey: 'link',
    header: 'Link',
    cell: ({ row }) => <div className="max-w-[150px] truncate" title={row.original.link}>{row.original.link || '–'}</div>
  },
  {
    id: 'actions',
    // We pass our new ActionsCell component here to be rendered
    cell: ({ row, table }) => <ActionsCell row={row} table={table} />,
  },
];