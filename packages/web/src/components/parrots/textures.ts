import {
  CanvasTexture,
  NearestFilter,
  RepeatWrapping,
  SRGBColorSpace,
} from "three";

export function createGridTexture(): CanvasTexture {
  const w = 1500;
  const h = 2500;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("2d context unavailable");
  }

  ctx.fillStyle = "#06040f";
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "#ffc8de";
  ctx.lineWidth = 1;
  ctx.shadowColor = "#ffc8de";
  ctx.shadowBlur = 6;

  const cellsX = 24;
  const cellsY = 48;
  const cellW = w / cellsX;
  const cellH = h / cellsY;

  for (let i = 0; i <= cellsX; i++) {
    ctx.beginPath();
    ctx.moveTo(i * cellW, 0);
    ctx.lineTo(i * cellW, h);
    ctx.stroke();
  }
  for (let i = 0; i <= cellsY; i++) {
    ctx.beginPath();
    ctx.moveTo(0, i * cellH);
    ctx.lineTo(w, i * cellH);
    ctx.stroke();
  }

  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export function createDisplacementTexture(): CanvasTexture {
  const w = 24;
  const h = 48;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("2d context unavailable");
  }

  const imageData = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    const yPhase = (y / h) * Math.PI * 2;
    for (let x = 0; x < w; x++) {
      const centerDist = Math.abs(x - (w - 1) / 2) / ((w - 1) / 2);
      const ridge = centerDist ** 1.6;
      const noise =
        Math.sin(yPhase + Math.cos(x * 0.5) * 2) * 0.1 +
        Math.sin(yPhase * 3 + x * 0.7) * 0.06 +
        Math.sin(yPhase * 7 + x * 0.3 + Math.PI / 5) * 0.04;
      const value = Math.max(0, Math.min(1, ridge + noise));
      const v = Math.floor(value * 255);
      const idx = (y * w + x) * 4;
      imageData.data[idx] = v;
      imageData.data[idx + 1] = v;
      imageData.data[idx + 2] = v;
      imageData.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);

  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  return texture;
}

export function createMetalnessTexture(): CanvasTexture {
  const w = 24;
  const h = 48;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("2d context unavailable");
  }

  const imageData = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const centerDist = Math.abs(x - (w - 1) / 2) / ((w - 1) / 2);
      const valleyMask = 1 - centerDist ** 1.6;
      const v = Math.floor(valleyMask * 255);
      const idx = (y * w + x) * 4;
      imageData.data[idx] = v;
      imageData.data[idx + 1] = v;
      imageData.data[idx + 2] = v;
      imageData.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);

  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  return texture;
}

export function createSunTexture(): CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("2d context unavailable");
  }

  const gradient = ctx.createLinearGradient(0, 0, 0, size);
  gradient.addColorStop(0, "#fff0a0");
  gradient.addColorStop(0.3, "#ffb348");
  gradient.addColorStop(0.55, "#ff5d8f");
  gradient.addColorStop(0.85, "#d63dbf");
  gradient.addColorStop(1, "#7c2d8f");

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalCompositeOperation = "destination-out";
  const cuts: Array<{ y: number; h: number }> = [
    { y: 0.58, h: 0.022 },
    { y: 0.645, h: 0.028 },
    { y: 0.72, h: 0.034 },
    { y: 0.81, h: 0.04 },
    { y: 0.92, h: 0.048 },
  ];
  for (const cut of cuts) {
    ctx.fillRect(0, cut.y * size, size, cut.h * size);
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}
