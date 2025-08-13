// /app/api/images/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import dbConnect from "@/lib/dbConnect";
import Image from "@/models/Image";
import { alchemyPrompt } from "@/lib/prompts";
import { parseAiResponse } from "@/lib/aiDataParser";

// Define the parameter type
type Params = {
    id: string;
};

// --- Function to UPDATE an existing image with manual edits ---
export async function PUT(
    req: NextRequest,
    { params }: { params: Params }
) {
    try {
        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
        if (!token?.sub) return new NextResponse("Unauthorized", { status: 401 });
        
        const imageId = params.id;
        const { metadata, link } = await req.json();

        await dbConnect();
        
        const updatedImage = await Image.findOneAndUpdate(
            { _id: imageId, userId: token.sub },
            { $set: { metadata: metadata, link: link } },
            { new: true }
        );

        if (!updatedImage) return new NextResponse("Image not found or user unauthorized", { status: 404 });
        
        return NextResponse.json({ success: true, image: updatedImage });
        
    } catch (e: any) {
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

// --- Function to REGENERATE an existing image with AI ---
export async function POST(
    req: NextRequest,
    { params }: { params: Params }
) {
    try {
        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
        if (!token?.sub) return new NextResponse("Unauthorized", { status: 401 });
        const imageId = params.id;
        await dbConnect();

        const imageToRegenerate = await Image.findOne({ _id: imageId, userId: token.sub });
        if (!imageToRegenerate) return new NextResponse("Image not found", { status: 404 });
        
        const imageResponse = await fetch(imageToRegenerate.cloudinaryUrl);
        if (!imageResponse.ok) throw new Error("Could not download original image.");
        const imageBlob = await imageResponse.arrayBuffer();

        const accountId = process.env.CLOUDFLARE_ACCOUNT_ID!;
        const apiToken = process.env.CLOUDFLARE_API_TOKEN!;
        const model = '@cf/llava-hf/llava-1.5-7b-hf';
        const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
        
        const inputs = { prompt: alchemyPrompt, image: [...new Uint8Array(imageBlob)] };
        
        const aiFetchResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(inputs),
        });

        if (!aiFetchResponse.ok) { 
            const err = await aiFetchResponse.text(); 
            throw new Error(`API error: ${err}`); 
        }
        const aiResponseData = await aiFetchResponse.json();
        const aiText = aiResponseData.result.description;
        if (!aiText) throw new Error("AI response was empty.");
        
        const parsedMetadata = parseAiResponse(aiText);
        imageToRegenerate.metadata = parsedMetadata;
        await imageToRegenerate.save();
        
        return NextResponse.json({ success: true, image: imageToRegenerate });
    } catch(e: any) {
        return new NextResponse(`Internal Server Error: ${e.message}`, { status: 500 });
    }
}