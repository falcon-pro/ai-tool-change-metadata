// /app/api/cron/cleanup/route.ts
import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Image from "@/models/Image";
import { v2 as cloudinary } from 'cloudinary';

// (Add cloudinary config and getPublicId helper here, just like in the delete API)

export async function GET(req: Request) {
  // Security: Protect your cron job with a secret key
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    await dbConnect();

    // The TTL index in MongoDB has already deleted the DB records.
    // Our job is to find the orphaned files in Cloudinary.
    // NOTE: A more direct method is to query for old files and delete both.
    
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    
    const expiredImages = await Image.find({ createdAt: { $lt: threeHoursAgo } });
    
    if (expiredImages.length === 0) {
        return NextResponse.json({ success: true, message: "No expired images to cleanup." });
    }
    
    // Use the same deletion logic
    const publicIds = expiredImages.map(img => getPublicId(img.cloudinaryUrl));
    await cloudinary.api.delete_resources(publicIds);
    
    const mongoIds = expiredImages.map(img => img._id);
    await Image.deleteMany({ _id: { $in: mongoIds } });
    
    console.log(`[CRON] Cleaned up ${expiredImages.length} expired images.`);
    return NextResponse.json({ success: true, cleanedUp: expiredImages.length });

  } catch (error: any) {
      console.error('[CRON_ERROR]', error.message);
      return new NextResponse("Cron job failed", { status: 500 });
  }
}