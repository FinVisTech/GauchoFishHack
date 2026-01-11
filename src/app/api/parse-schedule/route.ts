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
    Extract the class schedule from this image. Return a JSON array where each object has:
    - 'course' (e.g. 'CMPSC 16')
    - 'location' (e.g. 'PHELP 3526')
    - 'building' (the building abbreviation or name from the location)
    - 'room' (the room number)
    - 'days' (e.g. 'MW', 'TR', 'F' - standard university codes)
    - 'startTime' (e.g. '14:00' - 24h format)
    - 'endTime' (e.g. '15:15' - 24h format)
    
    Ignore online classes or locations that are not physical rooms. 
    Output ONLY valid JSON in the format: { "classes": [...] }
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
    
    let data;
    try {
        data = JSON.parse(cleanJson);
    } catch (e) {
        console.error("Failed to parse Gemini JSON:", cleanJson);
        throw new Error("Invalid JSON from AI");
    }

    // Enrich with building data
    const enrichedClasses = (data.classes || []).map((cls: any) => {
        // Attempt to split location if building field is weak
        let abbr = cls.building;
        let room = "";
        
        if (cls.location) {
            const parts = cls.location.split(' ');
            if (parts.length >= 2) {
                if (!abbr) abbr = parts[0];
                room = parts.slice(1).join(' ');
            }
        }

        const resolved = resolveBuilding(abbr);
        return {
            ...cls,
            buildingDetails: resolved || null,
            room: room || cls.room
        };
    });

    return NextResponse.json({ classes: enrichedClasses });
  } catch (error: any) {
    console.error('AI Error:', error);
    // Return the actual error message for debugging
    return NextResponse.json({ error: error.message || 'Failed to process schedule' }, { status: 500 });
  }
}
