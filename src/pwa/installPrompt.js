// src/pwa/installPrompt.js

const INSTALL_FLAG = "pb:install:installed";

let deferredPrompt = null;
let installed = false;
let initialized = false;
const listeners = new Set();

function readInstalledFlag() {
  try {
    return localStorage.getItem(INSTALL_FLAG) === "1";
  } catch {
    return false;
  }
}

function writeInstalledFlag() {
  try {
    localStorage.setItem(INSTALL_FLAG, "1");
  } catch {
    // Ignore storage errors.
  }
}

function emit() {
  listeners.forEach((listener) => listener());
}

export function initInstallPrompt() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  installed =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    navigator.standalone === true ||
    readInstalledFlag();

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    emit();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    installed = true;
    writeInstalledFlag();
    emit();
  });

  const mediaQuery = window.matchMedia?.("(display-mode: standalone)");
  mediaQuery?.addEventListener?.("change", (event) => {
    installed = event.matches || readInstalledFlag();
    emit();
  });
}

export function subscribeInstallPrompt(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getInstallSnapshot() {
  if (installed) return "installed";
  if (deferredPrompt) return "available";
  return "idle";
}

export async function promptInstall() {
  if (!deferredPrompt) return { outcome: "unavailable" };

  const event = deferredPrompt;
  deferredPrompt = null;
  emit();

  try {
    await event.prompt();
    const choice = await event.userChoice;
    return { outcome: choice.outcome };
  } catch (error) {
    return { outcome: "error", error };
  }
}
