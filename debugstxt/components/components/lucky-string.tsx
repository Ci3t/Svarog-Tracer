import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

export function LuckyString() {
  const earliestPulls = [60, 73, 64, 72, 75, 83]
  const softPityPulls = [79, 72, 75]
  const hardPityPulls = [83, 84, 85]
  const strategySequence = [
    { pull: 1, result: "---", chance: "0.6" },
    { pull: 1, result: "---", chance: "0.13" },
    { pull: 10, result: "---", chance: "13.23" },
  ]

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl" />

      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-accent" />
          <CardTitle className="text-xl">Lucky String</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Earliest Pulls */}
        <div>
          <h4 className="text-xs font-mono text-muted-foreground mb-3 uppercase tracking-wider">
            Earliest Pulls [1-59]
          </h4>
          <div className="grid grid-cols-3 gap-2">
            {earliestPulls.map((num, i) => (
              <div
                key={i}
                className="bg-secondary/50 rounded-lg px-3 py-2 text-center font-mono text-sm hover:bg-secondary transition-colors"
              >
                #{num}
              </div>
            ))}
          </div>
        </div>

        {/* Soft Pity */}
        <div>
          <h4 className="text-xs font-mono text-muted-foreground mb-3 uppercase tracking-wider">
            Soft Pity Range [74-89]
          </h4>
          <div className="grid grid-cols-3 gap-2">
            {softPityPulls.map((num, i) => (
              <div
                key={i}
                className="bg-secondary/50 rounded-lg px-3 py-2 text-center font-mono text-sm hover:bg-secondary transition-colors"
              >
                #{num}
              </div>
            ))}
          </div>
        </div>

        {/* Hard Pity - Highlighted */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Hard Pity [90]</h4>
            <div className="text-xs text-muted-foreground">6 - 13 - 24 - 32 - 38 - 43 - 49 - 5</div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {hardPityPulls.map((num, i) => (
              <div
                key={i}
                className={cn(
                  "bg-accent text-accent-foreground rounded-lg px-3 py-2 text-center font-mono text-sm font-bold",
                  "shadow-lg shadow-accent/30 hover:scale-105 transition-transform",
                )}
              >
                #{num}
              </div>
            ))}
          </div>
          <div className="text-xs text-muted-foreground mt-2">2 - 08 - 89 - 84 - 05</div>
        </div>

        {/* Strategy Sequence */}
        <div>
          <h4 className="text-xs font-mono text-muted-foreground mb-3 uppercase tracking-wider">Strategy Sequence</h4>
          <div className="space-y-2">
            {strategySequence.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-secondary/30 rounded-lg px-3 py-2 text-sm font-mono"
              >
                <span className="text-foreground">x{item.pull}</span>
                <span className="text-muted-foreground">{item.result}</span>
                <span className="text-primary">{item.chance}%</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
