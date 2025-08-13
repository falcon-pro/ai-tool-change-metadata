// full-worker-test.ts
// --- Standalone Test Script (NO Next.js code) ---

import dotenv from 'dotenv';
import mongoose, { Schema } from 'mongoose';
import axios from 'axios';
import { alchemyPrompt } from './lib/prompts';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Redefine the Mongoose model for this script
const imageSchema = new Schema({
    userId: { type: String, required: true },
    cloudinaryUrl: { type: String, required: true },
    status: { type: String, required: true },
    metadata: { type: Object },
    createdAt: { type: Date, default: Date.now, expires: 10800 }
});
const Image = mongoose.models.Image || mongoose.model('Image', imageSchema);


// The main test function
async function runTest() {
    console.log('--- [STARTING] Final Validation Test ---');

    // Use a real, working URL from a previous successful Cloudinary upload
    const TEST_CLOUDINARY_URL = "https://res.cloudinary.com/dl7bqwcvd/image/upload/v1754937994/alchemy-uploads/qwpwd6twqvurwv2hxhrp.jpg";
    const TEST_USER_ID = "test-user-123";

    try {
        // Step 1: Connect to MongoDB
        console.log('\n[1/5] Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI!);
        const newImageRecord = await Image.create({
            userId: TEST_USER_ID,
            cloudinaryUrl: TEST_CLOUDINARY_URL,
            status: 'test-processing',
        });
        const newImageRecordId = newImageRecord._id;
        console.log(`✅ Step 1 Complete. DB record created: ${newImageRecordId}`);

        // Step 2: Download image
        console.log('\n[2/5] Downloading image...');
        const imageResponse = await fetch(TEST_CLOUDINARY_URL);
        const imageBlob = await imageResponse.arrayBuffer();
        console.log(`✅ Step 2 Complete. Image downloaded.`);

        // Step 3: Call Cloudflare AI
        console.log('\n[3/5] Calling Cloudflare AI API...');
        const accountId = process.env.CLOUDFLARE_ACCOUNT_ID!;
        const apiToken = process.env.CLOUDFLARE_API_TOKEN!;
        const model = '@cf/llava-hf/llava-1.5-7b-hf'; // The model that worked
        const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

        const inputs = {
            prompt: alchemyPrompt,
            image: [...new Uint8Array(imageBlob)],
        };

        const aiResponse = await axios.post(apiUrl, inputs, {
            headers: { 'Authorization': `Bearer ${apiToken}` }
        });
        console.log('✅ Step 3 Complete. Received response from AI.');
        
        // Step 4: Parse AI response
        console.log('\n[4/5] Parsing AI response...');
        if (!aiResponse.data || !aiResponse.data.result || !aiResponse.data.result.description) {
            throw new Error("Invalid response structure. Expected 'result.description'.");
        }
        const aiJsonString = aiResponse.data.result.description;
        const cleanedJsonString = aiJsonString.replace(/```json\n|\n```/g, '').trim();
        const parsedMetadata = JSON.parse(cleanedJsonString);
        console.log(`✅ Step 4 Complete. Parsed AI response. Title: "${parsedMetadata.alchemy_title}"`);
        
        // Step 5: Update database
        console.log('\n[5/5] Updating database record...');
        await Image.findByIdAndUpdate(newImageRecordId, {
            metadata: parsedMetadata,
            status: 'test-complete'
        });
        console.log('✅ Step 5 Complete. Database record updated.');
        
        console.log('\n\n\x1b[32m%s\x1b[0m', '--- [SUCCESS] The entire worker flow is confirmed to be working! ---');

    } catch (error: any) {
        console.error('\n\n--- [TEST FAILED] ---');
        if (axios.isAxiosError(error)) {
            console.error('[ERROR] Axios Error:', JSON.stringify(error.response?.data, null, 2));
        } else {
            console.error('[ERROR] Message:', error.message);
        }
    } finally {
        if (mongoose.connection.readyState === 1) {
            await mongoose.disconnect();
            console.log('\nMongoDB connection closed.');
        }
        console.log('--- [FINISHED] Test Complete ---');
    }
}

runTest();