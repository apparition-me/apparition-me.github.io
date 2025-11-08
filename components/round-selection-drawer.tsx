"use client"

import * as React from "react"
import { Minus, Plus } from "lucide-react"

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
  const [open, setOpen] = React.useState(true)

  function onClick(adjustment: number) {
    const newRounds = Math.max(1, Math.min(20, rounds + adjustment))
    setRounds(newRounds)
  }

  function handleSubmit() {
    onRoundsChange(rounds)
    onStart()
  }

  // Calculate total workout time
  const calculateTotalTime = (rounds: number) => {
    let totalTime = 0
    for (let r = 1; r <= rounds; r++) {
      totalTime += r + 1 // work minutes + 1 minute rest
    }
    return totalTime - 1 // Remove last rest period
  }

  const totalWorkoutTime = calculateTotalTime(rounds)

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline" className="font-mono">
          Reset Timer
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
            <div className="mt-6 text-center">
              <div className="text-sm text-muted-foreground font-mono uppercase mb-1">
                Total Workout Time
              </div>
              <div className="text-3xl font-bold font-mono">
                {totalWorkoutTime} minutes
              </div>
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
