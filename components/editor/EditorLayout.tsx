"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import CanvasStage, { type CropAspect } from "./CanvasStage";
import ControlsSidebar from "./ControlsSidebar";


type SizeComparison = {
  original: number;
  resized: number;
};

export function EditorLayout() {
  const [image, setImage] = useState<string | null>(null);
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [saturation, setSaturation] = useState<number>(100);
  const [rotationDeg, setRotationDeg] = useState<number>(0);
  const [flipHorizontal, setFlipHorizontal] = useState<boolean>(false);
  const [flipVertical, setFlipVertical] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [sizeComparison, setSizeComparison] = useState<SizeComparison | null>(
    null
  );

  const [renderSize, setRenderSize] = useState<{ w: number; h: number } | null>(null);

  const [resizeOpen, setResizeOpen] = useState<boolean>(false);
  const [targetW, setTargetW] = useState<number>(512);
  const [targetH, setTargetH] = useState<number>(512);
  const [resizeMode, setResizeMode] = useState<"cover" | "contain">("cover");

  const [isCropping, setIsCropping] = useState<boolean>(false);
  const [cropRect, setCropRect] = useState<
    | { x: number; y: number; width: number; height: number }
    | null
  >(null);
  const [cropAspect, setCropAspect] = useState<CropAspect>("free");
  // image ref to read natural dimensions for resize
  const imgRef = useRef<HTMLImageElement>(null);

  // Allow reading the rendered canvas from CanvasStage for export/download
  const getRenderedCanvasRef = useRef<null | (() => HTMLCanvasElement | null)>(
    null
  );

  const captureRenderSize = useCallback(() => {
    const c = getRenderedCanvasRef.current?.();
    if (c && (c.width > 0 || c.height > 0)) {
      setRenderSize({ w: c.width, h: c.height });
    }
  }, []);

  const acceptNewImageFile = (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target?.result as string);
        setBrightness(100);
        setContrast(100);
      setSaturation(100);
      setRotationDeg(0);
      setFlipHorizontal(false);
      setFlipVertical(false);
        setSizeComparison(null);
      };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      acceptNewImageFile(file);
    }
  };

  const handlePaste = useCallback((event: ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          acceptNewImageFile(file);
          break;
        }
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

  // After image changes, capture the current rendered size for default output dimensions
  useEffect(() => {
    if (!image) {
      setRenderSize(null);
      return;
    }
    // Defer to allow CanvasStage to render/register
    const id = window.setTimeout(() => {
      captureRenderSize();
    }, 0);
    return () => window.clearTimeout(id);
  }, [image, captureRenderSize]);

  const handleReduceSize = async () => {
    if (!image) return;
    setIsProcessing(true);
    try {
      const response = await fetch("/api/resize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      });
      if (!response.ok) throw new Error("Failed to resize image");
      const data = await response.json();
      setImage(data.image);
      setSizeComparison(data.sizeComparison);
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    const canvas = getRenderedCanvasRef.current?.();
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "edited-image.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handleExport = (format: "png" | "jpeg" | "webp", quality: number) => {
    const canvas = getRenderedCanvasRef.current?.();
    if (!canvas) return;
    
    const mime = format === "png" ? "image/png" : format === "jpeg" ? "image/jpeg" : "image/webp";
    const dataURL = canvas.toDataURL(mime, quality);
    const link = document.createElement("a");
    link.download = `edited-image.${format}`;
    link.href = dataURL;
    link.click();
  };

  const handleRemoveImage = () => {
    setImage(null);
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setRotationDeg(0);
    setFlipHorizontal(false);
    setFlipVertical(false);
    setIsCropping(false);
    setCropRect(null);
    setCropAspect("free");
  };

  const resetAdjustments = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setRotationDeg(0);
    setFlipHorizontal(false);
    setFlipVertical(false);
  };

  const imageStyle = useMemo<React.CSSProperties>(
    () => ({
      filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`,
      transform: `rotate(${rotationDeg}deg) scaleX(${flipHorizontal ? -1 : 1}) scaleY(${flipVertical ? -1 : 1})`,
      transformOrigin: "center",
      maxWidth: "none",
      maxHeight: "none",
      userSelect: "none",
      pointerEvents: isCropping ? "none" : "auto",
    }),
    [brightness, contrast, saturation, rotationDeg, flipHorizontal, flipVertical, isCropping]
  );

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  return (
    <TooltipProvider>
      <div className="font-yekan h-screen w-full flex bg-background">
        {/* Canvas Stage */}
        <CanvasStage
          image={image}
          imageStyle={imageStyle}
          brightness={brightness}
          contrast={contrast}
          saturation={saturation}
          rotationDeg={rotationDeg}
          flipHorizontal={flipHorizontal}
          flipVertical={flipVertical}
          isCropping={isCropping}
          setIsCropping={setIsCropping}
          cropRect={cropRect}
          setCropRect={setCropRect}
          cropAspect={cropAspect}
          setCropAspect={setCropAspect}
          onCroppedImage={(dataUrl) => {
            setImage(dataUrl);
            setRotationDeg(0);
            setFlipHorizontal(false);
            setFlipVertical(false);
          }}

          onQuickDownload={handleDownload}
          onRotateCw={() => setRotationDeg((d) => (d + 90) % 360)}
          onRotateCcw={() => setRotationDeg((d) => (d + 270) % 360)}
          onFlipH={() => setFlipHorizontal((v) => !v)}
          onFlipV={() => setFlipVertical((v) => !v)}
          onImageLoaded={() => {
            captureRenderSize();
          }}
          onFileDropped={(file) => acceptNewImageFile(file)}
          registerGetCanvas={(fn) => {
            getRenderedCanvasRef.current = fn;
          }}
        />

        {/* Sidebar Controls */}
        <ControlsSidebar
          hasImage={!!image}
          isProcessing={isProcessing}
          brightness={brightness}
          contrast={contrast}
          saturation={saturation}
          onBrightness={setBrightness}
          onContrast={setContrast}
          onSaturation={setSaturation}
          onResetAdjustments={resetAdjustments}
          onRemoveImage={handleRemoveImage}
          onExport={(format, quality, outW, outH) => {
            // If custom size provided, render into a new canvas respecting contain-fit when unlocked
            const source = getRenderedCanvasRef.current?.();
            if (!source) return;
            let finalCanvas: HTMLCanvasElement = source;
            if (outW && outH) {
              const canvas = document.createElement("canvas");
              canvas.width = Math.max(1, Math.round(outW));
              canvas.height = Math.max(1, Math.round(outH));
              const ctx = canvas.getContext("2d");
              if (ctx) {
                // Cover-fit: fill target fully by cropping overflow
                const scale = Math.max(canvas.width / source.width, canvas.height / source.height);
                const drawW = source.width * scale;
                const drawH = source.height * scale;
                const dx = (canvas.width - drawW) / 2;
                const dy = (canvas.height - drawH) / 2;
                ctx.imageSmoothingQuality = "high";
                ctx.drawImage(source, dx, dy, drawW, drawH);
                finalCanvas = canvas;
              }
            }
            const mime = format === "png" ? "image/png" : format === "jpeg" ? "image/jpeg" : "image/webp";
            const dataURL = finalCanvas.toDataURL(mime, quality);
            const link = document.createElement("a");
            link.download = `edited-image.${format}`;
            link.href = dataURL;
            link.click();
          }}
          onQuickDownload={handleDownload}
          onSelectFile={(file) => acceptNewImageFile(file)}
          getCurrentCanvas={() => getRenderedCanvasRef.current?.() ?? null}
          imageSize={renderSize ?? undefined}
        />

      
      
      </div>
    </TooltipProvider>
  );
}