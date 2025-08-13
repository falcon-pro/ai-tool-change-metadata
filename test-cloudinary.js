// test-cloudinary.js

// This line loads all variables from your .env.local file
require('dotenv').config({ path: '.env.local' });

const cloudinary = require('cloudinary').v2;

// A function to test our configuration
async function testCredentials() {
  console.log('--- Cloudinary Credentials Test ---');
  console.log('Attempting to configure Cloudinary...');
  
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  // Log the credentials to make sure they are being read correctly
  console.log(`Cloud Name read from .env: ${cloudName}`);
  console.log(`API Key read from .env:    ${apiKey}`);
  // We won't log the secret for security, but we'll check if it exists.
  console.log(`API Secret exists:         ${apiSecret ? 'Yes' : 'No'}`);
  
  if (!cloudName || !apiKey || !apiSecret) {
    console.error('\n[ERROR] One or more Cloudinary environment variables are missing in your .env.local file. Please check them.');
    return;
  }
  
  try {
    // Configure Cloudinary with the variables
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    console.log('\nConfiguration seems OK. Now trying to ping Cloudinary...');
    
    // This is the simplest API call. It just tests if we can connect and authenticate.
    const result = await cloudinary.api.ping();

    console.log('\n--- TEST RESULT ---');
    if (result && result.status === 'ok') {
      console.log('✅ SUCCESS! Your credentials are correct and the connection to Cloudinary is working.');
    } else {
      console.log('❌ FAILED. The ping was not successful. Response:', result);
    }

  } catch (error) {
    console.error('\n--- TEST RESULT ---');
    console.error('❌ FAILED with an error. This almost certainly means your credentials (API Key or Secret) are incorrect.');
    console.error('Error Details:', error.message);
  }
  console.log('-----------------------------');
}

// Run the test function
testCredentials();