import * as React from "react"

export function Separator({ className = "", orientation = "horizontal", ...props }) {
  return (
    <div
      className={`shrink-0 bg-slate-200 ${orientation === "vertical" ? "w-px h-full" : "h-px w-full"} ${className}`}
      {...props}
    />
  )
}
