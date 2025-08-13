// /components/shared/DataTable.tsx
'use client';

import * as React from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  SortingState,
  getSortedRowModel,
  RowSelectionState,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onRowSelectionChange: (selectedIds: string[]) => void;
  onRowClick: (row: TData) => void;
}

// Note the generic constraint `TData extends { _id: string }`
// This ensures that any data passed to this table MUST have an `_id` property.
export function DataTable<TData extends { _id: string }, TValue>({ columns, data, onRowSelectionChange, onRowClick }: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowRowModel: getSortedRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      rowSelection
    },
    // This is crucial for TanStack Table to track rows correctly by their database ID
    getRowId: (row) => row._id, 
  });
  
  // This hook listens for changes in the table's internal selection state
  // and notifies the parent Dashboard page with an array of the selected database IDs.
  React.useEffect(() => {
      const selectedIds = Object.keys(rowSelection).filter(id => rowSelection[id]);
      onRowSelectionChange(selectedIds);
  }, [rowSelection, onRowSelectionChange]);

  return (
    <div className="rounded-md border bg-white">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && 'selected'}
                onClick={() => onRowClick(row.original)}
                className="cursor-pointer"
              >
                {row.getVisibleCells().map((cell) => (
                  // This complex onClick handler allows the checkbox to be clicked without triggering the row's main click event.
                  <TableCell key={cell.id} onClick={e => cell.column.id === 'select' && e.stopPropagation()}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">No images found.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}