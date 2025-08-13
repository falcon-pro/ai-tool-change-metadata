// /lib/platformPresets.ts

export interface Preset {
  key: string;
  platform: string;
  type: string;
  width: number;
  height: number;
  aspectRatio: string;
}

export const platformPresets: Preset[] = [
  { key: 'original', platform: 'General', type: 'Original (Optimized)', width: 1920, height: 1920, aspectRatio: 'N/A' },
  
  // Facebook
  { key: 'fb_post', platform: 'Facebook', type: 'Post (Recommended)', width: 1200, height: 630, aspectRatio: '1.91:1' },
  { key: 'fb_square', platform: 'Facebook', type: 'Post (Square)', width: 1080, height: 1080, aspectRatio: '1:1' },
  { key: 'fb_story', platform: 'Facebook', type: 'Story / Reel', width: 1080, height: 1920, aspectRatio: '9:16' },

  // Instagram
  { key: 'ig_square', platform: 'Instagram', type: 'Post (Square)', width: 1080, height: 1080, aspectRatio: '1:1' },
  { key: 'ig_portrait', platform: 'Instagram', type: 'Post (Portrait)', width: 1080, height: 1350, aspectRatio: '4:5' },
  { key: 'ig_landscape', platform: 'Instagram', type: 'Post (Landscape)', width: 1080, height: 566, aspectRatio: '1.91:1' },
  { key: 'ig_story', platform: 'Instagram', type: 'Story / Reel', width: 1080, height: 1920, aspectRatio: '9:16' },

  // TikTok
  { key: 'tt_video', platform: 'TikTok', type: 'Video / Thumbnail', width: 1080, height: 1920, aspectRatio: '9:16' },

  // Pinterest
  { key: 'pin_standard', platform: 'Pinterest', type: 'Pin (Standard)', width: 1000, height: 1500, aspectRatio: '2:3' },

  // YouTube
  { key: 'yt_shorts', platform: 'YouTube', type: 'Shorts Thumbnail', width: 1080, height: 1920, aspectRatio: '9:16' },
];

// Helper to create grouped options for the Select component
export const groupedPresets = platformPresets.reduce((acc, preset) => {
    if (!acc[preset.platform]) {
        acc[preset.platform] = [];
    }
    acc[preset.platform].push(preset);
    return acc;
}, {} as Record<string, Preset[]>);