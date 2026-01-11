// Lightweight connected-component detector for light-blue cards in UCSB weekly grid screenshots
// Runs in the browser (uses CanvasRenderingContext2D)

export interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

// Tune the blue mask thresholds as needed
const BLUE_MASK = {
  rMax: 200,
  gMin: 170,
  bMin: 190,
};

const MIN_AREA = 4000; // drop tiny specks
const MAX_AREA = 400000; // drop huge regions
const MIN_ASPECT = 0.6; // width/height lower bound
const MAX_ASPECT = 8; // width/height upper bound

export function detectCardBoxes(img: HTMLImageElement, padding = 4): BoundingBox[] {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const visited = new Uint8Array(width * height);
  const boxes: BoundingBox[] = [];

  const idx = (x: number, y: number) => (y * width + x);

  const isBlue = (x: number, y: number) => {
    const i = idx(x, y) * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    return r < BLUE_MASK.rMax && g >= BLUE_MASK.gMin && b >= BLUE_MASK.bMin;
  };

  const queueX: number[] = [];
  const queueY: number[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const id = idx(x, y);
      if (visited[id]) continue;
      visited[id] = 1;
      if (!isBlue(x, y)) continue;

      // BFS
      let minX = x, maxX = x, minY = y, maxY = y;
      queueX.length = 0;
      queueY.length = 0;
      queueX.push(x);
      queueY.push(y);
      let area = 0;

      while (queueX.length) {
        const cx = queueX.pop() as number;
        const cy = queueY.pop() as number;
        area++;
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        // 4-neighbors
        const neighbors = [
          [cx + 1, cy],
          [cx - 1, cy],
          [cx, cy + 1],
          [cx, cy - 1],
        ];
        for (const [nx, ny] of neighbors) {
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const nid = idx(nx, ny);
          if (visited[nid]) continue;
          visited[nid] = 1;
          if (!isBlue(nx, ny)) continue;
          queueX.push(nx);
          queueY.push(ny);
        }
      }

      const w = maxX - minX + 1;
      const h = maxY - minY + 1;
      const aspect = w / h;
      if (area < MIN_AREA || area > MAX_AREA) continue;
      if (aspect < MIN_ASPECT || aspect > MAX_ASPECT) continue;

      boxes.push({
        x: Math.max(0, minX - padding),
        y: Math.max(0, minY - padding),
        w: Math.min(width - minX + padding, w + 2 * padding),
        h: Math.min(height - minY + padding, h + 2 * padding),
      });
    }
  }

  // Sort by column then row
  boxes.sort((a, b) => {
    if (Math.abs(a.x - b.x) > 20) return a.x - b.x;
    return a.y - b.y;
  });

  return boxes;
}

export function inferDayFromX(x: number, width: number): string {
  const column = Math.floor((x / width) * 5); // 5 columns Monday–Friday
  return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'][Math.max(0, Math.min(4, column))];
}
