"use client";

import { useCallback, useEffect, useState } from "react";

export type InquiryCartItem = {
  productId: string;
  slug: string;
  name: string;
  nameEn?: string;
  nameZh?: string;
  image: string;
  quantity: number;
  notes: string;
};

const STORAGE_KEY = "ah-inquiry-cart";
const CHANGE_EVENT = "ah-inquiry-cart-change";

function readCart(): InquiryCartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeCart(items: InquiryCartItem[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useInquiryCart() {
  const [items, setItems] = useState<InquiryCartItem[]>([]);

  useEffect(() => {
    const refresh = () => setItems(readCart());
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener(CHANGE_EVENT, refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(CHANGE_EVENT, refresh);
    };
  }, []);

  const addItem = useCallback((item: Omit<InquiryCartItem, "quantity" | "notes">) => {
    const current = readCart();
    const existing = current.find((entry) => entry.slug === item.slug);
    writeCart(existing
      ? current.map((entry) => entry.slug === item.slug ? { ...entry, quantity: entry.quantity + 1 } : entry)
      : [...current, { ...item, quantity: 1, notes: "" }]);
  }, []);

  const updateItem = useCallback((slug: string, patch: Partial<Pick<InquiryCartItem, "quantity" | "notes">>) => {
    writeCart(readCart().map((item) => item.slug === slug
      ? { ...item, ...patch, quantity: Math.max(1, Number(patch.quantity ?? item.quantity)) }
      : item));
  }, []);

  const removeItem = useCallback((slug: string) => writeCart(readCart().filter((item) => item.slug !== slug)), []);
  const clear = useCallback(() => writeCart([]), []);
  const count = items.reduce((total, item) => total + item.quantity, 0);

  return { items, count, addItem, updateItem, removeItem, clear };
}
