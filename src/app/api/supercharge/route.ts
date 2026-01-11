import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export const maxDuration = 60; // Allow longer timeout for "High Thinking"

export async function POST(req: Request) {
    try {
        const { image, action } = await req.json();

        if (!image) {
            return NextResponse.json({ error: 'No image provided' }, { status: 400 });
        }

        if (!process.env.OPENAI_API_KEY) {
            // Mock response if no key is present (common during dev)
            await new Promise(resolve => setTimeout(resolve, 2000));
            return NextResponse.json({
                result: `[MOCK RESPONSE - NO API KEY FOUND]\n\nBased on your schedule and the selection of "${action}", here is your supercharged plan:\n\n1. **Morning Focus**: You have a gap on Tuesday mornings. Use this for deep work.\n2. **Location Optimization**: Your walk from Girvetz to Phelps is efficient. Grab coffee at the Arbor.\n3. **Strategy**: Since you chose "${action}", prioritize reviewing lecture notes immediately after class on Wednesdays.`
            });
        }

        const systemPrompt = `You are a High-Reasoning Academic Optimization AI (Model 5.2). 
Your goal is to analyze university student schedules and provide highly actionable, specific, and "supercharged" advice based on their selected strategy.

STRATEGY SELECTED BY USER: "${action}"

STRATEGY DEFINITIONS:
- "academic_weapon": Focus on maximizing GPA. Suggest intense study blocks, prime library hours, and efficient routing for punctuality.
- "balanced_lifestyle": Focus on mental health and sustainability. Suggest breaks, best times for meals/gym, and avoiding burnout.
- "social_butterfly": Focus on maximizing free time and social opportunities. Suggest when to hang out, where to meet people between classes, and clustering work to free up evenings.

INSTRUCTIONS:
1. Analyze the uploaded schedule image (time gaps, building locations, course load).
2. Synthesize this with the selected STRATEGY.
3. Provide a response that is authoritative, slightly futuristic/premium in tone, and extremely practical.
4. Keep it successful but brief (approx 150-200 words).
5. Format with Bold Headers for key points.
6. Address the user directly.

Example tone: "Optimal trajectory calculated. Your Tuesday gap is a critical leverage point..."
`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o", // Using the flagship model to represent "5.2"
            messages: [
                {
                    role: "system",
                    content: systemPrompt,
                },
                {
                    role: "user",
                    content: [
                        { type: "text", text: "Here is my schedule. Optimize it." },
                        {
                            type: "image_url",
                            image_url: {
                                "url": image, // Expecting base64 data URI
                            },
                        },
                    ],
                },
            ],
            max_tokens: 500,
        });

        const result = response.choices[0].message.content;

        return NextResponse.json({ result });

    } catch (error: any) {
        console.error("Supercharge API Error:", error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
