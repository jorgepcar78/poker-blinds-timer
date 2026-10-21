// src/utils/audioEngine.js

const SOUND_URL = "/level-up.mp3";

// Web Audio is the reliable path on iOS: the context is unlocked during a user
// gesture and sounds triggered later by the timer are allowed to play.
// HTMLAudio is kept as a fallback for browsers without Web Audio.
export function createAudioEngine(url = SOUND_URL) {
  let context = null;
  let buffer = null;
  let bufferPromise = null;
  let htmlAudio = null;

  function applyPlaybackSession() {
    if (typeof navigator === "undefined" || !("audioSession" in navigator)) return;

    try {
      // Makes the level-up sound ignore the iPhone silent switch.
      navigator.audioSession.type = "playback";
    } catch (error) {
      console.warn("AudioSession error:", error);
    }
  }

  function getAudioContextClass() {
    return typeof window !== "undefined" ? window.AudioContext || window.webkitAudioContext : null;
  }

  function getHtmlAudio() {
    if (!htmlAudio) {
      htmlAudio = new Audio(url);
      htmlAudio.preload = "auto";
    }
    return htmlAudio;
  }

  function loadBuffer(audioContext) {
    if (buffer) return Promise.resolve(buffer);
    if (bufferPromise) return bufferPromise;

    bufferPromise = fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.arrayBuffer();
      })
      .then((data) => audioContext.decodeAudioData(data))
      .then((decoded) => {
        buffer = decoded;
        return decoded;
      })
      .catch((error) => {
        console.warn("Could not decode level-up sound:", error);
        bufferPromise = null;
        return null;
      });

    return bufferPromise;
  }

  function primeHtmlAudio() {
    try {
      const audio = getHtmlAudio();
      const previousVolume = audio.volume;
      audio.volume = 0;

      const promise = audio.play();
      if (!promise) return;

      promise
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
          audio.volume = previousVolume;
        })
        .catch(() => {
          audio.volume = previousVolume;
        });
    } catch (error) {
      console.warn("Could not prime audio:", error);
    }
  }

  async function unlock() {
    applyPlaybackSession();

    const AudioContextClass = getAudioContextClass();
    if (!AudioContextClass) {
      primeHtmlAudio();
      return;
    }

    if (!context) {
      try {
        context = new AudioContextClass();
      } catch (error) {
        console.warn("Could not create AudioContext:", error);
        primeHtmlAudio();
        return;
      }
      loadBuffer(context);
    }

    if (context.state === "suspended") {
      try {
        await context.resume();
      } catch (error) {
        console.warn("Could not resume AudioContext:", error);
      }
    }
  }

  async function resume() {
    if (!context || context.state !== "suspended") return;

    try {
      await context.resume();
    } catch (error) {
      console.warn("Could not resume AudioContext:", error);
    }
  }

  async function play() {
    applyPlaybackSession();

    if (context) {
      if (context.state === "suspended") {
        await resume();
      }

      const decoded = buffer || (await loadBuffer(context));
      if (decoded && context.state === "running") {
        try {
          const source = context.createBufferSource();
          source.buffer = decoded;
          source.connect(context.destination);
          source.start();
          return true;
        } catch (error) {
          console.warn("Web Audio playback failed:", error);
        }
      }
    }

    try {
      const audio = getHtmlAudio();
      audio.currentTime = 0;
      await audio.play();
      return true;
    } catch (error) {
      console.warn("Audio playback failed:", error);
      return false;
    }
  }

  function getState() {
    return {
      mode: context
        ? "Web Audio"
        : getAudioContextClass()
          ? "Web Audio (não iniciado)"
          : "HTML5 Audio",
      contextState: context?.state ?? "—",
      soundLoaded: Boolean(buffer),
      audioSession: typeof navigator !== "undefined" && "audioSession" in navigator,
    };
  }

  return { unlock, resume, play, getState };
}
