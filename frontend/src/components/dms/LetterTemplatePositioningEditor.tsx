import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Move,
  Plus,
  Trash2,
  Type,
  Variable,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Eye,
  EyeOff,
  Copy,
  RotateCcw,
} from "lucide-react";
import type { TemplateVariable } from "@/types/dms";

// A4 dimensions in mm
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const A4_LANDSCAPE_WIDTH_MM = 297;
const A4_LANDSCAPE_HEIGHT_MM = 210;

// Scale factor for editor display (pixels per mm)
const SCALE = 2.5;

export interface PositionedBlock {
  id: string;
  type: "text" | "variable" | "static";
  x: number; // mm from left
  y: number; // mm from top
  width: number; // mm
  height: number; // mm
  content: string;
  variableName?: string;
  styles: {
    fontFamily: string;
    fontSize: number;
    fontWeight: string;
    color: string;
    textAlign: "left" | "center" | "right";
    direction: "ltr" | "rtl";
    lineHeight: number;
    backgroundColor?: string;
    border?: string;
    padding?: string;
  };
}

interface LetterTemplatePositioningEditorProps {
  letterheadBase64: string | null;
  letterheadFileType?: "pdf" | "image" | "html";
  letterheadPosition?: "header" | "background" | "watermark";
  pageLayout: "A4_portrait" | "A4_landscape";
  fieldPositions: PositionedBlock[];
  variables: TemplateVariable[];
  onChange: (positions: PositionedBlock[]) => void;
  onPreview?: () => void;
}

const fontFamilyOptions = [
  { value: "Bahij Nassim", label: "Bahij Nassim" },
  { value: "Bahij Titr", label: "Bahij Titr" },
  { value: "Arial", label: "Arial" },
  { value: "Inter", label: "Inter" },
  { value: "Times New Roman", label: "Times New Roman" },
];

const defaultBlockStyles: PositionedBlock["styles"] = {
  fontFamily: "Bahij Nassim",
  fontSize: 14,
  fontWeight: "normal",
  color: "#000000",
  textAlign: "right",
  direction: "rtl",
  lineHeight: 1.5,
  padding: "2px",
};

export function LetterTemplatePositioningEditor({
  letterheadBase64,
  letterheadFileType = "image",
  letterheadPosition = "header",
  pageLayout,
  fieldPositions,
  variables,
  onChange,
  onPreview,
}: LetterTemplatePositioningEditorProps) {
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const isLandscape = pageLayout === "A4_landscape";
  const pageWidthMm = isLandscape ? A4_LANDSCAPE_WIDTH_MM : A4_WIDTH_MM;
  const pageHeightMm = isLandscape ? A4_LANDSCAPE_HEIGHT_MM : A4_HEIGHT_MM;
  const pageWidthPx = pageWidthMm * SCALE;
  const pageHeightPx = pageHeightMm * SCALE;

  const selectedBlock = fieldPositions.find((b) => b.id === selectedBlockId);

  // Convert mm to px for display
  const mmToPx = (mm: number) => mm * SCALE;
  // Convert px to mm for storage
  const pxToMm = (px: number) => px / SCALE;

  // Generate unique ID
  const generateId = () => `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Add new text block
  const addTextBlock = () => {
    const newBlock: PositionedBlock = {
      id: generateId(),
      type: "text",
      x: 20,
      y: 50,
      width: 80,
      height: 15,
      content: "Enter text here",
      styles: { ...defaultBlockStyles },
    };
    onChange([...fieldPositions, newBlock]);
    setSelectedBlockId(newBlock.id);
  };

  // Add variable block
  const addVariableBlock = (variableName: string) => {
    const variable = variables.find((v) => v.name === variableName);
    const newBlock: PositionedBlock = {
      id: generateId(),
      type: "variable",
      x: 20,
      y: 80,
      width: 60,
      height: 10,
      content: `{{${variableName}}}`,
      variableName,
      styles: { ...defaultBlockStyles },
    };
    onChange([...fieldPositions, newBlock]);
    setSelectedBlockId(newBlock.id);
  };

  // Delete selected block
  const deleteBlock = (id: string) => {
    onChange(fieldPositions.filter((b) => b.id !== id));
    if (selectedBlockId === id) {
      setSelectedBlockId(null);
    }
  };

  // Duplicate selected block
  const duplicateBlock = (id: string) => {
    const block = fieldPositions.find((b) => b.id === id);
    if (block) {
      const newBlock: PositionedBlock = {
        ...block,
        id: generateId(),
        x: block.x + 5,
        y: block.y + 5,
      };
      onChange([...fieldPositions, newBlock]);
      setSelectedBlockId(newBlock.id);
    }
  };

  // Update block property
  const updateBlock = (id: string, updates: Partial<PositionedBlock>) => {
    onChange(
      fieldPositions.map((b) => (b.id === id ? { ...b, ...updates } : b))
    );
  };

  // Update block styles
  const updateBlockStyles = (id: string, styleUpdates: Partial<PositionedBlock["styles"]>) => {
    onChange(
      fieldPositions.map((b) =>
        b.id === id ? { ...b, styles: { ...b.styles, ...styleUpdates } } : b
      )
    );
  };

  // Handle mouse down on block (start drag)
  const handleBlockMouseDown = (e: React.MouseEvent, block: PositionedBlock) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedBlockId(block.id);

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const blockX = mmToPx(block.x);
      const blockY = mmToPx(block.y);
      setDragOffset({
        x: e.clientX - rect.left - blockX,
        y: e.clientY - rect.top - blockY,
      });
      setIsDragging(true);
    }
  };

  // Handle mouse down on resize handle
  const handleResizeMouseDown = (e: React.MouseEvent, handle: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeHandle(handle);
  };

  // Handle mouse move (drag or resize)
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!containerRef.current || !selectedBlockId) return;

      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      if (isDragging) {
        const newX = pxToMm(mouseX - dragOffset.x);
        const newY = pxToMm(mouseY - dragOffset.y);

        // Clamp to page bounds
        const block = fieldPositions.find((b) => b.id === selectedBlockId);
        if (block) {
          const clampedX = Math.max(0, Math.min(newX, pageWidthMm - block.width));
          const clampedY = Math.max(0, Math.min(newY, pageHeightMm - block.height));
          updateBlock(selectedBlockId, { x: clampedX, y: clampedY });
        }
      } else if (isResizing && resizeHandle) {
        const block = fieldPositions.find((b) => b.id === selectedBlockId);
        if (block) {
          const blockRight = block.x + block.width;
          const blockBottom = block.y + block.height;
          const mouseXMm = pxToMm(mouseX);
          const mouseYMm = pxToMm(mouseY);

          let newX = block.x;
          let newY = block.y;
          let newWidth = block.width;
          let newHeight = block.height;

          // Handle different resize handles
          if (resizeHandle.includes("w")) {
            newWidth = blockRight - mouseXMm;
            newX = mouseXMm;
          }
          if (resizeHandle.includes("e")) {
            newWidth = mouseXMm - block.x;
          }
          if (resizeHandle.includes("n")) {
            newHeight = blockBottom - mouseYMm;
            newY = mouseYMm;
          }
          if (resizeHandle.includes("s")) {
            newHeight = mouseYMm - block.y;
          }

          // Minimum size
          const minSize = 5;
          if (newWidth >= minSize && newHeight >= minSize) {
            updateBlock(selectedBlockId, {
              x: Math.max(0, newX),
              y: Math.max(0, newY),
              width: Math.min(newWidth, pageWidthMm - newX),
              height: Math.min(newHeight, pageHeightMm - newY),
            });
          }
        }
      }
    },
    [isDragging, isResizing, resizeHandle, selectedBlockId, dragOffset, fieldPositions, pageWidthMm, pageHeightMm]
  );

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
  }, []);

  // Add event listeners
  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  // Render resize handles
  const renderResizeHandles = (block: PositionedBlock) => {
    if (block.id !== selectedBlockId) return null;

    const handles = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
    const handleSize = 8;

    return handles.map((handle) => {
      let style: React.CSSProperties = {
        position: "absolute",
        width: handleSize,
        height: handleSize,
        background: "#3b82f6",
        border: "1px solid white",
        borderRadius: 2,
        cursor: `${handle}-resize`,
        zIndex: 10,
      };

      // Position handles
      if (handle.includes("n")) style.top = -handleSize / 2;
      if (handle.includes("s")) style.bottom = -handleSize / 2;
      if (handle.includes("w")) style.left = -handleSize / 2;
      if (handle.includes("e")) style.right = -handleSize / 2;
      if (handle === "n" || handle === "s") style.left = "50%";
      if (handle === "w" || handle === "e") style.top = "50%";
      if (handle === "n" || handle === "s") style.transform = "translateX(-50%)";
      if (handle === "w" || handle === "e") style.transform = "translateY(-50%)";

      return (
        <div
          key={handle}
          style={style}
          onMouseDown={(e) => handleResizeMouseDown(e, handle)}
        />
      );
    });
  };

  // Render letterhead background
  const renderLetterheadBackground = () => {
    if (!letterheadBase64) {
      return (
        <div
          className="absolute inset-0 flex items-center justify-center bg-gray-50 border-2 border-dashed border-gray-300"
          style={{ zIndex: 0 }}
        >
          <div className="text-center text-gray-400">
            <div className="text-4xl mb-2">No Letterhead</div>
            <p className="text-sm">Select a letterhead to see preview</p>
          </div>
        </div>
      );
    }

    if (letterheadFileType === "pdf") {
      // PDF placeholder
      return (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 50%, #dee2e6 100%)",
            border: "3px dashed #6c757d",
            zIndex: 0,
          }}
        >
          <div className="text-center text-gray-600">
            <div className="text-5xl mb-3">📄</div>
            <div className="font-semibold">PDF Letterhead</div>
            <div className="text-sm text-gray-500 mt-1">
              Position: {letterheadPosition}
            </div>
          </div>
        </div>
      );
    }

    // Image letterhead
    const opacity = letterheadPosition === "background" ? 0.15 : letterheadPosition === "watermark" ? 0.08 : 1;

    return (
      <div className="absolute inset-0" style={{ zIndex: 0 }}>
        <img
          src={letterheadBase64}
          alt="Letterhead"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            objectPosition: "top center",
            opacity,
          }}
        />
      </div>
    );
  };

  return (
    <div className="flex gap-4">
      {/* Editor Canvas */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Positioning Editor</h3>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Switch
                id="showGrid"
                checked={showGrid}
                onCheckedChange={setShowGrid}
              />
              <Label htmlFor="showGrid" className="text-sm">Show Grid</Label>
            </div>
            {onPreview && (
              <Button variant="outline" size="sm" onClick={onPreview}>
                <Eye className="h-4 w-4 mr-1" />
                Preview
              </Button>
            )}
          </div>
        </div>

        {/* Canvas Container */}
        <div
          className="border rounded-lg overflow-auto bg-gray-100 p-4"
          style={{ maxHeight: "70vh" }}
        >
          <div
            ref={containerRef}
            className="relative mx-auto bg-white shadow-lg"
            style={{
              width: pageWidthPx,
              height: pageHeightPx,
              cursor: isDragging ? "grabbing" : "default",
            }}
            onClick={() => setSelectedBlockId(null)}
          >
            {/* Grid overlay */}
            {showGrid && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: `
                    linear-gradient(to right, #e5e7eb 1px, transparent 1px),
                    linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
                  `,
                  backgroundSize: `${mmToPx(10)}px ${mmToPx(10)}px`,
                  zIndex: 1,
                  opacity: 0.5,
                }}
              />
            )}

            {/* Letterhead background */}
            {renderLetterheadBackground()}

            {/* Positioned blocks */}
            {fieldPositions.map((block) => (
              <div
                key={block.id}
                className={`absolute cursor-move ${
                  block.id === selectedBlockId
                    ? "ring-2 ring-blue-500 ring-offset-1"
                    : "hover:ring-2 hover:ring-blue-300"
                }`}
                style={{
                  left: mmToPx(block.x),
                  top: mmToPx(block.y),
                  width: mmToPx(block.width),
                  minHeight: mmToPx(block.height),
                  fontFamily: `'${block.styles.fontFamily}', sans-serif`,
                  fontSize: block.styles.fontSize,
                  fontWeight: block.styles.fontWeight,
                  color: block.styles.color,
                  textAlign: block.styles.textAlign,
                  direction: block.styles.direction,
                  lineHeight: block.styles.lineHeight,
                  backgroundColor: block.styles.backgroundColor || "transparent",
                  border: block.id === selectedBlockId ? "none" : "1px dashed #ccc",
                  padding: block.styles.padding,
                  zIndex: block.id === selectedBlockId ? 5 : 2,
                  overflow: "hidden",
                  wordWrap: "break-word",
                }}
                onMouseDown={(e) => handleBlockMouseDown(e, block)}
                onClick={(e) => e.stopPropagation()}
              >
                {block.type === "variable" ? (
                  <span className="bg-blue-100 text-blue-800 px-1 rounded text-xs">
                    {block.variableName}
                  </span>
                ) : (
                  block.content
                )}
                {renderResizeHandles(block)}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Properties Panel */}
      <div className="w-80 space-y-4">
        {/* Add Block Controls */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Add Block</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={addTextBlock}
            >
              <Type className="h-4 w-4 mr-2" />
              Add Text Block
            </Button>

            {variables.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Add Variable</Label>
                <div className="flex flex-wrap gap-1">
                  {variables.map((v) => (
                    <Button
                      key={v.name}
                      variant="secondary"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => addVariableBlock(v.name)}
                    >
                      <Variable className="h-3 w-3 mr-1" />
                      {v.label || v.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selected Block Properties */}
        {selectedBlock && (
          <Card>
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Block Properties</CardTitle>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => duplicateBlock(selectedBlock.id)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => deleteBlock(selectedBlock.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Content */}
              {selectedBlock.type === "text" && (
                <div className="space-y-2">
                  <Label className="text-xs">Content</Label>
                  <Textarea
                    value={selectedBlock.content}
                    onChange={(e) =>
                      updateBlock(selectedBlock.id, { content: e.target.value })
                    }
                    rows={2}
                    className="text-sm"
                  />
                </div>
              )}

              {selectedBlock.type === "variable" && (
                <div className="space-y-2">
                  <Label className="text-xs">Variable</Label>
                  <Select
                    value={selectedBlock.variableName}
                    onValueChange={(value) =>
                      updateBlock(selectedBlock.id, {
                        variableName: value,
                        content: `{{${value}}}`,
                      })
                    }
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {variables.map((v) => (
                        <SelectItem key={v.name} value={v.name}>
                          {v.label || v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Position & Size */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">X (mm)</Label>
                  <Input
                    type="number"
                    value={Math.round(selectedBlock.x * 10) / 10}
                    onChange={(e) =>
                      updateBlock(selectedBlock.id, { x: parseFloat(e.target.value) || 0 })
                    }
                    className="h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Y (mm)</Label>
                  <Input
                    type="number"
                    value={Math.round(selectedBlock.y * 10) / 10}
                    onChange={(e) =>
                      updateBlock(selectedBlock.id, { y: parseFloat(e.target.value) || 0 })
                    }
                    className="h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Width (mm)</Label>
                  <Input
                    type="number"
                    value={Math.round(selectedBlock.width * 10) / 10}
                    onChange={(e) =>
                      updateBlock(selectedBlock.id, { width: parseFloat(e.target.value) || 10 })
                    }
                    className="h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Height (mm)</Label>
                  <Input
                    type="number"
                    value={Math.round(selectedBlock.height * 10) / 10}
                    onChange={(e) =>
                      updateBlock(selectedBlock.id, { height: parseFloat(e.target.value) || 5 })
                    }
                    className="h-8"
                  />
                </div>
              </div>

              {/* Font Family */}
              <div className="space-y-2">
                <Label className="text-xs">Font Family</Label>
                <Select
                  value={selectedBlock.styles.fontFamily}
                  onValueChange={(value) =>
                    updateBlockStyles(selectedBlock.id, { fontFamily: value })
                  }
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fontFamilyOptions.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Font Size */}
              <div className="space-y-2">
                <Label className="text-xs">Font Size: {selectedBlock.styles.fontSize}px</Label>
                <Slider
                  value={[selectedBlock.styles.fontSize]}
                  onValueChange={([value]) =>
                    updateBlockStyles(selectedBlock.id, { fontSize: value })
                  }
                  min={8}
                  max={72}
                  step={1}
                />
              </div>

              {/* Font Weight */}
              <div className="flex items-center gap-2">
                <Label className="text-xs">Bold</Label>
                <Switch
                  checked={selectedBlock.styles.fontWeight === "bold"}
                  onCheckedChange={(checked) =>
                    updateBlockStyles(selectedBlock.id, {
                      fontWeight: checked ? "bold" : "normal",
                    })
                  }
                />
              </div>

              {/* Text Color */}
              <div className="space-y-2">
                <Label className="text-xs">Text Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={selectedBlock.styles.color}
                    onChange={(e) =>
                      updateBlockStyles(selectedBlock.id, { color: e.target.value })
                    }
                    className="w-10 h-8 p-1"
                  />
                  <Input
                    type="text"
                    value={selectedBlock.styles.color}
                    onChange={(e) =>
                      updateBlockStyles(selectedBlock.id, { color: e.target.value })
                    }
                    className="h-8 flex-1"
                  />
                </div>
              </div>

              {/* Text Alignment */}
              <div className="space-y-2">
                <Label className="text-xs">Text Alignment</Label>
                <div className="flex gap-1">
                  <Button
                    variant={selectedBlock.styles.textAlign === "left" ? "default" : "outline"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() =>
                      updateBlockStyles(selectedBlock.id, { textAlign: "left" })
                    }
                  >
                    <AlignLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={selectedBlock.styles.textAlign === "center" ? "default" : "outline"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() =>
                      updateBlockStyles(selectedBlock.id, { textAlign: "center" })
                    }
                  >
                    <AlignCenter className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={selectedBlock.styles.textAlign === "right" ? "default" : "outline"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() =>
                      updateBlockStyles(selectedBlock.id, { textAlign: "right" })
                    }
                  >
                    <AlignRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Direction */}
              <div className="space-y-2">
                <Label className="text-xs">Text Direction</Label>
                <div className="flex gap-2">
                  <Button
                    variant={selectedBlock.styles.direction === "ltr" ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() =>
                      updateBlockStyles(selectedBlock.id, { direction: "ltr" })
                    }
                  >
                    LTR
                  </Button>
                  <Button
                    variant={selectedBlock.styles.direction === "rtl" ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() =>
                      updateBlockStyles(selectedBlock.id, { direction: "rtl" })
                    }
                  >
                    RTL
                  </Button>
                </div>
              </div>

              {/* Line Height */}
              <div className="space-y-2">
                <Label className="text-xs">Line Height: {selectedBlock.styles.lineHeight}</Label>
                <Slider
                  value={[selectedBlock.styles.lineHeight]}
                  onValueChange={([value]) =>
                    updateBlockStyles(selectedBlock.id, { lineHeight: value })
                  }
                  min={1}
                  max={3}
                  step={0.1}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Blocks List */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">All Blocks ({fieldPositions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {fieldPositions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No blocks added yet
              </p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {fieldPositions.map((block) => (
                  <div
                    key={block.id}
                    className={`flex items-center justify-between p-2 rounded text-sm cursor-pointer hover:bg-muted ${
                      block.id === selectedBlockId ? "bg-muted" : ""
                    }`}
                    onClick={() => setSelectedBlockId(block.id)}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {block.type === "variable" ? (
                        <Variable className="h-4 w-4 text-blue-500" />
                      ) : (
                        <Type className="h-4 w-4 text-gray-500" />
                      )}
                      <span className="truncate">
                        {block.type === "variable"
                          ? block.variableName
                          : block.content.slice(0, 20)}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteBlock(block.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
