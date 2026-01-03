import { Move, X, Maximize2, Minimize2 } from "lucide-react";
import { useState, useCallback, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FieldPosition, Letterhead } from "@/types/dms";

interface TextBlock {
  id: string;
  text: string;
  position?: FieldPosition;
}

interface TemplatePositionEditorProps {
  bodyText: string;
  letterhead: Letterhead | null;
  letterheadImageUrl: string | null;
  fieldPositions: Record<string, FieldPosition> | null | undefined;
  onPositionsChange: (positions: Record<string, FieldPosition>) => void;
  onClose?: () => void;
  previewContainerRef?: React.RefObject<HTMLDivElement>; // Reference to the preview container
  showPreviewContainer?: boolean; // Whether to show the preview container or just controls
}

export function TemplatePositionEditor({
  bodyText,
  letterhead,
  letterheadImageUrl,
  fieldPositions = {},
  onPositionsChange,
  onClose,
  previewContainerRef,
  showPreviewContainer = true,
}: TemplatePositionEditorProps) {
  const [blocks, setBlocks] = useState<TextBlock[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);
  const [resizingBlockId, setResizingBlockId] = useState<string | null>(null);
  const [resizeHandle, setResizeHandle] = useState<'se' | 'sw' | 'ne' | 'nw' | 'e' | 'w' | 'n' | 's' | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  // Load Bahij Nassim fonts (same as certificates)
  useEffect(() => {
    const loadFonts = async () => {
      try {
        const boldWoffModule = await import('@/fonts/Bahij Nassim-Bold.woff?url');
        const boldWoffUrl = boldWoffModule.default;
        const fontFace = new FontFace('Bahij Nassim', `url(${boldWoffUrl})`);
        await fontFace.load();
        document.fonts.add(fontFace);
        setFontsLoaded(true);
        if (import.meta.env.DEV) {
          console.log('[TemplatePositionEditor] Bahij Nassim loaded');
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('[TemplatePositionEditor] Failed to load Bahij Nassim, using fallback');
        }
        setFontsLoaded(false);
      }
    };
    loadFonts();
  }, []);

  // Parse body_text into blocks (split by double newlines)
  useEffect(() => {
    if (!bodyText) {
      setBlocks([]);
      return;
    }

    const textBlocks = bodyText.split(/\n\s*\n/).filter(block => block.trim());
    if (textBlocks.length === 0 && bodyText.trim()) {
      textBlocks.push(bodyText);
    }

    const parsedBlocks: TextBlock[] = textBlocks.map((text, index) => {
      const blockId = `block-${index + 1}`;
      const position = fieldPositions?.[blockId];
      return {
        id: blockId,
        text: text.trim(),
        position,
      };
    });

    setBlocks(parsedBlocks);
  }, [bodyText, fieldPositions]);

  // Update positions when blocks change
  const updateBlockPosition = useCallback((blockId: string, position: FieldPosition) => {
    const newPositions = { ...fieldPositions, [blockId]: position };
    onPositionsChange(newPositions);
    setBlocks(prev => prev.map(block => 
      block.id === blockId ? { ...block, position } : block
    ));
  }, [fieldPositions, onPositionsChange]);

  const handleMouseDown = useCallback((e: React.MouseEvent, blockId: string, isResizeHandle = false, handle?: typeof resizeHandle) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isResizeHandle && handle) {
      setResizingBlockId(blockId);
      setResizeHandle(handle);
      setSelectedBlockId(blockId);
      
      const block = blocks.find(b => b.id === blockId);
      if (!block || !containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const position = block.position || { x: 50, y: 50, width: 40, height: 10 };
      const blockX = (position.x / 100) * rect.width;
      const blockY = (position.y / 100) * rect.height;
      const blockWidth = position.width ? (position.width / 100) * rect.width : 200;
      const blockHeight = position.height ? (position.height / 100) * rect.height : 100;
      
      setResizeStart({
        x: e.clientX - blockX,
        y: e.clientY - blockY,
        width: blockWidth,
        height: blockHeight,
      });
    } else {
      setDraggingBlockId(blockId);
      setSelectedBlockId(blockId);

      const block = blocks.find(b => b.id === blockId);
      if (!block || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const position = block.position || { x: 50, y: 50 };
      const fieldX = (position.x / 100) * rect.width;
      const fieldY = (position.y / 100) * rect.height;

      setDragOffset({
        x: e.clientX - rect.left - fieldX,
        y: e.clientY - rect.top - fieldY,
      });
    }
  }, [blocks]);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();

      if (resizingBlockId && resizeHandle) {
        const block = blocks.find(b => b.id === resizingBlockId);
        if (!block) return;

        const currentPosition = block.position || { x: 50, y: 50, width: 40, height: 10 };
        let newWidth = currentPosition.width || 40;
        let newHeight = currentPosition.height || 10;

        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const blockX = (currentPosition.x / 100) * rect.width;
        const blockY = (currentPosition.y / 100) * rect.height;

        if (resizeHandle.includes('e')) {
          newWidth = Math.max(5, Math.min(95, ((mouseX - blockX + resizeStart.width / 2) / rect.width) * 100));
        }
        if (resizeHandle.includes('w')) {
          newWidth = Math.max(5, Math.min(95, ((blockX - mouseX + resizeStart.width / 2) / rect.width) * 100));
        }
        if (resizeHandle.includes('s')) {
          newHeight = Math.max(2, Math.min(50, ((mouseY - blockY + resizeStart.height / 2) / rect.height) * 100));
        }
        if (resizeHandle.includes('n')) {
          newHeight = Math.max(2, Math.min(50, ((blockY - mouseY + resizeStart.height / 2) / rect.height) * 100));
        }

        updateBlockPosition(resizingBlockId, {
          ...currentPosition,
          width: newWidth,
          height: newHeight,
        });
      } else if (draggingBlockId) {
        const x = ((e.clientX - rect.left - dragOffset.x) / rect.width) * 100;
        const y = ((e.clientY - rect.top - dragOffset.y) / rect.height) * 100;

        const clampedX = Math.max(0, Math.min(100, x));
        const clampedY = Math.max(0, Math.min(100, y));

        const block = blocks.find(b => b.id === draggingBlockId);
        if (block) {
          const currentPosition = block.position || { x: 50, y: 50, fontSize: 14, fontFamily: 'Arial', textAlign: 'right' as const };
          updateBlockPosition(draggingBlockId, {
            ...currentPosition,
            x: clampedX,
            y: clampedY,
          });
        }
      }
    },
    [draggingBlockId, resizingBlockId, resizeHandle, dragOffset, resizeStart, blocks, updateBlockPosition]
  );

  const handleMouseUp = useCallback(() => {
    setDraggingBlockId(null);
    setResizingBlockId(null);
    setResizeHandle(null);
  }, []);

  useEffect(() => {
    if (draggingBlockId || resizingBlockId) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingBlockId, resizingBlockId, handleMouseMove, handleMouseUp]);

  const getBlockStyle = (block: TextBlock) => {
    const position = block.position || { x: 50, y: 50, fontSize: 14, fontFamily: 'Arial', textAlign: 'right', width: 40, height: 10 };
    const isSelected = selectedBlockId === block.id;
    const isDragging = draggingBlockId === block.id;
    const isResizing = resizingBlockId === block.id;

    const width = position.width ? `${position.width}%` : '40%';
    const height = position.height ? `${position.height}%` : 'auto';
    const maxWidth = position.maxWidth ? `${position.maxWidth}%` : '80%';

    return {
      position: 'absolute' as const,
      left: `${position.x}%`,
      top: `${position.y}%`,
      transform: 'translate(-50%, -50%)',
      fontSize: `${position.fontSize || 14}px`,
      fontFamily: position.fontFamily || 'Arial',
      textAlign: position.textAlign || 'right' as const,
      color: position.color || '#000000',
      width,
      height,
      maxWidth,
      minHeight: '30px',
      cursor: isDragging ? 'grabbing' : 'grab',
      zIndex: isDragging || isResizing ? 1000 : isSelected ? 100 : 10,
      padding: '8px 12px',
      backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.9)',
      border: isSelected ? '2px solid #3b82f6' : '1px dashed #ccc',
      borderRadius: '4px',
      wordWrap: 'break-word' as const,
      whiteSpace: 'pre-wrap' as const,
      overflow: 'hidden',
      boxSizing: 'border-box' as const,
    };
  };

  const updateBlockProperty = (blockId: string, property: keyof FieldPosition, value: any) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;

    const currentPosition = block.position || { x: 50, y: 50, fontSize: 14, fontFamily: 'Arial', textAlign: 'right', width: 40, height: 10 };
    updateBlockPosition(blockId, {
      ...currentPosition,
      [property]: value,
    });
  };

  const selectedBlock = blocks.find(b => b.id === selectedBlockId);

  // Resize handles for selected block
  const renderResizeHandles = (block: TextBlock) => {
    if (selectedBlockId !== block.id) return null;

    const handleSize = 8;
    const handles: Array<{ position: typeof resizeHandle; style: React.CSSProperties }> = [
      { position: 'nw', style: { top: '-4px', left: '-4px', cursor: 'nw-resize' } },
      { position: 'n', style: { top: '-4px', left: '50%', transform: 'translateX(-50%)', cursor: 'n-resize' } },
      { position: 'ne', style: { top: '-4px', right: '-4px', cursor: 'ne-resize' } },
      { position: 'e', style: { top: '50%', right: '-4px', transform: 'translateY(-50%)', cursor: 'e-resize' } },
      { position: 'se', style: { bottom: '-4px', right: '-4px', cursor: 'se-resize' } },
      { position: 's', style: { bottom: '-4px', left: '50%', transform: 'translateX(-50%)', cursor: 's-resize' } },
      { position: 'sw', style: { bottom: '-4px', left: '-4px', cursor: 'sw-resize' } },
      { position: 'w', style: { top: '50%', left: '-4px', transform: 'translateY(-50%)', cursor: 'w-resize' } },
    ];

    return (
      <>
        {handles.map((handle) => (
          <div
            key={handle.position}
            className="absolute bg-blue-600 border-2 border-white rounded-full"
            style={{
              width: `${handleSize}px`,
              height: `${handleSize}px`,
              ...handle.style,
            }}
            onMouseDown={(e) => handleMouseDown(e, block.id, true, handle.position)}
          />
        ))}
      </>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Position & Resize Text Blocks</CardTitle>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-md border border-blue-200">
            <strong>How to use:</strong> Click and drag text blocks to position them. Click a block to select it, then drag the resize handles (blue dots) to adjust size. Use the properties panel below to fine-tune font, size, color, and alignment.
          </div>

          {/* Preview Container */}
          <div className="relative border-2 border-primary/20 rounded-lg overflow-hidden bg-white shadow-lg" style={{ aspectRatio: '210/297', minHeight: '600px' }}>
            <div
              ref={containerRef}
              className="relative w-full h-full cursor-crosshair"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setSelectedBlockId(null);
                }
              }}
            >
              {/* Letterhead Background */}
              {letterheadImageUrl && !imageError && (
                <img
                  src={letterheadImageUrl}
                  alt="Letterhead"
                  className="absolute inset-0 w-full h-full object-contain"
                  style={{ opacity: imageLoaded ? 0.5 : 0.2 }}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageError(true)}
                />
              )}
              
              {!letterheadImageUrl && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-400 text-sm">
                  Select a letterhead to see positioning preview
                </div>
              )}

              {/* Text Blocks */}
              {blocks.map((block) => {
                const isSelected = selectedBlockId === block.id;
                const position = block.position || { x: 50, y: 50, fontSize: 14, fontFamily: 'Arial', textAlign: 'right', width: 40, height: 10 };
                
                return (
                  <div
                    key={block.id}
                    style={getBlockStyle(block)}
                    onMouseDown={(e) => handleMouseDown(e, block.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedBlockId(block.id);
                    }}
                    title={`${block.id}: ${block.text.substring(0, 30)}...`}
                    className="hover:shadow-lg transition-shadow"
                  >
                    {renderResizeHandles(block)}
                    <div className="flex items-center gap-1 mb-1">
                      <Move className={`h-3 w-3 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`} />
                      <span className={`text-xs font-medium ${isSelected ? 'text-blue-600' : 'text-gray-600'}`}>
                        {block.id}
                      </span>
                    </div>
                    <div className="text-sm whitespace-pre-wrap break-words" style={{ fontFamily: position.fontFamily || 'Arial' }}>
                      {block.text}
                    </div>
                    {isSelected && (
                      <div className="mt-1 text-xs text-blue-600">
                        X: {position.x.toFixed(1)}%, Y: {position.y.toFixed(1)}% | W: {position.width?.toFixed(1) || 40}%, H: {position.height?.toFixed(1) || 'auto'}%
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Block Properties Editor */}
          {selectedBlock && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Edit: {selectedBlock.id}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Font Size</Label>
                    <Input
                      type="number"
                      min="8"
                      max="72"
                      value={selectedBlock.position?.fontSize || 14}
                      onChange={(e) => updateBlockProperty(selectedBlock.id, 'fontSize', parseInt(e.target.value) || 14)}
                    />
                  </div>
                  <div>
                    <Label>Font Family</Label>
                    <Select
                      value={selectedBlock.position?.fontFamily || 'Arial'}
                      onValueChange={(value) => updateBlockProperty(selectedBlock.id, 'fontFamily', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Bahij Nassim">Bahij Nassim (Arabic/Pashto)</SelectItem>
                        <SelectItem value="Arial">Arial</SelectItem>
                        <SelectItem value="Helvetica">Helvetica</SelectItem>
                        <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                        <SelectItem value="Courier New">Courier New</SelectItem>
                        <SelectItem value="Georgia">Georgia</SelectItem>
                        <SelectItem value="Verdana">Verdana</SelectItem>
                        <SelectItem value="Noto Sans Arabic">Noto Sans Arabic</SelectItem>
                        <SelectItem value="Tahoma">Tahoma</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Text Align</Label>
                    <Select
                      value={selectedBlock.position?.textAlign || 'right'}
                      onValueChange={(value) => updateBlockProperty(selectedBlock.id, 'textAlign', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">Left</SelectItem>
                        <SelectItem value="center">Center</SelectItem>
                        <SelectItem value="right">Right</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Color</Label>
                    <Input
                      type="color"
                      value={selectedBlock.position?.color || '#000000'}
                      onChange={(e) => updateBlockProperty(selectedBlock.id, 'color', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Width (%)</Label>
                    <Input
                      type="number"
                      min="5"
                      max="95"
                      step="0.1"
                      value={selectedBlock.position?.width || 40}
                      onChange={(e) => updateBlockProperty(selectedBlock.id, 'width', parseFloat(e.target.value) || 40)}
                    />
                  </div>
                  <div>
                    <Label>Height (%)</Label>
                    <Input
                      type="number"
                      min="2"
                      max="50"
                      step="0.1"
                      value={selectedBlock.position?.height || 10}
                      onChange={(e) => updateBlockProperty(selectedBlock.id, 'height', parseFloat(e.target.value) || 10)}
                    />
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Position: X: {selectedBlock.position?.x.toFixed(1) || 50}%, Y: {selectedBlock.position?.y.toFixed(1) || 50}% | 
                  Size: W: {selectedBlock.position?.width?.toFixed(1) || 40}%, H: {selectedBlock.position?.height?.toFixed(1) || 'auto'}%
                </div>
              </CardContent>
            </Card>
          )}

          {blocks.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              No text blocks found. Add text to the body field and split blocks with double newlines.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
