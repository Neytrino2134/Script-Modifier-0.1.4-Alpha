
import React, { useState, useCallback, useEffect, MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent, useRef } from 'react';
import { Node, Point, Connection, Group, NodeType, Tool, ConnectingInfo } from '../types';
import { getOutputHandleType, getInputHandleType } from '../utils/nodeUtils';

interface ResizingInfo {
    nodeId: string;
    startPosition: Point;
    startSize: { width: number; height: number };
}

interface DraggingInfo {
    type: 'node' | 'group';
    id: string;
    offsets: Map<string, Point>; // Map of nodeId -> offset
}

interface PanInfo {
    startPoint: Point;
    startTranslate: Point;
}

interface DollyZoomInfo {
    startX: number;
    startScale: number;
    pivot: Point;
}

interface UseInteractionProps {
    nodes: Node[];
    setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
    groups: Group[];
    setGroups: React.Dispatch<React.SetStateAction<Group[]>>;
    addConnection: (connection: Omit<Connection, 'id'> & { fromPointOffset?: Point }, fromNode: Node) => void;
    connections: Connection[];
    setConnections: React.Dispatch<React.SetStateAction<Connection[]>>;
    viewTransform: { scale: number; translate: Point };
    updatePointerPosition: (e: { clientX: number, clientY: number }) => void;
    pan: (e: globalThis.MouseEvent) => void;
    isPanning: PanInfo | null;
    startPanning: (e: ReactMouseEvent<HTMLDivElement>) => void;
    stopPanning: () => void;
    isSnapToGrid: boolean;
    onAddNode: (type: NodeType, position: Point, t: (key: string) => string) => string;
    removeConnectionsByNodeId: (nodeId: string) => void;
    setZoom: (newScale: number, pivot: Point) => void;
    triggerClearSelections: () => void;
    t: (key: string) => string;
    clientPointerPosition: Point;
    handleExtractNodeFromGroup: (nodeId: string) => void;
    clientPointerPositionRef: React.RefObject<Point>;
    isQuickAddOpen: boolean;
    handleCloseAddNodeMenus: () => void;
    openRadialMenu: (position: Point) => void;
    onConnectionReleased: (info: ConnectingInfo, position: Point) => void;
}

const GRID_SIZE = 20;
const HEADER_HEIGHT = 40;

// Helper to recalculate groups based on a list of nodes (for online resizing)
const recalculateGroups = (groups: Group[], nodes: Node[]): Group[] => {
    return groups.map(group => {
        const memberNodes = nodes.filter(n => group.nodeIds.includes(n.id));
        if (memberNodes.length === 0) return group;

        const padding = 30;
        const paddingTop = 70;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        memberNodes.forEach(node => {
            minX = Math.min(minX, node.position.x);
            minY = Math.min(minY, node.position.y);
            maxX = Math.max(maxX, node.position.x + node.width);
            const nodeHeight = node.isCollapsed ? HEADER_HEIGHT : node.height;
            maxY = Math.max(maxY, node.position.y + nodeHeight);
        });

        const newX = minX - padding;
        const newY = minY - paddingTop;
        const newWidth = maxX - minX + padding * 2;
        const newHeight = (maxY - minY) + paddingTop + padding;

        if (group.position.x === newX && group.position.y === newY && group.width === newWidth && group.height === newHeight) {
            return group;
        }

        return {
            ...group,
            position: { x: newX, y: newY },
            width: newWidth,
            height: newHeight,
        };
    });
};

export const useInteraction = ({
    nodes, setNodes, groups, setGroups, addConnection, connections,
    setConnections,
    viewTransform, updatePointerPosition, pan, isPanning, startPanning, stopPanning, isSnapToGrid,
    onAddNode, removeConnectionsByNodeId, setZoom, triggerClearSelections, t, clientPointerPosition,
    clientPointerPositionRef,
    handleExtractNodeFromGroup,
    isQuickAddOpen,
    handleCloseAddNodeMenus,
    openRadialMenu,
    onConnectionReleased,
}: UseInteractionProps) => {
    const [activeTool, setActiveTool] = useState<Tool>('edit');
    const [draggingInfo, setDraggingInfo] = useState<DraggingInfo | null>(null);
    const [resizingInfo, setResizingInfo] = useState<ResizingInfo | null>(null);
    const [connectingInfo, setConnectingInfo] = useState<ConnectingInfo | null>(null);
    const [dollyZoomingInfo, setDollyZoomingInfo] = useState<DollyZoomInfo | null>(null);
    const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
    const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
    const [hoveredGroupIdForDrop, setHoveredGroupIdForDrop] = useState<string | null>(null);
    const [selectionRect, setSelectionRect] = useState<{ start: Point; end: Point } | null>(null);
    const [isShiftDown, setIsShiftDown] = useState(false);
    const [isCtrlDown, setIsCtrlDown] = useState(false);
    const [isAltDown, setIsAltDown] = useState(false);
    const [isZDown, setIsZDown] = useState(false);
    const [connectionTarget, setConnectionTarget] = useState<{ nodeId: string; handleId?: string } | null>(null);
    const [extractionTarget, setExtractionTarget] = useState<string | null>(null);

    const nodesRef = useRef(nodes);
    useEffect(() => {
        nodesRef.current = nodes;
    }, [nodes]);

    const resetModifiers = useCallback(() => {
        setIsShiftDown(false);
        setIsCtrlDown(false);
        setIsAltDown(false);
        setIsZDown(false);
        setSelectionRect(null);
        setExtractionTarget(null);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

            if (e.key === 'Shift' && !e.repeat) setIsShiftDown(true);
            if (e.key === 'Control' && !e.repeat) setIsCtrlDown(true);
            if (e.key === 'Alt' && !e.repeat) setIsAltDown(true);
            if (e.code === 'KeyZ' && !e.repeat) setIsZDown(true);
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'Shift') {
                setIsShiftDown(false);
                if (selectionRect) setSelectionRect(null);
            }
            if (e.key === 'Control') setIsCtrlDown(false);
            if (e.key === 'Alt') {
                setIsAltDown(false);
                setExtractionTarget(null);
            }
            if (e.code === 'KeyZ') setIsZDown(false);
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('blur', resetModifiers);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('blur', resetModifiers);
        };
    }, [selectionRect, resetModifiers]);

    const effectiveTool: Tool =
        isZDown ? 'zoom' :
            activeTool === 'edit'
                ? isCtrlDown && isAltDown
                    ? 'reroute'
                    : isCtrlDown
                        ? 'cutter'
                        : isShiftDown
                            ? 'selection'
                            : 'edit'
                : activeTool;

    useEffect(() => {
        if (connectingInfo && hoveredNodeId) {
            const targetNode = nodes.find(n => n.id === hoveredNodeId);
            if (targetNode && targetNode.id !== connectingInfo.fromNodeId) {
                if (targetNode.type === NodeType.SCRIPT_PROMPT_MODIFIER) {
                    const toType = getInputHandleType(targetNode);
                    if (connectingInfo.fromType === toType) {
                        setConnectionTarget({ nodeId: targetNode.id });
                        return;
                    }
                }
                if (targetNode.type === NodeType.REROUTE_DOT) {
                    const hasExistingInput = connections.some(c => c.toNodeId === hoveredNodeId);
                    if (!hasExistingInput) {
                        setConnectionTarget({ nodeId: targetNode.id });
                    }
                    return;
                }
                const toType = getInputHandleType(targetNode);
                if (connectingInfo.fromType && connectingInfo.fromType === toType) {
                    setConnectionTarget({ nodeId: targetNode.id, handleId: undefined });
                    return;
                }
            }
        }
        setConnectionTarget(null);
    }, [connectingInfo, hoveredNodeId, nodes, connections]);

    const deselectAllNodes = useCallback(() => {
        setSelectedNodeIds([]);
        triggerClearSelections();
    }, [triggerClearSelections]);

    const startNodeDrag = useCallback((nodeId: string, clientX: number, clientY: number, isShift: boolean) => {
        if (isQuickAddOpen) {
            handleCloseAddNodeMenus();
        }
        if (document.activeElement instanceof HTMLElement) {
            (document.activeElement as HTMLElement).blur();
        }
        if (effectiveTool !== 'edit' && effectiveTool !== 'selection' && effectiveTool !== 'reroute') return;

        const isSelected = selectedNodeIds.includes(nodeId);
        let newSelectedIds = [...selectedNodeIds];

        if (isShift || activeTool === 'selection') {
            if (isSelected) {
                newSelectedIds = newSelectedIds.filter(id => id !== nodeId);
            } else {
                newSelectedIds.push(newSelectedIds.includes(nodeId) ? [] : [nodeId] as any);
                // The above line had a bug in the original, should be:
                if (!newSelectedIds.includes(nodeId)) newSelectedIds.push(nodeId);
            }
        } else {
            if (!isSelected) {
                newSelectedIds = [nodeId];
                triggerClearSelections();
            }
        }
        setSelectedNodeIds(newSelectedIds);

        const nodesToDrag = newSelectedIds.includes(nodeId) ? newSelectedIds : [nodeId];
        const offsets = new Map<string, Point>();
        const transformedClientX = (clientX - viewTransform.translate.x) / viewTransform.scale;
        const transformedClientY = (clientY - viewTransform.translate.y) / viewTransform.scale;

        nodes.forEach(n => {
            if (nodesToDrag.includes(n.id)) {
                offsets.set(n.id, {
                    x: transformedClientX - n.position.x,
                    y: transformedClientY - n.position.y,
                });
            }
        });
        setDraggingInfo({ type: 'node', id: nodeId, offsets });
    }, [isQuickAddOpen, handleCloseAddNodeMenus, effectiveTool, selectedNodeIds, activeTool, triggerClearSelections, viewTransform, nodes]);

    const handleNodeMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>, nodeId: string) => {
        if (e.altKey) {
            e.preventDefault();
            e.stopPropagation();
            handleExtractNodeFromGroup(nodeId);
            return;
        }

        e.preventDefault();
        e.stopPropagation();
        startNodeDrag(nodeId, e.clientX, e.clientY, e.shiftKey);
    }, [startNodeDrag, handleExtractNodeFromGroup]);

    const handleNodeTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>, nodeId: string) => {
        e.stopPropagation();
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            startNodeDrag(nodeId, touch.clientX, touch.clientY, false);
        }
    }, [startNodeDrag]);

    const handleGroupMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>, groupId: string) => {
        if (effectiveTool !== 'edit' && effectiveTool !== 'selection' && effectiveTool !== 'reroute') return;
        e.preventDefault();
        e.stopPropagation();

        const group = groups.find(g => g.id === groupId);
        if (!group) return;

        const offsets = new Map<string, Point>();
        const transformedClientX = (e.clientX - viewTransform.translate.x) / viewTransform.scale;
        const transformedClientY = (e.clientY - viewTransform.translate.y) / viewTransform.scale;

        offsets.set(groupId, {
            x: transformedClientX - group.position.x,
            y: transformedClientY - group.position.y
        });

        nodes.forEach(n => {
            if (group.nodeIds.includes(n.id)) {
                offsets.set(n.id, {
                    x: transformedClientX - n.position.x,
                    y: transformedClientY - n.position.y,
                });
            }
        });

        setDraggingInfo({ type: 'group', id: groupId, offsets });
    }, [nodes, groups, viewTransform, effectiveTool]);

    const handleGroupTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>, groupId: string) => {
        if (e.touches.length !== 1) return;
        e.stopPropagation();
        const touch = e.touches[0];

        if (effectiveTool !== 'edit' && effectiveTool !== 'selection' && effectiveTool !== 'reroute') return;

        const group = groups.find(g => g.id === groupId);
        if (!group) return;

        const offsets = new Map<string, Point>();
        const transformedClientX = (touch.clientX - viewTransform.translate.x) / viewTransform.scale;
        const transformedClientY = (touch.clientY - viewTransform.translate.y) / viewTransform.scale;

        offsets.set(groupId, {
            x: transformedClientX - group.position.x,
            y: transformedClientY - group.position.y
        });

        nodes.forEach(n => {
            if (group.nodeIds.includes(n.id)) {
                offsets.set(n.id, {
                    x: transformedClientX - n.position.x,
                    y: transformedClientY - n.position.y,
                });
            }
        });

        setDraggingInfo({ type: 'group', id: groupId, offsets });
    }, [nodes, groups, viewTransform, effectiveTool]);

    const handleNodeResizeMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>, nodeId: string) => {
        if (effectiveTool !== 'edit' && effectiveTool !== 'selection' && effectiveTool !== 'reroute') return;
        e.preventDefault();
        e.stopPropagation();

        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }

        const node = nodes.find(n => n.id === nodeId);
        if (node) {
            setResizingInfo({
                nodeId,
                startPosition: { x: e.clientX, y: e.clientY },
                startSize: { width: node.width, height: node.height },
            });
        }
    }, [nodes, effectiveTool]);

    const handleNodeResizeTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>, nodeId: string) => {
        if (e.touches.length !== 1) return;
        e.stopPropagation();
        const touch = e.touches[0];

        if (effectiveTool !== 'edit' && effectiveTool !== 'selection' && effectiveTool !== 'reroute') return;

        const node = nodes.find(n => n.id === nodeId);
        if (node) {
            setResizingInfo({
                nodeId,
                startPosition: { x: touch.clientX, y: touch.clientY },
                startSize: { width: node.width, height: node.height },
            });
        }
    }, [nodes, effectiveTool]);

    const startConnection = useCallback((nodeId: string, handleId: string | undefined, clientRect: DOMRect) => {
        if (effectiveTool !== 'edit' && effectiveTool !== 'reroute') return;

        const fromNode = nodes.find(n => n.id === nodeId);
        if (!fromNode) return;

        const fromType = getOutputHandleType(fromNode, handleId);

        const fromPoint = {
            x: (clientRect.left + clientRect.width / 2 - viewTransform.translate.x) / viewTransform.scale,
            y: (clientRect.top + clientRect.height / 2 - viewTransform.translate.y) / viewTransform.scale
        };
        setConnectingInfo({ fromNodeId: nodeId, fromPoint, fromHandleId: handleId, fromType });
    }, [effectiveTool, viewTransform, nodes]);

    const handleStartConnection = useCallback((e: React.MouseEvent<HTMLDivElement>, fromNodeId: string, fromHandleId?: string) => {
        e.preventDefault();
        e.stopPropagation();
        startConnection(fromNodeId, fromHandleId, e.currentTarget.getBoundingClientRect());
    }, [startConnection]);

    const handleStartConnectionTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>, fromNodeId: string, fromHandleId?: string) => {
        if (e.touches.length !== 1) return;
        e.stopPropagation();
        startConnection(fromNodeId, fromHandleId, e.currentTarget.getBoundingClientRect());
    }, [startConnection]);

    const handleNodeClick = useCallback((nodeId: string) => {
        removeConnectionsByNodeId(nodeId);
    }, [removeConnectionsByNodeId]);

    const getTransformedPoint = useCallback((e: { clientX: number, clientY: number }): Point => {
        return {
            x: (e.clientX - viewTransform.translate.x) / viewTransform.scale,
            y: (e.clientY - viewTransform.translate.y) / viewTransform.scale,
        };
    }, [viewTransform.scale, viewTransform.translate.x, viewTransform.translate.y]);

    const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (isQuickAddOpen) {
            handleCloseAddNodeMenus();
        }
        if (document.activeElement instanceof HTMLElement) {
            (document.activeElement as HTMLElement).blur();
        }

        if (e.target !== e.currentTarget) return;

        (e.currentTarget as HTMLElement).focus();

        if (effectiveTool === 'zoom') {
            e.preventDefault();
            e.stopPropagation();
            setDollyZoomingInfo({
                startX: e.clientX,
                startScale: viewTransform.scale,
                pivot: { x: e.clientX, y: e.clientY }
            });
            return;
        }

        const position = getTransformedPoint(e);

        if (effectiveTool === 'selection') {
            e.preventDefault();
            e.stopPropagation();
            const startPoint = position;
            setSelectionRect({ start: startPoint, end: startPoint });

            if (!e.shiftKey && activeTool !== 'selection') {
                setSelectedNodeIds([]);
                triggerClearSelections();
            }

        } else if (effectiveTool === 'edit' || effectiveTool === 'cutter' || effectiveTool === 'reroute') {
            e.preventDefault();
            e.stopPropagation();
            startPanning(e);
            setSelectedNodeIds([]);
            triggerClearSelections();
        }
    }, [isQuickAddOpen, handleCloseAddNodeMenus, activeTool, isShiftDown, effectiveTool, getTransformedPoint, startPanning, triggerClearSelections, viewTransform.scale]);

    const getNormalizedRect = useCallback((start: Point, end: Point) => {
        const x = Math.min(start.x, end.x);
        const y = Math.min(start.y, end.y);
        const width = Math.abs(start.x - end.x);
        const height = Math.abs(start.y - end.y);
        return { x, y, width, height };
    }, []);

    const isIntersecting = (nodeRect: { x: number, y: number, width: number, height: number }, selection: { x: number, y: number, width: number, height: number }) => {
        return (
            nodeRect.x < selection.x + selection.width &&
            nodeRect.x + nodeRect.width > selection.x &&
            nodeRect.y < selection.y + selection.height &&
            nodeRect.y + nodeRect.height > selection.y
        );
    };

    const handlePointerMove = useCallback((pointer: { clientX: number, clientY: number }) => {
        updatePointerPosition(pointer);

        if (dollyZoomingInfo) {
            const dx = pointer.clientX - dollyZoomingInfo.startX;
            const zoomFactor = Math.pow(1.005, dx);
            const newScale = dollyZoomingInfo.startScale * zoomFactor;

            const pivot = dollyZoomingInfo.pivot;
            setZoom(newScale, pivot);
            return;
        }

        if (isPanning) {
            pan(pointer as MouseEvent);
            return;
        }

        if (selectionRect) {
            const currentPoint = getTransformedPoint(pointer);
            setSelectionRect(prev => prev ? { ...prev, end: currentPoint } : null);
            return;
        }

        if (draggingInfo) {
            const rawX = (pointer.clientX - viewTransform.translate.x) / viewTransform.scale;
            const rawY = (pointer.clientY - viewTransform.translate.y) / viewTransform.scale;

            if (draggingInfo.type === 'node') {
                setNodes(currentNodes => {
                    const updatedNodes = currentNodes.map(n => {
                        const offset = draggingInfo.offsets.get(n.id);
                        if (offset) {
                            let newPosX = rawX - offset.x;
                            let newPosY = rawY - offset.y;
                            if (isSnapToGrid) {
                                newPosX = Math.round(newPosX / GRID_SIZE) * GRID_SIZE;
                                newPosY = Math.round(newPosY / GRID_SIZE) * GRID_SIZE;
                            }
                            return { ...n, position: { x: newPosX, y: newPosY } };
                        }
                        return n;
                    });

                    setGroups(currentGroups => recalculateGroups(currentGroups, updatedNodes));

                    return updatedNodes;
                });

                const draggedNodeId = draggingInfo.id;
                const draggedNode = nodes.find(n => n.id === draggedNodeId);
                const offset = draggingInfo.offsets.get(draggedNodeId);

                if (draggedNode && offset) {
                    const nodeCurrentPos = { x: rawX - offset.x, y: rawY - offset.y };

                    const effectiveHeight = draggedNode.isCollapsed ? HEADER_HEIGHT : draggedNode.height;
                    const nodeCenter = {
                        x: nodeCurrentPos.x + draggedNode.width / 2,
                        y: nodeCurrentPos.y + effectiveHeight / 2
                    };

                    if (isAltDown) {
                        const group = groups.find(g => g.nodeIds.includes(draggedNodeId));
                        if (group) {
                            const isOutside = nodeCenter.x < group.position.x ||
                                nodeCenter.x > group.position.x + group.width ||
                                nodeCenter.y < group.position.y ||
                                nodeCenter.y > group.position.y + group.height;
                            if (isOutside) {
                                setExtractionTarget(draggedNodeId);
                                setHoveredGroupIdForDrop(null);
                                return;
                            }
                        }
                    }

                    setExtractionTarget(null);
                    let foundGroup: string | null = null;

                    // --- NEW INTERSECTION LOGIC ---
                    const nodeW = draggedNode.width;
                    const nodeH = effectiveHeight;

                    // Calculate the "inner box" of the node (5% inset from each side)
                    // The node's current position is `nodeCurrentPos.x` and `nodeCurrentPos.y`
                    const insetX = nodeW * 0.05;
                    const insetY = nodeH * 0.05;

                    const hitLeft = nodeCurrentPos.x + insetX;
                    const hitRight = nodeCurrentPos.x + nodeW - insetX;
                    const hitTop = nodeCurrentPos.y + insetY;
                    const hitBottom = nodeCurrentPos.y + nodeH - insetY;

                    for (const group of groups) {
                        if (group.nodeIds.includes(draggedNodeId)) continue;

                        const groupLeft = group.position.x;
                        const groupRight = group.position.x + group.width;
                        const groupTop = group.position.y;
                        const groupBottom = group.position.y + group.height;

                        // Check for rectangle intersection
                        // A overlaps B if (A.Left < B.Right) && (A.Right > B.Left) && (A.Top < B.Bottom) && (A.Bottom > B.Top)
                        const isOverlapping =
                            hitLeft < groupRight &&
                            hitRight > groupLeft &&
                            hitTop < groupBottom &&
                            hitBottom > groupTop;

                        if (isOverlapping) {
                            foundGroup = group.id;
                            break;
                        }
                    }
                    setHoveredGroupIdForDrop(foundGroup);
                }
            } else if (draggingInfo.type === 'group') {
                const groupOffset = draggingInfo.offsets.get(draggingInfo.id);
                if (groupOffset) {
                    let newGroupX = rawX - groupOffset.x;
                    let newGroupY = rawY - groupOffset.y;
                    if (isSnapToGrid) {
                        newGroupX = Math.round(newGroupX / GRID_SIZE) * GRID_SIZE;
                        newGroupY = Math.round(newGroupY / GRID_SIZE) * GRID_SIZE;
                    }
                    setGroups(currentGroups => currentGroups.map(g =>
                        g.id === draggingInfo.id ? { ...g, position: { x: newGroupX, y: newGroupY } } : g
                    ));
                }
                setNodes(currentNodes => currentNodes.map(n => {
                    const offset = draggingInfo.offsets.get(n.id);
                    if (offset) {
                        let newPosX = rawX - offset.x;
                        let newPosY = rawY - offset.y;
                        if (isSnapToGrid) {
                            newPosX = Math.round(newPosX / GRID_SIZE) * GRID_SIZE;
                            newPosY = Math.round(newPosY / GRID_SIZE) * GRID_SIZE;
                        }
                        return { ...n, position: { x: newPosX, y: newPosY } };
                    }
                    return n;
                }));
            }
        } else if (resizingInfo) {
            const { nodeId, startPosition, startSize } = resizingInfo;
            const node = nodes.find(n => n.id === nodeId);
            if (!node) return;

            let minWidth = 200;
            let minHeight = 150;
            switch (node.type) {
                case NodeType.TEXT_INPUT:
                    minWidth = 460; minHeight = 280; break;
                case NodeType.PROMPT_PROCESSOR:
                    minWidth = 460; minHeight = 280; break;
                case NodeType.PROMPT_ANALYZER:
                    minWidth = 460; minHeight = 1000; break;
                case NodeType.CHARACTER_ANALYZER:
                    minWidth = 460; minHeight = 500; break;
                case NodeType.CHARACTER_GENERATOR:
                    minWidth = 460; minHeight = 800; break;
                case NodeType.IMAGE_GENERATOR:
                    minWidth = 400; minHeight = 520; break;
                case NodeType.IMAGE_PREVIEW:
                    minWidth = 300; minHeight = 340; break;
                case NodeType.CHARACTER_CARD:
                    minWidth = 460; minHeight = 1000; break;
                case NodeType.GEMINI_CHAT:
                    minWidth = 400; minHeight = 640; break;
                case NodeType.PROMPT_MODIFIER:
                    minWidth = 460; minHeight = 800; break;
                case NodeType.TRANSLATOR:
                    minWidth = 380; minHeight = 640; break;
                case NodeType.SCRIPT_GENERATOR:
                    minWidth = 680; minHeight = 800; break;
                case NodeType.SCRIPT_ANALYZER:
                    minWidth = 680; minHeight = 800; break;
                case NodeType.SCRIPT_PROMPT_MODIFIER:
                    minWidth = 680; minHeight = 800; break;
                case NodeType.ERROR_ANALYZER:
                    minWidth = 380; minHeight = 280; break;
                case NodeType.DATA_READER:
                    minWidth = 380; minHeight = 280; break;
                case NodeType.NOTE:
                    minWidth = 440; minHeight = 640; break;
                case NodeType.SPEECH_SYNTHESIZER:
                    minWidth = 680; minHeight = 800; break;
                case NodeType.NARRATOR_TEXT_GENERATOR:
                    minWidth = 680; minHeight = 800; break;
                case NodeType.IDEA_GENERATOR:
                    minWidth = 680; minHeight = 800; break;
                case NodeType.REROUTE_DOT:
                    minWidth = 60; minHeight = 40; break;
                case NodeType.AUDIO_TRANSCRIBER:
                    minWidth = 400; minHeight = 480; break;
                case NodeType.YOUTUBE_TITLE_GENERATOR:
                    minWidth = 680; minHeight = 800; break;
                case NodeType.YOUTUBE_ANALYTICS:
                    minWidth = 1200; minHeight = 800; break;
                default:
                    minWidth = 200; minHeight = 150;
            }

            const dx = (pointer.clientX - startPosition.x) / viewTransform.scale;
            const dy = (pointer.clientY - startPosition.y) / viewTransform.scale;

            let newWidth = Math.max(minWidth, startSize.width + dx);
            let newHeight = Math.max(minHeight, startSize.height + dy);

            if (isSnapToGrid) {
                newWidth = Math.round(newWidth / GRID_SIZE) * GRID_SIZE;
                newHeight = Math.round(newHeight / GRID_SIZE) * GRID_SIZE;
            }

            setNodes(currentNodes => {
                const updatedNodes = currentNodes.map(n => n.id === nodeId ? { ...n, width: newWidth, height: newHeight } : n);
                setGroups(currentGroups => recalculateGroups(currentGroups, updatedNodes));
                return updatedNodes;
            });
        }
    }, [draggingInfo, resizingInfo, viewTransform, pan, updatePointerPosition, setNodes, setGroups, nodes, groups, selectionRect, getTransformedPoint, isSnapToGrid, setZoom, isPanning, dollyZoomingInfo, isAltDown]);

    const handlePointerUp = useCallback((e: { shiftKey?: boolean } | ReactMouseEvent | ReactTouchEvent) => {
        if (dollyZoomingInfo) {
            setDollyZoomingInfo(null);
        }

        if (selectionRect) {
            const normalizedRect = getNormalizedRect(selectionRect.start, selectionRect.end);

            if (normalizedRect.width > 5 || normalizedRect.height > 5) {
                const selectedIdsInRect = nodes
                    .filter(node => {
                        const effectiveHeight = node.isCollapsed ? HEADER_HEIGHT : node.height;
                        const nodeRect = { x: node.position.x, y: node.position.y, width: node.width, height: effectiveHeight };
                        return isIntersecting(nodeRect, normalizedRect);
                    })
                    .map(node => node.id);

                if ('shiftKey' in e && e.shiftKey) {
                    setSelectedNodeIds(prevIds => Array.from(new Set([...prevIds, ...selectedIdsInRect])));
                } else {
                    setSelectedNodeIds(selectedIdsInRect);
                }
            }
            setSelectionRect(null);
        }

        if (connectingInfo) {
            if (connectionTarget) {
                let finalConnectionTarget = { ...connectionTarget };
                const toNode = nodes.find(n => n.id === connectionTarget.nodeId);

                if (toNode && toNode.type === NodeType.SCRIPT_GENERATOR) {
                    const nodeTop = toNode.position.y * viewTransform.scale + viewTransform.translate.y;
                    const promptY = 95 * viewTransform.scale;
                    const charsY = 330 * viewTransform.scale;
                    const pointerYRelativeToNode = clientPointerPosition.y - nodeTop;
                    const midpoint = (promptY + charsY) / 2;

                    if (pointerYRelativeToNode < midpoint) {
                        finalConnectionTarget.handleId = 'prompt';
                    } else {
                        finalConnectionTarget.handleId = 'characters';
                    }
                }

                if (toNode && toNode.type === NodeType.SCRIPT_ANALYZER) {
                    finalConnectionTarget.handleId = undefined;
                }

                if (toNode && toNode.type === NodeType.SCRIPT_PROMPT_MODIFIER) {
                    const nodeTop = toNode.position.y * viewTransform.scale + viewTransform.translate.y;
                    const nodeHeight = toNode.height * viewTransform.scale;
                    const pointerYRelativeToNode = clientPointerPosition.y - nodeTop;

                    if (pointerYRelativeToNode < nodeHeight / 2) {
                        finalConnectionTarget.handleId = 'all-script-analyzer-data';
                    } else {
                        finalConnectionTarget.handleId = 'style';
                    }
                }

                let allowConnection = true;
                if (toNode && toNode.type === NodeType.REROUTE_DOT) {
                    if (connections.some(c => c.toNodeId === toNode.id)) {
                        allowConnection = false;
                    } else {
                        setNodes(prevNodes => prevNodes.map(n => {
                            if (n.id === toNode.id) {
                                return { ...n, value: JSON.stringify({ type: connectingInfo.fromType }) };
                            }
                            return n;
                        }));
                    }
                }
                if (allowConnection) {
                    const fromNode = nodes.find(n => n.id === connectingInfo.fromNodeId);
                    if (fromNode) {
                        const fromPointOffset = {
                            x: connectingInfo.fromPoint.x - fromNode.position.x,
                            y: connectingInfo.fromPoint.y - fromNode.position.y,
                        };
                        addConnection({
                            fromNodeId: connectingInfo.fromNodeId,
                            toNodeId: finalConnectionTarget.nodeId,
                            fromHandleId: connectingInfo.fromHandleId,
                            toHandleId: finalConnectionTarget.handleId,
                            fromPointOffset,
                        }, fromNode);
                    }
                }
            } else {
                let clientX: number | undefined;
                let clientY: number | undefined;

                if ('clientX' in e) {
                    clientX = (e as ReactMouseEvent).clientX;
                    clientY = (e as ReactMouseEvent).clientY;
                } else if ('changedTouches' in e && (e as ReactTouchEvent).changedTouches.length > 0) {
                    clientX = (e as ReactTouchEvent).changedTouches[0].clientX;
                    clientY = (e as ReactTouchEvent).changedTouches[0].clientY;
                }

                if (clientX !== undefined && clientY !== undefined) {
                    onConnectionReleased(connectingInfo, { x: clientX, y: clientY });
                }
            }
        }

        if (extractionTarget) {
            handleExtractNodeFromGroup(extractionTarget);
            setExtractionTarget(null);
        } else if (draggingInfo || resizingInfo) {
            setGroups(currentGroups => {
                let groupsAfterDrop = currentGroups;
                const affectedGroupIds = new Set<string>();

                if (draggingInfo && hoveredGroupIdForDrop) {
                    const nodeIdsToMove = Array.from(draggingInfo.offsets.keys());
                    const nodeIdsToMoveSet = new Set(nodeIdsToMove);

                    currentGroups.forEach(g => {
                        if (g.nodeIds.some(id => nodeIdsToMoveSet.has(id))) {
                            affectedGroupIds.add(g.id);
                        }
                    });
                    affectedGroupIds.add(hoveredGroupIdForDrop);

                    groupsAfterDrop = currentGroups.map(g => ({
                        ...g,
                        nodeIds: g.nodeIds.filter(id => !nodeIdsToMoveSet.has(id)),
                    }));

                    const targetGroup = groupsAfterDrop.find(g => g.id === hoveredGroupIdForDrop);
                    if (targetGroup) {
                        targetGroup.nodeIds = [...new Set([...targetGroup.nodeIds, ...nodeIdsToMove])];
                    }
                } else {
                    if (draggingInfo) {
                        const draggedNodeIds = Array.from(draggingInfo.offsets.keys());
                        currentGroups.forEach(group => {
                            if (group.nodeIds.some(nodeId => draggedNodeIds.includes(nodeId))) {
                                affectedGroupIds.add(group.id);
                            }
                        });
                    }
                    if (resizingInfo) {
                        const resizedNodeId = resizingInfo.nodeId;
                        const group = currentGroups.find(g => g.nodeIds.includes(resizedNodeId));
                        if (group) {
                            affectedGroupIds.add(group.id);
                        }
                    }
                }

                if (affectedGroupIds.size > 0) {
                    let finalGroups = [...groupsAfterDrop];
                    affectedGroupIds.forEach(groupId => {
                        const groupIndex = finalGroups.findIndex(g => g.id === groupId);
                        if (groupIndex === -1) return;

                        const group = finalGroups[groupIndex];
                        const memberNodes = nodesRef.current.filter(n => group.nodeIds.includes(n.id));

                        if (memberNodes.length > 0) {
                            const padding = 30;
                            const paddingTop = 70;
                            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                            memberNodes.forEach(node => {
                                minX = Math.min(minX, node.position.x);
                                minY = Math.min(minY, node.position.y);
                                maxX = Math.max(maxX, node.position.x + node.width);
                                const nodeHeight = node.isCollapsed ? HEADER_HEIGHT : node.height;
                                maxY = Math.max(maxY, node.position.y + nodeHeight);
                            });
                            const updatedGroup = {
                                ...group,
                                position: { x: minX - padding, y: minY - paddingTop },
                                width: maxX - minX + padding * 2,
                                height: (maxY - minY) + paddingTop + padding,
                            };
                            finalGroups[groupIndex] = updatedGroup;
                        } else {
                            finalGroups = finalGroups.filter(g => g.id !== groupId);
                        }
                    });
                    return finalGroups;
                }
                return groupsAfterDrop;
            });
        }

        setDraggingInfo(null);
        setResizingInfo(null);
        setConnectingInfo(null);
        stopPanning();
        setHoveredGroupIdForDrop(null);
    }, [
        dollyZoomingInfo, selectionRect, getNormalizedRect, nodes, connectingInfo, connectionTarget, viewTransform,
        clientPointerPosition.y, addConnection, setNodes, extractionTarget, handleExtractNodeFromGroup, draggingInfo,
        resizingInfo, setGroups, groups, hoveredGroupIdForDrop, stopPanning, setSelectedNodeIds, connections, onConnectionReleased
    ]);

    useEffect(() => {
        const handleGlobalMouseMove = (e: MouseEvent) => handlePointerMove(e);
        const handleGlobalMouseUp = (e: MouseEvent) => handlePointerUp(e);
        const handleGlobalTouchMove = (e: TouchEvent) => handlePointerMove(e.touches[0]);
        const handleGlobalTouchEnd = (e: TouchEvent) => handlePointerUp(e.changedTouches[0] as any);

        if (draggingInfo || resizingInfo || connectingInfo || isPanning || dollyZoomingInfo || selectionRect) {
            window.addEventListener('mousemove', handleGlobalMouseMove);
            window.addEventListener('mouseup', handleGlobalMouseUp);
            window.addEventListener('touchmove', handleGlobalTouchMove);
            window.addEventListener('touchend', handleGlobalTouchEnd);
        }

        return () => {
            window.removeEventListener('mousemove', handleGlobalMouseMove);
            window.removeEventListener('mouseup', handleGlobalMouseUp);
            window.removeEventListener('touchmove', handleGlobalTouchMove);
            window.removeEventListener('touchend', handleGlobalTouchEnd);
        };
    }, [draggingInfo, resizingInfo, connectingInfo, isPanning, handlePointerMove, handlePointerUp, dollyZoomingInfo, selectionRect]);

    return {
        activeTool,
        effectiveTool,
        setActiveTool,
        draggingInfo,
        resizingInfo,
        connectingInfo,
        dollyZoomingInfo,
        hoveredNodeId,
        setHoveredNodeId,
        selectedNodeIds,
        setSelectedNodeIds,
        deselectAllNodes,
        handleNodeMouseDown,
        handleGroupMouseDown,
        handleNodeResizeMouseDown,
        handleStartConnection,
        handleNodeClick,
        hoveredGroupIdForDrop,
        handleCanvasMouseDown,
        selectionRect,
        connectionTarget,
        isAltDown,
        extractionTarget,
        handleNodeTouchStart,
        handleGroupTouchStart,
        handleNodeResizeTouchStart,
        handleStartConnectionTouchStart,
    };
};
