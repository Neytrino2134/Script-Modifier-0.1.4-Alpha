
import { GenerateContentResponse, Type } from "@google/genai";
import { getAiClient, withRetry, cleanJsonString, safeJsonParse } from "./client";
import { PROMPT_MODIFIER_INSTRUCTIONS, LAYERED_CONSTRUCTION_NO_STYLE_TEXT, LAYERED_CONSTRUCTION_NO_CHAR_TEXT } from "../../utils/prompts/promptModifier";
import { SCRIPT_GENERATOR_INSTRUCTIONS, CHAR_GEN_INSTRUCTIONS } from "../../utils/prompts/scriptGenerator";
import { SCRIPT_ANALYZER_INSTRUCTIONS } from "../../utils/prompts/scriptAnalyzer";
import { SAFE_GENERATION_INSTRUCTIONS } from "../../utils/prompts/common";
import { getLanguageName } from "../../utils/languageUtils";

export const generateScriptEntities = async (
    prompt: string,
    targetLanguage: string,
    characterType: string,
    existingCharacters: any[] | undefined,
    advancedOptions: any,
    model: string,
    visualStyle: string,
    customVisualStyle: string,
    createSecondaryChars: boolean,
    createKeyItems: boolean,
    thinkingEnabled: boolean
) => {
    const ai = getAiClient();
    const languageName = getLanguageName(targetLanguage);
    const instructions = [];

    // System Core - Entity Generation Specialist
    instructions.push("You are an expert Character Designer and Prop Master for film production. Your goal is to analyze the story concept and existing cast to generate necessary additional entities (Main Characters, Secondary Characters, and Key Items).");

    // Inputs Data
    instructions.push(`${SCRIPT_GENERATOR_INSTRUCTIONS.INPUTS_DATA.text} "${prompt}"`);

    const hasExistingChars = existingCharacters && existingCharacters.length > 0;

    // Existing Cast context
    if (hasExistingChars) {
        const charList = existingCharacters!.map(c =>
            `- **Name:** ${c.name}\n  **Index:** ${c.index}\n  **Description:** ${c.fullDescription}`
        ).join('\n\n');
        instructions.push(`EXISTING CAST (LOCKED): \n${charList}`);
    } else {
        instructions.push("No existing cast provided.");
    }

    // Rules
    instructions.push(`**OUTPUT LANGUAGE:** Character names can remain in their original language/English, but descriptions must be in ${languageName}.`);

    // Smart Main Character Generation Logic
    if (advancedOptions.generateMainChars) {
        if (hasExistingChars) {
            // Intelligent override: If characters exist, don't blindly generate "Main Characters" again.
            instructions.push("**SMART GENERATION LOGIC:** The Main Character(s) are likely already provided in the 'EXISTING CAST' list above. \n1. **DO NOT** re-generate or duplicate existing characters (e.g., if Entity-1 is the hero, do not create a new hero). \n2. **ONLY** generate a new profile for an existing character if the plot explicitly demands a **visual transformation** (e.g., 'Batman (Armored Suit)'). \n3. Focus primarily on generating **MISSING** entities required by the prompt (Antagonists, Sidekicks) that are not yet in the list.");
        } else {
            // No characters exist, standard generation
            instructions.push(CHAR_GEN_INSTRUCTIONS.MAIN_CHAR_LOGIC.text);
        }
    }

    if (createSecondaryChars) {
        instructions.push(CHAR_GEN_INSTRUCTIONS.SECONDARY_CHARS.text);
    } else {
        instructions.push("Do NOT generate secondary characters unless absolutely necessary for the main plot.");
    }

    if (createKeyItems) {
        instructions.push(CHAR_GEN_INSTRUCTIONS.KEY_ITEMS_LOGIC.text);
    } else {
        instructions.push("Do NOT generate key items.");
    }

    instructions.push(CHAR_GEN_INSTRUCTIONS.NO_DUPLICATES.text);
    instructions.push(CHAR_GEN_INSTRUCTIONS.SMART_CONCEPT.text);

    // Style Context
    if (visualStyle === 'custom' && customVisualStyle) {
        instructions.push(`TARGET VISUAL STYLE: ${customVisualStyle}`);
        instructions.push(CHAR_GEN_INSTRUCTIONS.DETAILED_STYLE.text);
    } else if (visualStyle && visualStyle !== 'none') {
        instructions.push(`TARGET VISUAL STYLE: ${visualStyle}`);
        instructions.push(CHAR_GEN_INSTRUCTIONS.DETAILED_STYLE.text);
    }

    instructions.push("Return JSON object with key: 'detailedCharacters' (array of objects with keys: 'name', 'fullDescription', 'prompt', 'index' (optional - will be assigned automatically if missing)).");

    const fullPrompt = instructions.join('\n\n');

    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
        model: model,
        contents: fullPrompt,
        config: {
            responseMimeType: 'application/json',
            thinkingConfig: thinkingEnabled ? { thinkingBudget: 4000 } : undefined
        }
    }));

    return safeJsonParse(response.text || '{}');
};

export const generateScript = async (
    prompt: string,
    targetLanguage: string,
    characterType: string,
    narratorEnabled: boolean,
    narratorMode: string,
    existingCharacters: any[] | undefined,
    advancedOptions: any,
    model: string,
    visualStyle: string,
    customVisualStyle: string,
    thinkingEnabled: boolean,
    scenelessMode: boolean,
    simpleActions: boolean,
    commercialSafe: boolean,
    smartConceptEnabled: boolean,
    atmosphericEntryEnabled: boolean
) => {
    const ai = getAiClient();
    const languageName = getLanguageName(targetLanguage);
    const instructions = [];

    // System Core
    instructions.push(SCRIPT_GENERATOR_INSTRUCTIONS.CORE.text);

    // Explicit Language Instruction
    instructions.push(`**OUTPUT LANGUAGE:** You MUST write the 'summary', scene 'title', 'description', and 'narratorText' strictly in ${languageName}.`);

    // Inputs Data
    instructions.push(`${SCRIPT_GENERATOR_INSTRUCTIONS.INPUTS_DATA.text} "${prompt}"`);

    // --- CREATIVE EXPANSION RULES ---
    instructions.push(SCRIPT_GENERATOR_INSTRUCTIONS.IMPROVE_CONCEPT.text);
    instructions.push(SCRIPT_GENERATOR_INSTRUCTIONS.ANTI_COMPRESSION.text);

    if (scenelessMode) {
        instructions.push(SCRIPT_GENERATOR_INSTRUCTIONS.SCENELESS_MODE.text);
    } else {
        // Core Narrative Stack
        instructions.push(SCRIPT_GENERATOR_INSTRUCTIONS.ANALYSIS.text);

        if (atmosphericEntryEnabled) {
            instructions.push(SCRIPT_GENERATOR_INSTRUCTIONS.EXPOSITION.text);
        }

        instructions.push(SCRIPT_GENERATOR_INSTRUCTIONS.DELAYED_REVEAL.text);
        instructions.push(SCRIPT_GENERATOR_INSTRUCTIONS.VISUALS_FIRST.text);
        instructions.push(SCRIPT_GENERATOR_INSTRUCTIONS.SEAMLESS_FLOW.text);
        instructions.push(SCRIPT_GENERATOR_INSTRUCTIONS.ATMOSPHERE.text);
        instructions.push(SCRIPT_GENERATOR_INSTRUCTIONS.VISUAL_METAPHOR.text);
        instructions.push(SCRIPT_GENERATOR_INSTRUCTIONS.PACING_RHYTHM.text);
        instructions.push(SCRIPT_GENERATOR_INSTRUCTIONS.SUBTEXT.text);
        instructions.push(SCRIPT_GENERATOR_INSTRUCTIONS.NO_CAMERA_DIRECTIVES.text);
        instructions.push(SCRIPT_GENERATOR_INSTRUCTIONS.OBJECT_AGENCY.text);
    }

    instructions.push(SCRIPT_GENERATOR_INSTRUCTIONS.FRAME_ESTIMATION.text);

    if (advancedOptions.safeGeneration) {
        instructions.push(SAFE_GENERATION_INSTRUCTIONS.text);
    }

    if (commercialSafe) {
        instructions.push(SCRIPT_GENERATOR_INSTRUCTIONS.COMMERCIAL_SAFE.text);
    }

    if (simpleActions) {
        instructions.push(SCRIPT_GENERATOR_INSTRUCTIONS.SIMPLE_ACTIONS.text);
    }

    instructions.push(SCRIPT_GENERATOR_INSTRUCTIONS.STRICT_NAME_PERSISTENCE.text);
    instructions.push(SCRIPT_GENERATOR_INSTRUCTIONS.SCENE_CHARACTERS_LIST.text);

    // --- CHARACTER LOCK (STRICT SEPARATION) ---
    if (existingCharacters && existingCharacters.length > 0) {
        const charList = existingCharacters.map(c =>
            `- **Name:** ${c.name}\n  **Index:** ${c.index}\n  **Description:** ${c.fullDescription}`
        ).join('\n\n');

        instructions.push(`**MANDATORY CAST LIST (DO NOT INVENT NEW ENTITY TAGS):**\n${charList}`);
        instructions.push(CHAR_GEN_INSTRUCTIONS.STRICT_NO_NEW.text);

        // Redundant safety check to prevent hallucination of "Entity-3" for objects
        instructions.push("ABSOLUTE PROHIBITION: Do NOT invent new `Entity-N` tags for objects or props in the scene text. Refer to objects by their names (e.g. 'table', 'sword'), NOT as Entities.");
    } else if (advancedOptions.noCharacters) {
        instructions.push("No specific characters. Focus on events and atmosphere.");
    } else {
        // If no characters provided, and noCharacters is false, we might need a fallback or allow auto-generation
        // BUT per user request, we want to split logic. So we instruct to use generic placeholders or minimal generation if absolutely needed,
        // but prefer the entity stack to handle creation.
        instructions.push("No cast provided. Refer to characters generically (e.g. 'A tall man') or use 'Entity-1' if you must introduce a protagonist, but DO NOT generate a 'detailedCharacters' profile output.");
    }

    // Style Generation Logic
    if (visualStyle === 'custom' && customVisualStyle) {
        instructions.push(`TARGET VISUAL STYLE NAME: ${customVisualStyle}`);
        instructions.push(`In the JSON output field 'generatedStyle', you must NOT simply repeat this name. YOU MUST EXPAND IT into a full, detailed technical prompt.`);
    } else if (visualStyle && visualStyle !== 'none') {
        instructions.push(`TARGET VISUAL STYLE NAME: ${visualStyle}`);
        instructions.push(`In the JSON output field 'generatedStyle', you must NOT simply repeat this name. YOU MUST EXPAND IT into a full, detailed technical prompt.`);
    }
    instructions.push(SCRIPT_GENERATOR_INSTRUCTIONS.VISUAL_DNA.text);

    if (advancedOptions.includeSubscribeScene && !scenelessMode) {
        instructions.push("Include a scene breaking the fourth wall asking to subscribe/like.");
    }

    if (narratorEnabled) {
        instructions.push(`Include Narrator voiceover. Style: ${narratorMode}.`);
    }

    if (advancedOptions.numberOfScenes) {
        instructions.push(`Generate exactly ${advancedOptions.numberOfScenes} scenes.`);
    }

    if (characterType === 'anthro') {
        instructions.push("Characters must be Anthropomorphic animals.");
    }

    if (scenelessMode) {
        instructions.push(SCRIPT_GENERATOR_INSTRUCTIONS.LIVING_WORLD.text);
    }

    instructions.push(`REMINDER: Output Language MUST be ${languageName}.`);
    instructions.push(`REMINDER: Use entity format: "Entity-Index" (e.g. "Entity-1").`);

    // STRICT JSON FORMAT - EXPLICITLY FORBID detailedCharacters to separate logic
    instructions.push("Return JSON with keys: 'summary', 'generatedStyle', 'scenes' (array of objects with 'title', 'description', 'recommendedFrames', 'narratorText', 'characters' (array of strings)). \n\n**IMPORTANT:** DO NOT include a 'detailedCharacters' field in this response. Character generation is handled by a separate process.");

    const fullPrompt = instructions.join('\n\n');

    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
        model: model,
        contents: fullPrompt,
        config: {
            responseMimeType: 'application/json',
            thinkingConfig: thinkingEnabled ? { thinkingBudget: 16000 } : undefined
        }
    }));

    return safeJsonParse(response.text || '{}');
};

export const analyzeScript = async (
    scenes: any[],
    characters: any[],
    summary: string,
    targetLanguage: string,
    options: any,
    model: string
) => {
    const ai = getAiClient();
    const languageName = getLanguageName(targetLanguage);
    const instructions = [];

    instructions.push(SCRIPT_ANALYZER_INSTRUCTIONS.ROLE.text);
    instructions.push(SCRIPT_ANALYZER_INSTRUCTIONS.INPUTS.text);
    instructions.push(SCRIPT_ANALYZER_INSTRUCTIONS.NO_POV.text);

    // Inject Dynamic Frame Constraint Logic
    let frameConstraint = "";
    if (options.minFrames) {
        frameConstraint = `\n**CRITICAL FRAME COUNT ENFORCEMENT:**\nFor EVERY scene, you MUST generate a MINIMUM of ${options.minFrames} frames. This is a HARD CONSTRAINT. You are FORBIDDEN from generating fewer. If the action seems short, you MUST use "slow motion" descriptions and break actions into micro-details (e.g., 'Hand reaching', 'Fingers touching', 'Grip tightening') to satisfy the frame count. DO NOT MERGE ACTIONS.`;
    } else if (options.framesPerScene) {
        // Legacy fallback
        frameConstraint = `\n**FRAME COUNT GOAL:** Target approximately ${options.framesPerScene} frames per scene. Decompose actions to fill this quota.`;
    } else {
        frameConstraint = `\n**FRAME COUNT:** Respect the 'recommendedFrames' provided in the scene input. Try to match it exactly by decomposing actions.`;
    }
    instructions.push(frameConstraint);

    if (options.professionalStoryboard) {
        instructions.push(SCRIPT_ANALYZER_INSTRUCTIONS.STORYBOARD_RULES.text);
        instructions.push(SCRIPT_ANALYZER_INSTRUCTIONS.TECHNICAL_DIRECTIVES.text);
    }

    instructions.push(SCRIPT_ANALYZER_INSTRUCTIONS.MANDATORY_BG.text); // Force specific Set Design instruction
    instructions.push(SCRIPT_ANALYZER_INSTRUCTIONS.BATCH_PROCESSING.text);

    if (options.extendedAnalysis) {
        instructions.push(SCRIPT_ANALYZER_INSTRUCTIONS.EXTENDED_VISUALS.text);
    }

    instructions.push(SCRIPT_ANALYZER_INSTRUCTIONS.ACTION_PHASE_BREAKDOWN.text);
    instructions.push(SCRIPT_ANALYZER_INSTRUCTIONS.USE_ALIASES.text);
    instructions.push(SCRIPT_ANALYZER_INSTRUCTIONS.CHARACTER_ARRAY_INTEGRITY.text); // NEW INSTRUCTION
    instructions.push(SCRIPT_ANALYZER_INSTRUCTIONS.ENTITY_LIMIT.text);

    // STRICT LANGUAGE ENFORCEMENT
    instructions.push(`**TARGET LANGUAGE:** The entire analysis (sceneContext, imagePrompt, environmentPrompt, videoPrompt) MUST be written in **${languageName}**. \n**EXCEPTION:** The Character Tags must remain in English: 'Entity-1', 'Entity-2'. Do not translate the word 'Entity' to ${languageName}.`);

    const sceneText = scenes.map(s => {
        const charList = s.characters ? `Participating Entities: [${s.characters.join(', ')}]` : '';
        return `SCENE ${s.sceneNumber} (Rec Frames: ${s.recommendedFrames}): ${s.title}\n${charList}\n${s.description}\n${s.narratorText || ''}`;
    }).join('\n\n');
    const charText = characters.map(c => `${c.name} (Index: ${c.index || c.alias}): ${c.fullDescription}`).join('\n');

    const prompt = `
        ${instructions.join('\n\n')}
        
        SUMMARY: ${summary}
        
        ENTITIES / CHARACTERS:
        ${charText}
        
        SCENES TO ANALYZE:
        ${sceneText}
        
        Return JSON array of scene objects.
        Each scene object MUST contain:
        1. "sceneNumber": (integer)
        2. "sceneContext": (string in ${languageName}) **VISUAL MANIFEST.** You MUST describe: Location type (In/Out), Furniture (Specific Size/Color/Material/Position), Flooring/Walls, Lighting (Temp/Source/Intensity), and overall Color Palette. This context will be applied to every frame.
        3. "frames": (array of frame objects)
        
        Each frame object has: 'frameNumber', 'imagePrompt' (in ${languageName}), 'environmentPrompt' (in ${languageName}), 'videoPrompt' (in ${languageName}), 'characters' (array of indices e.g. "Entity-1"), 'shotType', 'duration' (integer, seconds, e.g. 2).
    `;

    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
            responseMimeType: 'application/json'
        }
    }));

    return safeJsonParse(response.text || '[]');
};

export const modifyScriptPrompt = async (
    basePrompt: string,
    environmentPrompt: string,
    characterPrompts: string[],
    targetLanguage: string,
    styleOverride: string,
    sceneContext: string = '',
    characterMap: Record<string, string> = {},
    characterAliases: string[] = [],
    activeInstructionIds: string[] = [],
    detailOptions: { charDescMode: 'none' | 'general' | 'full', safeGeneration?: boolean, thinkingEnabled?: boolean } = { charDescMode: 'general' }
): Promise<string | { imagePrompt: string, videoPrompt: string }> => {
    const ai = getAiClient();
    const languageName = getLanguageName(targetLanguage);
    const instructions = [];

    const isSaturationActive = activeInstructionIds.includes(PROMPT_MODIFIER_INSTRUCTIONS.VISUAL_SATURATION.id);

    if (detailOptions.safeGeneration) {
        instructions.push(SAFE_GENERATION_INSTRUCTIONS.text);
    }

    instructions.push(PROMPT_MODIFIER_INSTRUCTIONS.ROLE.text);
    instructions.push(PROMPT_MODIFIER_INSTRUCTIONS.NO_POV.text);
    instructions.push(PROMPT_MODIFIER_INSTRUCTIONS.STATIC_STATE.text);
    instructions.push(PROMPT_MODIFIER_INSTRUCTIONS.ATMOSPHERIC_FIX.text);
    instructions.push(PROMPT_MODIFIER_INSTRUCTIONS.STATELESS.text);
    instructions.push(PROMPT_MODIFIER_INSTRUCTIONS.SUBJECT_FOCUS.text);
    instructions.push(PROMPT_MODIFIER_INSTRUCTIONS.STRICT_CHAR_INDEX.text);
    instructions.push(PROMPT_MODIFIER_INSTRUCTIONS.ALWAYS_ENV.text);

    if (activeInstructionIds.includes(PROMPT_MODIFIER_INSTRUCTIONS.ANTHRO_REINFORCEMENT.id)) {
        instructions.push(PROMPT_MODIFIER_INSTRUCTIONS.ANTHRO_REINFORCEMENT.text);
    }
    if (activeInstructionIds.includes(PROMPT_MODIFIER_INSTRUCTIONS.SUBSCRIBE_REINFORCEMENT.id)) {
        instructions.push(PROMPT_MODIFIER_INSTRUCTIONS.SUBSCRIBE_REINFORCEMENT.text);
    }
    if (activeInstructionIds.includes(PROMPT_MODIFIER_INSTRUCTIONS.IMG_VID_CONSISTENCY.id)) {
        instructions.push(PROMPT_MODIFIER_INSTRUCTIONS.IMG_VID_CONSISTENCY.text);
    }
    if (activeInstructionIds.includes(PROMPT_MODIFIER_INSTRUCTIONS.PROP_ENHANCEMENT.id)) {
        instructions.push(PROMPT_MODIFIER_INSTRUCTIONS.PROP_ENHANCEMENT.text);
    }

    // Character Description Logic
    if (detailOptions.charDescMode === 'general') {
        instructions.push(PROMPT_MODIFIER_INSTRUCTIONS.GENERAL_CHAR_DESC.text);
        instructions.push(`**CHARACTER VISUAL INTEGRATION:** Summarize the visual prompt from the character's profile. Merge details naturally.`);
    } else if (detailOptions.charDescMode === 'full') {
        instructions.push(PROMPT_MODIFIER_INSTRUCTIONS.FULL_CHAR_DESC.text);
        instructions.push(`**CHARACTER VISUAL INTEGRATION:** Use FULL visual profiles.`);
    }
    // If 'none', no character visual instruction is pushed

    if (activeInstructionIds.includes(PROMPT_MODIFIER_INSTRUCTIONS.LAYERED_CONSTRUCTION.id)) {
        if (detailOptions.charDescMode === 'none') {
            // Use "No Character Visuals" algorithm text
            instructions.push(LAYERED_CONSTRUCTION_NO_CHAR_TEXT);
        } else if (isSaturationActive) {
            instructions.push(PROMPT_MODIFIER_INSTRUCTIONS.LAYERED_CONSTRUCTION.text);
        } else {
            instructions.push(LAYERED_CONSTRUCTION_NO_STYLE_TEXT);
        }
    }

    if (activeInstructionIds.includes(PROMPT_MODIFIER_INSTRUCTIONS.VISUAL_SATURATION.id)) {
        instructions.push(PROMPT_MODIFIER_INSTRUCTIONS.VISUAL_SATURATION.text);
    }

    if (activeInstructionIds.includes(PROMPT_MODIFIER_INSTRUCTIONS.NO_NAMES.id)) {
        instructions.push(PROMPT_MODIFIER_INSTRUCTIONS.NO_NAMES.text);
    }

    if (activeInstructionIds.includes(PROMPT_MODIFIER_INSTRUCTIONS.BREAK_PARAGRAPHS.id)) {
        instructions.push(PROMPT_MODIFIER_INSTRUCTIONS.BREAK_PARAGRAPHS.text);
    }

    // STRICT LANGUAGE ENFORCEMENT
    instructions.push(`**OUTPUT LANGUAGE:** The final image and video prompts MUST be written in **${languageName}**. \n**EXCEPTION:** The Character Tags inside square brackets must remain in English: '[Entity-1]', '[Entity-2]'. Do not translate the word 'Entity'.`);

    const generateVideoPrompt = activeInstructionIds.includes(PROMPT_MODIFIER_INSTRUCTIONS.GENERATE_VIDEO_PROMPT.id);
    if (generateVideoPrompt) {
        instructions.push(PROMPT_MODIFIER_INSTRUCTIONS.GENERATE_VIDEO_PROMPT.text);
        instructions.push(`Return JSON: { \"imagePrompt\": \"...\", \"videoPrompt\": \"...\" }`);
    } else {
        instructions.push("Return ONLY the final image prompt string.");
    }

    const relevantCharacterPrompts = characterAliases.length > 0
        ? characterAliases.map(alias => characterMap[alias] ? `[${alias}]: ${characterMap[alias]}` : null).filter(Boolean)
        : characterPrompts;

    const characterInfo = relevantCharacterPrompts.length > 0
        ? `Use ONLY these character profiles relevant to this frame:\n${relevantCharacterPrompts.map(p => `- ${p}`).join('\n')}`
        : 'No specific characters in this frame.';

    const styleContext = isSaturationActive ? `**VISUAL STYLE:** ${styleOverride || "Cinematic realism"}` : "";

    const prompt = `
        ${instructions.join('\n\n')}

        **INPUTS:**
        - **MASTER SCENE SET DESIGN (MANDATORY CONTEXT):** "${sceneContext.replace(/`/g, '')}"
        ${styleContext}
        - **Entities / Characters:** ${characterInfo.replace(/`/g, '')}
        - **Frame Action & Subject Detail:** ${basePrompt.replace(/`/g, '')}
        - **Frame World Context (MANDATORY BACKGROUND):** ${environmentPrompt.replace(/`/g, '')}
    `;

    try {
        const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                ... (generateVideoPrompt ? { responseMimeType: 'application/json' } : {}),
                thinkingConfig: detailOptions.thinkingEnabled ? { thinkingBudget: 16000 } : undefined
            }
        }));

        const text = (response.text ?? '').trim();

        if (generateVideoPrompt) {
            try {
                return safeJsonParse(text);
            } catch (e) {
                return { imagePrompt: text, videoPrompt: '' };
            }
        }
        return text;
    } catch (error) {
        console.error("Error modifying script prompt:", error);
        throw error;
    }
};

export const modifyScriptSceneBatch = async (
    sceneContext: string,
    frames: any[],
    characterMap: Record<string, string>,
    targetLanguage: string,
    styleOverride: string,
    model: string,
    activeInstructionIds: string[] = [],
    detailOptions: { charDescMode: 'none' | 'general' | 'full', safeGeneration?: boolean, thinkingEnabled?: boolean } = { charDescMode: 'general' }
): Promise<any[]> => {
    const ai = getAiClient();
    const languageName = getLanguageName(targetLanguage);
    const instructions = [];

    const isSaturationActive = activeInstructionIds.includes(PROMPT_MODIFIER_INSTRUCTIONS.VISUAL_SATURATION.id);

    if (detailOptions.safeGeneration) {
        instructions.push(SAFE_GENERATION_INSTRUCTIONS.text);
    }

    instructions.push(PROMPT_MODIFIER_INSTRUCTIONS.ROLE.text);
    instructions.push(PROMPT_MODIFIER_INSTRUCTIONS.NO_POV.text);
    instructions.push(PROMPT_MODIFIER_INSTRUCTIONS.STATIC_STATE.text);
    instructions.push(PROMPT_MODIFIER_INSTRUCTIONS.ATMOSPHERIC_FIX.text);
    instructions.push(PROMPT_MODIFIER_INSTRUCTIONS.STATELESS.text);
    instructions.push(PROMPT_MODIFIER_INSTRUCTIONS.SUBJECT_FOCUS.text);
    instructions.push(PROMPT_MODIFIER_INSTRUCTIONS.STRICT_CHAR_INDEX.text);
    instructions.push(PROMPT_MODIFIER_INSTRUCTIONS.ALWAYS_ENV.text);

    if (activeInstructionIds.includes(PROMPT_MODIFIER_INSTRUCTIONS.ANTHRO_REINFORCEMENT.id)) {
        instructions.push(PROMPT_MODIFIER_INSTRUCTIONS.ANTHRO_REINFORCEMENT.text);
    }
    if (activeInstructionIds.includes(PROMPT_MODIFIER_INSTRUCTIONS.SUBSCRIBE_REINFORCEMENT.id)) {
        instructions.push(PROMPT_MODIFIER_INSTRUCTIONS.SUBSCRIBE_REINFORCEMENT.text);
    }
    if (activeInstructionIds.includes(PROMPT_MODIFIER_INSTRUCTIONS.IMG_VID_CONSISTENCY.id)) {
        instructions.push(PROMPT_MODIFIER_INSTRUCTIONS.IMG_VID_CONSISTENCY.text);
    }
    if (activeInstructionIds.includes(PROMPT_MODIFIER_INSTRUCTIONS.PROP_ENHANCEMENT.id)) {
        instructions.push(PROMPT_MODIFIER_INSTRUCTIONS.PROP_ENHANCEMENT.text);
    }

    // Character Description Logic
    if (detailOptions.charDescMode === 'general') {
        instructions.push(PROMPT_MODIFIER_INSTRUCTIONS.GENERAL_CHAR_DESC.text);
        instructions.push(`**CHARACTER VISUAL INTEGRATION:** Summarize the visual prompt from the character's profile. Merge details naturally.`);
    } else if (detailOptions.charDescMode === 'full') {
        instructions.push(PROMPT_MODIFIER_INSTRUCTIONS.FULL_CHAR_DESC.text);
        instructions.push(`**CHARACTER VISUAL INTEGRATION:** Use FULL visual profiles.`);
    }

    if (activeInstructionIds.includes(PROMPT_MODIFIER_INSTRUCTIONS.LAYERED_CONSTRUCTION.id)) {
        if (detailOptions.charDescMode === 'none') {
            instructions.push(LAYERED_CONSTRUCTION_NO_CHAR_TEXT);
        } else if (isSaturationActive) {
            instructions.push(PROMPT_MODIFIER_INSTRUCTIONS.LAYERED_CONSTRUCTION.text);
        } else {
            instructions.push(LAYERED_CONSTRUCTION_NO_STYLE_TEXT);
        }
    }

    if (activeInstructionIds.includes(PROMPT_MODIFIER_INSTRUCTIONS.VISUAL_SATURATION.id)) {
        instructions.push(PROMPT_MODIFIER_INSTRUCTIONS.VISUAL_SATURATION.text);
    }

    if (activeInstructionIds.includes(PROMPT_MODIFIER_INSTRUCTIONS.NO_NAMES.id)) {
        instructions.push(PROMPT_MODIFIER_INSTRUCTIONS.NO_NAMES.text);
    }

    if (activeInstructionIds.includes(PROMPT_MODIFIER_INSTRUCTIONS.BREAK_PARAGRAPHS.id)) {
        instructions.push(PROMPT_MODIFIER_INSTRUCTIONS.BREAK_PARAGRAPHS.text);
    }

    // STRICT LANGUAGE ENFORCEMENT
    instructions.push(`**OUTPUT LANGUAGE:** The final image and video prompts MUST be written in **${languageName}**. \n**EXCEPTION:** The Character Tags inside square brackets must remain in English: '[Entity-1]', '[Entity-2]'. Do not translate the word 'Entity'.`);

    const generateVideoPrompt = activeInstructionIds.includes(PROMPT_MODIFIER_INSTRUCTIONS.GENERATE_VIDEO_PROMPT.id);
    if (generateVideoPrompt) {
        instructions.push(PROMPT_MODIFIER_INSTRUCTIONS.GENERATE_VIDEO_PROMPT.text);
        instructions.push(`Return JSON array: [{ \"imagePrompt\": \"...\", \"videoPrompt\": \"...\" }]`);
    } else {
        instructions.push(`Return JSON array of strings (image prompts only).`);
    }

    // STRICT JSON INSTRUCTION TO PREVENT SYNTAX ERRORS
    instructions.push(`**STRICT JSON SYNTAX:** Ensure all keys (e.g. "imagePrompt") are double-quoted. Do NOT use trailing commas. Escape any quotes inside strings.`);

    const uniqueAliases = new Set<string>();
    frames.forEach(f => {
        if (f.characters && Array.isArray(f.characters)) {
            f.characters.forEach((c: string) => uniqueAliases.add(c));
        }
    });

    const characterContext = Array.from(uniqueAliases).map(alias => characterMap[alias] ? `[${alias}]: ${characterMap[alias]}` : null).filter(Boolean).join('\n\n');

    const framesInput = frames.map((f, i) => {
        const activeCharacters = (f.characters || []).join(', ');
        return `FRAME_${i}:
        // Shot Type removed to prevent AI from shortcutting descriptions
        - Subject Detail & Action: ${(f.imagePrompt || '').replace(/`/g, '')}
        - World Context (MANDATORY): ${(f.environmentPrompt || '').replace(/`/g, '')}
        - Active Characters: ${activeCharacters || 'None'}
        `;
    }).join('\n\n');

    const styleContext = isSaturationActive ? `**STYLE DEFINITION:** ${styleOverride || "Cinematic realism"}` : "";

    const prompt = `
        ${instructions.join('\n\n')}

        **MASTER SCENE SET DESIGN (MANDATORY CONTEXT):** "${sceneContext.replace(/`/g, '')}"
        ${styleContext}
        
        **SCENE CAST VISUAL PROFILES (REFERENCE):**
        ${characterContext || "No specific characters in this scene."}

        **FRAMES TO PROCESS:**
        ${framesInput}
    `;

    try {
        const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                thinkingConfig: detailOptions.thinkingEnabled ? { thinkingBudget: 16000 } : undefined
            }
        }));
        return safeJsonParse(response.text || '[]');
    } catch (error) {
        console.error("Error batch modifying scene:", error);
        throw error;
    }
};

export const modifyScriptPart = async (original: string, instruction: string) => {
    const ai = getAiClient();
    const prompt = `Modify text:\nOriginal: ${original}\nInstructions: ${instruction}`;
    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    }));
    return response.text || '';
};

export const improveScriptConcept = async (concept: string, targetLanguage: string) => {
    const ai = getAiClient();
    const languageName = getLanguageName(targetLanguage);
    const prompt = `You are a professional Script Doctor and Visual Director.
    Significantly ENRICH, EXPAND, and DIVERSIFY the given story concept in ${languageName}.
    
    CRITICAL OUTPUT RULES:
    1. **Visual Focus:** Use vivid, descriptive language suitable for AI image generation (lighting, colors, textures, atmosphere).
    2. **Detail:** Add specific details about the setting, characters, and mood.
    3. **Expansion:** Flesh out the premise into a robust narrative foundation.
    4. **Output:** Return ONLY the improved concept text. DO NOT include prefixes like \"Title:\".

    Raw Concept: \"${concept}\"`;

    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
    }));
    return (response.text || '').trim();
};
