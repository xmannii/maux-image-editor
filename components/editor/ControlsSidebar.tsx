"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Sun, Contrast, UploadCloud, Lock, Unlock, RefreshCcw, ImageDown, FileDown, Trash, Coffee } from "lucide-react";
import { convertToPersianNumber } from "@/lib/utils";
import { IconMaux } from "@/components/ui/icons";
type ControlsSidebarProps = {
  hasImage: boolean;
  isProcessing: boolean;
  brightness: number;
  contrast: number;
  saturation: number;
  onBrightness: (n: number) => void;
  onContrast: (n: number) => void;
  onSaturation: (n: number) => void;
  onResetAdjustments: () => void;
  onRemoveImage: () => void;
  onExport: (
    format: "png" | "jpeg" | "webp",
    quality: number,
    outputWidth?: number,
    outputHeight?: number
  ) => void;
  onQuickDownload: () => void;
  onSelectFile: (file: File) => void;
  getCurrentCanvas?: () => HTMLCanvasElement | null;
  imageSize?: { w: number; h: number };
};

export default function ControlsSidebar(props: ControlsSidebarProps) {
  const {
    hasImage,
    isProcessing,
    brightness,
    contrast,
    saturation,
    onBrightness,
    onContrast,
    onSaturation,
    onResetAdjustments,
    onRemoveImage,
    onExport,
    onQuickDownload,
    onSelectFile,
    getCurrentCanvas,
    imageSize,
  } = props;

  const [isDropOver, setIsDropOver] = useState(false);
  const [exportFormat, setExportFormat] = useState<"png" | "jpeg" | "webp">("png");
  const [exportQuality, setExportQuality] = useState<number>(90);
  const [locked, setLocked] = useState<boolean>(true);
  const [widthStr, setWidthStr] = useState<string>("");
  const [heightStr, setHeightStr] = useState<string>("");
  const [baseAspect, setBaseAspect] = useState<number>(1);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const getMaxDims = useCallback(() => {
    const w = imageSize?.w ?? getCurrentCanvas?.()?.width ?? 0;
    const h = imageSize?.h ?? getCurrentCanvas?.()?.height ?? 0;
    return { maxW: Math.max(0, w), maxH: Math.max(0, h) };
  }, [imageSize?.w, imageSize?.h, getCurrentCanvas]);

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && f.type.startsWith("image/")) onSelectFile(f);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDropOver(false);
    const f = e.dataTransfer?.files?.[0];
    if (f && f.type.startsWith("image/")) onSelectFile(f);
  };

  // Initialize output size from current canvas
  useEffect(() => {
    if (!hasImage) return;
    const w = imageSize?.w ?? getCurrentCanvas?.()?.width ?? 0;
    const h = imageSize?.h ?? getCurrentCanvas?.()?.height ?? 0;
    if (w > 0 && h > 0) {
      setWidthStr(String(w));
      setHeightStr(String(h));
      setBaseAspect(w / h);
    }
  }, [hasImage, getCurrentCanvas, imageSize?.w, imageSize?.h]);

  const resetSizeToDefault = useCallback(() => {
    const w = imageSize?.w ?? getCurrentCanvas?.()?.width ?? 0;
    const h = imageSize?.h ?? getCurrentCanvas?.()?.height ?? 0;
    if (w > 0 && h > 0) {
      setWidthStr(String(w));
      setHeightStr(String(h));
      setBaseAspect(w / h);
    }
  }, [imageSize?.w, imageSize?.h, getCurrentCanvas]);

  const handleWidthInput = (raw: string) => {
    // Normalize Persian digits to ASCII and allow empty while typing
    const normalized = raw.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
    const cleaned = normalized.replace(/[^0-9]/g, "");
    if (cleaned === "") {
      setWidthStr("");
      return;
    }
    const num = parseInt(cleaned, 10);
    const { maxW, maxH } = getMaxDims();
    let finalW = num;
    if (maxW > 0) finalW = Math.min(finalW, maxW);
    if (locked && baseAspect > 0 && maxH > 0) {
      const maxWidthByHeight = Math.round(maxH * baseAspect);
      finalW = Math.min(finalW, maxWidthByHeight);
    }
    setWidthStr(String(finalW));
    if (locked && baseAspect > 0) {
      const newH = Math.max(1, Math.round(finalW / baseAspect));
      setHeightStr(String(newH));
    }
  };

  const handleHeightInput = (raw: string) => {
    const normalized = raw.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
    const cleaned = normalized.replace(/[^0-9]/g, "");
    if (cleaned === "") {
      setHeightStr("");
      return;
    }
    const num = parseInt(cleaned, 10);
    const { maxW, maxH } = getMaxDims();
    let finalH = num;
    if (maxH > 0) finalH = Math.min(finalH, maxH);
    if (locked && baseAspect > 0 && maxW > 0) {
      const maxHeightByWidth = Math.round(maxW / baseAspect);
      finalH = Math.min(finalH, maxHeightByWidth);
    }
    setHeightStr(String(finalH));
    if (locked && baseAspect > 0) {
      const newW = Math.max(1, Math.round(finalH * baseAspect));
      setWidthStr(String(newW));
    }
  };

    return (
    <aside className="w-full max-w-sm h-full border-l  overflow-hidden flex flex-col">
      <div className="p-6 border-b flex items-center justify-between">
        <a
          href="https://maux.site"
          target="_blank"
          rel="noopener noreferrer"
          className="group"
          title="maux.site"
        >
          <IconMaux className="h-6 w-6 ml-2 text-primary transition-colors group-hover:text-primary/80" />
        </a>
        <h2 className="text-right text-md text-primary/70 font-semibold m-0 p-0"> ابزار ویرایش عکس ماکس</h2>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="p-6 space-y-6">
          {!hasImage ? (
            <div
              className={`border-2 border-dashed border-primary/50 rounded-lg p-6 grid place-items-center text-center cursor-pointer transition-all duration-200 ${
                isDropOver 
                  ? "border-primary bg-primary/5 scale-[1.02]" 
                  : "border-muted-foreground/40 hover:border-primary/60 hover:bg-accent/30"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDropOver(true);
              }}
              onDragLeave={() => setIsDropOver(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadCloud className="h-8 w-8 mb-3 text-muted-foreground" />
              <div className="text-sm font-medium">تصویر را بکشید و رها کنید</div>
              <div className="text-xs text-muted-foreground mt-1">یا برای انتخاب کلیک کنید</div>
              <input ref={fileInputRef} id="picture" type="file" className="hidden" onChange={onFileInput} accept="image/*" />
            </div>
          ) : (
            <div className="  bg-muted/50 border rounded-lg p-4 text-center space-y-3">
              <div className="text-sm font-medium text-foreground">تصویر آپلود شده</div>
              <Button variant="secondary" size="sm" onClick={onRemoveImage} className="w-full bg-muted/50 border">
              <Trash className="h-4 w-4 mr-1" /> حذف تصویر 
              </Button>
           
            </div>
          )}

          {hasImage && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 bg-muted/50 border rounded-lg px-2 py-2">
                <div className="flex-1 flex flex-col items-center gap-1">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-9 w-9 flex flex-col text-primary items-center justify-center ">
                        <Sun className="h-5 w-5" />
                        <span className="text-[10px] mt-1">روشنایی</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="center" className="w-56 p-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground">{convertToPersianNumber(brightness)}%</span>
                          <span className="font-medium text-sm">روشنایی</span>
                        </div>
                        <Slider min={0} max={200} value={[brightness]} onValueChange={(v) => onBrightness(v[0])} />
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex-1 flex flex-col items-center gap-1">
                  <Popover>
                    <PopoverTrigger asChild>  
                      <Button variant="ghost" size="icon" className="h-9 w-9 flex flex-col text-primary items-center justify-center">
                        <Contrast className="h-5 w-5" />
                        <span className="text-[10px] mt-1">کنتراست</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="center" className="w-56 p-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground">{convertToPersianNumber(contrast)}%</span>
                          <span className="font-medium text-sm">کنتراست</span>
                        </div>
               

                        <Slider min={0} max={200} value={[contrast]} onValueChange={(v) => onContrast(v[0])} />
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex-1 flex flex-col items-center gap-1">
                  <Popover>
                    <PopoverTrigger asChild>  
                      <Button variant="ghost" size="icon" className="h-9 w-9 flex flex-col text-primary items-center justify-center">
                        <Sun className="h-5 w-5 rotate-90" />
                        <span className="text-[10px] mt-1">اشباع</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="center" className="w-56 p-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground">{convertToPersianNumber(saturation)}%</span>
                          <span className="font-medium text-sm">اشباع رنگ</span>
                        </div>
                        <Slider min={0} max={200} value={[saturation]} onValueChange={(v) => onSaturation(v[0])} />
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>



              {/* Output size with centered lock */}
              <div className="space-y-3">
                <h4 className="text-right font-semibold text-sm">ابعاد خروجی</h4>
                <div className="grid gap-1">
                  <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
                    <Input
                      inputMode="numeric"
                      className="text-center bg-muted/50 border rounded-lg text-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      value={widthStr}
                      onChange={(e) => handleWidthInput(e.target.value)}
                      placeholder="عرض"
                    />
                    <Button
                      type="button"
                      variant={locked ? "secondary" : "ghost"}
                      onClick={() => setLocked((v) => !v)}
                      size="icon"
                      className="h-8 w-8"
                      aria-label={locked ? "قفل نسبت" : "آزاد"}
                    >
                      {locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                    </Button>
                    <Input
                      inputMode="numeric"
                      className="text-center bg-muted/50 border rounded-lg text-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      value={heightStr}
                      onChange={(e) => handleHeightInput(e.target.value)}
                      placeholder="ارتفاع"
                    />
                  </div>
                  <div className="grid grid-cols-[1fr_auto_1fr] text-xs text-muted-foreground">
                    <div className="text-center mt-1">عرض</div>
                    <div></div>
                    <div className="text-center mt-1">ارتفاع</div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-right font-semibold text-sm">فرمت خروجی</h4>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant={exportFormat === "png" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setExportFormat("png")}
                  >
                    <FileDown className="h-4 w-4 ml-1" /> PNG
                  </Button>
                  <Button
                    variant={exportFormat === "jpeg" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setExportFormat("jpeg")}
                  >
                    <FileDown className="h-4 w-4 ml-1" /> JPEG
                  </Button>
                  <Button
                    variant={exportFormat === "webp" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setExportFormat("webp")}
                  >
                    <FileDown className="h-4 w-4 ml-1" /> WebP
                  </Button>
                </div>
                
                {exportFormat !== "png" && (
                  <div className="space-y-2" dir="rtl">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">کیفیت</span>
                      <span className="text-sm text-muted-foreground">
                        {exportQuality
                          .toString()
                          .replace(/\d/g, d => convertToPersianNumber(parseInt(d)))}
                        ٪
                      </span>
                    </div>
                    <Slider
                      min={10}
                      max={100}
                      value={[exportQuality]}
                      onValueChange={(v) => setExportQuality(v[0])}
                      className="w-full"
                      dir="ltr"
                    />
                  </div>
                )}
              </div>
              
              <Button variant="ghost" onClick={() => { onResetAdjustments(); resetSizeToDefault(); }} className="w-full border" size="icon">
                <RefreshCcw className="h-4 w-4 ml-2" /> بازنشانی تنظیمات
              </Button>

              <Button 
                onClick={() => {
                  const outW = parseInt(widthStr, 10);
                  const outH = parseInt(heightStr, 10);
                  onExport(
                    exportFormat, 
                    exportQuality / 100,
                    !isNaN(outW) && outW > 0 ? outW : undefined,
                    !isNaN(outH) && outH > 0 ? outH : undefined
                  );
                }} 
                disabled={isProcessing}
                variant="secondary"
                className="w-full bg-muted/50 border"
                size="lg"
              >
                <ImageDown className="h-4 w-4 ml-2" /> خروجی با تنظیمات
              </Button>
            </div>
          )}
        </div>
      </div>
      <div className="p-4 border-t">
        <Button asChild className="w-full" variant="ghost">
          <a href="http://www.coffeete.ir/mirzaei_mani" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
           buy me a coffee <Coffee className="h-4 w-4" /> 
          </a>
        </Button>
      </div>
    </aside>
  );
}


