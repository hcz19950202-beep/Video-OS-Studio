export type ByteRange = {start: number; end: number};

export class RangeNotSatisfiableError extends Error {}

export const parseSingleByteRange = (header: string | null, size: number): ByteRange | null => {
  if (!header) return null;
  if (!Number.isSafeInteger(size) || size <= 0) throw new RangeNotSatisfiableError("Asset is empty.");

  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (!match[1] && !match[2])) throw new RangeNotSatisfiableError("Only one byte range is supported.");

  if (!match[1]) {
    const suffixLength = Number(match[2]);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) throw new RangeNotSatisfiableError("Invalid suffix range.");
    return {start: Math.max(0, size - suffixLength), end: size - 1};
  }

  const start = Number(match[1]);
  const requestedEnd = match[2] ? Number(match[2]) : size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(requestedEnd) || start < 0 || start >= size || requestedEnd < start) {
    throw new RangeNotSatisfiableError("Requested range is outside the asset.");
  }

  return {start, end: Math.min(requestedEnd, size - 1)};
};
