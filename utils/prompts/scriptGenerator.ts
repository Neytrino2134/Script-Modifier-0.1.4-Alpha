
export const SCRIPT_GENERATOR_INSTRUCTIONS = {
    INPUTS_DATA: {
        id: 'sg_inputs',
        label: 'Inputs',
        text: "Source Data: Concept/Idea, Character Profiles."
    },
    CORE: {
        id: 'core_director',
        label: 'Physical Observer',
        text: "You are NOT a cameraman. You are a PHYSICAL OBSERVER. \n**YOUR GOAL:** Describe the PHYSICAL REALITY of the scene.\n**FORBIDDEN:** Metaphors, invisible feelings, and abstract summaries.\n**REQUIRED:** Physical muscle movements, contact between surfaces, light hitting textures."
    },
    ANALYSIS: {
        id: 'sg_thinking',
        label: 'Visual Logic',
        text: "LOGIC: Before writing, visualize the set. Where is the light coming from? What objects are present? If a character is performing an action, what specific tools are they using? Describe the physics of the scene."
    },
    IMPROVE_CONCEPT: {
        id: 'sg_improve_input',
        label: 'Creative Expansion',
        text: "**CRITICAL RULE: THE PROMPT IS SACRED.** \n1. **PRESERVATION:** You must incorporate EVERY visual detail, object, color, and specific action mentioned in the user's input. Do not skip \"small\" details like smells or background items.\n2. **EXPANSION:** After preserving the original details, you MUST flesh them out with cinematic lighting, texture, and micro-movements."
    },
    ANTI_COMPRESSION: {
        id: 'sg_anti_compression',
        label: 'Anti-Compression',
        text: "**CRITICAL: ZERO OMISSION POLICY.** \nYou are strictly FORBIDDEN from summarizing, compressing, or omitting details. \n- If the input lists specific items (e.g., 'rabbits, foxes, deer'), you MUST list them all.\n- If the input describes a background room (e.g., 'living room with fireplace'), you MUST describe it.\n**RULE: The output description MUST be longer and more detailed than the input.**"
    },
    STYLE_EXPANSION: {
        id: 'sg_style_expansion',
        label: 'Style Generator',
        text: "**CRITICAL: VISUAL STYLE GENERATION.** \nYou have been provided with a target 'Visual Style'. \nIn the JSON output field `visualStyle`, you must **NOT** simply repeat this name. \n**YOU MUST EXPAND IT** into a full, detailed technical prompt for an image generator (Midjourney/Stable Diffusion). \n**Define the lens, film stock, rendering engine, and artistic technique based on the input style.**"
    },
    EXPOSITION: {
        id: 'sg_exposition',
        label: 'Atmospheric Entry',
        text: "**MANDATORY OPENING BEAT:** Every scene description MUST start with 2-3 sentences establishing the location, mood, and lighting **BEFORE** the main character acts. Establish the world first."
    },
    DELAYED_REVEAL: {
        id: 'sg_delayed_reveal',
        label: 'Progressive Detail',
        text: "**SEQUENCE:** Describe the environment -> Then the action -> Then the character's reaction. Do not rush to the face."
    },
    VISUAL_METAPHOR: {
        id: 'sg_metaphor',
        label: 'Visual Proxies',
        text: "**VISUAL PROXIES FOR EMOTION:** Do not write abstract emotional states. Describe physical symptoms of that emotion (posture, facial muscle tension, sweat, breath visibility)."
    },
    PACING_RHYTHM: {
        id: 'sg_pacing',
        label: 'Action Atomization',
        text: "**CRITICAL: ACTION ATOMIZATION.** Never summarize an activity. Break it down into physical steps. \n**Expand every verb into a sequence of constituent motions.**"
    },
    SUBTEXT: {
        id: 'sg_subtext',
        label: 'Subtext',
        text: "SUBTEXT: Visual actions should tell the story. Use physical interactions with the environment to convey internal state."
    },
    FRAME_ESTIMATION: {
        id: 'sg_frame_estimation',
        label: 'Conservative Frames',
        text: "**CRITICAL: REALISTIC FRAME COUNT.** Analyze the 'Visual Density' of the scene description to set 'recommendedFrames'. Be conservative. Do not hallucinate length.\n- **LOW DENSITY (Dialogue/Simple Action):** 2-5 Frames.\n- **MID DENSITY (Interaction/Activity):** 6-10 Frames.\n- **HIGH DENSITY (Complex Action/Montage):** 11-16 Frames."
    },
    VISUALS_FIRST: {
        id: 'rule_visuals',
        label: 'Physics Only',
        text: "Describe Physics, not Vibes. Describe the behavior of light, particles, and textures."
    },
    VISUAL_DNA: {
        id: 'sg_visual_dna',
        label: 'Visual DNA',
        text: "**LIGHTING & TEXTURE:** Every scene description MUST include specific references to: 1. Light sources. 2. Surface textures and materials."
    },
    SEAMLESS_FLOW: {
        id: 'rule_flow',
        label: 'Continuity',
        text: "Ensure objects established in the beginning remain present throughout the scene description unless removed."
    },
    ATMOSPHERE: {
        id: 'rule_atmosphere',
        label: 'Atmosphere',
        text: "PARTICLE EFFECTS & SENSES: Mention airborne elements if applicable: dust, smoke, steam, snow, rain. Preserve described smells and sounds by converting them into visual cues (e.g. 'steam rising from cinnamon buns')."
    },
    NO_CAMERA_DIRECTIVES: {
        id: 'no_camera',
        label: 'STRICT CAMERA BAN',
        text: "**STRICT BAN ON CAMERA TERMS:** You are FORBIDDEN from using words like 'Camera', 'Shot', 'Pan', 'Zoom', 'Close-up', 'Wide', 'Angle'. \nDescribe the **Subject** and the **Environment**, never the lens."
    },
    OBJECT_AGENCY: {
        id: 'object_agency',
        label: 'Object Physics',
        text: "**CRITICAL PHYSICS RULE:** Inanimate objects DO NOT MOVE ON THEIR OWN. \nALWAYS attribute action to a character's body part unless it is falling via gravity."
    },
    LIVING_WORLD: {
        id: 'sg_living_world',
        label: 'Living World',
        text: "BACKGROUND: If the scene is not a close-up, briefly describe what is behind the character. Don't leave it as 'background'."
    },
    SCENELESS_MODE: {
        id: 'sceneless_mode',
        label: 'Sceneless',
        text: "**MODE: ASSET LIST.** Generate a sequential list of visual assets/locations based on the input. Focus purely on the visual description."
    },
    SIMPLE_ACTIONS: {
        id: 'sg_simple_actions',
        label: 'Simple Actions',
        text: "Keep poses stable and renderable. Avoid blurring motion."
    },
    COMMERCIAL_SAFE: {
        id: 'commercial_safe',
        label: 'Commercial Safe',
        text: "**NO BRANDS:** Replace specific brands with generic physical descriptions."
    },
    STRICT_NAME_PERSISTENCE: {
        id: 'strict_name_persistence',
        label: 'Strict Naming',
        text: "**CRITICAL ENTITY NAMING RULE:** When referring to a character, key item, or object from the provided list, you MUST use ONLY the Index format: `Entity-N`. \n**FORBIDDEN:** Do NOT include the character/object name or parenthesis (e.g., `Nick Wilde (Outfit) - Entity-2` is WRONG).\n**REQUIRED:** Use `Entity-2` only.\nThis applies to `description` and `narratorText`."
    },
    SCENE_CHARACTERS_LIST: {
        id: 'scene_characters_list',
        label: 'Participant List',
        text: "**CRITICAL JSON REQUIREMENT:** For every scene object, you MUST include a `characters` field. This array must contain the strings of the indices of ALL entities (characters/items) present in that specific scene (e.g., `[\"Entity-1\", \"Entity-3\"]`)."
    },
    CHARACTER_JSON_INDEX: {
        id: 'char_json_index',
        label: 'Index Persistence',
        text: "**CRITICAL JSON REQUIREMENT:** In the output JSON array `detailedCharacters`, you MUST include the `index` field for every entity. This value must strictly match the `Index` provided in the input list (e.g., 'Entity-1'). Do not re-number or omit this field."
    }
};

export const CHAR_GEN_INSTRUCTIONS = {
    SMART_CONCEPT: {
        id: 'char_smart_concept',
        label: 'Smart Concept',
        text: "VISUAL LOGIC: Determine if the entity is a sentient character or a static object/item. If it's a CHARACTER: append ', full body character concept on a gray background'. If it's an OBJECT/ITEM: append ', centered object concept, fill the frame, macro focus, on a gray background'. Never mix these two styles."
    },
    GRAY_BG: {
        id: 'char_gray_bg',
        label: 'Visual Concept',
        text: "For every entity visual prompt, ALWAYS append: ', full body character concept on a gray background'.",
    },
    SECONDARY_CHARS: {
        id: 'create_secondary_chars',
        label: 'Secondary Chars',
        text: "You MAY generate new secondary characters or entities if the plot requires it. COSTUME CHANGES: If a main character changes outfit, you MUST generate a NEW entity entry for them with the new clothing description and updated visual prompt."
    },
    KEY_ITEMS_LOGIC: {
        id: 'create_key_items',
        label: 'Key Items',
        text: "KEY ITEM GENERATION RULE: You MUST generate a specific object/item as a separate entry in the 'detailedCharacters' array if it is visually significant. \n\n**MANDATORY FIELDS FOR ITEMS:**\n1. **name**: Name of the item.\n2. **fullDescription**: Detailed physical description (Materials, colors, state of wear).\n3. **prompt**: A precise visual prompt for image generation."
    },
    STRICT_NO_NEW: {
        id: 'char_no_new',
        label: 'No New Chars',
        text: "Do NOT create any new characters or items. Use ONLY the provided Existing Entities. The 'detailedCharacters' output list must remain empty (unless defining visual updates for existing ones)."
    },
    NO_DUPLICATES: {
        id: 'char_no_dupes',
        label: 'No Duplicates',
        text: "CRITICAL: Do NOT re-generate entities provided in the 'Existing Characters' list. EXCEPTION: If a character changes clothes, you MUST create a new entry with the new outfit details and updated prompt."
    },
    DETAILED_STYLE: {
        id: 'char_detailed_style',
        label: 'Stylized Detail',
        text: "CHARACTER PROMPT MASTERING: For the 'prompt' field of each entity, generate an extremely detailed visual description. You MUST infuse this description with the 'visualStyle' technical parameters. Describe textures of skin/clothing, eye reflections, and surface shaders that match the chosen aesthetic."
    }
};
