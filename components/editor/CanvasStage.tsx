"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Crop,
  Maximize2,
  Download,
  Scissors,
} from "lucide-react";
import { convertToPersianNumber } from "@/lib/utils";

type CropRect = { x: number; y: number; width: number; height: number } | null;
export type CropAspect = "free" | "1:1" | "3:4" | "4:3" | "16:9" | "9:16";

type CanvasStageProps = {
  image: string | null;
  imageStyle: React.CSSProperties;
  // Filters and geometry for canvas render
  brightness: number;
  contrast: number;
  saturation: number;
  rotationDeg: number;
  flipHorizontal: boolean;
  flipVertical: boolean;

  // Crop state
  isCropping: boolean;
  setIsCropping: (v: boolean) => void;
  cropRect: CropRect;
  setCropRect: (r: CropRect) => void;
  cropAspect: CropAspect;
  setCropAspect: (a: CropAspect) => void;
  // Callbacks
  onCroppedImage: (dataUrl: string) => void;
  onOpenExport?: () => void;
  onQuickDownload: () => void;
  onRotateCw: () => void;
  onRotateCcw: () => void;
  onFlipH: () => void;
  onFlipV: () => void;
  onImageLoaded?: () => void;
  onFileDropped: (file: File) => void;
  registerGetCanvas?: (fn: () => HTMLCanvasElement | null) => void;
};

export default function CanvasStage(props: CanvasStageProps) {
  const {
    image,
    imageStyle,
    brightness,
    contrast,
    saturation,
    rotationDeg,
    flipHorizontal,
    flipVertical,
    isCropping,
    setIsCropping,
    cropRect,
    setCropRect,
    cropAspect,
    setCropAspect,
    onCroppedImage,
    onOpenExport,
    onQuickDownload,
    onRotateCw,
    onRotateCcw,
    onFlipH,
    onFlipV,
    onImageLoaded,
    onFileDropped,
  } = props;

  const imgRef = useRef<HTMLImageElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const hasImage = !!image;
  const cropStartRef = useRef<{ x: number; y: number } | null>(null);
  const [isMovingCrop, setIsMovingCrop] = useState<boolean>(false);
  const moveOffsetRef = useRef<{ dx: number; dy: number } | null>(null);
  const [scalePct, setScalePct] = useState<number>(100);
  const [activeHandle, setActiveHandle] = useState<
    | null
    | "n" | "s" | "e" | "w"
    | "ne" | "nw" | "se" | "sw"
  >(null);

  const bgGridClass =
    "bg-[linear-gradient(to_right,theme(colors.border)_1px,rgba(0,0,0,0.07)_1px),linear-gradient(to_bottom,theme(colors.border)_1px,rgba(0,0,0,0.07)_1px)] bg-[size:24px_24px]";

  const renderCurrentToCanvas = useCallback(
    (applyFilters: boolean) => {
      const el = imgRef.current;
      if (!el) return null;
      const nw = el.naturalWidth;
      const nh = el.naturalHeight;
      const normalizedRotation = ((rotationDeg % 360) + 360) % 360;
      const isQuarterTurn = normalizedRotation === 90 || normalizedRotation === 270;
      const canvas = document.createElement("canvas");
      canvas.width = isQuarterTurn ? nh : nw;
      canvas.height = isQuarterTurn ? nw : nh;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      if (applyFilters) {
        ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
      }
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((normalizedRotation * Math.PI) / 180);
      ctx.scale(flipHorizontal ? -1 : 1, flipVertical ? -1 : 1);
      ctx.drawImage(el, -nw / 2, -nh / 2, nw, nh);
      ctx.restore();
      return canvas;
    },
    [brightness, contrast, saturation, rotationDeg, flipHorizontal, flipVertical]
  );

  useEffect(() => {
    if (props.registerGetCanvas) {
      props.registerGetCanvas(() => renderCurrentToCanvas(true));
    }
  }, [props.registerGetCanvas, renderCurrentToCanvas]);

  const aspectToNumber = useCallback((a: CropAspect): number | null => {
    switch (a) {
      case "1:1":
        return 1;
      case "3:4":
        return 3 / 4; // width:height -> portrait-ish
      case "4:3":
        return 4 / 3; // width:height -> landscape-ish
      case "16:9":
        return 16 / 9;
      case "9:16":
        return 9 / 16;
      default:
        return null;
    }
  }, []);

  const onMouseDownCrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isCropping) return;
    const overlayBounds = overlayRef.current?.getBoundingClientRect();
    const imgBounds = imgRef.current?.getBoundingClientRect();
    if (!overlayBounds || !imgBounds) return;
    // Only start if inside the image bounds
    if (
      e.clientX < imgBounds.left ||
      e.clientX > imgBounds.right ||
      e.clientY < imgBounds.top ||
      e.clientY > imgBounds.bottom
    ) {
      return;
    }
    const localX = e.clientX - overlayBounds.left;
    const localY = e.clientY - overlayBounds.top;

    // If clicking inside an existing crop, start move mode
    if (
      cropRect &&
      localX >= cropRect.x &&
      localX <= cropRect.x + cropRect.width &&
      localY >= cropRect.y &&
      localY <= cropRect.y + cropRect.height
    ) {
      setIsMovingCrop(true);
      moveOffsetRef.current = { dx: localX - cropRect.x, dy: localY - cropRect.y };
      return;
    }

    // Otherwise start creating a new selection
    cropStartRef.current = { x: localX, y: localY };
    setCropRect({ x: localX, y: localY, width: 0, height: 0 });
  };

  const onMouseMoveCrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isCropping) return;
    const overlayBounds = overlayRef.current?.getBoundingClientRect();
    const imgBounds = imgRef.current?.getBoundingClientRect();
    if (!overlayBounds || !imgBounds) return;
    const curX = e.clientX - overlayBounds.left;
    const curY = e.clientY - overlayBounds.top;

    // Resizing via handle (free aspect only)
    if (activeHandle && cropRect && cropAspect === "free") {
      const imgLeft = imgBounds.left - overlayBounds.left;
      const imgTop = imgBounds.top - overlayBounds.top;
      const imgRight = imgBounds.right - overlayBounds.left;
      const imgBottom = imgBounds.bottom - overlayBounds.top;

      let { x, y, width, height } = cropRect;
      let nx = x;
      let ny = y;
      let nw = width;
      let nh = height;

      const clampX = (val: number) => Math.min(Math.max(val, imgLeft), imgRight);
      const clampY = (val: number) => Math.min(Math.max(val, imgTop), imgBottom);

      const right = x + width;
      const bottom = y + height;

      const cx = clampX(curX);
      const cy = clampY(curY);

      if (activeHandle.includes("e")) {
        nw = Math.max(1, cx - x);
      }
      if (activeHandle.includes("s")) {
        nh = Math.max(1, cy - y);
      }
      if (activeHandle.includes("w")) {
        nx = Math.min(cx, right - 1);
        nw = Math.max(1, right - nx);
      }
      if (activeHandle.includes("n")) {
        ny = Math.min(cy, bottom - 1);
        nh = Math.max(1, bottom - ny);
      }

      // Ensure within image bounds
      if (nx < imgLeft) {
        nw -= imgLeft - nx;
        nx = imgLeft;
      }
      if (ny < imgTop) {
        nh -= imgTop - ny;
        ny = imgTop;
      }
      if (nx + nw > imgRight) {
        nw = imgRight - nx;
      }
      if (ny + nh > imgBottom) {
        nh = imgBottom - ny;
      }

      setCropRect({ x: Math.round(nx), y: Math.round(ny), width: Math.round(nw), height: Math.round(nh) });
      return;
    }

    // Moving existing rect
    if (isMovingCrop && cropRect && moveOffsetRef.current) {
      let nx = curX - moveOffsetRef.current.dx;
      let ny = curY - moveOffsetRef.current.dy;
      const imgLeft = imgBounds.left - overlayBounds.left;
      const imgTop = imgBounds.top - overlayBounds.top;
      const imgRight = imgBounds.right - overlayBounds.left;
      const imgBottom = imgBounds.bottom - overlayBounds.top;

      // Clamp so the whole rect stays within image
      nx = Math.max(imgLeft, Math.min(nx, imgRight - cropRect.width));
      ny = Math.max(imgTop, Math.min(ny, imgBottom - cropRect.height));
      setCropRect({ x: Math.round(nx), y: Math.round(ny), width: cropRect.width, height: cropRect.height });
      return;
    }

    // Creating new rect
    if (!cropStartRef.current) return;
    let x = Math.min(curX, cropStartRef.current.x);
    let y = Math.min(curY, cropStartRef.current.y);
    let w = Math.abs(curX - cropStartRef.current.x);
    let h = Math.abs(curY - cropStartRef.current.y);

    // Clamp to image bounds
    const imgLeft = imgBounds.left - overlayBounds.left;
    const imgTop = imgBounds.top - overlayBounds.top;
    const imgRight = imgBounds.right - overlayBounds.left;
    const imgBottom = imgBounds.bottom - overlayBounds.top;

    x = Math.max(x, imgLeft);
    y = Math.max(y, imgTop);
    // Instead of capping width/height blindly, recalc w/h relative to the starting point
    const start = cropStartRef.current;
    const endX = Math.min(Math.max(curX, imgLeft), imgRight);
    const endY = Math.min(Math.max(curY, imgTop), imgBottom);
    x = Math.min(start.x, endX);
    y = Math.min(start.y, endY);
    w = Math.abs(endX - start.x);
    h = Math.abs(endY - start.y);

    // Enforce aspect ratio if any
    const target = aspectToNumber(cropAspect);
    if (target && w > 0 && h > 0) {
      // Adjust dimensions keeping the selection anchored to (x,y).
      const adjustedW = Math.round(h * target);
      const adjustedH = Math.round(w / target);
      if (adjustedW <= imgRight - x) {
        w = adjustedW;
      } else {
        h = Math.round((imgRight - x) / target);
        w = Math.round(h * target);
      }
      if (y + h > imgBottom) {
        h = imgBottom - y;
        w = Math.round(h * target);
      }
    }

    setCropRect({ x, y, width: w, height: h });
  };

  const onMouseUpCrop = () => {
    if (!isCropping) return;
    cropStartRef.current = null;
    setIsMovingCrop(false);
    moveOffsetRef.current = null;
    setActiveHandle(null);
  };

  const ensureInitialCropForAspect = useCallback(() => {
    if (!imgRef.current || !overlayRef.current) return;
    const a = aspectToNumber(cropAspect);
    if (!a) return; // only for fixed aspects
    const overlayBounds = overlayRef.current.getBoundingClientRect();
    const imgBounds = imgRef.current.getBoundingClientRect();
    const imgLeft = imgBounds.left - overlayBounds.left;
    const imgTop = imgBounds.top - overlayBounds.top;
    const imgWidth = imgBounds.width;
    const imgHeight = imgBounds.height;

    // target size ~80% of the image, respecting aspect ratio
    let targetW = imgWidth * 0.8;
    let targetH = targetW / a;
    if (targetH > imgHeight * 0.8) {
      targetH = imgHeight * 0.8;
      targetW = targetH * a;
    }

    const x = Math.round(imgLeft + (imgWidth - targetW) / 2);
    const y = Math.round(imgTop + (imgHeight - targetH) / 2);
    setCropRect({ x, y, width: Math.round(targetW), height: Math.round(targetH) });
  }, [aspectToNumber, cropAspect, isCropping]);

  useEffect(() => {
    if (isCropping && aspectToNumber(cropAspect)) {
      // Seed when ratio changes or image changes
      ensureInitialCropForAspect();
    }
  }, [cropAspect, isCropping, ensureInitialCropForAspect, image, aspectToNumber]);

  const performCrop = () => {
    if (!cropRect || !imgRef.current) return;
    const imgBounds = imgRef.current.getBoundingClientRect();
    const overlayBounds = overlayRef.current?.getBoundingClientRect();
    if (!overlayBounds) return;

    const cropAbs = {
      left: overlayBounds.left + cropRect.x,
      top: overlayBounds.top + cropRect.y,
      right: overlayBounds.left + cropRect.x + cropRect.width,
      bottom: overlayBounds.top + cropRect.y + cropRect.height,
    };

    // Intersection with image
    const interLeft = Math.max(cropAbs.left, imgBounds.left);
    const interTop = Math.max(cropAbs.top, imgBounds.top);
    const interRight = Math.min(cropAbs.right, imgBounds.right);
    const interBottom = Math.min(cropAbs.bottom, imgBounds.bottom);
    const interWidth = Math.max(0, interRight - interLeft);
    const interHeight = Math.max(0, interBottom - interTop);
    if (interWidth <= 2 || interHeight <= 2) {
      setIsCropping(false);
      setCropRect(null);
      return;
    }

    const orientedCanvas = renderCurrentToCanvas(false);
    if (!orientedCanvas) return;

    const ratioX = orientedCanvas.width / imgBounds.width;
    const ratioY = orientedCanvas.height / imgBounds.height;
    const srcX = Math.max(0, Math.round((interLeft - imgBounds.left) * ratioX));
    const srcY = Math.max(0, Math.round((interTop - imgBounds.top) * ratioY));
    const srcW = Math.min(
      orientedCanvas.width - srcX,
      Math.round(interWidth * ratioX)
    );
    const srcH = Math.min(
      orientedCanvas.height - srcY,
      Math.round(interHeight * ratioY)
    );

    const outCanvas = document.createElement("canvas");
    outCanvas.width = Math.max(1, srcW);
    outCanvas.height = Math.max(1, srcH);
    const outCtx = outCanvas.getContext("2d");
    if (!outCtx) return;
    outCtx.drawImage(
      orientedCanvas,
      srcX,
      srcY,
      srcW,
      srcH,
      0,
      0,
      srcW,
      srcH
    );

    onCroppedImage(outCanvas.toDataURL("image/png"));
    setIsCropping(false);
    setCropRect(null);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file && file.type.startsWith("image/")) {
      onFileDropped(file);
    }
  };

  const cropAspectLabel = useMemo(() => {
    switch (cropAspect) {
      case "1:1":
        return "۱:۱";
      case "3:4":
        return "۳:۴";
      case "4:3":
        return "۴:۳";
      case "16:9":
        return "۱۶:۹";
      case "9:16":
        return "۹:۱۶";
      default:
        return "آزاد";
    }
  }, [cropAspect]);

  return (
    <div
      ref={stageRef}
      className={`flex-grow h-full flex items-center justify-center p-4 md:p-8 relative ${bgGridClass} overflow-hidden`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <TransformWrapper
        minScale={0.05}
        maxScale={8}
        centerOnInit
        limitToBounds={false}
        wheel={{ step: 0.1 }}
        panning={{ disabled: isCropping }}
        doubleClick={{ disabled: true }}
        onTransformed={(ref: any) => {
          const sc = Math.round((ref?.state?.scale ?? 1) * 100);
          setScalePct(sc);
        }}
      >
        {(controls) => {
          const { zoomIn, zoomOut, setTransform, resetTransform } = controls as any;
          const handleFitToScreen = () => {
            const wrapper = stageRef.current;
            const imgEl = imgRef.current as HTMLImageElement | null;
            if (!wrapper || !imgEl) return;
            const wrapperRect = wrapper.getBoundingClientRect();
            const imgNaturalW = imgEl.naturalWidth;
            const imgNaturalH = imgEl.naturalHeight;
            if (!imgNaturalW || !imgNaturalH) return;
            const scale = Math.min(
              (wrapperRect.width * 0.9) / imgNaturalW,
              (wrapperRect.height * 0.9) / imgNaturalH
            );
            const x = (wrapperRect.width - imgNaturalW * scale) / 2;
            const y = (wrapperRect.height - imgNaturalH * scale) / 2;
            setTransform(x, y, Math.max(0.05, scale), 200);
          };

          return (
            <>
              {/* Top Toolbar */}
              <div className="absolute top-4 right-4 z-20 flex flex-wrap items-center gap-2 rounded-xl border bg-background/70 backdrop-blur px-2 py-2 shadow-sm select-none">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="secondary" className="bg-muted/50 border" size="icon" onClick={() => zoomIn()}>
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>بزرگ‌نمایی</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="secondary" className="bg-muted/50 border" size="icon" onClick={() => zoomOut()}>
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>کوچک‌نمایی</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="secondary" className="bg-muted/50 border" size="icon" onClick={handleFitToScreen}>
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>جایگیری در صفحه</TooltipContent>
                </Tooltip>
                <Separator orientation="vertical" className="h-6" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="secondary" className="bg-muted/50 border" size="icon" onClick={onRotateCcw} disabled={!hasImage}>
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>چرخش پادساعت‌گرد</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="secondary" className="bg-muted/50 border" size="icon" onClick={onRotateCw} disabled={!hasImage}>
                      <RotateCw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>چرخش ساعت‌گرد</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="secondary" className="bg-muted/50 border" size="icon" onClick={onFlipH} disabled={!hasImage}>
                      <FlipHorizontal className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>قرینه افقی</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="secondary" className="bg-muted/50 border" size="icon" onClick={onFlipV} disabled={!hasImage}>
                      <FlipVertical className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>قرینه عمودی</TooltipContent>
                </Tooltip>
                <Separator orientation="vertical" className="h-6" />
                <Popover>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PopoverTrigger asChild>
                        <Button
                          variant={isCropping ? "secondary" : "secondary"}
                          size="icon"
                          className="bg-muted/50 border"  
                          disabled={!hasImage}
                          onClick={() => {
                            if (!hasImage) return;
                            const willEnable = !isCropping;
                            setIsCropping(willEnable);
                            if (!willEnable) {
                              setCropRect(null);
                            } else {
                              // If enabling with a fixed aspect, pre-seed rect
                              requestAnimationFrame(() => ensureInitialCropForAspect());
                            }
                          }}
                        >
                          <Crop className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent>ابزار برش</TooltipContent>
                  </Tooltip>
                  <PopoverContent align="end" className="w-56">
                    <div className="grid gap-2 text-right">
                      <div className="text-sm text-muted-foreground">نسبت برش</div>
                      <div className="grid grid-cols-3 gap-2">
                        {["free", "1:1", "3:4", "4:3", "16:9", "9:16"].map((opt) => (
                          <Button
                            key={opt}
                            variant={cropAspect === (opt === "free" ? "free" : (opt as CropAspect)) ? "secondary" : "ghost"}
                            size="sm"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              const next = opt === "free" ? "free" : (opt as CropAspect);
                              setCropAspect(next);
                             
                              if (next !== "free") requestAnimationFrame(() => ensureInitialCropForAspect());
                            }}
                          >
                            {opt === "free" ? "آزاد" : opt}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                <Tooltip>
                  <TooltipTrigger asChild>
                      <Button variant="secondary" className="bg-muted/50 border" size="icon" onClick={onQuickDownload} disabled={!hasImage}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>دانلود سریع</TooltipContent>
                </Tooltip>
              </div>

              {/* Zoom indicator */}
              <div className="absolute bottom-4 left-4 z-20 rounded-full border bg-background/70 backdrop-blur px-3 py-1 text-xs text-muted-foreground shadow-sm">
               {convertToPersianNumber(scalePct)}%
              </div>

              <TransformComponent
                wrapperStyle={{ width: "100%", height: "100%" }}
                contentStyle={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {image ? (
                  <img
                    ref={imgRef}
                    src={image}
                    alt="Uploaded"
                    draggable={false}
                    onLoad={onImageLoaded}
                    className="select-none"
                    style={imageStyle}
                  />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <p>برای شروع، یک تصویر را بکشید و رها کنید یا بارگذاری کنید</p>
                  </div>
                )}
              </TransformComponent>

              {/* Crop overlay */}
              {isCropping && (
                <div
                  ref={overlayRef}
                  className="absolute inset-0 z-30 cursor-crosshair"
                  onMouseDown={onMouseDownCrop}
                  onMouseMove={onMouseMoveCrop}
                  onMouseUp={onMouseUpCrop}
                >
                  {/* Dim background */}
                  <div className="absolute inset-0 bg-black/30 pointer-events-none" />
                  {cropRect && (
                    <div
                      className="absolute border-2 border-primary bg-transparent"
                      style={{
                        left: cropRect.x,
                        top: cropRect.y,
                        width: cropRect.width,
                        height: cropRect.height,
                        cursor: isMovingCrop ? "grabbing" : "grab",
                      }}
                      onMouseDown={(e) => {
                        // Start moving when pressing inside the rect, but let the overlay handler handle it too
                        // Prevent starting a new selection from this element
                        e.stopPropagation();
                        const overlayBounds = overlayRef.current?.getBoundingClientRect();
                        if (!overlayBounds) return;
                        const localX = e.clientX - overlayBounds.left;
                        const localY = e.clientY - overlayBounds.top;
                        setIsMovingCrop(true);
                        moveOffsetRef.current = { dx: localX - cropRect.x, dy: localY - cropRect.y };
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        performCrop();
                      }}
                    >
                      {/* Handles (only interactive for free aspect) */}
                      <div
                        className="absolute -top-1 -left-1 size-2 rounded-full bg-primary"
                        style={{ cursor: cropAspect === "free" ? "nwse-resize" : "not-allowed" }}
                        onMouseDown={(e) => {
                          if (cropAspect !== "free") return;
                          e.stopPropagation();
                          setActiveHandle("nw");
                        }}
                      />
                      <div
                        className="absolute -top-1 -right-1 size-2 rounded-full bg-primary"
                        style={{ cursor: cropAspect === "free" ? "nesw-resize" : "not-allowed" }}
                        onMouseDown={(e) => {
                          if (cropAspect !== "free") return;
                          e.stopPropagation();
                          setActiveHandle("ne");
                        }}
                      />
                      <div
                        className="absolute -bottom-1 -left-1 size-2 rounded-full bg-primary"
                        style={{ cursor: cropAspect === "free" ? "nesw-resize" : "not-allowed" }}
                        onMouseDown={(e) => {
                          if (cropAspect !== "free") return;
                          e.stopPropagation();
                          setActiveHandle("sw");
                        }}
                      />
                      <div
                        className="absolute -bottom-1 -right-1 size-2 rounded-full bg-primary"
                        style={{ cursor: cropAspect === "free" ? "nwse-resize" : "not-allowed" }}
                        onMouseDown={(e) => {
                          if (cropAspect !== "free") return;
                          e.stopPropagation();
                          setActiveHandle("se");
                        }}
                      />
                      {/* Edge handles */}
                      <div
                        className="absolute left-1/2 -translate-x-1/2 -top-1 h-2 w-3 rounded-xs bg-primary"
                        style={{ cursor: cropAspect === "free" ? "ns-resize" : "not-allowed" }}
                        onMouseDown={(e) => {
                          if (cropAspect !== "free") return;
                          e.stopPropagation();
                          setActiveHandle("n");
                        }}
                      />
                      <div
                        className="absolute left-1/2 -translate-x-1/2 -bottom-1 h-2 w-3 rounded-xs bg-primary"
                        style={{ cursor: cropAspect === "free" ? "ns-resize" : "not-allowed" }}
                        onMouseDown={(e) => {
                          if (cropAspect !== "free") return;
                          e.stopPropagation();
                          setActiveHandle("s");
                        }}
                      />
                      <div
                        className="absolute top-1/2 -translate-y-1/2 -left-1 h-3 w-2 rounded-xs bg-primary"
                        style={{ cursor: cropAspect === "free" ? "ew-resize" : "not-allowed" }}
                        onMouseDown={(e) => {
                          if (cropAspect !== "free") return;
                          e.stopPropagation();
                          setActiveHandle("w");
                        }}
                      />
                      <div
                        className="absolute top-1/2 -translate-y-1/2 -right-1 h-3 w-2 rounded-xs bg-primary"
                        style={{ cursor: cropAspect === "free" ? "ew-resize" : "not-allowed" }}
                        onMouseDown={(e) => {
                          if (cropAspect !== "free") return;
                          e.stopPropagation();
                          setActiveHandle("e");
                        }}
                      />
                      {/* Actions */}
                      <div
                        className="absolute -top-10 left-0 flex items-center gap-2 rounded-md border bg-background px-2 py-1 shadow-sm"
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <Button size="sm" variant="secondary" onClick={performCrop} className="gap-1">
                          <Scissors className="h-3.5 w-3.5" />
                          تایید
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setIsCropping(false);
                            setCropRect(null);
                          }}
                        >
                          لغو
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          );
        }}
      </TransformWrapper>
    </div>
  );
}


