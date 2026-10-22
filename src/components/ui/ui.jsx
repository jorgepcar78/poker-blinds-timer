import React, { useState } from "react";
import { Link } from "react-router-dom";
import Icon from "./Icon";
import { cardClass, focusRing } from "./styles";

const BUTTON_VARIANTS = {
  primary:
    "bg-green-500 text-gray-950 hover:bg-green-400 active:bg-green-600",
  secondary:
    "border border-white/10 bg-gray-800 text-white hover:border-white/20 hover:bg-gray-700",
  ghost: "text-gray-300 hover:bg-white/5 hover:text-white",
  danger: "bg-red-600 text-white hover:bg-red-500",
  dangerGhost: "text-red-300 hover:bg-red-500/10 hover:text-red-200",
  amber: "bg-amber-400 text-amber-950 hover:bg-amber-300",
};

const BUTTON_SIZES = {
  xs: "min-h-11 px-2 text-xs",
  sm: "min-h-11 px-3 text-xs",
  md: "min-h-11 px-4 text-sm",
  lg: "min-h-12 px-5 text-base",
};

export function Button({
  as: Component = "button",
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  className = "",
  children,
  type,
  ...props
}) {
  const isNativeButton = Component === "button";
  const nativeProps = isNativeButton ? { type: type || "button" } : {};
  const iconSize = size === "sm" ? 16 : 18;

  return (
    <Component
      {...nativeProps}
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:pointer-events-none disabled:opacity-40 ${BUTTON_SIZES[size]} ${BUTTON_VARIANTS[variant]} ${focusRing} ${className}`}
    >
      {icon && <Icon name={icon} size={iconSize} />}
      {children}
      {iconRight && <Icon name={iconRight} size={iconSize} />}
    </Component>
  );
}

export function IconButton({
  as: Component = "button",
  icon,
  label,
  variant = "secondary",
  size = 20,
  indicator = false,
  className = "",
  type,
  ...props
}) {
  const isNativeButton = Component === "button";
  const nativeProps = isNativeButton ? { type: type || "button" } : {};

  return (
    <Component
      {...nativeProps}
      {...props}
      aria-label={label}
      className={`relative inline-flex h-11 w-11 items-center justify-center rounded-lg transition-colors ${BUTTON_VARIANTS[variant]} ${focusRing} ${className}`}
    >
      <Icon name={icon} size={size} />
      {indicator && (
        <span
          className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-black"
          aria-hidden="true"
        />
      )}
    </Component>
  );
}

export function PageShell({ children, className = "" }) {
  return (
    <div
      className={`min-h-dvh bg-black text-white ${className}`}
      style={{
        paddingTop: "max(1rem, env(safe-area-inset-top))",
        paddingBottom: "max(2.5rem, env(safe-area-inset-bottom))",
      }}
    >
      <div className="mx-auto w-full max-w-md px-4">{children}</div>
    </div>
  );
}

export function PageHeader({ backTo, backLabel = "Voltar", title, description, action }) {
  return (
    <header className="mb-6">
      <div className="mb-4 flex min-h-11 items-center justify-between gap-3">
        {backTo ? (
          <Link
            to={backTo}
            className={`-ml-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-medium text-gray-400 transition-colors hover:bg-white/5 hover:text-white ${focusRing}`}
          >
            <Icon name="arrow_back" size={20} />
            {backLabel}
          </Link>
        ) : (
          <span />
        )}
        {action}
      </div>

      <h1 className="text-2xl font-semibold tracking-tight text-white">{title}</h1>
      {description && <p className="mt-1 text-sm leading-relaxed text-gray-400">{description}</p>}
    </header>
  );
}

export function Card({ as = "section", className = "", children, ...props }) {
  const Component = as || "section";

  return (
    <Component className={`${cardClass} p-4 ${className}`} {...props}>
      {children}
    </Component>
  );
}

export function SectionTitle({ children, meta, className = "" }) {
  return (
    <div className={`flex items-start justify-between gap-3 ${className}`}>
      <h2 className="text-base font-semibold text-white">{children}</h2>
      {meta && <span className="pt-0.5 text-xs text-gray-400">{meta}</span>}
    </div>
  );
}

export function Badge({ children, tone = "neutral", className = "" }) {
  const tones = {
    neutral: "bg-white/5 text-gray-300 ring-white/10",
    green: "bg-green-500/10 text-green-300 ring-green-500/20",
    amber: "bg-amber-500/10 text-amber-300 ring-amber-500/20",
    red: "bg-red-500/10 text-red-300 ring-red-500/20",
    gray: "bg-gray-800 text-gray-300 ring-white/10",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function Alert({ tone = "info", icon, children, className = "", role }) {
  const tones = {
    info: "border-white/10 bg-white/5 text-gray-300",
    success: "border-green-500/20 bg-green-500/10 text-green-200",
    warning: "border-amber-500/20 bg-amber-500/10 text-amber-200",
    error: "border-red-500/20 bg-red-500/10 text-red-200",
  };
  const iconNames = {
    info: "info",
    success: "check_circle",
    warning: "warning",
    error: "error",
  };

  return (
    <div
      role={role || (tone === "error" ? "alert" : "status")}
      className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${tones[tone]} ${className}`}
    >
      <Icon name={icon || iconNames[tone]} size={18} className="mt-0.5" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function EmptyState({ icon = "info", title, description, action, className = "" }) {
  return (
    <div
      className={`rounded-xl border border-dashed border-white/10 px-4 py-8 text-center ${className}`}
    >
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white/5 text-gray-400">
        <Icon name={icon} size={22} />
      </div>
      <h2 className="mt-3 text-sm font-semibold text-white">{title}</h2>
      {description && <p className="mx-auto mt-1 max-w-xs text-sm leading-relaxed text-gray-400">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Accordion({ id, title, meta, defaultOpen = false, children, className = "" }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={`overflow-hidden rounded-xl border border-white/10 bg-gray-900 ${className}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        onClick={() => setOpen((current) => !current)}
        className={`flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-white/[0.03] ${focusRing}`}
      >
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold text-white">{title}</span>
          {meta && <span className="mt-0.5 block text-xs leading-snug text-gray-400">{meta}</span>}
        </span>
        <Icon
          name="expand_more"
          size={22}
          className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      <div
        id={`${id}-panel`}
        hidden={!open}
        className="border-t border-white/10 p-4"
      >
        {children}
      </div>
    </section>
  );
}

export function Tabs({ tabs, value, onChange, label = "Seções" }) {
  const handleKeyDown = (event, index) => {
    let nextIndex = null;

    if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
    if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = tabs.length - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    const nextTab = tabs[nextIndex];
    onChange(nextTab.id);
    document.getElementById(`tab-${nextTab.id}`)?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      className="grid grid-cols-4 gap-1 rounded-xl border border-white/10 bg-gray-900 p-1"
    >
      {tabs.map((tab, index) => {
        const selected = value === tab.id;

        return (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={`min-h-11 rounded-lg px-1 text-xs font-semibold transition-colors ${focusRing} ${
              selected
                ? "bg-white/10 text-white"
                : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function Field({ label, htmlFor, hint, suffix, children, className = "" }) {
  const content = (
    <>
      <span className="mb-1.5 flex items-center justify-between gap-2 text-xs font-medium text-gray-300">
        {htmlFor ? (
          <label htmlFor={htmlFor}>{label}</label>
        ) : (
          <span>{label}</span>
        )}
        {suffix && <span className="text-gray-400">{suffix}</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs leading-relaxed text-gray-400">{hint}</span>}
    </>
  );

  if (htmlFor) {
    return <div className={className}>{content}</div>;
  }

  return <label className={`block ${className}`}>{content}</label>;
}

export function Tile({ icon, title, children, className = "" }) {
  return (
    <div className={`flex min-h-40 flex-col rounded-xl border border-white/10 bg-white/[0.04] p-3 ${className}`}>
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-gray-300">
          <Icon name={icon} size={18} />
        </span>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      <div className="mt-2 flex flex-1 flex-col">{children}</div>
    </div>
  );
}
