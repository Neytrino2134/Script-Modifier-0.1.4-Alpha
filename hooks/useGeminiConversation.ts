
import React, { useCallback, useState } from 'react';
import { Node, NodeType, Connection } from '../types';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { getAiClient } from '../services/geminiService'; // Use the shared client helper

const SYSTEM_INSTRUCTIONS = {
    general: "Ты — полезный ассистент в визуальном приложении для создания сценариев под названием 'Модификатор Сценариев'. Твоя основная роль — помогать пользователям в создании историй, персонажей и сценариев. Ты можешь предлагать идеи, помогать со структурой сюжета, писать диалоги или описывать сцены. Хотя ты специализируешься на написании сценариев, ты можешь общаться на любые темы, которые предложит пользователь. Всегда отвечай простым текстом, без использования сложного форматирования Markdown.",
    script: "Ты — профессиональный сценарист и консультант по драматургии мирового уровня. Твоя специализация — помощь в написании киносценариев, сериалов и видеороликов. Ты отлично разбираешься в структуре сюжета (трехактная структура, путь героя), создании глубоких персонажей, написании живых диалогов и форматировании сценариев. Помогай пользователю разрабатывать идеи, писать сцены, улучшать диалоги и создавать логлайны. Давай конструктивную критику и предлагай творческие решения.",
    prompt: "Ты — эксперт по промпт-инжинирингу для генерации изображений (Stable Diffusion, Midjourney, DALL-E). Твоя задача — помогать пользователю создавать детальные, эффективные и художественные промпты. Ты знаешь, как описывать освещение (volumetric lighting, cinematic lighting), композицию (rule of thirds, wide shot), стиль (cyberpunk, watercolor, oil painting), художников и технические параметры (4k, 8k, detailed). Помогай улучшать короткие идеи пользователей, превращая их в богатые визуальные описания.",
    youtube: "Ты — эксперт по аналитике YouTube, стратегии роста каналов и созданию контента. Ты знаешь всё о SEO для видео (заголовки, описания, теги), удержании аудитории (CTR, retention rate) и трендах. Твоя цель — помочь пользователю развить его канал, улучшить показатели видео, придумать кликбейтные (но честные) заголовки и идеи для контента, которые зацепят зрителя. Давай советы по оптимизации, контент-плану и взаимодействию с аудиторией."
};

export const useGeminiConversation = ({
    nodes, connections, setNodes, getUpstreamTextValue, setError
}: {
    nodes: Node[];
    connections: Connection[];
    setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
    getUpstreamTextValue: (nodeId: string, handleId: string | undefined, visited?: Set<string>) => string;
    setError: (error: string | null) => void;
}) => {
    const [isChatting, setIsChatting] = useState<string | null>(null);
    const [isReadingData, setIsReadingData] = useState<string | null>(null);

    const handleSendMessage = useCallback(async (nodeId: string) => {
        const chatNode = nodes.find(n => n.id === nodeId);
        if (!chatNode) return;

        let parsedValue: any;
        try { parsedValue = JSON.parse(chatNode.value || '{}'); } 
        catch { setError("Invalid chat node data."); return; }

        const messages = Array.isArray(parsedValue.messages) ? parsedValue.messages : [];
        const { currentInput, mode = 'general' } = parsedValue;
        
        if (!currentInput || currentInput.trim() === '') return;

        const newUserMessage = { role: 'user', content: currentInput };
        const newMessages = [...messages, newUserMessage];

        setNodes(prev => prev.map(n => 
            n.id === nodeId 
            ? { ...n, value: JSON.stringify({ messages: newMessages, currentInput: '', mode }) }
            : n
        ));

        setError(null);
        setIsChatting(nodeId);

        try {
            const history = messages.map((msg: any) => ({
                role: msg.role,
                parts: [{ text: msg.content }]
            }));
            
            const systemInstruction = SYSTEM_INSTRUCTIONS[mode as keyof typeof SYSTEM_INSTRUCTIONS] || SYSTEM_INSTRUCTIONS.general;

            // Use the shared client helper that handles the API key correctly
            const ai = getAiClient();

            const chat = ai.chats.create({
                model: 'gemini-2.5-flash',
                history: history,
                config: {
                  systemInstruction: systemInstruction
                }
            });

            const result: GenerateContentResponse = await chat.sendMessage({ message: currentInput });
            const modelResponse = { role: 'model', content: result.text ?? '' };
            const finalMessages = [...newMessages, modelResponse];
            
            setNodes(prev => prev.map(n => 
                n.id === nodeId
                ? { ...n, value: JSON.stringify({ messages: finalMessages, currentInput: '', mode }) }
                : n
            ));

        } catch (e: any) {
            setError(e.message || "An unknown error occurred during chat.");
            setNodes(prev => prev.map(n => 
                n.id === nodeId 
                ? { ...n, value: JSON.stringify({ messages: messages, currentInput: currentInput, mode }) }
                : n
            ));
        } finally {
            setIsChatting(null);
        }
    }, [nodes, setNodes, setError, setIsChatting]);

    const handleReadData = useCallback(async (nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;
    
        // Determine correct input connection based on node type
        let inputConnection;
        if (node.type === NodeType.SCRIPT_GENERATOR) {
             // For Script Generator, strictly look for prompt input or default
             inputConnection = connections.find(c => c.toNodeId === nodeId && (c.toHandleId === 'prompt' || c.toHandleId === undefined));
        } else {
             // Default behavior: take the first connection
             inputConnection = connections.find(c => c.toNodeId === nodeId);
        }
        
        let newValue = '';
        if (inputConnection) {
            newValue = getUpstreamTextValue(inputConnection.fromNodeId, inputConnection.fromHandleId);
        }

        // Deep check to prevent infinite update loops
        let currentParsed; 
        try { currentParsed = JSON.parse(node.value || '{}'); } catch { currentParsed = {}; }
        
        const mode = currentParsed.mode || 'simple';
        
        if (node.type === NodeType.SPEECH_SYNTHESIZER) {
            if (mode === 'scene') {
                let incomingScenes = [];
                try {
                    const parsedInput = JSON.parse(newValue);
                    if (Array.isArray(parsedInput)) incomingScenes = parsedInput;
                } catch {}
                
                if (JSON.stringify(currentParsed.inputText) === JSON.stringify(incomingScenes)) return;
            } else {
                if (currentParsed.inputText === newValue) return;
            }
        } else if (node.type === NodeType.DATA_READER) {
            if (node.value === newValue) return;
            try {
                const parsedJson = JSON.parse(newValue);
                const formatted = JSON.stringify(parsedJson, null, 2);
                if (node.value === formatted) return;
            } catch {}
        } else if (node.type === NodeType.SCRIPT_GENERATOR || node.type === NodeType.CHARACTER_GENERATOR || node.type === NodeType.IDEA_GENERATOR || node.type === NodeType.NARRATOR_TEXT_GENERATOR) {
            // Complex nodes: Only update the prompt/text field, keep parameters
            const fieldName = (node.type === NodeType.IDEA_GENERATOR) ? 'theme' : 'prompt';
            if (currentParsed[fieldName] === newValue) return;
        }

        setError(null);
        setIsReadingData(nodeId);
        try {
            await new Promise(resolve => setTimeout(resolve, 30));
            
            if (node.type === NodeType.SPEECH_SYNTHESIZER) {
                setNodes(prev => prev.map(n => {
                    if (n.id === nodeId) {
                        let parsed; 
                        try { parsed = JSON.parse(n.value || '{}'); } catch { parsed = {}; }
                        const currentMode = parsed.mode || 'simple';
                        let updatedValue;

                        if (currentMode === 'scene') {
                            let sceneTexts = [];
                            try {
                                const parsedInput = JSON.parse(newValue);
                                if (Array.isArray(parsedInput)) {
                                    sceneTexts = parsedInput;
                                }
                            } catch {}
                            updatedValue = { ...parsed, inputText: sceneTexts, audioFiles: [] };
                        } else { 
                            updatedValue = { ...parsed, inputText: newValue };
                        }
                        return { ...n, value: JSON.stringify(updatedValue) };
                    }
                    return n;
                }));
            } else if (node.type === NodeType.SCRIPT_GENERATOR || node.type === NodeType.CHARACTER_GENERATOR || node.type === NodeType.IDEA_GENERATOR || node.type === NodeType.NARRATOR_TEXT_GENERATOR) {
                // COMPLEX NODES: Partial Update
                setNodes(prev => prev.map(n => {
                    if (n.id === nodeId) {
                        let parsed; 
                        try { parsed = JSON.parse(n.value || '{}'); } catch { parsed = {}; }
                        const fieldName = (n.type === NodeType.IDEA_GENERATOR) ? 'theme' : 'prompt';
                        return { ...n, value: JSON.stringify({ ...parsed, [fieldName]: newValue }) };
                    }
                    return n;
                }));
            } else if (node.type === NodeType.SCRIPT_ANALYZER || node.type === NodeType.SCRIPT_PROMPT_MODIFIER) {
                // These nodes handle sync via their own useEffect[inputData], so we just trigger a tiny state flick if needed
                // or do nothing as the inputData reactive string change already triggered them.
            } else { 
                // DEFAULT (e.g. DATA_READER): Full replacement
                let formattedValue = newValue;
                try {
                    const parsedJson = JSON.parse(newValue);
                    formattedValue = JSON.stringify(parsedJson, null, 2);
                } catch (e) {}
        
                setNodes(prev => prev.map(n => 
                    n.id === nodeId ? { ...n, value: formattedValue } : n
                ));
            }
    
        } catch (e: any) {
            setError(e.message || "An unknown error occurred while reading data.");
        } finally {
            setIsReadingData(null);
        }
    }, [connections, getUpstreamTextValue, setNodes, nodes, setError, setIsReadingData]);

    return {
        states: { isChatting, isReadingData },
        handleSendMessage,
        handleReadData,
        stop: () => {
            setIsChatting(null);
            setIsReadingData(null);
        }
    };
};
