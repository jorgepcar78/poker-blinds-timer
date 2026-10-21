// src/utils/platform.js

const FULLSCREEN_HINT_KEY = "fullscreen-hint-dismissed";

export function isIos(userAgent, platform, maxTouchPoints) {
  const ua = userAgent ?? (typeof navigator !== "undefined" ? navigator.userAgent : "");
  const plat = platform ?? (typeof navigator !== "undefined" ? navigator.platform : "");
  const touch =
    maxTouchPoints ?? (typeof navigator !== "undefined" ? navigator.maxTouchPoints : 0);

  return /iP(hone|ad|od)/.test(ua) || (plat === "MacIntel" && touch > 1);
}

export function isStandalone(standalone, matchesDisplayMode) {
  const standaloneFlag =
    standalone ?? (typeof navigator !== "undefined" ? navigator.standalone : undefined);
  const displayMode =
    matchesDisplayMode ??
    (typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(display-mode: standalone)").matches
      : false);

  return Boolean(standaloneFlag) || Boolean(displayMode);
}

export function getFullscreenApi(root = document) {
  const element = root.documentElement;
  const request = element.requestFullscreen || element.webkitRequestFullscreen;
  const exit = root.exitFullscreen || root.webkitExitFullscreen;

  return {
    supported: Boolean(request),
    request: () => (request ? request.call(element) : undefined),
    exit: () => (exit ? exit.call(root) : undefined),
    getElement: () => root.fullscreenElement || root.webkitFullscreenElement || null,
  };
}

export function isFullscreenHintDismissed() {
  try {
    return localStorage.getItem(FULLSCREEN_HINT_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissFullscreenHint() {
  try {
    localStorage.setItem(FULLSCREEN_HINT_KEY, "1");
  } catch (error) {
    console.warn("Could not save fullscreen hint state:", error);
  }
}
