// /components/pages/UploaderPage.tsx
'use client';

import { signOut } from "next-auth/react";
import Link from "next/link";
import useSWR from 'swr';
import { Button } from "@/components/ui/button";
import { Uploader } from "@/components/shared/Uploader";
import { Loader2, AlertTriangle } from "lucide-react";

// SWR requires a global fetcher function.
const fetcher = (url: string) => fetch(url).then(res => res.json());

// A helper function to format bytes into a readable string (KB, MB, etc.)
// This needs to be included in this file.
const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function UploaderPage({ userName }: { userName: string | null | undefined }) {
  // Fetch data from our powerful GET API.
  // This hook will handle loading, errors, and caching automatically.
  const { data, error, isLoading } = useSWR('/api/images', fetcher);

  // Safely get data, with default values to prevent errors on the first render
  const totalSize = data?.totalSize || 0;
  const userQuota = data?.userQuota || 500 * 1024 * 1024; // Default to 500MB
  const isQuotaFull = totalSize >= userQuota;
  
  return (
    <main className="container mx-auto p-4 md:p-8">
      <div className="flex flex-wrap gap-4 justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Welcome, {userName || 'User'}!</h1>
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link href="/dashboard">View Dashboard</Link>
          </Button>
          <Button variant="outline" onClick={() => signOut()}>Sign Out</Button>
        </div>
      </div>
      
      {/* ===== Conditional Rendering Logic ===== */}

      {/* Case 1: The data is currently being fetched */}
      {isLoading && (
        <div className="text-center p-20">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-gray-300" />
          <p className="mt-4 text-muted-foreground">Checking your storage quota...</p>
        </div>
      )}

      {/* Case 2: The data has loaded, but the user's quota is full */}
      {!isLoading && isQuotaFull && (
         <div className="max-w-4xl mx-auto p-8 text-center bg-orange-50 border-2 border-dashed border-orange-200 rounded-lg">
              <AlertTriangle className="w-12 h-12 mx-auto text-orange-400"/>
              <h2 className="mt-4 text-2xl font-bold">Storage Quota Full</h2>
              <p className="mt-2 text-muted-foreground">You have used {formatBytes(totalSize)} of your {formatBytes(userQuota)} limit.</p>
              <p className="mt-1">Please go to your dashboard to delete some images before you can process more.</p>
              <Button asChild className="mt-6"><Link href="/dashboard">Go to Dashboard</Link></Button>
         </div>
      )}

      {/* Case 3: The data has loaded, and the user has space available */}
      {!isLoading && !isQuotaFull && (
          <>
             <p className="text-lg text-muted-foreground mb-8 text-center">
                Ready to transform your images? Drop them below to begin.
             </p>
             <div className="max-w-4xl mx-auto">
                <Uploader />
             </div>
          </>
      )}

      {/* Case 4: An error occurred while fetching the data */}
      {error && (
         <div className="max-w-4xl mx-auto p-8 text-center bg-red-50 border rounded-lg">
            <h2 className="text-xl font-bold text-red-700">Could not check storage</h2>
            <p className="mt-2 text-muted-foreground">There was an error connecting to the server. Please try again later.</p>
         </div>
      )}

    </main>
  );
}