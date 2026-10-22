// src/hooks/useFullscreen.js

import { useEffect, useState } from "react";
import { getFullscreenApi, isIos } from "../utils/platform";

export default function useFullscreen() {
  const [capabilities] = useState(() => {
    const fullscreen = getFullscreenApi();
    return { fullscreen, canUseFullscreen: fullscreen.supported && !isIos() };
  });

  const { fullscreen, canUseFullscreen } = capabilities;
  const [isFullscreen, setIsFullscreen] = useState(() => Boolean(fullscreen.getElement()));

  useEffect(() => {
    const updateFullscreenState = () => {
      setIsFullscreen(Boolean(fullscreen.getElement()));
    };

    document.addEventListener("fullscreenchange", updateFullscreenState);
    document.addEventListener("webkitfullscreenchange", updateFullscreenState);

    return () => {
      document.removeEventListener("fullscreenchange", updateFullscreenState);
      document.removeEventListener("webkitfullscreenchange", updateFullscreenState);
    };
  }, [fullscreen]);

  const toggleFullscreen = async () => {
    try {
      if (fullscreen.getElement()) {
        await fullscreen.exit();
      } else {
        await fullscreen.request();
      }
    } catch (error) {
      console.warn("Fullscreen error:", error);
    }
  };

  return { fullscreen, canUseFullscreen, isFullscreen, toggleFullscreen };
}
