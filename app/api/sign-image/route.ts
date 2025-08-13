// /app/api/sign-image/route.ts
import { v2 as cloudinary } from 'cloudinary';
import { NextResponse } from 'next/server';

// Configure Cloudinary with your server-side credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function POST(request: Request) {
  try {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const folder = 'alchemy-uploads'; // Define the folder here

    // THE CRITICAL FIX: We MUST sign ALL parameters that will be sent to Cloudinary,
    // other than the file itself and api_key. This guarantees a match.
    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp: timestamp,
        folder: folder, // <-- THIS LINE FIXES THE UPLOAD ERROR
      },
      process.env.CLOUDINARY_API_SECRET!
    );

    return NextResponse.json({ timestamp, signature });
  } catch (e: any) {
    console.error("[SIGN_IMAGE_API] Error:", e.message);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}