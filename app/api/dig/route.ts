import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType, Schema } from "@google/generative-ai";
import { searchAlbum } from "@/lib/spotify";

const apiKey = process.env.GEMINI_API_KEY;

// JSON Schema definition for structured album recommendation
const albumRecommendationSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    title: {
      type: SchemaType.STRING,
      description: "The exact title of the real-world music album.",
    },
    artist: {
      type: SchemaType.STRING,
      description: "The exact name of the artist or band who released this album.",
    },
    genres: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.STRING,
      },
      description: "2-3 genre tags or mood keywords in Korean that describe the album and mood connection.",
    },
    description: {
      type: SchemaType.STRING,
      description: "A detailed description in Korean (2-3 sentences) explaining how the user's mood is analyzed and why this specific real-world album fits their situation perfectly.",
    },
    tracks: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          title: {
            type: SchemaType.STRING,
            description: "The title of a real track from this album.",
          },
          duration: {
            type: SchemaType.STRING,
            description: "The duration of the track in MM:SS format.",
          },
        },
        required: ["title", "duration"],
      },
      description: "Exactly 3 popular or representative tracks from the recommended album.",
    },
    albumColor: {
      type: SchemaType.STRING,
      description: "A representative hex code color (e.g. '#2d4b68') that represents the dominant visual color or visual vibe of this album artwork.",
    },
  },
  required: ["title", "artist", "genres", "description", "tracks", "albumColor"],
};

export async function POST(req: NextRequest) {
  try {
    // Verify if the API key is loaded properly
    if (!process.env.GEMINI_API_KEY) {
      console.error("Gemini API Key가 로드되지 않았습니다");
    } else {
      console.log(`Gemini API Key 로드 성공 (길이: ${process.env.GEMINI_API_KEY.length})`);
    }

    if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY_HERE") {
      return NextResponse.json(
        {
          error: "API_KEY_MISSING",
          message: "Gemini API Key가 설정되지 않았습니다. 프로젝트 루트의 .env.local 파일에 GEMINI_API_KEY를 기입해 주세요.",
        },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { moodText, scope = "korean" } = body;

    if (!moodText || typeof moodText !== "string" || !moodText.trim()) {
      return NextResponse.json(
        {
          error: "BAD_REQUEST",
          message: "기분 텍스트(moodText)를 입력해 주세요.",
        },
        { status: 400 }
      );
    }

    // Determine curation persona and music constraints based on selected scope
    let systemInstruction = "";
    if (scope === "korean") {
      systemInstruction = `You are an expert Korean music curator specializing in Korean Indie, K-Pop, and Korean band music (한국 인디 및 대중음악 전문 큐레이터).
Your job is to analyze the user's emotional state, mood, situation, or feelings described in the prompt.
Based on the analysis, you must recommend ONE ACTUAL, REAL-WORLD music album released by a SOUTH KOREAN artist/band (domestic K-Pop, Korean Indie, Folk, Rock, etc.) that exists and can be searched on Spotify.
Do NOT recommend fictional albums or artists.
All textual output like description and genres MUST be written in Korean.
Ensure the tracks listed are actual tracks belonging to the recommended album.
Identify a representative visual color (hex code) of this album artwork or visual theme and return it in the 'albumColor' field (e.g. '#3b5998').`;
    } else {
      systemInstruction = `You are a world-class global music critic (글로벌 음악 평론가) with deep knowledge across pop, rock, jazz, classical, and billboard hits worldwide.
Your job is to analyze the user's emotional state, mood, situation, or feelings described in the prompt.
Based on the analysis, you must recommend ONE ACTUAL, REAL-WORLD music album from any international artist/band worldwide (Billboard pop, rock, electronic, jazz, etc.) that exists and can be searched on Spotify.
Do NOT recommend fictional albums or artists.
All textual output like description and genres MUST be written in Korean.
Ensure the tracks listed are actual tracks belonging to the recommended album.
Identify a representative visual color (hex code) of this album artwork or visual theme and return it in the 'albumColor' field (e.g. '#3b5998').`;
    }

    // Initialize Google Generative AI
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Using gemini-2.5-flash for fast and cost-effective analysis
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: albumRecommendationSchema,
        temperature: 0.7,
      },
      systemInstruction: systemInstruction,
    });

    const prompt = `User's current mood/situation description:
"${moodText}"

Recommend a fitting real-world album following the instructions.`;

    // Retry helper for handling transient 503 / 429 errors from the Gemini API
    const generateContentWithRetry = async (
      modelInstance: any,
      textPrompt: string,
      retries = 2,
      delayMs = 1000
    ): Promise<any> => {
      try {
        return await modelInstance.generateContent(textPrompt);
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        const isRetryable =
          errMsg.includes("503") ||
          errMsg.includes("Service Unavailable") ||
          errMsg.includes("429") ||
          errMsg.includes("Too Many Requests");

        if (retries > 0 && isRetryable) {
          console.warn(
            `Gemini API transient error detected. Retrying in ${delayMs}ms... (Remaining retries: ${retries})`
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          return generateContentWithRetry(modelInstance, textPrompt, retries - 1, delayMs * 1.5);
        }
        throw err;
      }
    };

    const result = await generateContentWithRetry(model, prompt);
    const responseText = result.response.text();

    if (!responseText) {
      throw new Error("Empty response from Gemini API");
    }

    const recommendationData = JSON.parse(responseText);

    // Fetch Spotify Album metadata (Artwork, Links, IDs)
    let spotifyData = null;
    try {
      spotifyData = await searchAlbum(recommendationData.title, recommendationData.artist);
    } catch (spotifyError) {
      console.error("Spotify integration failed, continuing with fallback:", spotifyError);
    }

    return NextResponse.json({
      success: true,
      data: recommendationData,
      spotify: spotifyData,
    });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    console.error("실제 Gemini 에러:", error);
    
    // Provide user-friendly, descriptive error messages based on failure conditions
    const errString = error?.message || String(error);
    let userMessage = "감정을 분석하고 음악을 매칭하는 과정에서 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
    
    if (
      errString.includes("503") ||
      errString.includes("Service Unavailable") ||
      errString.includes("high demand") ||
      errString.includes("temporary")
    ) {
      userMessage = "현재 AI 추천 서비스 이용자가 매우 많아 일시적으로 요청이 밀리고 있습니다. 1~2초 후 다시 시도해 주세요.";
    } else if (
      errString.includes("429") ||
      errString.includes("Quota exceeded") ||
      errString.includes("rate-limits")
    ) {
      userMessage = "AI 서비스 API 요청량 한도(Quota)를 초과했습니다. 잠시 후 다시 시도해 주세요.";
    } else if (errString.includes("API_KEY_MISSING") || errString.includes("key")) {
      userMessage = "Gemini API Key가 없거나 올바르지 않습니다. 프로젝트 루트의 .env.local 설정을 점검해 주세요.";
    }

    return NextResponse.json(
      {
        error: "INTERNAL_SERVER_ERROR",
        message: userMessage,
        details: errString,
      },
      { status: 500 }
    );
  }
}
