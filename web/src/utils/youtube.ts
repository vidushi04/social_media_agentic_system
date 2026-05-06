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
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

export const fetchVideoMetrics = async (url: string, apiKey: string): Promise<VideoMetrics> => {
  const videoId = extractVideoId(url);
  if (!videoId) {
    throw new Error('Invalid YouTube URL');
  }

  // 1. Fetch Video Details
  const videoResponse = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}&key=${apiKey}`
  );
  
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
      const categoryResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/videoCategories?part=snippet&id=${categoryId}&key=${apiKey}`
      );
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
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&key=${apiKey}&maxResults=30`
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
