"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

interface CharacterCardProps {
  name: string
  rarity: number
  isSelected: boolean
  onClick: () => void
  imageQuery: string
}

export function CharacterCard({ name, rarity, isSelected, onClick, imageQuery }: CharacterCardProps) {
  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-300 hover:scale-105 overflow-hidden group",
        "bg-card/50 backdrop-blur-sm border-2",
        isSelected ? "border-accent shadow-lg shadow-accent/30 glow-effect" : "border-border hover:border-primary/50",
      )}
      onClick={onClick}
    >
      <CardContent className="p-0 relative aspect-[3/4]">
        {/* Character Image */}
        <img
          src={`/.jpg?height=400&width=300&query=${encodeURIComponent(imageQuery)}`}
          alt={name}
          className="w-full h-full object-cover"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-center gap-1 mb-2">
            {Array.from({ length: rarity }).map((_, i) => (
              <Star key={i} className="w-3 h-3 fill-accent text-accent" />
            ))}
          </div>
          <h3 className="text-lg font-bold text-foreground uppercase tracking-wider">{name}</h3>
        </div>

        {/* Selected Indicator */}
        {isSelected && <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-accent animate-pulse" />}
      </CardContent>
    </Card>
  )
}
