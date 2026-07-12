import { extractVideoId } from './youtube';

/** Public YouTube thumbnail URL derived from a video URL (no API key required). */
export const getThumbnailFromUrl = (videoUrl?: string | null): string | null => {
  if (!videoUrl) return null;
  const id = extractVideoId(videoUrl);
  if (!id) return null;
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
};

export const formatAnalysisDate = (isoTimestamp: string) => {
  const parsed = new Date(isoTimestamp);
  if (Number.isNaN(parsed.getTime())) return isoTimestamp;
  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};
