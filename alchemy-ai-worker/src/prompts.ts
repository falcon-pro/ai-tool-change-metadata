// alchemy-ai-worker/src/prompts.ts
export const alchemyPrompt = `
Analyze the provided image and generate a creative title and a short narrative.
Your output MUST be a valid JSON object with ONLY two keys: "title" and "description". Do not add any other text.
Example format:
{ "title": "A Creative Title Here", "description": "A short, engaging description." }
`;