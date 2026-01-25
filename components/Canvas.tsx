

import React, { useRef, useMemo, useEffect, useLayoutEffect } from 'react';
import { useAppContext } from '../contexts/Context';
import NodeView from './NodeView';
import ConnectionView from './ConnectionView';
import GroupView from './GroupView';
import { Point } from '../types';
import { useVirtualization } from '../hooks/useVirtualization';

interface CanvasProps {
    children?: React.ReactNode;
    checkTarget?: boolean;
}

const Canvas: React.FC<CanvasProps> = ({ children, checkTarget = false }) => {
    const context = useAppContext();
    const longPressTimer = useRef<number | null>(null);
    const touchStartPos = useRef<Point | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Prevent browser auto-scrolling (e.g. on paste/focus of off-screen inputs)
    useLayoutEffect(() => {
        // 1. Lock Window Scroll
        const preventWindowScroll = () => {
            if (window.scrollY !== 0 || window.scrollX !== 0) {
                window.scrollTo(0, 0);
            }
        };

        // 2. Lock Container Scroll
        // This is crucial because the Toolbar is absolute inside this container.
        // If this container scrolls, the Toolbar moves away.
        const preventContainerScroll = () => {
            if (containerRef.current) {
                if (containerRef.current.scrollTop !== 0 || containerRef.current.scrollLeft !== 0) {
                    containerRef.current.scrollTop = 0;
                    containerRef.current.scrollLeft = 0;
                }
            }
        };

        window.addEventListener('scroll', preventWindowScroll);
        document.body.addEventListener('scroll', preventWindowScroll);
        
        // Attach directly to the container if available
        const container = containerRef.current;
        if (container) {
            container.addEventListener('scroll', preventContainerScroll);
        }
        
        return () => {
            window.removeEventListener('scroll', preventWindowScroll);
            document.body.removeEventListener('scroll', preventWindowScroll);
            if (container) {
                container.removeEventListener('scroll', preventContainerScroll);
            }
        };
    }, []);

    if (!context) return null;

    const {
        viewTransform,
        handleCanvasMouseDown,
        handleCanvasContextMenu,
        updatePointerPosition,
        handleWheel,
        handleCanvasDoubleClick,
        handleDrop,
        handleDragOver,
        handleDragLeave,
        getCanvasCursor,
        handleCanvasTouchStart,
        handleCanvasTouchMove,
        handleCanvasTouchEnd,
        isDraggingOverCanvas,
        openContextMenu,
        // Entities
        connections,
        nodes,
        groups,
        creationLine,
        selectionRect,
        groupButtonPosition,
        hoveredNodeId,
        selectedNodeIds,
        effectiveTool,
        lineStyle,
        hoveredGroupIdForDrop,
        draggingInfo,
        // Callbacks from context
        getConnectionPoints,
        removeConnectionById,
        handleSplitConnection,
        handleGroupMouseDown,
        handleGroupTouchStart,
        handleRenameGroup,
        handleRemoveGroup,
        handleSaveGroupToCatalog,
        handleSaveGroupToDisk,
        handleCopyGroup,
        handleDuplicateGroup,
        // Node Callbacks
        handleNodeMouseDown,
        handleNodeTouchStart,
        handleNodeResizeMouseDown,
        handleNodeResizeTouchStart,
        handleValueChange,
        handleEnhance,
        isEnhancing,
        handleAnalyzePrompt,
        isAnalyzing,
        handleAnalyzeCharacter,
        isAnalyzingCharacter,
        handleExecuteChain,
        handleExecuteFullChain,
        isExecutingChain,
        executingNodeId,
        stopGeneration,
        stoppingNodes,
        handleSendMessage,
        isChatting,
        handleTranslate,
        isTranslating,
        handleGenerateScript,
        isGeneratingScript,
        handleGenerateEntities,
        isGeneratingEntities,
        handleModifyScriptPart,
        handleModifyAnalyzerFramePart,
        isModifyingScriptPart,
        handleFixErrors,
        isFixingErrors,
        handleReadData,
        isReadingData,
        handleAnalyzeScript,
        isAnalyzingScript,
        handleGenerateCharacters,
        isGeneratingCharacters,
        handleGenerateImage,
        isGeneratingImage,
        handleGenerateCharacterImage,
        isGeneratingCharacterImage,
        handleModifyScriptPrompts,
        isModifyingScriptPrompts,
        handleApplyAliases,
        handleDetachCharacter,
        handleStartConnection,
        handleStartConnectionTouchStart,
        handleNodeClick,
        setHoveredNodeId,
        deleteNodeAndConnections,
        removeConnectionsByNodeId,
        copyNodeValue,
        pasteNodeValue,
        handleDuplicateNode,
        handleDuplicateNodeEmpty,
        handleNodeDoubleClick,
        connectedInputs,
        connectingInfo,
        connectionTarget,
        libraryItems,
        deselectAllNodes,
        dragOverNodeId,
        handleProcessChainForward,
        lastAddedNodeId,
        getUpstreamTextValue,
        addToast,
        handleGenerateSpeech,
        isGeneratingSpeech,
        handleGenerateIdeaCategories,
        isGeneratingIdeaCategories,
        handleCombineStoryIdea,
        isCombiningStoryIdea,
        handleGenerateNarratorText,
        isGeneratingNarratorText,
        handleTranscribeAudio,
        isTranscribingAudio,
        handleGenerateYouTubeTitles,
        isGeneratingYouTubeTitles,
        handleGenerateYouTubeChannelInfo,
        isGeneratingYouTubeChannelInfo,
        handleGenerateMusicIdeas,
        isGeneratingMusicIdeas,
        handleExtractTextFromImage,
        isExtractingText,
        onAnalyzeYouTubeStats,
        isAnalyzingYouTubeStats,
        saveDataToCatalog,
        handleRenameNode,
        clearSelectionsSignal,
        handleImproveScriptConcept,
        isImprovingScriptConcept,
        t,
        pointerPosition,
        // Image Handling Props
        setFullSizeImage,
        getFullSizeImage,
        setImageViewer,
        onCopyImageToClipboard,
        onDownloadImage,
        onSaveCharacterCard,
        onLoadCharacterCard,
        onSaveCharacterToCatalog,
        handleDownloadChat // Passed here
    } = context;

    // Apply Virtualization
    const { visibleNodes, visibleConnections } = useVirtualization(nodes, connections, viewTransform);

    // Calculate set of grouped node IDs for O(1) lookup during render
    const groupedNodeIds = useMemo(() => {
        const ids = new Set<string>();
        groups.forEach(g => g.nodeIds.forEach(id => ids.add(id)));
        return ids;
    }, [groups]);

    const connectingLineColor = React.useMemo(() => {
        if (!connectingInfo) return '#6b7280'; // gray-500
        if (connectingInfo.fromType === 'text') return '#34d399'; // emerald-400
        if (connectingInfo.fromType === 'image') return '#22d3ee'; // cyan-400
        return '#6b7280'; // gray-500
    }, [connectingInfo]);

    const handleContainerTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
        if (e.touches.length === 1) {
            if (longPressTimer.current) clearTimeout(longPressTimer.current);
            const touch = e.touches[0];
            touchStartPos.current = { x: touch.clientX, y: touch.clientY };
            longPressTimer.current = window.setTimeout(() => {
                if (touchStartPos.current) {
                    openContextMenu(touchStartPos.current);
                }
                longPressTimer.current = null;
            }, 500);
        }
        handleCanvasTouchStart(e);
    };

    const handleContainerTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
        if (longPressTimer.current && touchStartPos.current && e.touches.length > 0) {
            const dx = e.touches[0].clientX - touchStartPos.current.x;
            const dy = e.touches[0].clientY - touchStartPos.current.y;
            if (Math.hypot(dx, dy) > 10) {
                clearTimeout(longPressTimer.current);
                longPressTimer.current = null;
            }
        }
        handleCanvasTouchMove(e);
    };

    const handleContainerTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
        handleCanvasTouchEnd(e);
    };

    // Optimization: avoid passing full value string for large data nodes (like images)
    // This prevents massive string allocation/concatenation on every render frame during drag.
    // We use a signature based on length and a prefix for large data.
    const getInputDataForNode = (nodeId: string) => {
        const incoming = connections.filter(c => c.toNodeId === nodeId);
        if (incoming.length === 0) return '';
        return incoming.map(c => {
            const fromNode = nodes.find(n => n.id === c.fromNodeId);
            if (!fromNode) return '';
            // If value is large (likely containing images), create a lightweight signature
            if (fromNode.value.length > 2000) {
                return `${c.fromHandleId}:LEN_${fromNode.value.length}_${fromNode.value.substring(0, 50)}`;
            }
            return `${c.fromHandleId}:${fromNode.value}`;
        }).sort().join('||');
    };

    const handleWheelRef = useRef(handleWheel);
    handleWheelRef.current = handleWheel;

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const onWheelNative = (e: WheelEvent) => {
            const target = e.target as HTMLElement;

            // Проверяем, находится ли курсор над нодой или внутри интерактивных элементов
            // Если да, то не применяем масштабирование холста
            if (
                target.closest('.absolute.flex.flex-col') || // Нода (основной контейнер)
                target.closest('textarea') ||
                target.closest('input') ||
                target.closest('.no-wheel') ||
                target.closest('.custom-scrollbar') || // Элементы с прокруткой
                target.closest('button') ||
                target.closest('select')
            ) {
                return; // Позволяем стандартное поведение прокрутки
            }

            // Если курсор на пустом пространстве холста, применяем масштабирование
            handleWheelRef.current(e as unknown as React.WheelEvent<HTMLDivElement>);
        };

        container.addEventListener('wheel', onWheelNative, { passive: false });
        return () => container.removeEventListener('wheel', onWheelNative);
    }, []);

    return (
        <div
            id="app-container"
            ref={containerRef}
            tabIndex={-1}
            className={`relative w-full h-full min-h-0 bg-gray-900 select-none outline-none ${isDraggingOverCanvas ? 'outline-4 outline-dashed outline-emerald-500 outline-offset-[-4px]' : ''}`}
            onMouseDown={handleCanvasMouseDown}
            onContextMenu={handleCanvasContextMenu}
            onMouseMove={updatePointerPosition}
            onDoubleClick={handleCanvasDoubleClick}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onTouchStart={handleContainerTouchStart}
            onTouchMove={handleContainerTouchMove}
            onTouchEnd={handleContainerTouchEnd}
            style={{
                cursor: getCanvasCursor(),
                touchAction: 'none',
                overflow: 'hidden'
            }}
        >
            {/* Background Grid Pattern (Static Background) */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    backgroundImage: 'radial-gradient(rgba(52, 211, 153, 0.15) 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                }}
            />

            {children}

            {/* Transform Layer: Moves everything together */}
            {/* Added pointer-events-none so panning clicks pass through to app-container */}
            <div
                id="canvas-transform-layer"
                className="pointer-events-none"
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    transform: `translate3d(${viewTransform.translate.x}px, ${viewTransform.translate.y}px, 0) scale(${viewTransform.scale})`,
                    transformOrigin: '0 0',
                    // REMOVED will-change: transform to prevent blurry text at >100% zoom
                }}
            >
                {/* Origin Crosshair - Neat little plus */}
                <div className="absolute pointer-events-none" style={{ left: 0, top: 0, zIndex: 0 }}>
                    <div className="absolute bg-emerald-500/50" style={{ width: '20px', height: '2px', left: '-10px', top: '-1px' }} />
                    <div className="absolute bg-emerald-500/50" style={{ width: '2px', height: '20px', left: '-1px', top: '-10px' }} />
                    <div className="absolute text-[10px] text-emerald-500/50 font-mono select-none" style={{ left: '4px', top: '4px' }}>0,0</div>
                </div>

                {/* Selection Rect */}
                {selectionRect && <div className="absolute border-2 border-dashed border-emerald-400 bg-emerald-400/20 pointer-events-none" style={{ left: selectionRect.x, top: selectionRect.y, width: selectionRect.width, height: selectionRect.height, zIndex: 100 }} />}

                {/* Group Creation Button */}
                {groupButtonPosition && (
                    <button
                        onClick={(e) => { e.stopPropagation(); context.handleGroupSelection(); }}
                        className="absolute z-20 px-4 py-2 font-bold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 transition-colors duration-200 -translate-x-1/2 flex items-center space-x-2 pointer-events-auto shadow-lg"
                        style={{ left: groupButtonPosition.x, top: groupButtonPosition.y }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                        </svg>
                        <span>{t('group.button.create', { count: selectedNodeIds.length })}</span>
                    </button>
                )}

                {/* Connections SVG - pointer events handled by paths */}
                <svg className="absolute top-0 left-0 w-full h-full overflow-visible pointer-events-none" style={{ zIndex: 9 }}>
                    <defs>
                        <filter id="glow-connection" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="2" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                    </defs>
                    {visibleConnections.map(conn => {
                        const fromNode = nodes.find(n => n.id === conn.fromNodeId);
                        const toNode = nodes.find(n => n.id === conn.toNodeId);
                        if (!fromNode || !toNode) return null;
                        const { start, end } = getConnectionPoints(fromNode, toNode, conn);
                        return <ConnectionView key={conn.id} connection={conn} fromNode={fromNode} start={start} end={end} isNodeHovered={effectiveTool === 'cutter' && (hoveredNodeId === conn.fromNodeId || hoveredNodeId === conn.toNodeId)} activeTool={effectiveTool} onDelete={removeConnectionById} onSplit={handleSplitConnection} lineStyle={lineStyle} />;
                    })}
                    {connectingInfo && <path d={`M ${connectingInfo.fromPoint.x} ${connectingInfo.fromPoint.y} C ${connectingInfo.fromPoint.x + 80} ${connectingInfo.fromPoint.y}, ${pointerPosition.x - 80} ${pointerPosition.y}, ${pointerPosition.x} ${pointerPosition.y}`} stroke={connectingLineColor} strokeWidth="3" fill="none" style={{ strokeDasharray: '8 4' }} />}

                    {creationLine && (
                        <line
                            x1={creationLine.start.x} y1={creationLine.start.y}
                            x2={creationLine.end.x} y2={creationLine.end.y}
                            stroke="#34d399"
                            strokeWidth="2"
                            className="creation-line"
                        />
                    )}
                </svg>

                {/* Groups */}
                {groups.map(group => {
                    const isBeingDragged = (draggingInfo?.type === 'group' && draggingInfo.id === group.id) || (draggingInfo?.type === 'node' && group.nodeIds.some((id: string) => draggingInfo.offsets.has(id)));
                    return (
                        <GroupView
                            key={group.id}
                            group={group}
                            onMouseDown={(e) => handleGroupMouseDown(e, group.id)}
                            onTouchStart={(e) => handleGroupTouchStart(e, group.id)}
                            onRename={handleRenameGroup}
                            onClose={handleRemoveGroup}
                            onSaveToCatalog={handleSaveGroupToCatalog}
                            onSaveToDisk={handleSaveGroupToDisk}
                            onCopy={handleCopyGroup}
                            onDuplicate={handleDuplicateGroup}
                            isHoveredForDrop={hoveredGroupIdForDrop === group.id}
                            isBeingDragged={isBeingDragged}
                        />
                    )
                })}

                {/* Nodes */}
                {visibleNodes.map(node => (
                    <NodeView
                        key={node.id}
                        node={node}
                        nodes={nodes}
                        connections={connections}
                        removeConnectionById={removeConnectionById}
                        onMouseDown={handleNodeMouseDown}
                        onTouchStart={handleNodeTouchStart}
                        onResizeMouseDown={handleNodeResizeMouseDown}
                        onResizeTouchStart={handleNodeResizeTouchStart}
                        onValueChange={handleValueChange}
                        onEnhance={handleEnhance}
                        isEnhancing={isEnhancing}
                        onAnalyze={handleAnalyzePrompt}
                        isAnalyzing={isAnalyzing}
                        onAnalyzeCharacter={handleAnalyzeCharacter}
                        isAnalyzingCharacter={isAnalyzingCharacter}
                        onExecuteChain={handleExecuteChain}
                        onExecuteFullChain={handleExecuteFullChain}
                        isExecutingChain={isExecutingChain}
                        isExecuting={executingNodeId === node.id}
                        onStopGeneration={stopGeneration}
                        stoppingNodes={stoppingNodes}
                        onSendMessage={handleSendMessage}
                        isChatting={isChatting}
                        onTranslate={handleTranslate}
                        isTranslating={isTranslating}
                        onGenerateScript={handleGenerateScript}
                        isGeneratingScript={isGeneratingScript}
                        onGenerateEntities={handleGenerateEntities}
                        isGeneratingEntities={isGeneratingEntities}
                        onModifyScriptPart={handleModifyScriptPart}
                        isModifyingScriptPart={isModifyingScriptPart}
                        onModifyAnalyzerFramePart={handleModifyAnalyzerFramePart}
                        onFixErrors={handleFixErrors}
                        isFixingErrors={isFixingErrors}
                        onReadData={handleReadData}
                        isReadingData={isReadingData}
                        onAnalyzeScript={handleAnalyzeScript}
                        isAnalyzingScript={isAnalyzingScript}
                        onGenerateCharacters={handleGenerateCharacters}
                        isGeneratingCharacters={isGeneratingCharacters}
                        onGenerateImage={handleGenerateImage}
                        isGeneratingImage={isGeneratingImage}
                        onGenerateCharacterImage={handleGenerateCharacterImage}
                        isGeneratingCharacterImage={isGeneratingCharacterImage}
                        onModifyScriptPrompts={handleModifyScriptPrompts}
                        isModifyingScriptPrompts={isModifyingScriptPrompts}
                        onApplyAliases={handleApplyAliases}
                        onDetachCharacter={handleDetachCharacter}
                        activeTool={effectiveTool}
                        onOutputHandleMouseDown={handleStartConnection}
                        onOutputHandleTouchStart={handleStartConnectionTouchStart}
                        onNodeClick={handleNodeClick}
                        isHovered={hoveredNodeId === node.id}
                        isSelected={selectedNodeIds.includes(node.id)}
                        isGrouped={groupedNodeIds.has(node.id)}
                        onNodeMouseEnter={(id) => setHoveredNodeId(id)}
                        onNodeMouseLeave={() => setHoveredNodeId(null)}
                        onDeleteNode={deleteNodeAndConnections}
                        onCutConnections={removeConnectionsByNodeId}
                        onCopyNodeValue={copyNodeValue}
                        onPasteNodeValue={pasteNodeValue}
                        onDuplicateNode={handleDuplicateNode}
                        onDuplicateNodeEmpty={handleDuplicateNodeEmpty}
                        onNodeDoubleClick={handleNodeDoubleClick}
                        connectedInputs={connectedInputs.get(node.id)}
                        connectingInfo={connectingInfo}
                        connectionTarget={connectionTarget}
                        libraryItems={libraryItems}
                        deselectAllNodes={deselectAllNodes}
                        isDragOverTarget={dragOverNodeId === node.id}
                        onProcessChainForward={handleProcessChainForward}
                        lastAddedNodeId={lastAddedNodeId}
                        getUpstreamTextValue={getUpstreamTextValue}
                        addToast={addToast}
                        onGenerateSpeech={handleGenerateSpeech}
                        isGeneratingSpeech={isGeneratingSpeech}
                        onGenerateIdeaCategories={handleGenerateIdeaCategories}
                        isGeneratingIdeaCategories={isGeneratingIdeaCategories}
                        onCombineStoryIdea={handleCombineStoryIdea}
                        isCombiningStoryIdea={isCombiningStoryIdea}
                        onGenerateNarratorText={handleGenerateNarratorText}
                        isGeneratingNarratorText={isGeneratingNarratorText}
                        onTranscribeAudio={handleTranscribeAudio}
                        isTranscribingAudio={isTranscribingAudio}
                        onGenerateYouTubeTitles={handleGenerateYouTubeTitles}
                        isGeneratingYouTubeTitles={isGeneratingYouTubeTitles}
                        onGenerateYouTubeChannelInfo={handleGenerateYouTubeChannelInfo}
                        isGeneratingYouTubeChannelInfo={isGeneratingYouTubeChannelInfo}
                        onGenerateMusicIdeas={handleGenerateMusicIdeas}
                        isGeneratingMusicIdeas={isGeneratingMusicIdeas}
                        onExtractTextFromImage={handleExtractTextFromImage}
                        isExtractingText={isExtractingText}
                        onAnalyzeYouTubeStats={onAnalyzeYouTubeStats}
                        isAnalyzingYouTubeStats={isAnalyzingYouTubeStats}
                        saveDataToCatalog={saveDataToCatalog}
                        onRenameNode={handleRenameNode}
                        clearSelectionsSignal={clearSelectionsSignal}
                        onImproveScriptConcept={handleImproveScriptConcept}
                        isImprovingScriptConcept={isImprovingScriptConcept}
                        inputData={getInputDataForNode(node.id)}
                        setFullSizeImage={setFullSizeImage}
                        getFullSizeImage={getFullSizeImage}
                        setImageViewer={setImageViewer}
                        onCopyImageToClipboard={onCopyImageToClipboard}
                        onDownloadImage={onDownloadImage}
                        onSaveCharacterCard={onSaveCharacterCard}
                        onLoadCharacterCard={onLoadCharacterCard}
                        onSaveCharacterToCatalog={onSaveCharacterToCatalog}
                        onDownloadChat={handleDownloadChat}
                    />
                ))}
            </div>
        </div>
    );
};

export default Canvas;