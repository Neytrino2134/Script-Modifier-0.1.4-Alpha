
























export const modifier = {
    'instruction.inputs': 'Inputs',
    'instruction.desc.inputs': 'Source Data: Script Frames, Character Visuals, Scene Style, Global Scene Context.',
    'instruction.role': 'Role: Lead Environment Artist',
    'instruction.desc.role': 'You are an expert Lead Environment Artist and AI Prompt Engineer. Synthesize inputs into a definitive visual description.',
    'instruction.layered': 'Algorithm: Unified Flow',
    'instruction.desc.layered': 'Generates a SINGLE seamless block. Structure: [Style] -> [MASTER SET DESIGN FROM CONTEXT] -> [Visuals] + [POSE & ACTION] -> [Camera].',
    'instruction.desc.layered_no_char': 'Structure: [MASTER SET DESIGN] -> [Index] + [FULL POSE & ACTION]. Omits appearance but explicitly describes body geometry/movement.',
    'instruction.visuals': 'Style: Saturation',
    'instruction.desc.visuals': 'Use rich visual descriptors: volumetric lighting, chiaroscuro, 8k textures, depth of field.',
    'instruction.process_whole_scene': 'Batch Scene',
    'instruction.desc.process_whole_scene': 'Analyze entire scene at once for consistency.',
    'instruction.video': 'Video',
    'instruction.desc.video': 'Video Prompt: [Index] (Detailed Visual Desc) [Action] in one block. Dynamics: [Env Motion]. Camera: [Movements]. NO NAMES.',
    'instruction.stateless': 'Rule: Stateless',
    'instruction.desc.stateless': 'Treat every frame as independent. MANDATORY: Fully redescribe action of EVERY character from scratch (Posture -> Limbs -> Face). No abbreviations like "same pose".',
    'instruction.rule_static': 'Rule: Static',
    'instruction.desc.rule_static': 'Describe only the frozen moment. No narrative transitions.',
    'instruction.atmosphere_fix': 'Atmospheric Anchor',
    'instruction.desc.atmosphere_fix': 'Describe mood as physical properties of air and light.',
    'instruction.subject_focus': 'Context Hierarchy',
    'instruction.desc.subject_focus': 'CRITICAL: Even for Close-ups, describe 1. Full Character + ACTIVE INTERACTION (e.g. dragging). 2. Pose. 3. Detail. The AI needs the full context to render parts correctly.',
    'instruction.always_env': 'MANDATORY SET DESIGN',
    'instruction.desc.always_env': "CRITICAL: Use the provided 'Global Scene Context' as the ABSOLUTE TRUTH for the background. You MUST inject the specific furniture, lighting, and textures from the context into the environment layer of EVERY prompt. Do not hallucinate generic backgrounds.",
    'instruction.pm_anthro': 'Anthro Detail',
    'instruction.desc.pm_anthro': 'MANDATORY: Word "anthropomorphic" before species in both Image AND Video. Enhanced textures/anatomy.',
    'instruction.pm_subscribe': 'Legible Text',
    'instruction.desc.pm_subscribe': 'Ensure text like "SUBSCRIBE" is legible and integrated (neon, signs, 3D) in the final image prompt.',
    'instruction.strict_char_index': 'Characters',
    'instruction.desc.strict_char_index': 'Strictly map character Aliases (Character-N) to each frame data.',
    'instruction.no_names': 'CRITICAL: NO NAMES',
    'instruction.desc.no_names': 'CRITICAL: Names banned. Use [Entity-N]. Tag inside brackets MUST be in English (e.g., [Entity-1]), do not translate it.',
    'instruction.general_char_desc': 'General Detail',
    'instruction.desc.general_char_desc': 'Summarize and incorporate a CONCISE, GENERAL version of the visual prompt from the character\'s profile.',
    'instruction.full_char_desc': 'Full Detail',
    'instruction.desc.full_char_desc': 'Incorporate the FULL and DETAILED visual prompt from the character\'s profile exactly as written.',
    'instruction.formatting': 'Formatting',
    'instruction.desc.formatting': 'Enables explicit HEADERS (Environment, Interaction, Technical) and line breaks. Use this if you want structure instead of a flat text block.',
    'instruction.anatomical_strictness': 'Anatomy Logic',
    'instruction.desc.anatomical_strictness': 'RIGGING: Prevents "Arms behind head AND holding drink". Forces separate description: Left Arm [state], Right Arm [state]. Eliminates extra limbs.',
    'instruction.img_vid_consistency': 'Img->Vid Flow',
    'instruction.desc.img_vid_consistency': 'Image Prompt = Setup/Start Frame (Static). Video Prompt = Action/Movement (Evolution). Ensures video evolves naturally from the static image.',
    'instruction.desc.prop_enhancement': 'MATERIALITY: Amplifies object descriptions from input (e.g. "red board" -> "glossy red fiberglass"). Preserves specified colors/types.',
    'instruction.no_pov': 'CRITICAL: NO POV',
    'instruction.desc.no_pov': 'STRICT BAN on First Person/POV angles. Camera MUST be external (Third Person). No "through eyes" or "view from".',
};
