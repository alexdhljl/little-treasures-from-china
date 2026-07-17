"use client";

import Script from "next/script";
import { useCallback, useEffect, useId, useRef } from "react";

declare global {
  interface Window {
    turnstile?: { render: (selector: string, options: { sitekey: string; callback: (token: string) => void; "expired-callback": () => void }) => string };
  }
}

const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function TurnstileField({ onToken }: { onToken: (token: string) => void }) {
  const id = `turnstile-${useId().replace(/:/g, "")}`;
  const rendered = useRef(false);
  const renderWidget = useCallback(() => {
    if (!siteKey || !window.turnstile || rendered.current) return;
    window.turnstile.render(`#${id}`, { sitekey: siteKey, callback: onToken, "expired-callback": () => onToken("") });
    rendered.current = true;
  }, [id, onToken]);
  useEffect(() => { renderWidget(); }, [renderWidget]);
  if (!siteKey) return null;
  return <><Script onLoad={renderWidget} src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" /><div id={id} /></>;
}
