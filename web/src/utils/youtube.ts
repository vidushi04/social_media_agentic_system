export interface VideoMetrics {
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  viewCount: string;
  likeCount: string;
  commentCount: string;
  categoryName: string;
  description: string;
  tags: string[];
}

export const extractVideoId = (url: string): string | null => {
  const trimmed = url.trim();
  if (!trimmed) return null;

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    const host = parsed.hostname.replace(/^www\./i, '').replace(/^m\./i, '').toLowerCase();
    const pathParts = parsed.pathname.split('/').filter(Boolean);
    const fromQuery = parsed.searchParams.get('v');
    const candidates = [
      fromQuery,
      host === 'youtu.be' ? pathParts[0] : undefined,
      pathParts[0] === 'shorts' || pathParts[0] === 'embed' || pathParts[0] === 'live' || pathParts[0] === 'v'
        ? pathParts[1]
        : undefined,
    ];

    for (const candidate of candidates) {
      if (candidate && /^[\w-]{11}$/.test(candidate)) return candidate;
    }
  } catch {
    return null;
  }

  return null;
};

// With a manually entered key (settings modal) we call the YouTube API directly.
// Without one, requests go through /api/youtube so the production key stays server-side.
const youtubeFetch = (endpoint: string, params: Record<string, string>, apiKey: string): Promise<Response> => {
  const qs = new URLSearchParams(params);
  if (apiKey.trim()) {
    qs.set('key', apiKey.trim());
    return fetch(`https://www.googleapis.com/youtube/v3/${endpoint}?${qs}`);
  }
  qs.set('endpoint', endpoint);
  return fetch(`/api/youtube?${qs}`);
};

export const fetchVideoMetrics = async (url: string, apiKey: string): Promise<VideoMetrics> => {
  const videoId = extractVideoId(url);
  if (!videoId) {
    throw new Error('Invalid YouTube URL');
  }

  // 1. Fetch Video Details
  const videoResponse = await youtubeFetch('videos', { part: 'snippet,statistics', id: videoId }, apiKey);
  
  if (!videoResponse.ok) {
    const errorData = await videoResponse.json();
    throw new Error(errorData.error?.message || 'Failed to fetch video details');
  }

  const videoData = await videoResponse.json();
  
  if (!videoData.items || videoData.items.length === 0) {
    throw new Error('Video not found');
  }

  const video = videoData.items[0];
  const { snippet, statistics } = video;
  const categoryId = snippet.categoryId;

  // 2. Fetch Category Name
  let categoryName = 'Unknown Category';
  if (categoryId) {
    try {
      const categoryResponse = await youtubeFetch('videoCategories', { part: 'snippet', id: categoryId }, apiKey);
      if (categoryResponse.ok) {
        const categoryData = await categoryResponse.json();
        if (categoryData.items && categoryData.items.length > 0) {
          categoryName = categoryData.items[0].snippet.title;
        }
      }
    } catch (e) {
      console.warn('Failed to fetch category name', e);
    }
  }

  // Choose the highest quality thumbnail available
  const thumbnails = snippet.thumbnails;
  const thumbnailUrl = thumbnails.maxres?.url || thumbnails.standard?.url || thumbnails.high?.url || thumbnails.medium?.url || thumbnails.default?.url;

  return {
    title: snippet.title,
    channelTitle: snippet.channelTitle,
    thumbnailUrl: thumbnailUrl,
    viewCount: statistics.viewCount || '0',
    likeCount: statistics.likeCount || '0',
    commentCount: statistics.commentCount || '0',
    categoryName,
    description: snippet.description || '',
    tags: snippet.tags || [],
  };
};

export const fetchVideoComments = async (url: string, apiKey: string): Promise<string[]> => {
  const videoId = extractVideoId(url);
  if (!videoId) return [];

  try {
    const response = await youtubeFetch(
      'commentThreads',
      { part: 'snippet', videoId, maxResults: '30' },
      apiKey
    );
    if (!response.ok) return [];
    
    const data = await response.json();
    if (!data.items) return [];

    return data.items.map((item: any) => item.snippet.topLevelComment.snippet.textOriginal);
  } catch (e) {
    console.warn('Failed to fetch comments', e);
    return [];
  }
};

export const formatNumber = (numStr: string): string => {
  const num = parseInt(numStr, 10);
  if (isNaN(num)) return numStr;
  
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
};
