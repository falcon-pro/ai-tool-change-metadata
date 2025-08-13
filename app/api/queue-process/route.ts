// /app/api/queue-process/route.ts
import { Client } from "@upstash/qstash";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Initialize the QStash client
const qstashClient = new Client({
  token: process.env.QSTASH_TOKEN!,
});

export async function POST(request: Request) {
  // 1. Authenticate the request: Make sure the user is logged in
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // 2. Parse the incoming request body
  const body = await request.json();
  const { imageUrl } = body; // We expect the client to send the Cloudinary URL

  if (!imageUrl) {
    return new NextResponse("Image URL is required", { status: 400 });
  }

  try {
    // 3. Publish a job to the QStash queue
    const result = await qstashClient.publishJSON({
      // The API endpoint that will DO the actual AI work.
      // We will build this in the next phase.
    url: 'https://alchemy-ai-worker.twiktvapp.workers.dev',
      // The data we want to send to the worker
      body: {
        imageUrl: imageUrl,
        userId: session.user.id, // Pass the user's ID to the worker
      },
      // Optional: Add a delay or retry logic if needed
      // retries: 3, 
    });

    console.log("Job published to QStash:", result);
    
    // 4. Respond to the client that the job was queued successfully
    return NextResponse.json({ success: true, message: "Image queued for processing.", jobId: result.messageId });

  } catch (error) {
    console.error("Error publishing to QStash:", error);
    return new NextResponse("Error queueing job", { status: 500 });
  }
}