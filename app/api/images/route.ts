// /app/api/images/route.ts
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import dbConnect from "@/lib/dbConnect";
import Image from "@/models/Image";

// USER_QUOTA is 500 MB, expressed in bytes
const USER_QUOTA = 500 * 1024 * 1024;

export async function GET(req: any) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.sub) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const userId = token.sub;

    await dbConnect();

    const results = await Image.aggregate([
      { $match: { userId: userId } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: null,
          images: { $push: '$$ROOT' },
          totalSize: { $sum: '$size' }
        }
      }
    ]);

    if (results.length === 0) {
      return NextResponse.json({
        success: true,
        images: [],
        totalSize: 0,
        userQuota: USER_QUOTA
      });
    }

    const { images, totalSize } = results[0];

    return NextResponse.json({
      success: true,
      images,
      totalSize,
      userQuota: USER_QUOTA
    });

  } catch (e: any) {
    console.error("[GET_IMAGES_API] Error:", e.message);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}