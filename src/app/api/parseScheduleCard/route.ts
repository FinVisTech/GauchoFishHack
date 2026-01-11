import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { image } = await req.json();
    if (!image) {
      return NextResponse.json({ error: 'Image is required' }, { status: 400 });
    }

    const base64Data = image.split(',')[1];
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
Extract only the following fields from this cropped class card image. Return JSON only, no prose.
{
  "course_code": string|null,      // e.g. "PSTAT 127"
  "location_text": string|null,    // raw location line, e.g. "PHELP 1517"
  "start_time": string|null,       // e.g. "03:00 PM"
  "end_time": string|null,         // e.g. "03:50 PM"
  "raw_text": string               // full extracted text
}
Do not include any extra keys. If unreadable, set that field to null.
`;

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
    const text = response.text();
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    let data;
    try {
      data = JSON.parse(cleanJson);
    } catch (e) {
      console.error("Failed to parse JSON from card:", cleanJson);
      throw new Error("Invalid JSON from card OCR");
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Card OCR Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to parse card' }, { status: 500 });
  }
}
