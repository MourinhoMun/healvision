import sharp from 'sharp';

const MARKER = 'HEALVISION';

export async function embedWatermark(imageBuffer: Buffer, metadata: string): Promise<Buffer> {
  const message = `${MARKER}|${metadata}`;
  const bits = stringToBits(message);

  const image = sharp(imageBuffer);
  const { data, info } = await image
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = Buffer.from(data);
  const channels = info.channels;

  // Embed bits into the LSB of the blue channel (channel index 2)
  // First 32 bits encode the message length
  const lengthBits = numberToBits(bits.length, 32);
  const allBits = [...lengthBits, ...bits];

  let bitIndex = 0;
  for (let i = 0; i < pixels.length && bitIndex < allBits.length; i += channels) {
    const blueIdx = i + 2; // Blue channel
    if (blueIdx < pixels.length) {
      pixels[blueIdx] = (pixels[blueIdx] & 0xFE) | allBits[bitIndex];
      bitIndex++;
    }
  }

  return sharp(pixels, {
    raw: { width: info.width, height: info.height, channels: info.channels },
  })
    .jpeg({ quality: 95 })
    .toBuffer();
}

export async function extractWatermark(imageBuffer: Buffer): Promise<string | null> {
  try {
    const { data, info } = await sharp(imageBuffer)
      .raw()
      .toBuffer({ resolveWithObject: true });

    const pixels = Buffer.from(data);
    const channels = info.channels;

    // Read length (first 32 bits)
    const lengthBits: number[] = [];
    let pixelIdx = 0;
    for (let i = 0; i < 32 && pixelIdx < pixels.length; i++) {
      const blueIdx = pixelIdx + 2;
      if (blueIdx < pixels.length) {
        lengthBits.push(pixels[blueIdx] & 1);
      }
      pixelIdx += channels;
    }

    const messageLength = bitsToNumber(lengthBits);
    if (messageLength <= 0 || messageLength > 10000) return null;

    // Read message bits
    const messageBits: number[] = [];
    for (let i = 0; i < messageLength && pixelIdx < pixels.length; i++) {
      const blueIdx = pixelIdx + 2;
      if (blueIdx < pixels.length) {
        messageBits.push(pixels[blueIdx] & 1);
      }
      pixelIdx += channels;
    }

    const message = bitsToString(messageBits);
    return message.startsWith(MARKER) ? message : null;
  } catch {
    return null;
  }
}

function stringToBits(str: string): number[] {
  const bits: number[] = [];
  for (const char of str) {
    const code = char.charCodeAt(0);
    for (let i = 7; i >= 0; i--) {
      bits.push((code >> i) & 1);
    }
  }
  return bits;
}

function bitsToString(bits: number[]): string {
  let str = '';
  for (let i = 0; i + 7 < bits.length; i += 8) {
    let code = 0;
    for (let j = 0; j < 8; j++) {
      code = (code << 1) | bits[i + j];
    }
    if (code === 0) break;
    str += String.fromCharCode(code);
  }
  return str;
}

function numberToBits(num: number, length: number): number[] {
  const bits: number[] = [];
  for (let i = length - 1; i >= 0; i--) {
    bits.push((num >> i) & 1);
  }
  return bits;
}

function bitsToNumber(bits: number[]): number {
  let num = 0;
  for (const bit of bits) {
    num = (num << 1) | bit;
  }
  return num;
}
