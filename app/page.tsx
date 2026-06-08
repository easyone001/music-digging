"use client";

import React, { useState, useEffect } from "react";

interface Track {
  title: string;
  duration: string;
}

interface AlbumData {
  title: string;
  artist: string;
  genres: string[];
  description: string;
  tracks: Track[];
  albumColor: string;
}

interface SpotifyData {
  albumArtUrl: string | null;
  spotifyUrl: string | null;
  albumId: string | null;
}

export default function Home() {
  const [moodText, setMoodText] = useState("");
  const [isKoreanOnly, setIsKoreanOnly] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [albumData, setAlbumData] = useState<AlbumData | null>(null);
  const [spotifyData, setSpotifyData] = useState<SpotifyData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const steps = [
    "문장에서 감정 키워드를 분석하고 있습니다...",
    "오늘 날씨와 기분에 어울리는 선율을 매칭하고 있습니다...",
    "음악 디깅 데이터베이스에서 가장 최적의 앨범을 선별하는 중...",
    "매칭 완료! 추천 앨범을 구성하고 있습니다..."
  ];

  // Loading animation step cycle
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAnalyzing) {
      interval = setInterval(() => {
        setAnalysisStep((prev) => {
          if (prev < steps.length - 1) {
            return prev + 1;
          }
          return prev;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  const handleDig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moodText.trim()) return;

    setIsAnalyzing(true);
    setAnalysisStep(0);
    setShowResult(false);
    setErrorMsg(null);
    setAlbumData(null);
    setSpotifyData(null);

    const targetScope = isKoreanOnly ? "korean" : "global";

    try {
      const response = await fetch("/api/dig", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ moodText, scope: targetScope }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "추천을 받아오는 과정에서 문제가 발생했습니다.");
      }

      // Ensure the loader has at least a short duration to display transitions nicely
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setAlbumData(result.data);
      setSpotifyData(result.spotify);
      setShowResult(true);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "알 수 없는 에러가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setMoodText("");
    setIsKoreanOnly(true);
    setShowResult(false);
    setErrorMsg(null);
    setAlbumData(null);
    setSpotifyData(null);
  };

  // Generate a beautiful top-focused glow with the dynamic color from Spotify/Gemini
  const dynamicBackgroundStyle = showResult && albumData?.albumColor
    ? {
        background: `radial-gradient(circle at top, ${albumData.albumColor}33 0%, #09090b 80%, #020202 100%)`
      }
    : {};

  return (
    <div
      style={dynamicBackgroundStyle}
      className={`relative flex flex-col flex-1 min-h-screen transition-all duration-1000 ease-in-out ${
        showResult
          ? "bg-zinc-950 text-zinc-100"
          : "bg-white bg-dot-grid text-zinc-950"
      }`}
    >
      {/* Top Header */}
      <header
        className={`sticky top-0 z-40 w-full border-b transition-all duration-1000 ease-in-out ${
          showResult
            ? "border-zinc-900 bg-zinc-950/80 text-white"
            : "border-zinc-100 bg-white/80 text-zinc-950"
        } backdrop-blur-md`}
      >
        <div className="flex h-16 items-center justify-between px-6 max-w-6xl mx-auto">
          <div className="flex items-center gap-2 cursor-pointer" onClick={handleReset}>
            {/* Spinning Vinyl Record Icon */}
            <svg
              className={`h-6 w-6 transition-all duration-1000 ${
                showResult ? "text-white" : "text-zinc-900"
              } animate-[spin_8s_linear_infinite]`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
            </svg>
            <span className="font-semibold text-lg tracking-wider">
              MUSIC DIGGING
            </span>
          </div>
          <nav className="flex items-center gap-6">
            <span
              className={`text-xs transition-colors duration-1000 ${
                showResult ? "text-zinc-500" : "text-zinc-400"
              } font-medium tracking-tight`}
            >
              AI Mood-based Music Recommender
            </span>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-3xl w-full mx-auto px-6 py-12 md:py-24">
        {!isAnalyzing && !showResult && !errorMsg && (
          <div className="w-full flex flex-col items-center text-center space-y-8">
            {/* Heading Section */}
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-zinc-900">
                오늘의 기분은 어떠신가요?
              </h1>
              <p className="text-zinc-500 text-sm md:text-base max-w-lg mx-auto leading-relaxed">
                오늘의 기분이나 감정을 자유롭게 적어보세요.
                <br />
                그에 맞는 음악 앨범을 찾아드립니다.
              </p>
            </div>

            {/* Form Section */}
            <form onSubmit={handleDig} className="w-full space-y-6">
              {/* Custom Checkbox Selector */}
              <div className="flex items-center justify-center gap-2 mb-2">
                <label className="relative flex items-center gap-2.5 cursor-pointer select-none text-zinc-500 hover:text-zinc-800 transition-colors text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={isKoreanOnly}
                    onChange={(e) => setIsKoreanOnly(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`w-5 h-5 border rounded flex items-center justify-center transition-all duration-300 ${
                      isKoreanOnly
                        ? "bg-zinc-950 border-zinc-950 text-white"
                        : "bg-white border-zinc-300 text-transparent"
                    }`}
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="4"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-xs font-semibold tracking-wide">국내 아티스트 음악 위주</span>
                </label>
              </div>

              <div className="relative group">
                <textarea
                  value={moodText}
                  onChange={(e) => setMoodText(e.target.value)}
                  placeholder="예) 금요일 퇴근길, 온 세상이 다 내 것 같은 신나는 기분이야! / 비가 와서 그런지 조금 차분하고 몽환적인 인디 음악이 듣고 싶어."
                  className="w-full min-h-[180px] p-6 text-base text-zinc-800 placeholder-zinc-400 bg-white border border-zinc-200/80 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-zinc-300 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-55 focus:shadow-[0_4px_20px_rgba(99,102,241,0.05)] transition-all duration-300 outline-none resize-none leading-relaxed"
                  maxLength={500}
                />
                <div className="absolute bottom-4 right-4 text-xs text-zinc-400 font-mono">
                  {moodText.length}/500
                </div>
              </div>

              {/* Digging Button */}
              <div className="flex justify-center">
                <button
                  type="submit"
                  disabled={!moodText.trim()}
                  className={`relative px-8 py-4 rounded-full font-semibold tracking-wide text-sm transition-all duration-500 overflow-hidden outline-none ${
                    moodText.trim()
                      ? "bg-zinc-950 text-white cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(99,102,241,0.3)] hover:scale-[1.02] active:translate-y-0 active:scale-[0.98] animate-pulse-glow"
                      : "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>오늘은 뭐 듣지?</span>
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </div>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Loading / Analyzing Screen */}
        {isAnalyzing && (
          <div className="w-full flex flex-col items-center justify-center py-12 text-center space-y-8 animate-[fadeIn_0.5s_ease-out]">
            {/* Elegant Equalizer / Soundwaves Loader */}
            <div className="flex items-end justify-center gap-1.5 h-16 w-24">
              <span className="w-1.5 bg-indigo-500 rounded-full animate-[bounce_0.8s_infinite_0.1s]"></span>
              <span className="w-1.5 bg-purple-500 rounded-full animate-[bounce_0.8s_infinite_0.2s] h-12"></span>
              <span className="w-1.5 bg-indigo-600 rounded-full animate-[bounce_0.8s_infinite_0.3s] h-8"></span>
              <span className="w-1.5 bg-violet-400 rounded-full animate-[bounce_0.8s_infinite_0.4s] h-14"></span>
              <span className="w-1.5 bg-purple-600 rounded-full animate-[bounce_0.8s_infinite_0.5s] h-6"></span>
            </div>

            <div className="space-y-3">
              <h2 className="text-xl font-semibold text-zinc-900">당신의 기분을 분석하고 있습니다</h2>
              <p className="text-zinc-500 text-sm h-6 transition-all duration-300">
                {steps[analysisStep]}
              </p>
            </div>

            {/* Minimalist Progress Bar */}
            <div className="w-64 h-1 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 ease-out"
                style={{ width: `${((analysisStep + 1) / steps.length) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Error Screen */}
        {errorMsg && (
          <div className="w-full flex flex-col items-center space-y-6 text-center animate-[fadeIn_0.5s_ease-out]">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
              <svg
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div className="space-y-2 max-w-md">
              <h2 className="text-xl font-bold text-zinc-900">디깅 도중 오류가 발생했습니다</h2>
              <p className="text-zinc-500 text-sm leading-relaxed">{errorMsg}</p>
            </div>
            <button
              onClick={() => setErrorMsg(null)}
              className="px-6 py-2.5 bg-zinc-950 text-white hover:bg-zinc-900 rounded-full text-xs font-semibold shadow-md transition-all active:scale-95"
            >
              다시 시도하기
            </button>
          </div>
        )}

        {/* Recommended Result Screen (Immersive Center Alignment Design) */}
        {showResult && albumData && (
          <div className="w-full flex flex-col items-center space-y-8 animate-[fadeIn_0.8s_ease-out] text-center">
            {/* Header Result Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-semibold tracking-wide uppercase">
              AI Mood Digging Complete
            </div>

            {/* Immersive Album Result Container */}
            <div className="w-full max-w-xl flex flex-col items-center">
              {/* Very large, sharp Album Cover Art with projected background aura */}
              <div className="relative">
                {albumData?.albumColor && (
                  <div
                    className="absolute -inset-6 rounded-[50px] opacity-40 blur-3xl transition-all duration-1000 -z-10 animate-[pulse_3s_infinite_ease-in-out]"
                    style={{ backgroundColor: albumData.albumColor }}
                  ></div>
                )}
                
                <div className="relative w-64 h-64 md:w-80 md:h-80 rounded-[32px] bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-400 shadow-[0_30px_70px_rgba(0,0,0,0.8)] flex flex-col items-center justify-center text-white overflow-hidden group aspect-square">
                  {spotifyData?.albumArtUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={spotifyData.albumArtUrl}
                      alt={albumData.title}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <>
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-all duration-300"></div>
                      {/* Vinyl Graphic inside art */}
                      <div className="z-10 w-28 h-28 rounded-full border-[8px] border-white/20 flex items-center justify-center animate-[spin_20s_linear_infinite]">
                        <div className="w-10 h-10 rounded-full bg-white/95"></div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Album Metadata */}
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mt-8 leading-tight">
                {albumData.title}
              </h2>
              <p className="text-zinc-400 text-lg md:text-xl font-medium mt-2">
                {albumData.artist}
              </p>

              {/* Genre Pills */}
              <div className="flex flex-wrap gap-2 justify-center mt-4">
                {albumData.genres.map((genre, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 rounded-full text-xs font-medium bg-zinc-900/80 text-zinc-300 border border-zinc-800/80 shadow-sm"
                  >
                    {genre}
                  </span>
                ))}
              </div>

              {/* Description */}
              <p className="text-zinc-300 text-sm md:text-base leading-relaxed max-w-lg mt-6">
                {albumData.description}
              </p>

              {/* Spotify Button & Player widget */}
              <div className="w-full mt-8 space-y-6 flex flex-col items-center">
                {/* Spotify Listen Button */}
                {spotifyData?.spotifyUrl && (
                  <a
                    href={spotifyData.spotifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-full text-sm font-bold bg-[#1DB954] text-white hover:bg-[#1ed760] hover:shadow-[0_8px_25px_rgba(29,185,84,0.4)] transition-all duration-300 active:scale-95 hover:-translate-y-0.5"
                  >
                    <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.563.387-.857.207-2.377-1.454-5.37-1.783-8.893-1.007-.336.074-.67-.142-.744-.48-.074-.336.143-.67.48-.744 3.844-.872 7.14-.492 9.807 1.139.294.18.387.563.207.885zm1.222-2.724c-.226.367-.707.487-1.074.26-2.72-1.672-6.87-2.157-10.078-1.182-.413.125-.847-.107-.972-.52-.125-.413.107-.847.52-.972 3.676-1.115 8.24-.578 11.344 1.332.367.226.487.707.26 1.082zm.106-2.833C14.384 8.84 9.178 8.667 6.173 9.578c-.476.144-.978-.124-1.122-.6-.144-.476.124-.978.6-.112 3.483-1.057 9.224-.853 13.242 1.53.43.255.57.81.314 1.24-.255.43-.81.57-1.24.314z"/>
                    </svg>
                    <span>Spotify에서 전체 감상하기</span>
                  </a>
                )}

                {/* Tracklist Preview */}
                {albumData.tracks && albumData.tracks.length > 0 && (
                  <div className="w-full bg-zinc-900/40 border border-zinc-900/80 rounded-2xl p-5 backdrop-blur-xs text-left">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">
                      추천 트랙
                    </h4>
                    <ul className="space-y-2.5 text-sm">
                      {albumData.tracks.slice(0, 3).map((track, index) => (
                        <li
                          key={index}
                          className="flex items-center justify-between text-zinc-300 hover:text-white transition-colors py-0.5"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-zinc-600 font-mono text-xs">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            <span className="font-semibold">{track.title}</span>
                          </div>
                          <span className="text-xs text-zinc-500 font-mono">{track.duration}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Spotify Embed Player */}
                {spotifyData?.albumId && (
                  <div className="w-full">
                    <iframe
                      src={`https://open.spotify.com/embed/album/${spotifyData.albumId}?utm_source=generator&theme=0`}
                      width="100%"
                      height="152"
                      frameBorder="0"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="lazy"
                      className="rounded-2xl border border-zinc-900 shadow-lg"
                    ></iframe>
                  </div>
                )}
              </div>
            </div>

            {/* Reset Button */}
            <button
              onClick={handleReset}
              className="px-6 py-2.5 border border-zinc-800 rounded-full text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 transition-all active:scale-95 flex items-center gap-1.5 mt-4 cursor-pointer"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              다시 디깅하기
            </button>
          </div>
        )}
      </main>

      {/* Minimal Footer */}
      <footer
        className={`w-full border-t transition-all duration-1000 ease-in-out ${
          showResult ? "border-zinc-900 text-zinc-500" : "border-zinc-100 text-zinc-400"
        } py-6`}
      >
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between text-xs gap-4">
          <p>© {new Date().getFullYear()} Music Digging. All rights reserved.</p>
          <div className="flex gap-4">
            <span className="hover:text-zinc-300 cursor-pointer transition-colors">이용약관</span>
            <span className="hover:text-zinc-300 cursor-pointer transition-colors">개인정보처리방침</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
