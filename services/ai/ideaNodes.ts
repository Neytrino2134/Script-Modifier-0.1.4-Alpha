
import { GenerateContentResponse, Type } from "@google/genai";
import { getAiClient, withRetry, cleanJsonString } from "./client";
import { getLanguageName } from "../../utils/languageUtils";
import { MUSIC_GENERATOR_INSTRUCTIONS } from "../../utils/prompts/musicGenerator";

export const generateIdeaCategories = async (targetLanguage: string, format: string, theme: string): Promise<{ action: string[], place: string[], obstacle: string[] }> => {
    const ai = getAiClient();
    const languageName = getLanguageName(targetLanguage);
    const themeInstruction = theme && theme.trim() !== ''
        ? `The ideas should be related to the following theme: "${theme}".`
        : '';
        
    const prompt = `
        You are a creative assistant for story writing.
        Generate a list of 10 random and interesting ideas for each of the following three categories, tailored for a "${format}" story format.
        ${themeInstruction}
        The categories are:
        1. Action (a key verb or event, e.g., "find a hidden map", "escape from a maze")
        2. Place (a setting, e.g., "an abandoned space station", "a magical forest")
        3. Obstacle (a challenge or antagonist, e.g., "a mischievous dragon", "a forgotten curse")

        All ideas must be in ${languageName}.
        Return the output as a single JSON object with keys "action", "place", and "obstacle", where each key has an array of 10 strings.
    `;
    
    const schema = {
        type: Type.OBJECT,
        properties: {
            action: { type: Type.ARRAY, items: { type: Type.STRING } },
            place: { type: Type.ARRAY, items: { type: Type.STRING } },
            obstacle: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['action', 'place', 'obstacle']
    };

    try {
        const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json', responseSchema: schema }
        }));
        
        const responseText = response.text;
        if (!responseText) throw new Error("Received empty response from model.");
        return JSON.parse(cleanJsonString(responseText));
    } catch (error) {
        console.error("Error generating idea categories:", error);
        throw error;
    }
};

export const combineStoryIdea = async (action: string, place: string, obstacle: string, targetLanguage: string): Promise<string> => {
    const ai = getAiClient();
    const languageName = getLanguageName(targetLanguage);
    const prompt = `
        Combine the following three elements into a short, one-paragraph story idea.
        The story idea should be written in ${languageName}.

        - Action: ${action}
        - Place: ${place}
        - Obstacle: ${obstacle}

        Return only the story idea paragraph.
    `;
    try {
        const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        }));
        return (response.text ?? '').trim();
    } catch (error) {
        console.error("Error combining story idea:", error);
        throw error;
    }
};

export const generateMusicIdeas = async (idea: string, languages: any, lyrics: boolean, verseCount: number = 2, model: string = 'gemini-3-flash-preview') => {
    const ai = getAiClient();
    const instructions = [];

    instructions.push(MUSIC_GENERATOR_INSTRUCTIONS.ROLE.text);
    instructions.push(`${MUSIC_GENERATOR_INSTRUCTIONS.INPUT_CONTEXT.text}: "${idea}"`);
    
    // Explicitly list target languages for the model
    const selectedLangs = Object.keys(languages).filter(k => languages[k]);
    instructions.push(`Target Languages: ${JSON.stringify(selectedLangs)}`);
    
    instructions.push(MUSIC_GENERATOR_INSTRUCTIONS.CREATIVE_RULE.text);
    instructions.push(MUSIC_GENERATOR_INSTRUCTIONS.MUSIC_PROMPT_RULE.text);

    if (lyrics) {
        instructions.push(MUSIC_GENERATOR_INSTRUCTIONS.LYRICS_RULE.text);
        if (verseCount && verseCount > 0) {
             instructions.push(MUSIC_GENERATOR_INSTRUCTIONS.VERSE_COUNT_RULE.text.replace('{N}', verseCount.toString()));
        }
    } else {
        instructions.push("Do NOT generate lyrics.");
    }

    // Override format instruction for schema compatibility
    instructions.push("Return a JSON object containing an 'outputs' array. Each item in the array must correspond to one of the target languages and contain: 'language', 'song_title', 'music_prompt', and optional 'lyrics'.");

    const prompt = instructions.join('\n\n');

    const schema = {
        type: Type.OBJECT,
        properties: {
            outputs: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        language: { type: Type.STRING },
                        song_title: { type: Type.STRING },
                        music_prompt: { type: Type.STRING },
                        lyrics: { type: Type.STRING, nullable: true }
                    },
                    required: ["language", "song_title", "music_prompt"]
                }
            }
        },
        required: ["outputs"]
    };

    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
        model: model,
        contents: prompt,
        config: { 
            responseMimeType: 'application/json',
            responseSchema: schema
        }
    }));
    
    const json = JSON.parse(cleanJsonString(response.text || '{}'));
    
    // Transform array back to map object expected by consumers
    const result: Record<string, any> = {};
    if (json.outputs && Array.isArray(json.outputs)) {
        json.outputs.forEach((item: any) => {
            if (item.language) {
                result[item.language] = item;
            }
        });
    }

    return result;
};
