// /app/api/worker/process-image/route.ts
// --- FINAL, BAREBONES, ROBUST VERSION ---

import { NextRequest, NextResponse } from "next/server";
import { verifySignature } from "@upstash/qstash/nextjs";
import { alchemyPrompt } from "@/lib/prompts";
import dbConnect from "@/lib/dbConnect";
import Image from "@/models/Image";

async function handler(req: NextRequest) {
  // -- BLOCK 1: INITIALIZATION ---
  let body;
  try {
    body = await req.json();
  } catch (e) {
    console.error("Failed to parse request body", e);
    return new NextResponse("Invalid JSON body", { status: 400 });
  }

  const { imageUrl, userId } = body;
  if (!imageUrl || !userId) {
    return new NextResponse("Missing imageUrl or userId", { status: 400 });
  }
  console.log(`[WORKER] Received job for user ${userId}`);
  
  // -- BLOCK 2: DATABASE ---
  let imageRecordId: string | null = null;
  try {
    await dbConnect();
    const newImageRecord = await Image.create({ userId, cloudinaryUrl: imageUrl, status: 'processing' });
    imageRecordId = newImageRecord._id.toString();
    console.log(`[WORKER] DB record created: ${imageRecordId}`);
  } catch (e: any) {
    console.error("DB Operation Failed:", e.message);
    return new NextResponse("Database operation failed", { status: 500 });
  }
  
  // --- BLOCK 3: API CALLS AND PROCESSING ---
  try {
    // Download Image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) throw new Error(`Failed to download image. Status: ${imageResponse.status}`);
    const imageBlob = await imageResponse.arrayBuffer();
    
    // Prepare for Cloudflare API
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID!;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN!;
    const model = '@cf/llava-hf/llava-1.5-7b-hf';
    const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
    const inputs = { prompt: alchemyPrompt, image: [...new Uint8Array(imageBlob)] };

    // Call Cloudflare using native fetch
    const aiFetchResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(inputs),
    });
    
    if (!aiFetchResponse.ok) {
        const errorBody = await aiFetchResponse.json();
        throw new Error(`Cloudflare API failed. Status: ${aiFetchResponse.status}. Body: ${JSON.stringify(errorBody)}`);
    }
    
    const aiResponseData = await aiFetchResponse.json();
    
    // Parse the AI's string response
    const aiJsonString = aiResponseData.result?.description;
    if (!aiJsonString) throw new Error("Invalid AI response structure.");
    
    const cleanedJsonString = aiJsonString.replace(/```json\n|\n```/g, '').trim();
    const parsedMetadata = JSON.parse(cleanedJsonString);

    // Update Database with final results
    await Image.findByIdAndUpdate(imageRecordId, {
        metadata: parsedMetadata,
        status: 'complete'
    });
    
    console.log(`[WORKER] Job complete for ${imageRecordId}`);
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error(`[WORKER] Main processing failed for ${imageRecordId}:`, error.message);
    await Image.findByIdAndUpdate(imageRecordId, { status: 'failed', metadata: { error: error.message } });
    return new NextResponse("Worker process failed.", { status: 500 });
  }
}

// Export with Upstash verification
export const POST = verifySignature(handler);
export const dynamic = 'force-dynamic';