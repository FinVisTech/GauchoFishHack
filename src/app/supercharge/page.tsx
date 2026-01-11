'use client';

import { useState, useRef } from 'react';
import ThreeDButton from '@/components/ui/ThreeDButton';
import { Upload, Sparkles, Zap, BookOpen, Coffee, ArrowLeft, Bot, Loader2 } from 'lucide-react';
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
        <main className="min-h-screen bg-slate-950 text-white selection:bg-indigo-500 selection:text-white">
            <div className="max-w-4xl mx-auto px-6 py-12">
                {/* Header */}
                <div className="mb-12">
                    <Link href="/" className="inline-flex items-center text-slate-400 hover:text-white transition-colors mb-6 group">
                        <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                        Back to Map
                    </Link>
                    <h1 className="text-4xl md:text-6xl font-black mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 animate-gradient-x">
                        Supercharge Your Schedule
                    </h1>
                    <p className="text-xl text-slate-400 max-w-2xl">
                        Powered by <span className="text-white font-semibold">OpenAI 5.2 (High Thinking)</span>.
                        Upload your schedule to get personalized optimization insights that act as a cheat code for your quarter.
                    </p>
                </div>

                {/* Main Content Area */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 backdrop-blur-sm relative overflow-hidden">
                    {/* Background Gradients */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

                    {step === 'upload' && (
                        <div className="flex flex-col items-center justify-center py-12 text-center relative z-10">
                            <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-6 ring-4 ring-slate-800/50">
                                <Upload className="w-10 h-10 text-indigo-400" />
                            </div>
                            <h2 className="text-2xl font-bold mb-3">Upload your Schedule</h2>
                            <p className="text-slate-400 mb-8 max-w-md">
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
                                glowEffect
                            >
                                <span className="flex items-center gap-2">
                                    <Sparkles className="w-5 h-5" />
                                    Select Image
                                </span>
                            </ThreeDButton>
                        </div>
                    )}

                    {step === 'action' && preview && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex flex-col md:flex-row gap-8 items-start">
                                {/* Preview */}
                                <div className="w-full md:w-1/3 bg-slate-950 p-2 rounded-xl border border-slate-800 rotate-1 shadow-2xl">
                                    <img src={preview} alt="Schedule Preview" className="w-full h-auto rounded-lg opacity-80" />
                                </div>

                                {/* Actions */}
                                <div className="flex-1 space-y-6">
                                    <h2 className="text-2xl font-bold">Choose your Strategy</h2>
                                    <p className="text-slate-400">
                                        How do you want the AI to optimize your life this quarter?
                                    </p>

                                    <div className="grid gap-4">
                                        <button
                                            onClick={() => handleAction('academic_weapon')}
                                            className="group flex items-center gap-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700 hover:bg-indigo-500/10 hover:border-indigo-500/50 transition-all text-left"
                                        >
                                            <div className="p-3 rounded-lg bg-indigo-500/20 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                                                <Zap className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg">Academic Weapon</h3>
                                                <p className="text-slate-400 text-sm">Maximize study output. ruthlessly efficient routines.</p>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => handleAction('balanced_lifestyle')}
                                            className="group flex items-center gap-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700 hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-all text-left"
                                        >
                                            <div className="p-3 rounded-lg bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                                <Coffee className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg">Balanced Lifestyle</h3>
                                                <p className="text-slate-400 text-sm">Optimal mix of work, rest, and social time.</p>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => handleAction('social_butterfly')}
                                            className="group flex items-center gap-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700 hover:bg-purple-500/10 hover:border-purple-500/50 transition-all text-left"
                                        >
                                            <div className="p-3 rounded-lg bg-purple-500/20 text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                                                <Sparkles className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg">Social Butterfly</h3>
                                                <p className="text-slate-400 text-sm">Maximize free time and events without failing.</p>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 'processing' && (
                        <div className="py-20 flex flex-col items-center justify-center text-center animate-in fade-in duration-500">
                            <div className="relative mb-8">
                                <div className="absolute inset-0 bg-indigo-500/30 blur-xl rounded-full animate-pulse" />
                                <Bot className="w-16 h-16 text-white relative z-10" />
                            </div>
                            <h2 className="text-2xl font-bold mb-2">Analyzing with High Thinking Model...</h2>
                            <p className="text-slate-400 max-w-sm mx-auto">
                                The AI is cross-referencing your schedule with productivity data and campus geography.
                            </p>
                            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mt-8" />
                        </div>
                    )}

                    {step === 'result' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 rounded-lg bg-indigo-500/20 text-indigo-400">
                                    <Bot className="w-8 h-8" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold">Your Supercharged Plan</h2>
                                    <p className="text-slate-400 text-sm">Actionable insights generated just for you</p>
                                </div>
                            </div>

                            <div className="prose prose-invert prose-indigo max-w-none bg-slate-950/50 p-6 rounded-2xl border border-slate-800 leading-relaxed whitespace-pre-wrap">
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
