
export const LAYERED_CONSTRUCTION_NO_STYLE_TEXT = "**MASTER CONSTRUCTION ALGORITHM (Unified Flow):**\n\nConstruct the final prompt as a **SINGLE, SEAMLESS BLOCK of descriptive text**. \n\n**CRITICAL RULES:**\n1. **NO HEADERS:** Do NOT use prefixes like 'Environment:', 'Subject:', 'Action:'. Just write the text.\n2. **FLOW:** [**Master Set Design/Background**] -> [Subject Visuals] + [**Full Pose & Interaction**] -> [Technical/Camera].\n\n**LOGIC:**\n- **Environment:** You MUST start by establishing the physical set defined in the input (Furniture, Lighting, Textures). \n- **Subject:** Integrate visual details with the **POSE and ACTION**. Explicitly describe body geometry (e.g. 'kneeling', 'reaching', 'twisted torso') and movement.\n- **Technical:** End with lens, angle, and quality tags.";

export const LAYERED_CONSTRUCTION_NO_CHAR_TEXT = "**MASTER CONSTRUCTION ALGORITHM (No Entity Vis):**\n\nConstruct the final prompt as a **SINGLE, SEAMLESS BLOCK of descriptive text**. \n\n**CRITICAL RULES:**\n1. **NO ENTITY VISUALS:** Do NOT include physical descriptions (clothing, face, hair) of the entities. Refer to them ONLY by their Index (e.g. `[Entity-1]`).\n2. **FLOW:** [**Master Set Design/Background**] -> [Subject Index] + [**Full Pose & Action**] -> [Technical/Camera].\n\n**LOGIC:**\n- **Environment:** Start with the background and physical set details. \n- **Action:** Describe **POSE, GESTURE, and MOVEMENT**. You MUST describe the physical body geometry (e.g. 'sitting cross-legged', 'running', 'arms raised') even without describing the clothes/face.\n- **Technical:** End with lens, angle, and quality tags.";

export const PROMPT_MODIFIER_INSTRUCTIONS = {
    INPUTS: {
        id: 'inputs',
        label: 'Inputs',
        text: "Source Data: Script Frames, Entity Visuals, Scene Style, Master Set Design (Context)."
    },
    ROLE: {
        id: 'role_artist',
        label: 'Role',
        text: "You are a Lead Keyframe Technical Director and AI Prompt Engineer. Your task is to generate a RAW TECHNICAL IMAGE PROMPT for a STATIC frame. Do not write introductory text. Do not use literary devices or abbreviations. Output ONLY the prompt content."
    },
    NO_POV: {
        id: 'no_pov',
        label: 'No POV',
        text: "**CRITICAL NEGATIVE CONSTRAINT: NO POV SHOTS.** You are strictly FORBIDDEN from generating 'Point of View', 'POV', or 'First Person' shots. The camera must ALWAYS be external to the subject. Do not use phrases like 'seen through eyes', 'view from', or 'hands entering frame'. Describe the scene from an objective, third-person cinematic angle."
    },
    STATIC_STATE: {
        id: 'rule_static',
        label: 'Static Only',
        text: "**CRITICAL RULE: NO NARRATIVE TRANSITIONS.** Do not use words like 'suddenly', 'instantly', 'begins to', 'changed', 'transitioned'. Describe the current visual STATE. Describe physical anatomy and stance."
    },
    ATMOSPHERIC_FIX: {
        id: 'rule_atmosphere',
        label: 'Fixed Atmosphere',
        text: "ATMOSPHERIC ANCHOR: Describe the current mood as a physical property of the air and light (e.g., fog density, light color, particulate matter). Do not describe how it 'became' this way."
    },
    STATELESS: {
        id: 'rule_stateless',
        label: 'Self-Contained',
        text: "**CRITICAL RULE: VISUAL STATELESSNESS.** You are strictly FORBIDDEN from using referential literary shortcuts. Every prompt is an independent technical document. DO NOT use words like 'same', 'opposite', 'continues', 'there', 'before', 'also'. You MUST fully redescribe the setting for every single frame as if the previous one never existed.\n\n**MANDATORY ACTION RESET:** You must also fully redescribe the ACTION of EVERY entity from scratch. Describe the action hierarchy from **General to Specific**: 1. Full Body Posture. 2. Limb Action. 3. Facial Expression. Never abbreviate or omit the subject's physical state."
    },
    SUBJECT_FOCUS: {
        id: 'rule_subject_detail',
        label: 'Context Hierarchy',
        text: "**CRITICAL: FULL SUBJECT CONTEXT (MACRO-TO-MICRO).** For every subject in the frame, you MUST describe them in this specific order, REGARDLESS of the shot size (even for Extreme Close-Ups):\n1. **THE WHOLE:** Describe the Entity's Identity (Index) AND their **ACTIVE INTERACTION** (e.g. 'dragging Entity-3').\n2. **THE POSTURE:** Describe the full body stance relative to the action.\n3. **THE PART:** Only then describe the specific body part or micro-action in focus.\n\n*Never describe a floating body part without stating who it belongs to and what that person is actively doing.*"
    },
    STRICT_CHAR_INDEX: {
        id: 'strict_char_index',
        label: 'Entity Index',
        text: "Entities are identified by their index (Entity-N). Map these to the provided visual profiles perfectly."
    },
    GENERAL_CHAR_DESC: {
        id: 'general_char_desc',
        label: 'General Detail',
        text: "Summarize and incorporate a CONCISE, GENERAL version of the visual prompt from the character's profile."
    },
    FULL_CHAR_DESC: {
        id: 'full_char_desc',
        label: 'Full Detail',
        text: "Incorporate the FULL and DETAILED visual prompt from the entity's profile exactly as written."
    },
    NO_NAMES: {
        id: 'rule_no_names',
        label: 'No Names (English Tags)',
        text: "**CRITICAL: ABSOLUTE NAME BAN & BRACKETS.** You are strictly FORBIDDEN from including character names in the output. You MUST refer to characters ONLY by their Entity Index ID **enclosed in square brackets** (e.g., `[Entity-1]`, `[Entity-2]`). \n**ENGLISH TAGS ONLY:** The tag inside the brackets MUST remain in English (e.g., `[Entity-1]`), even if the rest of the prompt is in another language. DO NOT translate 'Entity'."
    },
    ALWAYS_ENV: {
        id: 'rule_always_env',
        label: 'Mandatory Set Design',
        text: "**CRITICAL RULE: MANDATORY SET DESIGN INJECTION.** The provided 'Global Scene Context' is the **PHYSICAL TRUTH**. You MUST incorporate its specific details (Furniture type/color, Floor texture, Wall material, Lighting source) into the environment layer of EVERY prompt.\n\n**HIERARCHY:**\n1. **SET DESIGN:** Establish the room/location details from the Context FIRST.\n2. **DEPTH:** Then describe Far -> Mid -> Near elements.\n\n*Do not hallucinate a generic background. Use the specific one provided.*"
    },
    LAYERED_CONSTRUCTION: {
        id: 'rule_layers',
        label: 'Layered',
        text: "**MASTER CONSTRUCTION ALGORITHM (Unified Flow):**\n\nConstruct the final prompt as a **SINGLE, SEAMLESS BLOCK of descriptive text**. \n\n**CRITICAL RULES:**\n1. **NO HEADERS:** Do NOT use prefixes like 'Environment:', 'Subject:', 'Action:'. Just write the text.\n2. **FLOW:** [Style] -> [**Master Set Design/Background**] -> [Subject Visuals] + [**Full Pose & Interaction**] -> [Technical/Camera].\n\n**LOGIC:**\n- **Environment:** Start with the specific physical set details (Furniture, Light, Texture) defined in the Scene Context. \n- **Subject:** Integrate visual details with the **POSE and ACTION**. Explicitly describe body geometry and movement.\n- **Technical:** End with lens, angle, and quality tags."
    },
    VISUAL_SATURATION: {
        id: 'rule_saturation',
        label: 'Saturation',
        text: "Use technical descriptors: anamorphic flares, chromatic aberration, ray-tracing, sub-surface scattering."
    },
    PROCESS_WHOLE_SCENE: {
        id: 'process_whole_scene',
        label: 'Batch Scene',
        text: "Analyze all frames of a scene together for visual consistency."
    },
    GENERATE_VIDEO_PROMPT: {
        id: 'generate_video',
        label: 'Video Prompt',
        text: "Generate separate technical video prompt: \n**STRICT FORMATTING RULES:**\n1. **SUBJECTS & ACTIONS:** DO NOT use names. Use ONLY Index in brackets (e.g. `[Entity-1]`). Format: `[Entity-Index] (A detailed visual description of appearance, outfit, textures, and species) performs [Detailed Action]`. \n2. **VISUAL DETAIL:** The visual description inside the video prompt MUST be extensive enough for the video model to understand the entity without external context.\n3. **DYNAMICS:** Dynamics: [Describe environment motion, wind, light shifts].\n4. **CAMERA:** Camera: [Movement].",
    },
    BREAK_PARAGRAPHS: {
        id: 'break_paragraphs',
        label: 'Formatting',
        text: "**FORMATTING OVERRIDE:**\nIgnore the 'seamless block' rule. You MUST structure the output into distinct sections using explicit headers and line breaks:\n\n**ENVIRONMENT:** [Set Design & Description]\n**INTERACTION:** [Entities & Action Description]\n**TECHNICAL:** [Camera & Style]"
    },
    // New Stacks
    ANTHRO_REINFORCEMENT: {
        id: 'pm_anthro',
        label: 'Anthro Detail',
        text: "**ANTHROPOMORPHIC ENFORCEMENT:** You MUST explicitly insert the word 'anthropomorphic' before the species name in BOTH the final 'imagePrompt' AND the 'videoPrompt'. Emphasize animal textures (fur, scales, etc.) and correct anatomical blending in all output fields."
    },
    SUBSCRIBE_REINFORCEMENT: {
        id: 'pm_subscribe',
        label: 'Legible Text',
        text: "**TEXT RENDERING ENHANCEMENT:** If the scene involves 'Subscribe' or 'Like', ensure the text is visible and legible. Use keywords: 'text label', 'signboard', 'neon typography', 'legible font', 'bold letters', 'typographic composition'."
    },
    ANATOMICAL_STRICTNESS: {
        id: 'anatomical_strictness',
        label: 'Anatomy Logic',
        text: "**CRITICAL: ANATOMICAL RIGGING & LIMB BUDGET.** You act as a 3D Rigger. An entity has only 2 hands/paws.\n1. **CALCULATE:** If a hand is holding an object, it CANNOT be doing something else. \n2. **SEPARATE:** Forbidden to use plural 'Arms' if they do different things. \n3. **SYNTAX:** Explicitly describe: 'Left Arm [State], Right Arm [State]'. \n4. **NO LITERARY SIMPLIFICATIONS.** Be technically explicit about geometry."
    },
    PROP_ENHANCEMENT: {
        id: 'prop_enhancement',
        label: 'Prop Materiality',
        text: "**PROP MATERIALITY & TEXTURE:** Amplify the physical presence of specific objects mentioned in the input. If the input specifies an object, you must describe the *interaction of light* with that specific material. **MANDATORY:** You must preserve the specific Object Type and Color defined in the input. Do not randomize objects."
    },
    IMG_VID_CONSISTENCY: {
        id: 'img_vid_consistency',
        label: 'Img-Vid Flow',
        text: "**RULE: START-TO-MOTION CONTINUITY.** The 'imagePrompt' describes the **INITIAL STATIC STATE (Frame 0/Start Frame)**. The 'videoPrompt' describes the **IMMEDIATE ACTION** occurring *after* that frame. \n- **Image:** Describe potential energy/static setup.\n- **Video:** Describe the kinetic release/movement.\n\nDo not describe the movement in the image prompt (keep it static). Do not describe the static setup in the video prompt (describe the evolution)."
    }
};
