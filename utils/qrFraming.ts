export type QrPoint = { x: number; y: number };
export type QrBox = { left: number; top: number; right: number; bottom: number };
export type QrDetection = {
  data: string;
  cornerPoints?: QrPoint[] | null;
  bounds?: { origin: QrPoint; size: { width: number; height: number } } | null;
};

export type SeenQr = { payload: string; box: QrBox; seenAt: number };

function finitePoint(point: QrPoint): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

export function boxFromQr(result: QrDetection): QrBox | null {
  const points = result.cornerPoints?.filter(finitePoint) ?? [];
  if (points.length >= 4) {
    const box = {
      left: Math.min(...points.map((point) => point.x)),
      top: Math.min(...points.map((point) => point.y)),
      right: Math.max(...points.map((point) => point.x)),
      bottom: Math.max(...points.map((point) => point.y))
    };
    if (box.right > box.left && box.bottom > box.top) return box;
  }
  const bounds = result.bounds;
  if (!bounds || !finitePoint(bounds.origin) ||
      !Number.isFinite(bounds.size.width) || !Number.isFinite(bounds.size.height) ||
      bounds.size.width <= 0 || bounds.size.height <= 0) return null;
  return {
    left: bounds.origin.x,
    top: bounds.origin.y,
    right: bounds.origin.x + bounds.size.width,
    bottom: bounds.origin.y + bounds.size.height
  };
}

export function centerWithinExpandedFrame(box: QrBox, frame: QrBox, fraction = 0.15): boolean {
  const marginX = (frame.right - frame.left) * fraction;
  const marginY = (frame.bottom - frame.top) * fraction;
  const centerX = (box.left + box.right) / 2;
  const centerY = (box.top + box.bottom) / 2;
  return centerX >= frame.left - marginX && centerX <= frame.right + marginX &&
    centerY >= frame.top - marginY && centerY <= frame.bottom + marginY;
}

function samePhysicalQr(a: QrBox, b: QrBox): boolean {
  const overlapWidth = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
  const overlapHeight = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  const overlap = overlapWidth * overlapHeight;
  const smallerArea = Math.min((a.right - a.left) * (a.bottom - a.top), (b.right - b.left) * (b.bottom - b.top));
  return smallerArea > 0 && overlap / smallerArea >= 0.35;
}

export function recordSeenQr(seen: SeenQr[], next: SeenQr, now: number, windowMs = 650): SeenQr[] {
  const current = seen.filter((entry) => now - entry.seenAt <= windowMs);
  const match = current.findIndex((entry) => entry.payload === next.payload && samePhysicalQr(entry.box, next.box));
  if (match >= 0) current[match] = next;
  else current.push(next);
  return current.slice(-4);
}

export function decideObservedQrCapture(
  first: SeenQr | null,
  seen: SeenQr[],
  sawMultiple: boolean,
  now: number,
  frame: QrBox
): { ambiguous: boolean; payload: string | null } {
  const recent = seen.filter((entry) => now - entry.seenAt <= 650);
  const changed = Boolean(first && recent.length === 1 &&
    recordSeenQr([first], recent[0], now, 1500).length > 1);
  if (sawMultiple || seen.length > 1 || changed || recent.length > 1) {
    return { ambiguous: true, payload: null };
  }
  const only = recent[0];
  return {
    ambiguous: false,
    payload: only && centerWithinExpandedFrame(only.box, frame) ? only.payload : null
  };
}
