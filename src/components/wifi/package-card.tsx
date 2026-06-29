"use client"

import { motion } from "framer-motion"
import { Check, Clock, Gauge, Star, Upload, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { WifiPackage } from "@/lib/types"
import {
  formatData,
  formatDuration,
  formatKES,
} from "@/lib/wifi-utils"
import { cn } from "@/lib/utils"

export function PackageCard({
  pkg,
  onBuy,
  index = 0,
}: {
  pkg: WifiPackage
  onBuy: (pkg: WifiPackage) => void
  index?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="h-full"
    >
      <Card
        className={cn(
          "relative h-full overflow-hidden py-0",
          pkg.popular
            ? "border-primary/60 ring-2 ring-primary/40 shadow-md"
            : "hover:border-primary/40 hover:shadow-md"
        )}
      >
        {pkg.popular && (
          <div className="absolute right-0 top-0">
            <div className="rounded-bl-xl bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-sm">
              <span className="flex items-center gap-1">
                <Star className="size-3 fill-current" />
                Popular
              </span>
            </div>
          </div>
        )}

        <CardContent className="flex flex-col gap-4 p-5">
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-bold tracking-tight">{pkg.name}</h3>
            {pkg.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {pkg.description}
              </p>
            )}
          </div>

          <div className="flex items-end gap-1">
            <span className="text-3xl font-extrabold tracking-tight text-primary">
              {formatKES(pkg.priceKES)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-muted-foreground" />
              <span>{formatDuration(pkg.durationMinutes)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Gauge className="size-4 text-muted-foreground" />
              <span>{formatData(pkg.dataLimitMB)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="size-4 text-muted-foreground" />
              <span>{pkg.downloadSpeedMbps} Mbps</span>
            </div>
            <div className="flex items-center gap-2">
              <Upload className="size-4 text-muted-foreground" />
              <span>{pkg.uploadSpeedMbps} Mbps</span>
            </div>
          </div>

          <Button
            onClick={() => onBuy(pkg)}
            className="mt-2 w-full"
            size="lg"
            variant={pkg.popular ? "default" : "outline"}
          >
            <Check className="size-4" />
            Buy with M-Pesa
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export function PackageCardSkeleton() {
  return (
    <Card className="h-full py-0">
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-9 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-4 w-full animate-pulse rounded bg-muted" />
          ))}
        </div>
        <div className="mt-2 h-10 w-full animate-pulse rounded bg-muted" />
      </CardContent>
    </Card>
  )
}

export { Badge }
