// /app/api/worker/process-image/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verify } from "@upstash/qstash"; // Import verify instead of verifySignature
import { alchemyPrompt } from "@/lib/prompts";
import dbConnect from "@/lib/dbConnect";
import Image from "@/models/Image";

export async function POST(req: NextRequest) {
  // -- VERIFY QSTASH SIGNATURE --
  try {
    // Get raw body for signature verification
    const rawBody = await req.text();
    
    const signature = req.headers.get('Upstash-Signature');
    if (!signature) {
      return new NextResponse("Missing signature", { status: 401 });
    }

    // Verify the signature
    await verify({
      signature,
      body: rawBody,
      secret: process.env.QSTASH_SECRET!,
    });
    
    console.log("[WORKER] Signature verified");
    
    // Parse the body after verification
    const body = JSON.parse(rawBody);
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
      if (imageRecordId) {
        await Image.findByIdAndUpdate(imageRecordId, { status: 'failed', metadata: { error: error.message } });
      }
      return new NextResponse("Worker process failed.", { status: 500 });
    }
    
  } catch (verificationError: any) {
    console.error("[WORKER] Signature verification failed:", verificationError.message);
    return new NextResponse("Invalid signature", { status: 401 });
  }
}

export const dynamic = 'force-dynamic';