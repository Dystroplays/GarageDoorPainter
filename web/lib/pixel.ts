"use client";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export function pixelTrack(event: string, params?: Record<string, unknown>) {
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", event, params);
  }
}

export function pixelPageView() {
  pixelTrack("PageView");
}

export function pixelLead() {
  pixelTrack("Lead");
}

export function pixelViewContent(contentName: string) {
  pixelTrack("ViewContent", { content_name: contentName });
}

export function pixelPurchase(value: number) {
  pixelTrack("Purchase", { value, currency: "USD" });
}
