// /lib/downloadUtils.ts

/**
 * Takes a URL and a desired filename, fetches the data as a blob,
 * and forces the browser to download it. This is an advanced client-side utility.
 * @param url The direct URL to the file to be downloaded (e.g., from Cloudinary).
 * @param filename The desired name for the downloaded file (e.g., "my-viral-title.webp").
 */
export async function forceDownload(url: string, filename: string): Promise<void> {
  try {
    // Step 1: Fetch the image data from the URL.
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.statusText}`);
    }
    // Step 2: Convert the response data into a Blob (a file-like object).
    const blob = await response.blob();
    
    // Step 3: Create a temporary, hidden link element in the browser.
    const link = document.createElement('a');
    
    // Step 4: Create a temporary URL that points to the in-memory Blob data.
    link.href = URL.createObjectURL(blob);
    
    // Step 5: Tell the browser that when this link is clicked, it should download
    // the file with the name we specified.
    link.download = filename;
    
    // Step 6: Programmatically "click" the hidden link to trigger the download.
    document.body.appendChild(link);
    link.click();
    
    // Step 7: Clean up by removing the hidden link and the temporary URL.
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

  } catch (error) {
    console.error("Download failed:", error);
    // You could show an error message to the user here.
    alert("Could not download the file. Please check the console for errors.");
  }
}