"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sparkles, Zap } from "lucide-react"
import { DistributionChart } from "@/components/distribution-chart"
import { LuckyString } from "@/components/lucky-string"
import { StatsCard } from "@/components/stats-card"
import { CharacterCard } from "@/components/character-card"

export default function WarpAnalyzer() {
  const [selectedCharacter, setSelectedCharacter] = useState("dahlia")

  return (
    <div className="min-h-screen bg-background">
      {/* Gradient overlay for atmospheric effect */}
      <div className="fixed inset-0 bg-gradient-to-b from-primary/5 via-transparent to-accent/5 pointer-events-none" />

      <div className="relative container mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 backdrop-blur-sm border border-border mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">Advanced Analytics</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary to-accent animate-pulse">
            WARP ANALYZER
          </h1>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Decode the Gacha • Find Your Fate</p>
        </div>

        {/* Type Selector */}
        <div className="max-w-md mx-auto mb-12">
          <Tabs defaultValue="characters" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-card/50 backdrop-blur-sm border border-border">
              <TabsTrigger
                value="characters"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                Characters
              </TabsTrigger>
              <TabsTrigger
                value="light-cones"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                Light Cones
              </TabsTrigger>
            </TabsList>
            <TabsContent value="characters" className="mt-6">
              {/* Character Selection */}
              <div className="grid grid-cols-2 gap-4">
                <CharacterCard
                  name="The Dahlia"
                  rarity={5}
                  isSelected={selectedCharacter === "dahlia"}
                  onClick={() => setSelectedCharacter("dahlia")}
                  imageQuery="elegant purple flower dahlia cosmic background"
                />
                <CharacterCard
                  name="Firefly"
                  rarity={5}
                  isSelected={selectedCharacter === "firefly"}
                  onClick={() => setSelectedCharacter("firefly")}
                  imageQuery="glowing firefly magical night scene"
                />
              </div>
            </TabsContent>
            <TabsContent value="light-cones">
              <div className="text-center py-8 text-muted-foreground">Select a light cone to analyze</div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Initiate Button */}
        <div className="flex justify-center mb-12">
          <Button
            size="lg"
            className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-lg px-8 py-6 rounded-xl shadow-lg shadow-accent/20 glow-effect group"
          >
            <span>INITIATE DECRYPTION</span>
            <Zap className="ml-2 w-5 h-5 group-hover:rotate-12 transition-transform" />
          </Button>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Distribution Chart */}
          <div className="lg:col-span-2">
            <DistributionChart />
          </div>

          {/* Lucky String & Stats */}
          <div className="space-y-6">
            <LuckyString />

            <StatsCard sampleSize={37447} median={75} effectiveness={176.4} />
          </div>
        </div>
      </div>
    </div>
  )
}
