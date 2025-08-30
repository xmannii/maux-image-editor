"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
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
  const [isAiEditing, setIsAiEditing] = useState<boolean>(false);
  const [aiPrompt, setAiPrompt] = useState<string>("");
  const [showAiPrompt, setShowAiPrompt] = useState<boolean>(false);
  const [sizeComparison, setSizeComparison] = useState<SizeComparison | null>(
    null
  );

  const [renderSize, setRenderSize] = useState<{ w: number; h: number } | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(false);

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
        setShowAiPrompt(true);
        setAiPrompt("");
        toast.success("تصویر با موفقیت بارگذاری شد!");
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

  // Detect mobile/small screens and force a notice dialog
  useEffect(() => {
    const checkMobile = () => {
      const smallScreen = window.matchMedia("(max-width: 768px)").matches;
      const uaMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
      setIsMobile(smallScreen || uaMobile);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);


  const handleDownload = () => {
    const canvas = getRenderedCanvasRef.current?.();
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "edited-image.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("تصویر با موفقیت دانلود شد!");
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
    toast.success(`تصویر با فرمت ${format.toUpperCase()} دانلود شد!`);
  };



  const handleAiEdit = async () => {
    if (!image || !aiPrompt.trim() || isAiEditing) return;
    
    setIsAiEditing(true);
    toast.loading("در حال پردازش تصویر...", {
      id: "ai-edit",
    });
    
    try {
      const response = await fetch("/api/ai-edit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageDataUrl: image,
          prompt: aiPrompt,
        }),
      });

      if (!response.ok) {
        throw new Error("خطا در پردازش تصویر");
      }

      const result = await response.json();
      if (result.success) {
        if (result.editedImage) {
          // If we got an edited image, replace the current image
          setImage(result.editedImage);
          setAiPrompt("");
          // Keep the prompt input visible for further edits
          toast.success("تصویر با موفقیت ویرایش شد!", {
            id: "ai-edit",
          });
        } else if (result.analysis) {
          // Fallback to showing analysis
          toast.info(`تحلیل AI:\n\n${result.analysis}`, {
            id: "ai-edit",
            duration: 8000,
          });
          setAiPrompt("");
        }
      }
    } catch (error) {
      console.error("AI editing error:", error);
      toast.error("خطا در پردازش تصویر", {
        id: "ai-edit",
      });
    } finally {
      setIsAiEditing(false);
    }
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
    setAiPrompt("");
    setShowAiPrompt(false);
    toast.info("تصویر حذف شد");
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
        <Dialog open={isMobile} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle className="text-center ">این نسخه روی موبایل پشتیبانی نمی‌شود</DialogTitle>
              <DialogDescription className="text-right" dir="auto">
                متاسفانه در حال حاضر استفاده از این وب‌اپ تنها روی دسکتاپ امکان‌پذیر است. لطفاً با رایانه یا نمایشگر بزرگ‌تر وارد شوید.
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>

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
          showAiPrompt={showAiPrompt}
          aiPrompt={aiPrompt}
          setAiPrompt={setAiPrompt}
          isAiEditing={isAiEditing}
          onAiEdit={handleAiEdit}
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