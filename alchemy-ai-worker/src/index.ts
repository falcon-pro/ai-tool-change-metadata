// alchemy-ai-worker/src/index.ts

// NOTE: In Cloudflare Workers, we cannot use mongoose directly in this way
// because it relies on long-lived TCP connections, which are not a good fit.
// We will use the MongoDB Data API instead. This is a crucial change.
import { alchemyPrompt } from './prompts';

// This is the interface for our environment variables (secrets)
export interface Env {
  MONGO_API_URL: string;
  MONGO_API_KEY: string;
  CF_ACCOUNT_ID: string;
  CF_API_TOKEN: string;
}

// --- MongoDB Data API Helper Functions ---
// We'll use this instead of mongoose.
const dataSource = "Cluster0"; // Your cluster name
const database = "alchemy-ai-suite"; // Your database name
const collection = "images"; // Your collection name

async function mongoApi(apiKey: string, apiUrl: string, action: string, document: any = {}) {
    const response = await fetch(`${apiUrl}/action/${action}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'api-key': apiKey,
        },
        body: JSON.stringify({ dataSource, database, collection, ...document }),
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`MongoDB Data API error for action '${action}': ${errorText}`);
    }
    return response.json();
}
// --- End of MongoDB Helpers ---


export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Expected POST', { status: 405 });
    }

    const body: { imageUrl: string, userId: string } = await request.json();
    let imageRecordId: string | null = null;
    
    try {
        // Step 1: Create initial record via MongoDB Data API
        const doc = { userId: body.userId, cloudinaryUrl: body.imageUrl, status: 'processing', createdAt: { "$date": new Date().toISOString() } };
        const insertResult = await mongoApi(env.MONGO_API_KEY, env.MONGO_API_URL, 'insertOne', { document: doc });
        imageRecordId = insertResult.insertedId;
        console.log(`[WORKER] DB record created: ${imageRecordId}`);
        
        // Step 2 & 3: Download image & call AI (this logic is the same)
        const imageResponse = await fetch(body.imageUrl);
        const imageBlob = await imageResponse.arrayBuffer();

        const model = '@cf/llava-hf/llava-1.5-7b-hf';
        const aiApiUrl = `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/ai/run/${model}`;
        const inputs = { prompt: alchemyPrompt, image: [...new Uint8Array(imageBlob)] };
        
        const aiFetchResponse = await fetch(aiApiUrl, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${env.CF_API_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(inputs),
        });
        const aiResponseData = await aiFetchResponse.json();
        
        // Step 4: Parse response
        const aiJsonString = aiResponseData.result.description;
        const cleanedJsonString = aiJsonString.replace(/```json\n|\n```/g, '').trim();
        const parsedMetadata = JSON.parse(cleanedJsonString);

        // Step 5: Update record via MongoDB Data API
        await mongoApi(env.MONGO_API_KEY, env.MONGO_API_URL, 'updateOne', {
            filter: { "_id": { "$oid": imageRecordId } },
            update: { "$set": { metadata: parsedMetadata, status: 'complete' } },
        });

        return new Response(JSON.stringify({ success: true, recordId: imageRecordId }), { headers: { 'Content-Type': 'application/json' } });
    } catch (error: any) {
        console.error(`Worker Error for record ${imageRecordId}:`, error.message);
        // If an error occurs after record creation, mark it as failed
        if (imageRecordId) {
            await mongoApi(env.MONGO_API_KEY, env.MONGO_API_URL, 'updateOne', {
                filter: { "_id": { "$oid": imageRecordId } },
                update: { "$set": { status: 'failed', metadata: { error: error.message } } },
            });
        }
        return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
    }
  },
};