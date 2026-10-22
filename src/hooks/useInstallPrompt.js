// src/hooks/useInstallPrompt.js

import { useSyncExternalStore } from "react";
import {
  getInstallSnapshot,
  subscribeInstallPrompt,
} from "../pwa/installPrompt";

export default function useInstallPrompt() {
  return useSyncExternalStore(
    subscribeInstallPrompt,
    getInstallSnapshot,
    getInstallSnapshot
  );
}
