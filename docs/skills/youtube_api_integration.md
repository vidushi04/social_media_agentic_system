# Skill: YouTube API Integration

This document outlines the standard method for interacting with the YouTube Data API v3 to retrieve video metrics, based on the established patterns in the `youtube_metrics` reference project. This skill is primarily used by the **Performance Interpreter** agent.

## Authentication
The system uses simple API Key authentication.
- **Method:** Append `&key={YOUR_API_KEY}` to all requests.
- **Note:** Do not use OAuth 2.0 unless actions requiring user authorization (like posting comments or uploading videos) are needed, which is currently outside our scope boundary.

## 1. Extracting the Video ID
Before making an API call, you must extract the 11-character video ID from the YouTube URL.

**Pattern used:**
```typescript
const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
// Match and ensure the ID is exactly 11 characters long.
```

## 2. Fetching Core Video Metrics
To retrieve the primary data (title, statistics, snippet), use the `/videos` endpoint.

- **Endpoint:** `https://www.googleapis.com/youtube/v3/videos`
- **Required Query Parameters:**
  - `part`: `snippet,statistics`
  - `id`: The extracted video ID
  - `key`: The API key

**Data to Extract:**
- **From `snippet`:** `title`, `channelTitle`, `categoryId`, and `thumbnails` (always prefer `maxres` or `high` quality).
- **From `statistics`:** `viewCount`, `likeCount`, `commentCount`.

*Warning: YouTube API returns numerical statistics as strings. They must be parsed into integers before mathematical comparison or formatting.*

## 3. Resolving Category Names
The `/videos` endpoint only returns a numeric `categoryId`. To get the human-readable category name, a secondary request must be made to the `/videoCategories` endpoint.

- **Endpoint:** `https://www.googleapis.com/youtube/v3/videoCategories`
- **Required Query Parameters:**
  - `part`: `snippet`
  - `id`: The `categoryId` retrieved from the previous step
  - `key`: The API key

**Data to Extract:**
- The category name is located at `items[0].snippet.title`.

## Error Handling Standards
- Always verify the HTTP response (`response.ok`).
- If a video is not found, the API returns a 200 OK with an empty `items` array. You must manually check `data.items.length === 0` and throw a "Video not found" error.
- Wrap the secondary category fetch in a `try/catch` block. If it fails, fallback to 'Unknown Category' rather than failing the entire metrics retrieval process.

## Data Formatting
When presenting metrics to the user (via the Performance Interpreter), format large numbers into readable strings (e.g., `1,500,000` -> `1.5M`, `25,400` -> `25.4K`) using a standard base-10 formatting utility.
