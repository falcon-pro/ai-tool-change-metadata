// /app/api/images/delete/route.ts
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import dbConnect from "@/lib/dbConnect";
import Image from "@/models/Image";
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary with server-side credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Helper to extract public_id from a Cloudinary URL
const getPublicId = (url: string) => {
    const parts = url.split('/');
    return parts.slice(parts.indexOf('alchemy-uploads')).join('/').replace(/\.[^/.]+$/, "");
}

export async function POST(req: any) { // We use POST for delete to send a body with IDs
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.sub) return new NextResponse("Unauthorized", { status: 401 });
    const userId = token.sub;

    const body = await req.json();
    const { imageIds }: { imageIds: string[] } = body;

    if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
      return new NextResponse("Image IDs are required", { status: 400 });
    }

    await dbConnect();
    
    // Find the documents in the DB first to get their Cloudinary URLs
    const imagesToDelete = await Image.find({
      _id: { $in: imageIds },
      userId: userId // Security: Make sure user can only delete their own images
    });
    
    if (imagesToDelete.length === 0) {
      return NextResponse.json({ success: true, message: "No images found to delete." });
    }
    
    const publicIds = imagesToDelete.map(img => getPublicId(img.cloudinaryUrl));
    
    // --- Step 1: Delete from Cloudinary ---
    // The Admin API can delete up to 100 images at once
    await cloudinary.api.delete_resources(publicIds);
    console.log(`[DELETE] Successfully deleted ${publicIds.length} images from Cloudinary.`);
    
    // --- Step 2: Delete from MongoDB ---
    const mongoIdsToDelete = imagesToDelete.map(img => img._id);
    await Image.deleteMany({ _id: { $in: mongoIdsToDelete } });
    console.log(`[DELETE] Successfully deleted ${mongoIdsToDelete.length} records from MongoDB.`);

    return NextResponse.json({ success: true, message: "Images deleted successfully." });

  } catch (e: any) {
    console.error("[DELETE_API] Error:", e.message);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}