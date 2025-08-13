// /app/api/process-now/route.ts
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { alchemyPrompt } from "@/lib/prompts";
import dbConnect from "@/lib/dbConnect";
import Image from "@/models/Image";
import { parseAiResponse } from "@/lib/aiDataParser";

interface ImagePayload { url: string; size: number; }

export async function POST(req: any) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.sub) return new NextResponse("Unauthorized", { status: 401 });
    const userId = token.sub;
    const body = await req.json();
    const { imagesToProcess }: { imagesToProcess: ImagePayload[] } = body;
    if (!imagesToProcess?.length) return new NextResponse("Missing image data", { status: 400 });
    await dbConnect();

    for (const image of imagesToProcess) {
      try {
        const imageResponse = await fetch(image.url);
        if (!imageResponse.ok) throw new Error(`Download failed: ${imageResponse.statusText}`);
        const imageBlob = await imageResponse.arrayBuffer();
        
        const accountId = process.env.CLOUDFLARE_ACCOUNT_ID!;
        const apiToken = process.env.CLOUDFLARE_API_TOKEN!;
        const model = '@cf/llava-hf/llava-1.5-7b-hf';
        const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
        const inputs = { prompt: alchemyPrompt, image: [...new Uint8Array(imageBlob)] };
        
        const aiFetchResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(inputs)
        });

        if (!aiFetchResponse.ok) throw new Error(`Cloudflare API error: ${await aiFetchResponse.text()}`);
        const aiResponseData = await aiFetchResponse.json();
        const aiText = aiResponseData.result.description;
        if (!aiText) throw new Error("AI response was empty.");
        
        const parsedMetadata = parseAiResponse(aiText);
        
        await Image.create({
            userId, cloudinaryUrl: image.url, size: image.size, status: 'complete', metadata: parsedMetadata,
        });
      } catch (processingError: any) {
          console.error(`[PROCESS-NOW] FAILED for ${image.url}:`, processingError.message);
          await Image.create({
              userId, cloudinaryUrl: image.url, size: image.size, status: 'failed', metadata: { error: processingError.message },
          });
      }
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error(`[PROCESS-NOW] FATAL ERROR: ${e.message}`);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}