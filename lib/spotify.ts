export interface SpotifyAlbumInfo {
  albumArtUrl: string | null;
  spotifyUrl: string | null;
  albumId: string | null;
}

const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

let accessToken: string | null = null;
let tokenExpiresAt = 0;

/**
 * Retrieves the Spotify Access Token via Client Credentials Flow
 */
async function getAccessToken(): Promise<string | null> {
  if (accessToken && Date.now() < tokenExpiresAt) {
    return accessToken;
  }

  if (!clientId || !clientSecret) {
    console.warn("Spotify Credentials are not configured in .env.local");
    return null;
  }

  try {
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
      cache: "no-store", // Prevent Next.js from caching the auth token request globally
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Spotify access token: ${response.statusText}`);
    }

    const data = await response.json();
    accessToken = data.access_token;
    // Set token expiration time (expires_in is in seconds, e.g. 3600. Keep a 5-minute safety margin)
    tokenExpiresAt = Date.now() + (data.expires_in - 300) * 1000;
    return accessToken;
  } catch (error) {
    console.error("Spotify Authentication Error:", error);
    return null;
  }
}

/**
 * Searches for an album on Spotify by album name and artist
 */
export async function searchAlbum(title: string, artist: string): Promise<SpotifyAlbumInfo | null> {
  const token = await getAccessToken();
  if (!token) return null;

  try {
    // 1. Attempt structured search (recommended for accuracy)
    const query = encodeURIComponent(`album:${title} artist:${artist}`);
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${query}&type=album&limit=1`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error(`Spotify Search structured query failed: ${response.statusText}`);
    }

    const data = await response.json();
    let album = data.albums?.items?.[0];

    // 2. Fallback search (simple search query if structured search returns no result)
    if (!album) {
      const fallbackQuery = encodeURIComponent(`${title} ${artist}`);
      const fallbackResponse = await fetch(
        `https://api.spotify.com/v1/search?q=${fallbackQuery}&type=album&limit=1`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        album = fallbackData.albums?.items?.[0];
      }
    }

    if (!album) {
      console.warn(`Album not found on Spotify: "${title}" by "${artist}"`);
      return null;
    }

    return {
      albumArtUrl: album.images?.[0]?.url || null,
      spotifyUrl: album.external_urls?.spotify || null,
      albumId: album.id || null,
    };
  } catch (error) {
    console.error("Spotify Search API Error:", error);
    return null;
  }
}
