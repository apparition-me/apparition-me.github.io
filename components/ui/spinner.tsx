"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const Spinner = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center space-x-2", className)}
    {...props}
  >
    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
    <div className="flex-1" />
  </div>
))
Spinner.displayName = "Spinner"

export { Spinner }
