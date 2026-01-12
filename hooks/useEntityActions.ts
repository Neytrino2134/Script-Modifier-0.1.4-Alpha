
import React, { useCallback } from 'react';
import { Node, NodeType, Point, Group, Connection, CatalogItem, CatalogItemType } from '../types';
import { getOutputHandleType } from '../utils/nodeUtils';
import { extractYouTubeMetadata } from '../services/geminiService';

// Helper to split image for YouTube Analytics
const splitYouTubeImage = (blob: Blob): Promise<{ thumbnail: string, metadataImage: string }> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = URL.createObjectURL(blob);
        img.onload = () => {
            const CUT_X = 136; // Approximate width of the thumbnail in the screenshot
            
            // Canvas 1: Thumbnail
            const cvsThumb = document.createElement('canvas');
            cvsThumb.width = CUT_X;
            cvsThumb.height = img.height;
            const ctxThumb = cvsThumb.getContext('2d');
            if (!ctxThumb) { reject("Canvas error"); return; }
            ctxThumb.drawImage(img, 0, 0, CUT_X, img.height, 0, 0, CUT_X, img.height);
            
            // Canvas 2: Metadata (Title, etc) - The rest of the image
            const cvsMeta = document.createElement('canvas');
            const metaWidth = img.width - CUT_X;
            cvsMeta.width = metaWidth;
            cvsMeta.height = img.height;
            const ctxMeta = cvsMeta.getContext('2d');
            if (!ctxMeta) { reject("Canvas error"); return; }
            ctxMeta.drawImage(img, CUT_X, 0, metaWidth, img.height, 0, 0, metaWidth, img.height);

            resolve({
                thumbnail: cvsThumb.toDataURL('image/png').split(',')[1],
                metadataImage: cvsMeta.toDataURL('image/png').split(',')[1]
            });
        };
        img.onerror = reject;
    });
};

export const useEntityActions = ({
    nodes, connections, groups, addNodeFromHook, t, clientPointerPosition, clientPointerPositionRef,
    viewTransform, setCreationLine, setLastAddedNodeId, handleDeleteNode, removeConnectionsByNodeId,
    addConnection, handleValueChange, nodeIdCounter, setNodes, setConnections, addGroup,
    selectedNodeIds, setSelectedNodeIds, removeGroup, saveGroupToCatalog, catalogItems, currentCatalogItems, handleCloseCatalog,
    geminiContext,
    addToast, setGroups, handleDuplicateNode, handleDuplicateNodeEmpty,
    saveGenericItemToCatalog
}: {
    nodes: Node[];
    connections: Connection[];
    groups: Group[];
    addNodeFromHook: (type: NodeType, position: Point, t: (key: string, options?: { [key: string]: string | number; }) => string, value?: string, title?: string) => string;
    t: (key: string, options?: { [key: string]: string | number; }) => string;
    clientPointerPosition: Point;
    clientPointerPositionRef: React.RefObject<Point>;
    viewTransform: { scale: number; translate: Point };
    setCreationLine: (line: { start: Point; end: Point } | null) => void;
    setLastAddedNodeId: React.Dispatch<React.SetStateAction<string | null>>;
    handleDeleteNode: (nodeId: string) => void;
    removeConnectionsByNodeId: (nodeId: string) => void;
    addConnection: (connection: Omit<any, "id">, fromNode: Node) => void;
    handleValueChange: (nodeId: string, value: string) => void;
    nodeIdCounter: React.MutableRefObject<number>;
    setNodes: (nodes: Node[] | ((current: Node[]) => Node[])) => void;
    setConnections: (connections: Connection[] | ((current: Connection[]) => Connection[])) => void;
    addGroup: (nodesToGroup: Node[], title?: string) => void;
    selectedNodeIds: string[];
    setSelectedNodeIds: (ids: string[]) => void;
    removeGroup: (groupId: string) => void;
    saveGroupToCatalog: (group: Group, allNodes: Node[], allConnections: Connection[]) => void;
    catalogItems: any[];
    currentCatalogItems: any[];
    handleCloseCatalog: () => void;
    geminiContext: any;
    addToast: (message: string, type?: 'success' | 'info', position?: Point) => void;
    setGroups: (groups: Group[] | ((current: Group[]) => Group[])) => void;
    handleDuplicateNode: (nodeId: string) => string;
    handleDuplicateNodeEmpty: (nodeId: string, t: (key: string, options?: { [key: string]: string | number; }) => string) => string;
    saveGenericItemToCatalog: (type: CatalogItemType, name: string, data: any) => void;
}) => {
    
    const onAddNode = useCallback((type: NodeType, position: Point, value?: string, title?: string) => {
        const newNodeId = addNodeFromHook(type, position, t, value, title);
        setLastAddedNodeId(newNodeId);
        setTimeout(() => {
            setLastAddedNodeId(currentId => (currentId === newNodeId ? null : currentId));
        }, 1500);
        return newNodeId;
    }, [addNodeFromHook, t, setLastAddedNodeId]);

    const handleAddNodeFromToolbar = useCallback((type: NodeType) => {
        const viewportCenterScreen = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        const viewportCenterCanvas = {
            x: (viewportCenterScreen.x - viewTransform.translate.x) / viewTransform.scale,
            y: (viewportCenterScreen.y - viewTransform.translate.y) / viewTransform.scale,
        };
        setCreationLine({ start: clientPointerPositionRef.current, end: viewportCenterScreen });
        setTimeout(() => setCreationLine(null), 700);
        onAddNode(type, viewportCenterCanvas, undefined);
    }, [clientPointerPositionRef, viewTransform, onAddNode, setCreationLine]);

    const deleteNodeAndConnections = useCallback((nodeId: string) => {
        const nodeToDelete = nodes.find(n => n.id === nodeId);
        if (nodeToDelete && nodeToDelete.type === NodeType.REROUTE_DOT) {
            const incomingConn = connections.find(c => c.toNodeId === nodeId);
            const outgoingConns = connections.filter(c => c.fromNodeId === nodeId);
            if (incomingConn && outgoingConns.length > 0) {
                const newConnections = outgoingConns.map(outConn => ({ fromNodeId: incomingConn.fromNodeId, fromHandleId: incomingConn.fromHandleId, toNodeId: outConn.toNodeId, toHandleId: outConn.toHandleId, }));
                newConnections.forEach(conn => {
                    const fromNode = nodes.find(n => n.id === conn.fromNodeId);
                    if (fromNode) addConnection(conn, fromNode);
                });
            }
        }
        handleDeleteNode(nodeId);
        removeConnectionsByNodeId(nodeId);
    }, [nodes, connections, handleDeleteNode, removeConnectionsByNodeId, addConnection]);

    const handleSplitConnection = useCallback((connectionId: string, e: React.MouseEvent) => {
        const connToSplit = connections.find(c => c.id === connectionId);
        if (!connToSplit) return;
        const fromNode = nodes.find(n => n.id === connToSplit.fromNodeId);
        if (!fromNode) return;
        nodeIdCounter.current += 1;
        const newNodeId = `node-${nodeIdCounter.current}-${Date.now()}`;
        const connectionType = getOutputHandleType(fromNode, connToSplit.fromHandleId);
        
        const canvasPosition = {
            x: (e.clientX - viewTransform.translate.x) / viewTransform.scale,
            y: (e.clientY - viewTransform.translate.y) / viewTransform.scale,
        };

        const newNode = { 
            id: newNodeId, 
            type: NodeType.REROUTE_DOT, 
            position: { 
                x: canvasPosition.x - 30, // hardcoded 60/2
                y: canvasPosition.y - 20, // hardcoded 40/2
            }, 
            value: JSON.stringify({ type: connectionType }), 
            title: t('node.title.reroute_dot'), 
            width: 60, 
            height: 40 
        };
        const newConn1 = { id: `conn-${Date.now()}-1-${Math.random().toString(36).substr(2, 9)}`, fromNodeId: connToSplit.fromNodeId, toNodeId: newNodeId, fromHandleId: connToSplit.fromHandleId };
        const newConn2 = { id: `conn-${Date.now()}-2-${Math.random().toString(36).substr(2, 9)}`, fromNodeId: newNodeId, toNodeId: connToSplit.toNodeId, toHandleId: connToSplit.toHandleId };
        
        setNodes(current => [...current, newNode]);
        setConnections(current => [ ...current.filter(c => c.id !== connectionId), newConn1, newConn2, ]);
    }, [connections, nodes, t, setNodes, setConnections, nodeIdCounter, viewTransform]);
    
    const handleGroupSelection = useCallback(() => {
        if (selectedNodeIds.length > 1) {
            const nodesToGroup = nodes.filter(node => selectedNodeIds.includes(node.id));
            addGroup(nodesToGroup);
            setSelectedNodeIds([]);
        }
    }, [selectedNodeIds, nodes, addGroup, setSelectedNodeIds]);

    const handleRemoveGroup = useCallback((groupId: string, e: React.MouseEvent) => {
        if (e.shiftKey) { const group = groups.find(g => g.id === groupId); if (group) group.nodeIds.forEach(nodeId => deleteNodeAndConnections(nodeId)); }
        removeGroup(groupId);
    }, [groups, deleteNodeAndConnections, removeGroup]);

    const handleSaveGroupToCatalog = useCallback((groupId: string) => {
        const group = groups.find(g => g.id === groupId);
        if (group) { saveGroupToCatalog(group, nodes, connections); addToast(t('alert.groupSaved', { groupTitle: group.title }), 'success'); }
    }, [groups, nodes, connections, saveGroupToCatalog, t, addToast]);

    const handleCopyGroup = useCallback(async (groupId: string) => {
        const group = groups.find(g => g.id === groupId);
        if (!group) return;

        const memberNodes = nodes.filter(n => group.nodeIds.includes(n.id));
        if (memberNodes.length === 0) return;

        const memberNodeIds = new Set(memberNodes.map(n => n.id));
        const internalConnections = connections.filter(c =>
            memberNodeIds.has(c.fromNodeId) && memberNodeIds.has(c.toNodeId)
        );

        // Normalize positions relative to top-left
        const nodesToCopy = JSON.parse(JSON.stringify(memberNodes));
        const minX = Math.min(...nodesToCopy.map((n: Node) => n.position.x));
        const minY = Math.min(...nodesToCopy.map((n: Node) => n.position.y));
        
        nodesToCopy.forEach((n: Node) => {
            n.position.x -= minX;
            n.position.y -= minY;
        });

        const clipboardData = {
            type: 'scriptModifierGroup',
            name: group.title,
            nodes: nodesToCopy,
            connections: internalConnections
        };

        try {
            await navigator.clipboard.writeText(JSON.stringify(clipboardData, null, 2));
            addToast(t('toast.copied'), 'success');
        } catch (err) {
            console.error("Failed to copy group:", err);
            addToast("Failed to copy group", 'info');
        }
    }, [groups, nodes, connections, t, addToast]);

    const handleAddGroupFromTemplate = useCallback((groupTemplate: { name: string, nodes: Node[], connections: any[] }, position: Point) => {
        if (!groupTemplate.nodes || groupTemplate.nodes.length === 0) return;

        const idMap = new Map<string, string>();
        const newNodes: Node[] = [];

        let minX = Infinity;
        let minY = Infinity;
        if (groupTemplate.nodes.length > 0) {
            groupTemplate.nodes.forEach(node => {
                minX = Math.min(minX, node.position.x);
                minY = Math.min(minY, node.position.y);
            });
        } else {
            minX = 0;
            minY = 0;
        }

        groupTemplate.nodes.forEach(templateNode => {
            nodeIdCounter.current++;
            const newNodeId = `node-${nodeIdCounter.current}-${Date.now()}`;
            idMap.set(templateNode.id, newNodeId);
            newNodes.push({
                ...templateNode,
                id: newNodeId,
                position: {
                    x: position.x + (templateNode.position.x - minX),
                    y: position.y + (templateNode.position.y - minY),
                },
            });
        });

        const newConnections = (groupTemplate.connections || []).map((conn: any) => ({
            ...conn,
            id: `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            fromNodeId: idMap.get(conn.fromNodeId),
            toNodeId: idMap.get(conn.toNodeId),
        })).filter(conn => conn.fromNodeId && conn.toNodeId);

        setNodes(current => [...current, ...newNodes]);
        setConnections(current => [...current, ...newConnections]);

        addGroup(newNodes, groupTemplate.name);
    }, [nodeIdCounter, setNodes, setConnections, addGroup]);

    const handleDuplicateGroup = useCallback((groupId: string) => {
        const group = groups.find(g => g.id === groupId);
        if (!group) return;

        const memberNodes = nodes.filter(n => group.nodeIds.includes(n.id));
        if (memberNodes.length === 0) return;

        const memberNodeIds = new Set(memberNodes.map(n => n.id));
        const internalConnections = connections.filter(c =>
            memberNodeIds.has(c.fromNodeId) && memberNodeIds.has(c.toNodeId)
        );

        // Offset slightly
        const newPosition = {
            x: group.position.x + 50,
            y: group.position.y + 50
        };

        const groupTemplate = {
            name: group.title + " (Copy)",
            nodes: memberNodes, // handleAddGroupFromTemplate handles normalization
            connections: internalConnections
        };

        handleAddGroupFromTemplate(groupTemplate, newPosition);
        addToast(t('toast.pasted'), 'success');
    }, [groups, nodes, connections, handleAddGroupFromTemplate, t, addToast]);

    const saveDataToCatalog = useCallback((nodeId: string, type: CatalogItemType, name: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;

        let dataToSave: any = {};
        try {
            const parsed = JSON.parse(node.value || '{}');
            
            switch (type) {
                case CatalogItemType.CHARACTERS:
                    // Can be Generator or Card
                    if (node.type === NodeType.CHARACTER_GENERATOR) {
                        dataToSave = { type: 'character-generator-data', characters: parsed.characters || [] };
                    } else if (node.type === NodeType.CHARACTER_CARD) {
                        const cards = Array.isArray(parsed) ? parsed : [parsed];
                        // Process images for all cards (similar to NodeHeader logic)
                        const exportCards = cards.map((card: any) => {
                            const exportImageSources: Record<string, string | null> = {};
                            const ratios = ['1:1', '16:9', '9:16'];
                            if (card.imageSources) {
                                Object.keys(card.imageSources).forEach(key => {
                                    const val = card.imageSources[key];
                                    if (val) {
                                        exportImageSources[key] = val.startsWith('data:image') ? val : `data:image/png;base64,${val}`;
                                    }
                                });
                            }
                            let mainImage = null;
                            if (card.selectedRatio && exportImageSources[card.selectedRatio]) {
                                mainImage = exportImageSources[card.selectedRatio];
                            } else if (card.image) {
                                mainImage = card.image.startsWith('data:image') ? card.image : `data:image/png;base64,${card.image}`;
                            } else if (card.imageBase64) {
                                mainImage = card.imageBase64.startsWith('data:image') ? card.imageBase64 : `data:image/png;base64,${card.imageBase64}`;
                            }
                            if (mainImage && !exportImageSources['1:1']) {
                                exportImageSources['1:1'] = mainImage;
                            }
                            ratios.forEach(r => { if (!exportImageSources[r]) exportImageSources[r] = null; });

                            return {
                                type: 'character-card',
                                nodeTitle: node.title,
                                id: card.id || `char-card-${Date.now()}-${Math.random()}`,
                                name: card.name,
                                index: card.index || card.alias || 'Entity-1', // Default to Entity
                                image: mainImage,
                                selectedRatio: card.selectedRatio || '1:1',
                                prompt: card.prompt || '',
                                fullDescription: card.fullDescription || '',
                                imageSources: exportImageSources,
                                additionalPrompt: card.additionalPrompt,
                                targetLanguage: card.targetLanguage,
                                isOutput: card.isOutput
                            };
                        });
                        
                        dataToSave = exportCards; // Save the ARRAY directly for catalog logic
                    }
                    break;
                case CatalogItemType.SCRIPT:
                    dataToSave = { type: 'script-generator-data', scenes: parsed.scenes || [] };
                    break;
                case CatalogItemType.ANALYSIS:
                    dataToSave = { type: 'script-analyzer-data', scenes: parsed.scenes || [], visualStyle: parsed.visualStyle || '' }; 
                    break;
                case CatalogItemType.FINAL_PROMPTS:
                    dataToSave = { 
                        type: 'script-prompt-modifier-data', 
                        finalPrompts: parsed.finalPrompts || [],
                        usedCharacters: parsed.usedCharacters || [] // Added usedCharacters
                    };
                    break;
                case CatalogItemType.YOUTUBE:
                    if (node.type === NodeType.YOUTUBE_TITLE_GENERATOR) {
                        dataToSave = {
                            type: 'youtube-title-data',
                            generatedTitleOutputs: parsed.generatedTitleOutputs,
                            generatedChannelOutputs: parsed.generatedChannelOutputs
                        };
                    } else if (node.type === NodeType.YOUTUBE_ANALYTICS) {
                        dataToSave = { type: 'youtube-analytics-data', ...parsed };
                    }
                    break;
                case CatalogItemType.MUSIC:
                    dataToSave = {
                         type: 'music-idea-data',
                         idea: parsed.idea,
                         generatedLyrics: parsed.generatedLyrics,
                         generatedMusicPrompts: parsed.generatedMusicPrompts,
                         generatedTitles: parsed.generatedTitles
                    };
                    break;
                default:
                    dataToSave = parsed;
            }
        } catch (e) {
            console.error("Failed to parse node value for catalog save", e);
            return;
        }

        // Add current node title to the saved data (if it's an object, not array like character cards)
        if (!Array.isArray(dataToSave)) {
            dataToSave.title = node.title;
        } else if (dataToSave.length > 0) {
             // For arrays, attach title to first element or handle differently if needed. 
             // CharacterCardNode load logic expects nodeTitle on elements.
             dataToSave[0].nodeTitle = node.title;
        }

        saveGenericItemToCatalog(type, name, dataToSave);
        addToast(t('toast.savedToCatalog'), 'success');
    }, [nodes, saveGenericItemToCatalog, t, addToast]);

    const handleSaveGroupToDisk = useCallback((groupId: string) => {
        const group = groups.find(g => g.id === groupId);
        if (!group) return;

        const memberNodes = nodes.filter(n => group.nodeIds.includes(n.id));
        if (memberNodes.length === 0) return;

        const memberNodeIds = new Set(memberNodes.map(n => n.id));
        const internalConnections = connections.filter(c =>
            memberNodeIds.has(c.fromNodeId) && memberNodeIds.has(c.toNodeId)
        );

        const nodesToSave: Node[] = JSON.parse(JSON.stringify(memberNodes));
        const minX = Math.min(...nodesToSave.map((n: Node) => n.position.x));
        const minY = Math.min(...nodesToSave.map((n: Node) => n.position.y));
        nodesToSave.forEach((n: Node) => {
            n.position.x -= minX;
            n.position.y -= minY;
        });
        
        const groupData = {
            type: 'scriptModifierGroup', // Updated type
            name: group.title,
            nodes: nodesToSave,
            connections: JSON.parse(JSON.stringify(internalConnections)),
        };

        const stateString = JSON.stringify(groupData, null, 2);
        const blob = new Blob([stateString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;

        const sanitizedTitle = group.title.replace(/[^a-z0-9а-яё\s-_]/gi, '').trim().replace(/\s+/g, '_');
        
        a.download = `${sanitizedTitle}_Script_Modifier_Group_${dateString}.json`;

        a.click();
        URL.revokeObjectURL(url);
        a.remove();
        addToast(t('toast.groupSavedToDisk', { groupTitle: group.title }), 'success');
    }, [groups, nodes, connections, t, addToast]);
    
    const handleAddGroupFromCatalog = useCallback((itemId) => {
        const item = catalogItems.find(i => i.id === itemId) || currentCatalogItems.find(i => i.id === itemId);
        if (!item) return;
        const canvasCenter = { x: (-viewTransform.translate.x + window.innerWidth / 2) / viewTransform.scale, y: (-viewTransform.translate.y + window.innerHeight / 2) / viewTransform.scale, };
        
        if (item.type === CatalogItemType.GROUP && item.nodes && item.connections) {
             handleAddGroupFromTemplate({ name: item.name, nodes: item.nodes, connections: item.connections }, canvasCenter);
        }
        
        handleCloseCatalog();
    }, [catalogItems, currentCatalogItems, viewTransform, handleAddGroupFromTemplate, handleCloseCatalog]);
    
    // Updated to be async to handle Promise<void>
    const handleApplyAliases = useCallback(async (nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (node?.type === NodeType.SCRIPT_ANALYZER) {
            await geminiContext.handleApplyAliasesForScriptAnalyzer(nodeId);
        } else if (node?.type === NodeType.CHARACTER_GENERATOR) {
            await geminiContext.handleApplyAliasesForCharacterGenerator(nodeId);
        }
    }, [nodes, geminiContext]);
    
    const handleDetachCharacter = useCallback((characterData: any, generatorNode: Node) => {
        if (!characterData || !generatorNode) return;

        nodeIdCounter.current++;
        const newNodeId = `node-${nodeIdCounter.current}-${Date.now()}`;
        
        // Create basic imageSources if image exists
        const imageSources: Record<string, string | null> = {};
        if (characterData.imageBase64) {
            imageSources['1:1'] = characterData.imageBase64;
        }

        const newNodeValue = JSON.stringify([{
            id: `char-card-${Date.now()}`,
            name: characterData.name || 'New Entity',
            index: characterData.index || characterData.alias || 'Entity-1', // Default to Entity
            imageSources: imageSources,
            selectedRatio: '1:1',
            prompt: characterData.prompt || '',
            fullDescription: characterData.fullDescription || '',
            isOutput: true
        }]);

        const newNode = {
            id: newNodeId,
            type: NodeType.CHARACTER_CARD,
            position: {
                x: generatorNode.position.x + generatorNode.width + 60,
                y: generatorNode.position.y,
            },
            value: newNodeValue,
            title: characterData.name || t('node.title.character_card'),
            width: 460,
            height: 1000,
        };

        setNodes(current => [...current, newNode]);
     }, [nodeIdCounter, setNodes, t]);

    const addCharacterCardFromFile = useCallback((cardData: any, position: Point) => {
        const processCard = (data: any) => {
             const loadedSources: Record<string, string | null> = {};
             if (data.imageSources) {
                 Object.keys(data.imageSources).forEach(key => {
                    const val = data.imageSources[key];
                    if (typeof val === 'string' && val.startsWith('data:image')) {
                        loadedSources[key] = val.split(',')[1];
                    } else {
                        loadedSources[key] = val;
                    }
                });
             }
             
             let mainImage = data.image;
             if (typeof mainImage === 'string' && mainImage.startsWith('data:image')) {
                 mainImage = mainImage.split(',')[1];
             }
             if (!loadedSources['1:1']) {
                 loadedSources['1:1'] = mainImage;
             }

             return {
                id: data.id || `char-card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: data.name || 'Loaded Entity',
                index: data.index || data.alias || 'Entity-1', // Default to Entity
                imageSources: loadedSources,
                selectedRatio: data.selectedRatio || '1:1',
                prompt: data.prompt || '',
                additionalPrompt: data.additionalPrompt || "Full body character concept on a gray background",
                fullDescription: data.fullDescription || '',
                targetLanguage: data.targetLanguage || 'en',
                isOutput: !!data.isOutput,
                isDescriptionCollapsed: !!data.isDescriptionCollapsed
             };
        };

        let cardsToProcess: any[] = [];
        let title = t('node.title.character_card');

        if (Array.isArray(cardData)) {
            cardsToProcess = cardData.map(processCard);
            if (cardsToProcess.length > 0 && cardData[0].nodeTitle) title = cardData[0].nodeTitle;
            else if (cardsToProcess.length > 1) title = `${t('node.title.character_card')} (${cardsToProcess.length})`;
        } else {
            if (cardData.type !== 'character-card' && !cardData.name) return;
            cardsToProcess = [processCard(cardData)];
            title = cardData.title || cardData.nodeTitle || cardData.name || t('node.title.character_card');
        }

        nodeIdCounter.current++;
        const newNodeId = `node-${nodeIdCounter.current}-${Date.now()}`;
        
        const newNode = {
            id: newNodeId,
            type: NodeType.CHARACTER_CARD,
            position: position,
            value: JSON.stringify(cardsToProcess),
            title: title,
            width: Math.max(460, cardsToProcess.length * 420), // 420 is NODE_WIDTH_STEP
            height: 1000,
        };

        setNodes(current => [...current, newNode]);
    }, [nodeIdCounter, setNodes, t]);

    const addImagePreviewNodeFromFile = useCallback((file: File, position: Point) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const result = event.target?.result as string;
            if (result) {
                const base64String = result.split(',')[1];
                
                nodeIdCounter.current++;
                const newNodeId = `node-${nodeIdCounter.current}-${Date.now()}`;
                
                const newNodeValue = JSON.stringify({ imageBase64: base64String });
                const nodeTitle = file.name.replace(/\.[^/.]+$/, "") || t('node.title.image_preview');

                const newNode = {
                    id: newNodeId,
                    type: NodeType.IMAGE_PREVIEW,
                    position: position,
                    value: newNodeValue,
                    title: nodeTitle,
                    width: 300,
                    height: 340,
                };
                setNodes(current => [...current, newNode]);
            }
        };
        reader.readAsDataURL(file);
    }, [nodeIdCounter, setNodes, t]);

    const handlePasteFromClipboard = useCallback(async () => {
        try {
            const clipboardItems = await navigator.clipboard.read().catch(() => []);
            
            const pastePosition = {
                x: (clientPointerPositionRef.current.x - viewTransform.translate.x) / viewTransform.scale,
                y: (clientPointerPositionRef.current.y - viewTransform.translate.y) / viewTransform.scale,
            };

            // 1. Check if a single YouTube Analytics node is selected
            if (selectedNodeIds.length === 1) {
                const targetNode = nodes.find(n => n.id === selectedNodeIds[0]);
                if (targetNode && targetNode.type === NodeType.YOUTUBE_ANALYTICS) {
                     for (const item of clipboardItems) {
                        const imageType = item.types.find(type => type.startsWith('image/'));
                        if (imageType) {
                            // Let the youtube analytics node logic inside useCanvasEvents (handleDrop) or handle internal paste logic if moved there.
                        }
                    }
                }
            }

            // 2. Check if a single CHARACTER_CARD node is selected (to update it)
            if (selectedNodeIds.length === 1) {
                const targetNode = nodes.find(n => n.id === selectedNodeIds[0]);
                if (targetNode && targetNode.type === NodeType.CHARACTER_CARD) {
                    for (const item of clipboardItems) {
                        if (item.types.includes('text/plain')) {
                            const blob = await item.getType('text/plain');
                            const text = await blob.text();
                            try {
                                const parsed = JSON.parse(text);
                                
                                // Handling array paste into existing node? 
                                // Or single card update?
                                // If it is an array of cards, we might want to APPEND them or REPLACE.
                                // For now, let the existing logic handle array structure
                                
                                let cardData = parsed;
                                if (Array.isArray(parsed) && parsed.length > 0) {
                                     // If pasting an array into an existing node, maybe we append?
                                     // Or if it's a single card inside array.
                                     cardData = parsed[0]; // Take first for single update logic, OR implement merge
                                }

                                if (cardData.type === 'character-card' || (cardData.name && cardData.fullDescription)) {
                                    const parsedValue = JSON.parse(targetNode.value || '[]');
                                    const currentCards = Array.isArray(parsedValue) ? parsedValue : [parsedValue];
                                    
                                    // Append new card
                                    const newCard = {
                                        ...cardData,
                                        id: `char-card-${Date.now()}`,
                                        index: cardData.index || cardData.alias || `Entity-${currentCards.length + 1}`
                                    };
                                    delete newCard.alias;

                                    if (cardData.imageSources) {
                                         Object.keys(cardData.imageSources).forEach(k => {
                                             if (cardData.imageSources[k] && cardData.imageSources[k].startsWith('data:image')) {
                                                 cardData.imageSources[k] = cardData.imageSources[k].split(',')[1];
                                             }
                                         });
                                         newCard.imageSources = cardData.imageSources;
                                    }

                                    const updated = [...currentCards, newCard];
                                    handleValueChange(targetNode.id, JSON.stringify(updated));
                                    
                                    // Update width
                                    setNodes(nds => nds.map(n => n.id === targetNode.id ? { ...n, width: updated.length * 420 } : n));
                                    
                                    addToast(t('toast.charLoaded'), 'success', clientPointerPositionRef.current);
                                    return;
                                }
                            } catch {}
                        }
                    }
                }
            }

            // Standard Paste Logic (Global)
            
            // 3. Check for Image Files in Clipboard
            for (const item of clipboardItems) {
                const imageType = item.types.find(type => type.startsWith('image/'));
                if (imageType) {
                    const blob = await item.getType(imageType);
                    const file = new File([blob], "pasted_image.png", { type: imageType });
                    addImagePreviewNodeFromFile(file, pastePosition);
                    addToast(t('toast.pasted'), 'success', clientPointerPositionRef.current);
                    return; // Stop after pasting image
                }
            }
            
            // 4. Text / JSON / Base64 String
            // Fallback for Firefox or if read() didn't find image, try readText
            const text = await navigator.clipboard.readText().catch(() => '');
            
            if (text) {
                // Check if text is a Base64 Data URI for an image
                // Common format: "data:image/png;base64,..."
                if (text.startsWith('data:image/') && text.includes('base64,')) {
                     const base64Data = text.split(',')[1];
                     const newNodeValue = JSON.stringify({ imageBase64: base64Data });
                     
                     nodeIdCounter.current++;
                     const newNodeId = `node-${nodeIdCounter.current}-${Date.now()}`;
                     const newNode = {
                        id: newNodeId,
                        type: NodeType.IMAGE_PREVIEW,
                        position: pastePosition,
                        value: newNodeValue,
                        title: t('node.title.image_preview'),
                        width: 300,
                        height: 340,
                     };
                     setNodes(current => [...current, newNode]);
                     addToast(t('toast.pasted'), 'success', clientPointerPositionRef.current);
                     return;
                }

                // Check for JSON Nodes/Groups
                try {
                    const parsed = JSON.parse(text);
                    // Check for Group Paste
                    if (parsed.type === 'group' || parsed.type === 'scriptModifierGroup') {
                        handleAddGroupFromTemplate(parsed, pastePosition);
                        addToast(t('toast.pasted'), 'success', clientPointerPositionRef.current);
                        return;
                    }
                    // Check for Character Card JSON on global paste -> Create NEW node (Array or Single)
                    if (Array.isArray(parsed) && parsed.length > 0 && (parsed[0].type === 'character-card' || parsed[0].name)) {
                         addCharacterCardFromFile(parsed, pastePosition);
                         addToast(t('toast.charLoaded'), 'success', clientPointerPositionRef.current);
                         return;
                    }
                    // Single card legacy check
                    if (parsed.type === 'character-card' || (parsed.name && parsed.fullDescription)) {
                        addCharacterCardFromFile(parsed, pastePosition);
                        addToast(t('toast.charLoaded'), 'success', clientPointerPositionRef.current);
                        return;
                    }
                    // Check for YouTube Analytics data
                    if (parsed.type === 'youtube-analytics-data') {
                         onAddNode(NodeType.YOUTUBE_ANALYTICS, pastePosition, text, parsed.title);
                         addToast(t('toast.pasted'), 'success', clientPointerPositionRef.current);
                         return;
                    }
                    
                    // Check for Music Idea data
                    if (parsed.type === 'music-idea-data') {
                         onAddNode(NodeType.MUSIC_IDEA_GENERATOR, pastePosition, text, parsed.title);
                         addToast(t('toast.pasted'), 'success', clientPointerPositionRef.current);
                         return;
                    }
                    
                    // Check for Image Preview JSON (imageBase64)
                    if (parsed.imageBase64 && typeof parsed.imageBase64 === 'string') {
                         nodeIdCounter.current++;
                         const newNodeId = `node-${nodeIdCounter.current}-${Date.now()}`;
                         const newNode = {
                            id: newNodeId,
                            type: NodeType.IMAGE_PREVIEW,
                            position: pastePosition,
                            value: text, // The original JSON string is exactly what this node needs
                            title: t('node.title.image_preview'),
                            width: 300,
                            height: 340,
                         };
                         setNodes(current => [...current, newNode]);
                         addToast(t('toast.pasted'), 'success', clientPointerPositionRef.current);
                         return;
                    }

                } catch {}

                // Fallback for Plain Text Input
                onAddNode(NodeType.TEXT_INPUT, pastePosition, text);
                addToast(t('toast.pasted'), 'success', clientPointerPositionRef.current);
                return;
            }

        } catch (err) {
            console.error('Failed to read clipboard contents: ', err);
            geminiContext.setError('Could not read from clipboard. Permission might be denied.');
        }
    }, [clientPointerPositionRef, viewTransform, onAddNode, geminiContext, selectedNodeIds, nodes, handleValueChange, addToast, t, addCharacterCardFromFile, handleAddGroupFromTemplate, setNodes, addImagePreviewNodeFromFile, nodeIdCounter]);
    
    const handleDuplicateNodeEmptyWrapper = useCallback((nodeId: string) => {
        return handleDuplicateNodeEmpty(nodeId, t);
    }, [handleDuplicateNodeEmpty, t]);

    return {
        onAddNode,
        handleAddNodeFromToolbar,
        deleteNodeAndConnections,
        handleSplitConnection,
        handleGroupSelection,
        handleRemoveGroup,
        handleSaveGroupToCatalog,
        handleSaveGroupToDisk,
        handleCopyGroup,
        handleDuplicateGroup,
        handleAddGroupFromCatalog,
        handleApplyAliases,
        handleDetachCharacter,
        addCharacterCardFromFile,
        addImagePreviewNodeFromFile,
        handlePasteFromClipboard,
        handleAddGroupFromTemplate,
        handleDuplicateNode,
        handleDuplicateNodeEmpty: handleDuplicateNodeEmptyWrapper,
        saveDataToCatalog,
    };
};
