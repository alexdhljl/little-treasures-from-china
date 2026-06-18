"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "outline";
};

export function Button({ className, variant = "default", ...props }: ButtonProps) {
  const variants = {
    default: "bg-teal-700 text-white hover:bg-teal-800 disabled:bg-slate-300",
    secondary: "bg-slate-100 text-slate-950 hover:bg-slate-200 disabled:bg-slate-100",
    outline: "border border-slate-300 bg-white text-slate-950 hover:bg-slate-50 disabled:bg-slate-50",
  };

  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
