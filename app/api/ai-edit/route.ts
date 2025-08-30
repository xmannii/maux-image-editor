import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function POST(request: NextRequest) {
  try {
    const { imageDataUrl, prompt } = await request.json();

    if (!imageDataUrl || !prompt) {
      return NextResponse.json(
        { error: "تصویر و متن درخواست مورد نیاز است" },
        { status: 400 }
      );
    }

    // Convert data URL to base64
    const base64Data = imageDataUrl.split(",")[1];
    if (!base64Data) {
      return NextResponse.json(
        { error: "فرمت تصویر نامعتبر است" },
        { status: 400 }
      );
    }

    const input = {
      prompt: prompt,
      image_input: [imageDataUrl]
    };

    const output = await replicate.run("google/nano-banana", { input });

    // Convert the output to a data URL
    const outputUrl = Array.isArray(output) ? output[0] : output;
    const response = await fetch(outputUrl as string);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    const mimeType = 'image/jpeg'; // nano-banana outputs JPEG
    const dataUrl = `data:${mimeType};base64,${base64}`;

    return NextResponse.json({
      success: true,
      editedImage: dataUrl,
      originalImage: imageDataUrl,
    });

  } catch (error) {
    console.error("AI editing error:", error);
    return NextResponse.json(
      { error: "خطا در پردازش تصویر" },
      { status: 500 }
    );
  }
}
