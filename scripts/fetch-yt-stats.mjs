/**
 * YouTube Analytics Sync Script.
 * Uses YouTube Data API v3 (Free Quota: 10,000 units/day) to fetch view, like, and comment counts
 * for released channel videos, storing metrics into Turso/SQLite DB to inform script generation.
 *
 * Usage: node scripts/fetch-yt-stats.mjs [--channel-id <CHANNEL_ID>] [--video-id <VIDEO_ID>]
 */
import { getClient, initDbSchema } from "./lib/db.mjs";
import { loadDotEnv, parseArgs } from "./lib/common.mjs";

loadDotEnv();

const API_KEY = process.env.YOUTUBE_API_KEY;
const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;

export async function fetchYouTubeStats(options = {}) {
  const apiKey = options.apiKey || API_KEY;
  const channelId = options.channelId || CHANNEL_ID;

  if (!apiKey) {
    console.log("[yt-stats] YOUTUBE_API_KEY not set. Skipping live YouTube Data API fetch.");
    return;
  }

  await initDbSchema();
  const db = getClient();

  // 1. Get published episode video IDs or fetch from channel
  let videoIds = [];
  if (options.videoId) {
    videoIds = [options.videoId];
  } else {
    // Read video releases from DB
    const res = await db.execute("SELECT slug, release_url FROM episodes WHERE release_url IS NOT NULL");
    for (const row of res.rows) {
      if (row.release_url) {
        const match = row.release_url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        if (match) videoIds.push({ slug: row.slug, id: match[1] });
      }
    }
  }

  if (videoIds.length === 0 && channelId) {
    // Fetch latest videos from channel search endpoint (costs ~100 quota units)
    try {
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&channelId=${channelId}&part=snippet&type=video&maxResults=50`;
      const searchRes = await fetch(searchUrl);
      const searchData = await searchRes.json();
      if (searchData.items) {
        videoIds = searchData.items.map((item) => ({ slug: item.snippet.title, id: item.id.videoId }));
      }
    } catch (e) {
      console.warn(`[yt-stats] search endpoint error: ${e.message}`);
    }
  }

  if (videoIds.length === 0) {
    console.log("[yt-stats] No video IDs found to query analytics for.");
    return;
  }

  const idsParam = videoIds.map((v) => v.id).join(",");
  const videosUrl = `https://www.googleapis.com/youtube/v3/videos?key=${apiKey}&id=${idsParam}&part=statistics,snippet`;

  try {
    const response = await fetch(videosUrl);
    const data = await response.json();

    if (!data.items) {
      console.warn("[yt-stats] No video items returned from YouTube API:", data);
      return;
    }

    for (const item of data.items) {
      const stats = item.statistics;
      const slug = videoIds.find((v) => v.id === item.id)?.slug || item.id;
      const views = Number(stats.viewCount || 0);
      const likes = Number(stats.likeCount || 0);
      const comments = Number(stats.commentCount || 0);

      await db.execute({
        sql: `INSERT INTO analytics (slug, video_id, views, likes, comments, fetched_at)
              VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
              ON CONFLICT(slug) DO UPDATE SET
                views = excluded.views,
                likes = excluded.likes,
                comments = excluded.comments,
                fetched_at = CURRENT_TIMESTAMP`,
        args: [slug, item.id, views, likes, comments],
      });

      console.log(`[yt-stats] Synced ${slug} (${item.id}): ${views} views, ${likes} likes, ${comments} comments`);
    }

    console.log(`[yt-stats] Successfully updated analytics for ${data.items.length} videos.`);
  } catch (err) {
    console.error(`[yt-stats] Error fetching stats: ${err.message}`);
  }
}

// CLI entry point
const isMain = process.argv[1] && new URL(import.meta.url).pathname.endsWith(process.argv[1].split("/").pop());
if (isMain) {
  (async () => {
    const args = parseArgs();
    await fetchYouTubeStats(args);
  })();
}
