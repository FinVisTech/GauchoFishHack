import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { resolveBuilding } from '@/lib/data';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { image } = await req.json();

    if (!image) {
      return NextResponse.json({ error: 'Image is required' }, { status: 400 });
    }

    // Prepare image for Gemini (remove base64 header)
    const base64Data = image.split(',')[1];
    
    // List of models to try in order of preference (efficiency/cost)
    // We try multiple because some API keys have different access/quotas
    const modelsToTry = [
        "gemini-2.0-flash",              // Standard 2.0 (Most reliable current)
        "gemini-2.0-flash-lite-preview-02-05", // Lite version
    ];

    const prompt = `
    You are extracting EVERY in-person class meeting visible in the screenshot (list view or weekly grid). Treat each meeting block as one entry, even if the course repeats on different days/times/rooms.

    For each meeting, return:
      - course (e.g., "ECON 100B")
      - building (building name or abbreviation exactly as shown, e.g., "Broida Hall" or "PHELP")
      - room (room number/text exactly as shown, e.g., "1610")
      - location (combined string if present, e.g., "Broida Hall, 1610")
      - days (if shown, e.g., "TR", "MW", "F")
      - startTime (24h, e.g., "15:30")
      - endTime (24h, e.g., "16:45")

    Rules:
    - Include all in-person classes; do NOT deduplicate.
    - If location line is like "Broida Hall, 1610", set building="Broida Hall", room="1610".
    - If abbreviation + room like "PHELP 3526", set building="PHELP", room="3526".
    - If any field is missing, set it to null.
    - Ignore online/remote/TBA/no-location items.
    - Output ONLY valid JSON exactly as: { "classes": [ ... ] } with no extra text.
    `;

    let lastError;
    let text = "";

    // Try models sequentially
    for (const modelName of modelsToTry) {
        try {
            console.log(`Trying model: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });
            
            const result = await model.generateContent([
                prompt,
                {
                    inlineData: {
                        data: base64Data,
                        mimeType: "image/png"
                    }
                }
            ]);

            const response = await result.response;
            text = response.text();
            
            // If we got here, success!
            console.log(`Success with model: ${modelName}`);
            break; 
        } catch (e: any) {
            console.log(`Failed with model ${modelName}: ${e.message}`);
            lastError = e;
            // Continue to next model
        }
    }

    if (!text) {
        throw lastError || new Error("All AI models failed to respond");
    }
    
    // Clean up markdown code blocks if Gemini includes them
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    console.log("[api/parse-schedule] Raw LLM text:", text);
    console.log("[api/parse-schedule] Cleaned JSON string:", cleanJson);
    
    let data;
    try {
        data = JSON.parse(cleanJson);
        console.log("[api/parse-schedule] Parsed JSON object:", data);
    } catch (e) {
        console.error("Failed to parse Gemini JSON:", cleanJson);
        throw new Error("Invalid JSON from AI");
    }

    // Enrich with building data
    const enrichedClasses = (data.classes || []).map((cls: any) => {
        // Try to parse building/room from location if missing
        let building = cls.building;
        let room = cls.room || "";

        if ((!building || !room) && cls.location) {
            // Handle formats like "Broida Hall, 1610" or "PHELP 3526"
            const loc = cls.location.replace(',', ' ');
            const parts = loc.split(/\s+/).filter(Boolean);
            if (parts.length >= 2) {
                // assume last token is room
                const maybeRoom = parts[parts.length - 1];
                const maybeBuilding = parts.slice(0, parts.length - 1).join(' ');
                if (!building) building = maybeBuilding;
                if (!room) room = maybeRoom;
            }
        }

        const resolved = building ? resolveBuilding(building) : null;
        return {
            ...cls,
            building,
            room: room || null,
            buildingDetails: resolved || null,
        };
    });

    return NextResponse.json({ classes: enrichedClasses });
  } catch (error: any) {
    console.error('AI Error:', error);
    // Return the actual error message for debugging
    return NextResponse.json({ error: error.message || 'Failed to process schedule' }, { status: 500 });
  }
}
