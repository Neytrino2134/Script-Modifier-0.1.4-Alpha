
import { GenerateContentResponse, Type, Modality } from "@google/genai";
import { getAiClient, withRetry, cleanJsonString } from "./client";

export const generateSpeech = async (text: string, voice: string, intonation?: string, multiSpeaker?: any) => {
    const ai = getAiClient();
    
    let speechConfig;

    // Check if multi-speaker configuration is active and valid
    if (multiSpeaker && multiSpeaker.speakers && multiSpeaker.speakers.length === 2) {
        speechConfig = {
            multiSpeakerVoiceConfig: {
                speakerVoiceConfigs: [
                    { 
                        speaker: multiSpeaker.speakers[0].name, 
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: multiSpeaker.speakers[0].voice } } 
                    },
                    { 
                        speaker: multiSpeaker.speakers[1].name, 
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: multiSpeaker.speakers[1].voice } } 
                    }
                ]
            }
        };
    } else {
        // Fallback to single speaker
        speechConfig = {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } }
        };
    }

    const config: any = {
        responseModalities: [Modality.AUDIO],
        speechConfig: speechConfig
    };

    // If it's a single speaker and NOT multi-speaker config, we might want to add system instructions for intonation
    // However, for TTS models, systemInstruction is often less effective than SSML or implicit text cues.
    // The Gemini 2.5 TTS model handles intonation primarily through text context.

    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: {
            parts: [{ text: text }]
        },
        config
    }));
    
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || '';
};

export const generateNarratorText = async (prompt: string, role: string, languages: any, ssml: boolean) => {
    const ai = getAiClient();
    const promptText = `Generate narrator text for: ${prompt}. Role: ${role}. Languages: ${JSON.stringify(languages)}. Use SSML: ${ssml}. Return JSON with keys matching language codes (ru, en).`;
    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: promptText,
        config: { responseMimeType: 'application/json' }
    }));
    return JSON.parse(cleanJsonString(response.text || '{}'));
};

export const transcribeAudio = async (audioBase64: string, mimeType: string, model: string = 'gemini-2.5-flash') => {
    const ai = getAiClient();
    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
        model: model, // Use passed model
        contents: {
            parts: [
                { inlineData: { mimeType, data: audioBase64 } },
                { text: "Transcribe this audio. Return a JSON array of segments. Each segment must have: startTime (format HH:MM:SS,mmm), endTime (format HH:MM:SS,mmm), and text." }
            ]
        },
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        startTime: { type: Type.STRING },
                        endTime: { type: Type.STRING },
                        text: { type: Type.STRING }
                    },
                    required: ["startTime", "endTime", "text"]
                }
            }
        }
    }));
    // Return the JSON array directly (as a string to be parsed by the node)
    return cleanJsonString(response.text || '[]');
};
