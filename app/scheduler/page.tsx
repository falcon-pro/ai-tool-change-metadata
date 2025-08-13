// /app/scheduler/page.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import useSWR from 'swr';
import { Loader2, Download, CheckCircle, AlertTriangle } from 'lucide-react';

// Type definition for our generated schedule items
interface ScheduleItem {
    publish_date: string;
    publish_time: string;
    title: string;
    description: string;
    alt_text: string;
    keywords: string;
    hashtags: string;
    pinterest_board: string;
    image_url: string;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function SchedulerPage() {
  // 1. Fetch all processed images to get the total count
  const { data: imagesData, isLoading: isLoadingImages } = useSWR('/api/images', fetcher);

  // 2. State for the user's strategy inputs
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [numDays, setNumDays] = useState(10);
  const [postsPerDay, setPostsPerDay] = useState(3);
  const [errorMessage, setErrorMessage] = useState('');
  
  // 3. State to hold the generated schedule
  const [generatedSchedule, setGeneratedSchedule] = useState<ScheduleItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const totalImages = imagesData?.images?.filter((img: any) => img.status === 'complete').length || 0;
  
  // --- THE CORE ALGORITHM ---
  const handleGenerateStrategy = () => {
      setIsGenerating(true);
      setErrorMessage('');
      setGeneratedSchedule([]);
      
      if (!imagesData || totalImages === 0) {
          setErrorMessage("No processed images are available to schedule.");
          setIsGenerating(false);
          return;
      }

      // More advanced validation
      const totalPostsRequired = numDays * postsPerDay;
      if (totalImages < totalPostsRequired) {
          setErrorMessage(`Error: You need ${totalPostsRequired} images for this schedule, but you only have ${totalImages} ready.`);
          setIsGenerating(false);
          return;
      }

      const newSchedule: ScheduleItem[] = [];
      const imagesToSchedule = [...imagesData.images.filter((img: any) => img.status === 'complete')]; // Use only completed images
      
      const timeGapMs = (24 * 60 * 60 * 1000) / postsPerDay;
      let currentTimestamp = new Date(startDate).getTime();

      for (let i = 0; i < totalPostsRequired; i++) {
        const imageToPost = imagesToSchedule[i];
        const publishDate = new Date(currentTimestamp);

        const item: ScheduleItem = {
          publish_date: publishDate.toLocaleDateString('en-CA'), // YYYY-MM-DD
          publish_time: publishDate.toLocaleTimeString('en-GB'), // HH:MM:SS
          title: `"${imageToPost.metadata?.title?.replace(/"/g, '""') || ''}"`,
          description: `"${imageToPost.metadata?.description?.replace(/"/g, '""') || ''}"`,
          alt_text: `"${imageToPost.metadata?.alt_text?.replace(/"/g, '""') || ''}"`,
          keywords: (imageToPost.metadata?.keywords || []).join(', '),
          hashtags: (imageToPost.metadata?.hashtags || []).join(' '),
          pinterest_board: imageToPost.metadata?.pinterest_board || "General",
          image_url: imageToPost.cloudinaryUrl,
        };
        newSchedule.push(item);
        
        // Increment the timestamp for the next post
        currentTimestamp += timeGapMs;
      }
      
      // Using a timeout to simulate work and make the UX feel smoother
      setTimeout(() => {
          setGeneratedSchedule(newSchedule);
          setIsGenerating(false);
      }, 1000);
  };

  // --- CSV EXPORT FUNCTION ---
  const handleExportCsv = () => {
      if (generatedSchedule.length === 0) return;
      
      const headers = Object.keys(generatedSchedule[0]);
      const csvContent = [
          headers.join(','),
          ...generatedSchedule.map(item => headers.map(header => (item as any)[header]).join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `alchemy_schedule_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  return (
    <main className="container mx-auto p-4 md:p-8">
        {/* Header section... same as before */}
        <div className="flex justify-between items-center mb-8"><h1 className="text-4xl font-bold tracking-tight">AI Content Strategist</h1><Button variant="outline" asChild><Link href="/dashboard">Back to Dashboard</Link></Button></div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* --- Left Column: STRATEGY INPUTS --- */}
            <div className="md:col-span-1 bg-white p-6 rounded-lg border shadow-sm h-fit">
                <h2 className="text-xl font-semibold mb-4">Your Strategy</h2>
                <div className="mb-4"><Label>Total Ready Images</Label><p className="text-2xl font-bold">{isLoadingImages ? <Loader2 className="animate-spin" /> : totalImages}</p></div>

                <div className="space-y-4">
                    <div><Label htmlFor="start-date">Schedule Start Date</Label><Input id="start-date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
                    <div><Label htmlFor="num-days">For how many days?</Label><Input id="num-days" type="number" min="1" value={numDays} onChange={e => setNumDays(Math.max(1, Number(e.target.value)))} /></div>
                    <div><Label htmlFor="posts-per-day">How many posts per day?</Label><Input id="posts-per-day" type="number" min="1" value={postsPerDay} onChange={e => setPostsPerDay(Math.max(1, Number(e.target.value)))} /></div>
                    
                    <Button onClick={handleGenerateStrategy} className="w-full" disabled={isGenerating || isLoadingImages}>
                        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Generate Strategy
                    </Button>
                    {errorMessage && <p className="text-sm font-medium text-red-600"><AlertTriangle className="inline w-4 h-4 mr-1"/>{errorMessage}</p>}
                </div>
            </div>

            {/* --- Right Column: SCHEDULE PREVIEW & EXPORT --- */}
            <div className="md:col-span-3 bg-white p-6 rounded-lg border shadow-sm">
                <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-semibold">Generated Schedule Preview</h2>{generatedSchedule.length > 0 && (<Button onClick={handleExportCsv}><Download className="mr-2 h-4 w-4" /> Export as CSV</Button>)}</div>
                
                {isGenerating && <div className="text-center p-8"><Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-300" /></div>}
                
                {generatedSchedule.length > 0 && !isGenerating && (
                    <>
                      <div className="p-4 bg-green-50 text-green-800 rounded-lg mb-4 flex items-center gap-2"><CheckCircle className="w-5 h-5"/><div><h3 className="font-semibold">Strategy Generated!</h3><p className="text-sm">A schedule for {generatedSchedule.length} posts has been created. Here is a preview of the first few posts.</p></div></div>
                      <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left">
                              <thead className="text-xs text-gray-700 uppercase bg-gray-50"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Time</th><th className="px-4 py-3">Title</th></tr></thead>
                              <tbody>
                                  {generatedSchedule.slice(0, 5).map(item => (
                                      <tr key={item.publish_date + item.publish_time} className="border-b"><td className="px-4 py-3 font-medium">{item.publish_date}</td><td className="px-4 py-3">{item.publish_time}</td><td className="px-4 py-3 truncate" title={item.title}>{item.title.length > 50 ? item.title.substring(0,50) + '...' : item.title}</td></tr>
                                  ))}
                              </tbody>
                          </table>
                       </div>
                    </>
                )}
                
                {!generatedSchedule.length && !isGenerating && (<div className="text-center p-12 text-muted-foreground"><p>Set your strategy and click "Generate" to create your content plan.</p></div>)}
            </div>
        </div>
    </main>
  );
}