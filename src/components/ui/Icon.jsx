import React from "react";
import { ICON_PATHS } from "./iconPaths";

export default function Icon({
  name,
  size = 20,
  className = "",
  title,
  ...props
}) {
  const paths = ICON_PATHS[name];

  if (!paths) return null;

  const accessibilityProps = title
    ? { role: "img", "aria-label": title }
    : { "aria-hidden": true };

  return (
    <svg
      viewBox="0 -960 960 960"
      width={size}
      height={size}
      fill="currentColor"
      focusable="false"
      className={`shrink-0 ${className}`}
      {...accessibilityProps}
      {...props}
    >
      {paths.map((path, index) => (
        <path key={index} d={path} />
      ))}
    </svg>
  );
}
