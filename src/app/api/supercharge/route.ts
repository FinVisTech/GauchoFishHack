import { NextResponse } from 'next/server';
import OpenAI from 'openai';

import { getSystemPrompt } from './prompt';

// OpenAI initialized lazily inside handler


export const maxDuration = 60; // Allow longer timeout for "High Thinking"

export async function POST(req: Request) {
    try {
        const { image, action } = await req.json();

        if (!image) {
            return NextResponse.json({ error: 'No image provided' }, { status: 400 });
        }

        // Initialize OpenAI lazily to avoid top-level errors
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY || 'dummy', // Prevent throw on init if missing
        });

        const systemPrompt = getSystemPrompt(action);

        let result;

        try {
            // Check if key is arguably valid before trying? 
            // Actually, just try and catch.
            if (!process.env.OPENAI_API_KEY) throw new Error("Missing API Key");

            const response = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: systemPrompt },
                    {
                        role: "user",
                        content: [
                            { type: "text", text: "Here is my schedule. Optimize it." },
                            { type: "image_url", image_url: { "url": image } },
                        ],
                    },
                ],
                max_tokens: 500,
            });

            result = response.choices[0].message.content;

        } catch (error: any) {
            console.warn("OpenAI API Failed (falling back to mock):", error.message);

            // Fallback Mock Response
            await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate delay
            result = `[MOCK RESPONSE - API CALL FAILED: ${error.message}]\n\n` +
                `Since the AI couldn't be reached, here is a simulation based on your strategy "${action}":\n\n` +
                `1. **Strategic Gap Analysis**: Based on standard layouts, your Tuesday mornings look free. Use this for deep work.\n` +
                `2. **Route Optimization**: Ensure you leave 10 minutes early for the trek to Phelps Hall.\n` +
                `3. **Immediate Action**: Log into GOLD and verify these times matches your finals schedule.`;
        }

        return NextResponse.json({ result });

    } catch (error: any) {
        console.error("Supercharge API Critical Error:", error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
