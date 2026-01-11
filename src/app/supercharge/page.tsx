'use client';

import { useState, useRef } from 'react';
import ThreeDButton from '@/components/ui/ThreeDButton';
import { Upload, Sparkles, Zap, BookOpen, Coffee, ArrowLeft, Bot, Loader2, Settings } from 'lucide-react';
import Link from 'next/link';

export default function SuperchargePage() {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [step, setStep] = useState<'upload' | 'action' | 'processing' | 'result'>('upload');
    const [result, setResult] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (selected) {
            setFile(selected);
            const reader = new FileReader();
            reader.onload = () => {
                setPreview(reader.result as string);
                setStep('action');
            };
            reader.readAsDataURL(selected);
        }
    };

    const handleAction = async (action: string) => {
        if (!preview) return;
        setStep('processing');

        try {
            const res = await fetch('/api/supercharge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: preview, action })
            });

            if (!res.ok) throw new Error('Failed to process');
            const data = await res.json();
            setResult(data.result);
            setStep('result');
        } catch (error) {
            console.error(error);
            alert('Something went wrong. Please try again.');
            setStep('action');
        }
    };

    return (
        <main className="min-h-screen bg-white text-slate-900 selection:bg-indigo-500 selection:text-white">
            <div className="max-w-4xl mx-auto px-6 py-12">
                {/* Header */}
                <div className="mb-12">
                    <div className="flex items-center justify-between mb-6">
                        <Link href="/" className="inline-flex items-center text-slate-500 hover:text-slate-900 transition-colors group">
                            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                            Back to Map
                        </Link>
                        <button className="text-slate-500 hover:text-slate-900 transition-colors">
                            <Settings className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="text-center">
                        <h1 className="text-4xl md:text-6xl font-black mb-4 bg-clip-text text-transparent bg-gradient-to-r from-[#FFC82E] via-[#FFD700] to-[#FFC82E] animate-gradient-x">
                            Supercharge Your Schedule
                        </h1>
                        <p className="text-xl text-slate-500 max-w-2xl mx-auto">
                            Powered by <span className="text-slate-900 font-semibold">OpenAI 5.2 (High Thinking)</span>.
                            Upload your schedule to get personalized optimization insights that act as a cheat code for your quarter.
                        </p>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl relative overflow-hidden">
                    {/* Background Gradients - Adjusted for light mode visibility */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

                    {step === 'upload' && (
                        <div className="flex flex-col items-center justify-center py-12 text-center relative z-10">
                            <h2 className="text-2xl font-bold mb-3">Upload your Schedule</h2>
                            <p className="text-slate-500 mb-8 max-w-md">
                                Take a screenshot of your weekly schedule (Gold or any calendar) and drop it here.
                            </p>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileChange}
                            />
                            <ThreeDButton
                                onClick={() => fileInputRef.current?.click()}
                                variant="accent"
                                className="text-lg px-8"
                            >
                                <span className="flex items-center gap-2">
                                    <Sparkles className="w-5 h-5" />
                                    Select Image
                                </span>
                            </ThreeDButton>
                        </div>
                    )}

                    {step === 'action' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 py-8">
                            <div className="flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-8">
                                <div>
                                    <h2 className="text-3xl font-black mb-4">Choose your Strategy</h2>
                                    <p className="text-slate-500 text-lg">
                                        How should we optimize your quarter?
                                    </p>
                                </div>

                                <div className="grid md:grid-cols-2 gap-6 w-full">
                                    <button
                                        onClick={() => handleAction('activities_outside')}
                                        className="group relative flex flex-col items-center p-8 rounded-3xl bg-white border-2 border-slate-100 hover:border-purple-500 hover:bg-purple-50/30 transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-1"
                                    >
                                        <div className="p-4 rounded-2xl bg-purple-100 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors mb-6">
                                            <Sparkles className="w-8 h-8" />
                                        </div>
                                        <h3 className="font-bold text-xl text-slate-900 mb-2">Social & Extracurriculars</h3>
                                        <p className="text-slate-500 text-sm">Optimize for clubs, events, and maximizing free time.</p>

                                        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 rounded-b-3xl" />
                                    </button>

                                    <button
                                        onClick={() => handleAction('focus_academic')}
                                        className="group relative flex flex-col items-center p-8 rounded-3xl bg-white border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50/30 transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-1"
                                    >
                                        <div className="p-4 rounded-2xl bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors mb-6">
                                            <BookOpen className="w-8 h-8" />
                                        </div>
                                        <h3 className="font-bold text-xl text-slate-900 mb-2">Academic Focus</h3>
                                        <p className="text-slate-500 text-sm">Optimize for GPA, study blocks, and deep work.</p>

                                        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-indigo-500 to-cyan-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 rounded-b-3xl" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 'processing' && (
                        <div className="py-20 flex flex-col items-center justify-center text-center animate-in fade-in duration-500">
                            <div className="relative mb-8">
                                <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full animate-pulse" />
                                <Bot className="w-16 h-16 text-indigo-600 relative z-10" />
                            </div>
                            <h2 className="text-2xl font-bold mb-2">Analyzing with High Thinking Model...</h2>
                            <p className="text-slate-500 max-w-sm mx-auto">
                                The AI is cross-referencing your schedule with productivity data and campus geography.
                            </p>
                            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mt-8" />
                        </div>
                    )}

                    {step === 'result' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 rounded-lg bg-indigo-100 text-indigo-600">
                                    <Bot className="w-8 h-8" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold">Your Supercharged Plan</h2>
                                    <p className="text-slate-500 text-sm">Actionable insights generated just for you</p>
                                </div>
                            </div>

                            <div className="prose prose-slate max-w-none bg-slate-50 p-6 rounded-2xl border border-slate-200 leading-relaxed whitespace-pre-wrap">
                                {result}
                            </div>

                            <div className="mt-8 flex gap-4">
                                <ThreeDButton
                                    onClick={() => {
                                        setStep('upload');
                                        setFile(null);
                                        setPreview(null);
                                        setResult('');
                                    }}
                                    variant="secondary"
                                >
                                    Start Over
                                </ThreeDButton>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
