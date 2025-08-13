// /lib/aiDataParser.ts
function cleanValue(value: string): string {
  return value
    .replace(/---/g, '') // remove separators
    .trim()
    .replace(/^["']+|["']+$/g, ''); // remove leading/trailing quotes
}

function extractValueBetween(text: string, startKey: string, allKnownKeys: string[]): string {
  try {
    const startIndex = text.indexOf(startKey);
    if (startIndex === -1) return '';
    let endIndex = text.length;
    for (const key of allKnownKeys) {
      if (key !== startKey) {
        const potentialEndIndex = text.indexOf(key, startIndex + startKey.length);
        if (potentialEndIndex !== -1) {
          endIndex = Math.min(endIndex, potentialEndIndex);
        }
      }
    }
    const rawValue = text.substring(startIndex + startKey.length, endIndex);
    return cleanValue(rawValue);
  } catch {
    return '';
  }
}

export function parseAiResponse(aiText: string): any {
  const metadata: any = {};
  const allKeys = ["TITLE:", "DESCRIPTION:", "ALT_TEXT:", "KEYWORDS:", "BOARD:"];

  metadata.title = extractValueBetween(aiText, "TITLE:", allKeys);
  metadata.description = extractValueBetween(aiText, "DESCRIPTION:", allKeys);
  metadata.alt_text = extractValueBetween(aiText, "ALT_TEXT:", allKeys);
  const keywordsRaw = extractValueBetween(aiText, "KEYWORDS:", allKeys);
  metadata.pinterest_board = extractValueBetween(aiText, "BOARD:", allKeys);

  const keywords = keywordsRaw
    ? keywordsRaw.split(',').map(k => cleanValue(k)).filter(k => k)
    : [];
  metadata.keywords = keywords;
  metadata.hashtags = keywords.map((k: string) => `#${k.replace(/\s+/g, '').toLowerCase()}`);

  if (!metadata.title) metadata.title = "AI Analysis Failed";
  if (!metadata.description) metadata.description = "Could not generate description.";
  if (!metadata.alt_text) metadata.alt_text = metadata.title;

  return metadata;
}
