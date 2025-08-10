import { type NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json();
    if (!image) {
      return NextResponse.json({ error: "Image is required" }, { status: 400 });
    }

    const imageBuffer = Buffer.from(
      image.replace(/^data:image\/\w+;base64,/, ""),
      "base64"
    );

    const originalSize = imageBuffer.length;

    const resizedImageBuffer = await sharp(imageBuffer)
      .jpeg({ quality: 80 }) // Adjust quality to balance size and appearance
      .toBuffer();

    const resizedSize = resizedImageBuffer.length;

    const resizedImageData = `data:image/jpeg;base64,${resizedImageBuffer.toString(
      "base64"
    )}`;

    return NextResponse.json({
      image: resizedImageData,
      sizeComparison: {
        original: originalSize,
        resized: resizedSize,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
