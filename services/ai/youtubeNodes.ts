
import { GenerateContentResponse, Type } from "@google/genai";
import { getAiClient, withRetry, cleanJsonString } from "./client";
import { getLanguageName } from "../../utils/languageUtils";
import { YOUTUBE_GENERATOR_INSTRUCTIONS } from "../../utils/prompts/youtubeGenerator";

export const analyzeYouTubeStats = async (analyticsData: any, language: string = 'ru'): Promise<{ advice: string, suggestedGoal?: string }> => {
    const ai = getAiClient();
    
    const languageName = getLanguageName(language);
    const userContext = analyticsData.contextPrompt ? `\n**User Context / Specific Question:**\n"${analyticsData.contextPrompt}"\n` : '';

    const prompt = `
        You are an expert YouTube Growth Strategist and Data Analyst. 
        You have been provided with data for a YouTube channel.
        **Current Date/Time:** ${analyticsData.currentDate || 'Unknown'}
        ${userContext}
        
        **Channel Context:**
        - **Current Goal:** ${analyticsData.goal || 'Not specified'}
        - **Current Subscribers:** ${analyticsData.currentSubscribers || 'Unknown'}
        - **Monetization Status:** ${analyticsData.isMonetized ? 'Monetized' : 'Not Monetized'}
        
        **Your Task:**
        Analyze the provided data and the user's goal (and answer their specific question if provided). Provide actionable advice to improve channel performance and reach the goal.
        
        1.  **Goal Analysis:** Is the current goal realistic given the stats? Is it the right next step? 
            - If the goal is "Not specified" or seems inappropriate for the channel's current size, suggest a better, immediate milestone.
            - If you suggest a new goal, provide it in the "suggestedGoal" field.
        2.  **Consistency:** Are videos being uploaded regularly? Consider the current date.
        3.  **Trends:** Are subscribers and views increasing, decreasing, or stagnant? Pay attention to Shorts vs Long form performance if distinct.
        4.  **Content Strategy:** Based on the Channel Description and titles of uploaded videos (if available), suggest improvements.
        5.  **Action Plan:** Provide a bulleted list of specific actions.

        **Input Data:**
        ${JSON.stringify(analyticsData.channels, null, 2)}

        **Output Format:**
        Return a JSON object.
        - "advice": The main analysis and advice text in Markdown format. Use headings.
        - "suggestedGoal": (Optional) A short string (max 5 words) if you recommend changing the specific goal target (e.g., "Reach 1,000 Subscribers"). Leave empty if the current goal is fine.
        
        IMPORTANT: The "advice" content MUST be written in ${languageName}.
    `;

    const schema = {
        type: Type.OBJECT,
        properties: {
            advice: { type: Type.STRING },
            suggestedGoal: { type: Type.STRING, nullable: true }
        },
        required: ['advice']
    };

    try {
        const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: schema
            }
        }));
        
        return JSON.parse(cleanJsonString(response.text || '{}'));
    } catch (error) {
        console.error("Error analyzing YouTube stats:", error);
        throw error;
    }
};

export const generateYouTubeTitles = async (
    idea: string, 
    languages: any, 
    options?: { includeHashtags?: boolean, generateThumbnail?: boolean }
) => {
    const ai = getAiClient();
    const instructions = [];

    instructions.push(YOUTUBE_GENERATOR_INSTRUCTIONS.ROLE.text);
    instructions.push(YOUTUBE_GENERATOR_INSTRUCTIONS.TITLE_MODE_RULES.text);
    
    // Add new instructions if flags are present
    if (options?.includeHashtags !== false) { // Default true
        instructions.push(YOUTUBE_GENERATOR_INSTRUCTIONS.HASHTAGS.text);
    }
    
    if (options?.generateThumbnail) {
        instructions.push(YOUTUBE_GENERATOR_INSTRUCTIONS.THUMBNAIL.text);
    }

    instructions.push(`${YOUTUBE_GENERATOR_INSTRUCTIONS.INPUT_CONTEXT.text}: "${idea}"`);
    instructions.push(`Target Languages: ${JSON.stringify(languages)}`);
    instructions.push(YOUTUBE_GENERATOR_INSTRUCTIONS.FORMAT.text);

    const prompt = instructions.join('\n\n');

    // Dynamic schema based on options
    const properties: any = {
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        tags: { type: Type.STRING },
    };

    if (options?.generateThumbnail) {
        properties.thumbnailPrompt = { type: Type.STRING };
    }

    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { 
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                // The API will return a map where keys are language codes
                // Since the keys are dynamic (ru, en, etc.), we usually just ask for JSON and parse it
                // But if we want to enforce schema for internal objects, we'd need a map type which isn't fully supported in schema gen yet for dynamic keys
                // So we rely on the prompt "Return a JSON object where keys are language codes" and parse the raw JSON.
                // However, providing a schema for the *values* helps.
                // Since we can't easily define dynamic keys in standard schema config here without knowing languages beforehand,
                // we will stick to text parsing or a generic object schema if supported.
                // For now, let's omit responseSchema to allow dynamic keys (languages) at the root level, 
                // OR we can try to define known languages if provided.
                
                // Let's stick to prompt-based JSON enforcement as the keys are dynamic.
            }
        }
    }));
    return JSON.parse(cleanJsonString(response.text || '{}'));
};

export const generateYouTubeChannelInfo = async (idea: string, languages: any) => {
    const ai = getAiClient();
    const instructions = [];

    instructions.push(YOUTUBE_GENERATOR_INSTRUCTIONS.ROLE.text);
    instructions.push(YOUTUBE_GENERATOR_INSTRUCTIONS.CHANNEL_MODE_RULES.text);
    instructions.push(`${YOUTUBE_GENERATOR_INSTRUCTIONS.INPUT_CONTEXT.text}: "${idea}"`);
    instructions.push(`Target Languages: ${JSON.stringify(languages)}`);
    instructions.push(YOUTUBE_GENERATOR_INSTRUCTIONS.FORMAT.text);

    const prompt = instructions.join('\n\n');

    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
    }));
    return JSON.parse(cleanJsonString(response.text || '{}'));
};
