import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, Target, Zap } from "lucide-react"

interface StatsCardProps {
  sampleSize: number
  median: number
  effectiveness: number
}

export function StatsCard({ sampleSize, median, effectiveness }: StatsCardProps) {
  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border">
      <CardContent className="p-6 space-y-4">
        {/* Sample Size */}
        <div className="flex items-center justify-between group hover:bg-secondary/30 rounded-lg p-3 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Sample Size</p>
              <p className="text-2xl font-bold tabular-nums">{sampleSize.toLocaleString()}</p>
            </div>
          </div>
          <span className="text-xs text-primary font-medium">PULLS</span>
        </div>

        {/* Median */}
        <div className="flex items-center justify-between group hover:bg-secondary/30 rounded-lg p-3 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Target className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Median S+</p>
              <p className="text-2xl font-bold text-accent tabular-nums">#{median}</p>
            </div>
          </div>
        </div>

        {/* Effectiveness */}
        <div className="flex items-center justify-between group hover:bg-secondary/30 rounded-lg p-3 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-chart-2/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-chart-2" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Effectiveness</p>
              <p className="text-2xl font-bold text-chart-2 tabular-nums">{effectiveness}%</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
