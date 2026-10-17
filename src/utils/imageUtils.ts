/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Resizes an image file to a maximum dimension if needed while maintaining aspect ratio.
 * Returns both the original Blob and a base64 string for model ingestion.
 */
export async function processImageUpload(
  file: File,
  maxDimension = 1400
): Promise<{
  blob: Blob;
  base64: string;
  dataUrl: string;
  fileName: string;
  mimeType: string;
  size: number;
  width: number;
  height: number;
}> {
  return new Promise((resolve, reject) => {
    // Validate mime type
    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      reject(new Error(`Unsupported file type: ${file.type || 'unknown'}. Please upload a PNG, JPEG, or WebP image.`));
      return;
    }

    // Max file size: 12MB
    const MAX_SIZE_BYTES = 12 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      reject(new Error(`File size ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds the 12MB limit.`));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate resize dimensions if exceeding maxDimension
        let targetWidth = width;
        let targetHeight = height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            targetWidth = maxDimension;
            targetHeight = Math.round((height * maxDimension) / width);
          } else {
            targetHeight = maxDimension;
            targetWidth = Math.round((width * maxDimension) / height);
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Failed to obtain canvas 2D rendering context.'));
          return;
        }

        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        // Convert canvas to optimized JPEG/PNG for the AI payload
        const outputMime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const resizedDataUrl = canvas.toDataURL(outputMime, 0.9);
        const base64Data = resizedDataUrl.split(',')[1];

        resolve({
          blob: file, // Keep pristine original Blob for IndexedDB storage
          base64: base64Data,
          dataUrl: dataUrl,
          fileName: file.name,
          mimeType: outputMime,
          size: file.size,
          width,
          height
        });
      };

      img.onerror = () => {
        reject(new Error('Failed to load image. The file may be corrupted.'));
      };

      img.src = dataUrl;
    };

    reader.onerror = () => {
      reject(new Error('Error reading image file from disk.'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Creates a sample SVG mockup for testing without needing external images.
 */
export function createSampleProductMockup(
  title: string,
  subtitle: string,
  theme: 'viking' | 'civil_war' | 'odyssey' | 'cinema'
): { base64: string; dataUrl: string; mimeType: string; fileName: string; size: number } {
  let bg = '#1E293B';
  let accent = '#38BDF8';
  let symbol = '⚔';

  if (theme === 'viking') {
    bg = '#1C1917';
    accent = '#D97706';
    symbol = 'ᚱ';
  } else if (theme === 'civil_war') {
    bg = '#172554';
    accent = '#93C5FD';
    symbol = '★';
  } else if (theme === 'odyssey') {
    bg = '#262626';
    accent = '#FDE047';
    symbol = '🏛';
  } else if (theme === 'cinema') {
    bg = '#0F172A';
    accent = '#E2E8F0';
    symbol = '🎬';
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
    <rect width="800" height="800" fill="#F8FAFC"/>
    <!-- Product apparel / mug silhouette -->
    <rect x="150" y="100" width="500" height="600" rx="24" fill="${bg}" stroke="#CBD5E1" stroke-width="3"/>
    <!-- Graphic Print Area -->
    <rect x="220" y="200" width="360" height="400" rx="12" fill="#000000" fill-opacity="0.3" stroke="${accent}" stroke-width="2" stroke-dasharray="6,4"/>
    <text x="400" y="320" font-family="serif" font-size="72" fill="${accent}" text-anchor="middle">${symbol}</text>
    <text x="400" y="410" font-family="serif" font-size="28" font-weight="bold" fill="#FFFFFF" text-anchor="middle">${title.toUpperCase()}</text>
    <text x="400" y="460" font-family="sans-serif" font-size="16" fill="#94A3B8" text-anchor="middle">${subtitle}</text>
    <text x="400" y="520" font-family="sans-serif" font-size="12" fill="#64748B" text-anchor="middle">SCIENCE OF GIFTS • EDITORIAL ARCHIVE SPECIMEN</text>
  </svg>`;

  const base64 = btoa(unescape(encodeURIComponent(svg)));
  const dataUrl = `data:image/svg+xml;base64,${base64}`;

  return {
    base64,
    dataUrl,
    mimeType: 'image/svg+xml',
    fileName: `${theme}_specimen_mockup.svg`,
    size: svg.length
  };
}
