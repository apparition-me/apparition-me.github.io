"use client"

import * as React from "react"
import { Minus, Plus } from "lucide-react"
import { Bar, BarChart, ResponsiveContainer } from "recharts"

import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"

// Sample data for the chart - representing workout intensity over rounds
const data = [
  { round: 1, intensity: 100 },
  { round: 2, intensity: 200 },
  { round: 3, intensity: 300 },
  { round: 4, intensity: 400 },
  { round: 5, intensity: 500 },
  { round: 6, intensity: 600 },
  { round: 7, intensity: 700 },
  { round: 8, intensity: 800 },
  { round: 9, intensity: 900 },
  { round: 10, intensity: 1000 },
  { round: 11, intensity: 1100 },
  { round: 12, intensity: 1200 },
  { round: 13, intensity: 1300 },
]

interface RoundSelectionDrawerProps {
  currentRounds: number
  onRoundsChange: (rounds: number) => void
  onStart: () => void
}

export function RoundSelectionDrawer({ 
  currentRounds, 
  onRoundsChange, 
  onStart 
}: RoundSelectionDrawerProps) {
  const [rounds, setRounds] = React.useState(currentRounds)

  function onClick(adjustment: number) {
    const newRounds = Math.max(1, Math.min(20, rounds + adjustment))
    setRounds(newRounds)
  }

  function handleSubmit() {
    onRoundsChange(rounds)
    onStart()
  }

  // Generate chart data based on current rounds selection
  const chartData = data.slice(0, rounds).map((item, index) => ({
    ...item,
    intensity: (index + 1) * 100 // Each round increases intensity
  }))

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline" className="font-mono">
          {currentRounds} Work rounds
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>Round Selection</DrawerTitle>
            <DrawerDescription>
              Set your workout rounds. Each round increases in work duration.
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4 pb-0">
            <div className="flex items-center justify-center space-x-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0 rounded-full"
                onClick={() => onClick(-1)}
                disabled={rounds <= 1}
              >
                <Minus className="h-4 w-4" />
                <span className="sr-only">Decrease</span>
              </Button>
              <div className="flex-1 text-center">
                <div className="text-7xl font-bold tracking-tighter font-mono">
                  {rounds}
                </div>
                <div className="text-muted-foreground text-[0.70rem] uppercase font-mono">
                  Rounds
                </div>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0 rounded-full"
                onClick={() => onClick(1)}
                disabled={rounds >= 20}
              >
                <Plus className="h-4 w-4" />
                <span className="sr-only">Increase</span>
              </Button>
            </div>
            <div className="mt-3 h-[120px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <Bar
                    dataKey="intensity"
                    style={{
                      fill: "hsl(var(--primary))",
                      opacity: 0.9,
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button onClick={handleSubmit} className="font-mono">
                Start Timer
              </Button>
            </DrawerClose>
            <DrawerClose asChild>
              <Button variant="outline" className="font-mono">
                Cancel
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
