"use client"

import { cn } from "@/lib/utils"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart3 } from "lucide-react"

export function DistributionChart() {
  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <CardTitle className="text-2xl">Distribution</CardTitle>
          </div>

          <Tabs defaultValue="count" className="w-auto">
            <TabsList className="bg-secondary/50">
              <TabsTrigger value="count" className="text-xs">
                Count
              </TabsTrigger>
              <TabsTrigger value="chance" className="text-xs">
                Chance %
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex gap-4 text-xs text-muted-foreground mt-2">
          <span>GLOBAL • PITY • FREQUENCY</span>
          <span className="text-muted-foreground/50">//</span>
          <span>FULL • M+1-90</span>
        </div>
      </CardHeader>

      <CardContent>
        {/* Chart Container */}
        <div className="relative h-[300px] w-full">
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between text-xs text-muted-foreground">
            <span>500</span>
            <span>400</span>
            <span>300</span>
            <span>200</span>
            <span>100</span>
            <span>0</span>
          </div>

          {/* Chart area */}
          <div className="ml-8 mr-4 h-full flex items-end gap-[2px] pb-8">
            {Array.from({ length: 90 }).map((_, i) => {
              // Create a bell curve-like distribution
              const height = Math.exp(-Math.pow((i - 70) / 15, 2)) * 100
              const isHighlight = i >= 70 && i <= 80

              return (
                <div
                  key={i}
                  className={cn(
                    "flex-1 rounded-t transition-all hover:opacity-80",
                    isHighlight ? "bg-primary shadow-lg shadow-primary/50" : "bg-muted",
                  )}
                  style={{ height: `${height}%` }}
                />
              )
            })}
          </div>

          {/* X-axis label */}
          <div className="absolute bottom-0 left-0 right-0 text-center">
            <span className="text-xs text-muted-foreground">WARPS UNTIL LANDING [#]</span>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-4 text-muted-foreground">
          <button className="hover:text-foreground transition-colors">←</button>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <div className="w-2 h-2 rounded-full bg-muted" />
            <div className="w-2 h-2 rounded-full bg-muted" />
          </div>
          <button className="hover:text-foreground transition-colors">→</button>
        </div>
      </CardContent>
    </Card>
  )
}
