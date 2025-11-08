"use client"

import * as React from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { RoundSelectionDrawer } from "@/components/round-selection-drawer"
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface TimerState {
  targetRounds: number
  currentRound: number
  phase: 'idle' | 'work' | 'rest' | 'done'
  secondsLeft: number
  elapsedSeconds: number
  phaseStartElapsed: number
}

interface QueueItem {
  round: number
  workStart: number
  restStart: number
  workMinutes: number
  completionTime: number
}

interface WorkoutTableRow {
  id: string
  description: string
  quantity: number
  price: number
  total: number
  workStart: number
  restStart: number
  workMinutes: number
  elapsedTimeOnCompletion: number
}

export function LadderbataTimer() {
  const [state, setState] = React.useState<TimerState>({
    targetRounds: 8,
    currentRound: 0,
    phase: 'idle',
    secondsLeft: 0,
    elapsedSeconds: 0,
    phaseStartElapsed: 0,
  })

  const [queue, setQueue] = React.useState<QueueItem[]>([])
  const [tick, setTick] = React.useState<NodeJS.Timeout | null>(null)
  const [carouselApi, setCarouselApi] = React.useState<CarouselApi>()
  const [currentCarouselIndex, setCurrentCarouselIndex] = React.useState(0)

  const mmss = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = Math.floor(s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  const hms = (s: number) => {
    const h = Math.floor(s / 3600).toString().padStart(2, '0')
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0')
    const sec = Math.floor(s % 60).toString().padStart(2, '0')
    return `${h}:${m}:${sec}`
  }

  const clearTimer = () => {
    if (tick) {
      clearInterval(tick)
      setTick(null)
    }
  }

  // Generate table data directly from targetRounds - no complex state management
  const generateTableData = (rounds: number) => {
    const tableRows = []
    let cumulativeTime = 0
    
    for (let r = 1; r <= rounds; r++) {
      const workStart = cumulativeTime
      const workMinutes = r
      const restStart = cumulativeTime + workMinutes
      const completionTime = restStart + 1 // 1 min rest
      
      tableRows.push({
        round: r,
        workStart,
        restStart,
        workMinutes,
        elapsedTimeOnCompletion: completionTime,
      })
      
      cumulativeTime = completionTime
    }
    
    return tableRows
  }

  const buildQueue = (total: number) => {
    console.log('buildQueue called with total:', total)
    const newQueue: QueueItem[] = []
    let cumulativeTime = 0
    
    for (let r = 1; r <= total; r++) {
      const workStart = cumulativeTime
      const workMinutes = r
      const restStart = cumulativeTime + workMinutes
      const completionTime = restStart + 1 // 1 min rest
      
      newQueue.push({
        round: r,
        workStart,
        restStart,
        workMinutes,
        completionTime,
      })
      
      cumulativeTime = completionTime
    }
    
    console.log('buildQueue created newQueue with length:', newQueue.length)
    setQueue(newQueue)
  }


  const reset = () => {
    window.location.reload()
  }

  const beginWork = () => {
    const workMinutes = state.currentRound
    setState(prev => ({
      ...prev,
      phase: 'work',
      secondsLeft: workMinutes * 60,
      phaseStartElapsed: prev.elapsedSeconds,
    }))
    
    // Trigger Sonner notification when work round starts
    toast.success('Work Round Started', {
      description: `Round ${state.currentRound} - ${workMinutes} minutes of work`,
    })
  }

  const beginRest = () => {
    setState(prev => ({
      ...prev,
      phase: 'rest',
      secondsLeft: 60, // 1 minute rest
      phaseStartElapsed: prev.elapsedSeconds,
    }))
  }

  const complete = () => {
    clearTimer()
    setState(prev => ({
      ...prev,
      phase: 'done',
      secondsLeft: 0,
    }))
    setQueue([])
    // Don't clear tableData - keep table visible after completion
  }

  const startFlow = () => {
    console.log('startFlow called with state.targetRounds:', state.targetRounds)
    setState(prev => ({
      ...prev,
      currentRound: 1,
      elapsedSeconds: 0,
    }))
    
    buildQueue(state.targetRounds)
    
    // Start the timer
    clearTimer()
    const newTick = setInterval(() => {
      setState(prev => {
        const newElapsed = prev.elapsedSeconds + 1
        const phaseDuration = prev.phase === 'work' ? prev.currentRound * 60 : 60
        const elapsedInPhase = newElapsed - prev.phaseStartElapsed
        const newSecondsLeft = Math.max(0, phaseDuration - elapsedInPhase)

        if (newSecondsLeft === 0) {
          if (prev.phase === 'work') {
            // Transition to rest
            return {
              ...prev,
              elapsedSeconds: newElapsed,
              phase: 'rest',
              secondsLeft: 60,
              phaseStartElapsed: newElapsed,
            }
          } else if (prev.phase === 'rest') {
            // Round completed
            if (prev.currentRound >= prev.targetRounds) {
              complete()
              return {
                ...prev,
                elapsedSeconds: newElapsed,
                phase: 'done',
                secondsLeft: 0,
              }
            } else {
              // Next round
              const nextRound = prev.currentRound + 1
              // Auto-advance carousel to next round
              if (carouselApi) {
                carouselApi.scrollTo(nextRound - 1)
              }
              return {
                ...prev,
                elapsedSeconds: newElapsed,
                currentRound: nextRound,
                phase: 'work',
                secondsLeft: nextRound * 60,
                phaseStartElapsed: newElapsed,
              }
            }
          }
        }

        return {
          ...prev,
          elapsedSeconds: newElapsed,
          secondsLeft: newSecondsLeft,
        }
      })
    }, 1000)
    
    setTick(newTick)
    beginWork()
  }

  const handleRoundsChange = (rounds: number) => {
    console.log('handleRoundsChange called with rounds:', rounds)
    setState(prev => ({ ...prev, targetRounds: rounds }))
  }

  const handleStart = () => {
    if (state.phase === 'idle' || state.phase === 'done') {
      startFlow()
    } else {
      reset()
    }
  }

  const getPhaseText = () => {
    switch (state.phase) {
      case 'idle': return 'READY'
      case 'work': return 'WORK'
      case 'rest': return 'REST'
      case 'done': return 'COMPLETED'
      default: return 'READY'
    }
  }

  const getPhaseClass = () => {
    switch (state.phase) {
      case 'work': return 'text-green-600'
      case 'rest': return 'text-red-500'
      case 'done': return 'text-gray-900'
      default: return 'text-green-600'
    }
  }

  const getProgressPercentage = () => {
    if (state.phase === 'work') {
      const totalWorkSeconds = state.currentRound * 60
      const elapsedWorkSeconds = totalWorkSeconds - state.secondsLeft
      return (elapsedWorkSeconds / totalWorkSeconds) * 100
    } else if (state.phase === 'rest') {
      const totalRestSeconds = 60
      const elapsedRestSeconds = totalRestSeconds - state.secondsLeft
      return (elapsedRestSeconds / totalRestSeconds) * 100
    }
    return 0
  }

  const getProgressStyle = () => {
    const percentage = getProgressPercentage()
    const baseColor = state.phase === 'work' ? '34, 197, 94' : '239, 68, 68' // green-500 or red-500
    return {
      background: `linear-gradient(to right, rgba(${baseColor}, 1) ${percentage}%, rgba(${baseColor}, 0.3) ${percentage}%)`
    }
  }

  return (
    <div className="min-h-screen bg-background p-7">
      {/* Single drawer instance that handles all states */}
      <RoundSelectionDrawer
        currentRounds={state.targetRounds}
        onRoundsChange={handleRoundsChange}
        onStart={handleStart}
        onReset={reset}
        isRunning={state.phase === 'work' || state.phase === 'rest'}
      />
      
      {/* Timer interface - only show when NOT in idle/done states */}
      {state.phase !== 'idle' && state.phase !== 'done' && (
        <>
          <main className="max-w-3xl mx-auto bg-card border rounded-2xl shadow-lg p-6">
            <header 
              className="flex items-center justify-center mb-6 w-full py-3 rounded-lg"
              style={getProgressStyle()}
            >
              <div className="font-bold text-lg font-mono text-white bg-black p-2">LADDERBATA</div>
            </header>

            <h1 className={` text-8xl font-bold text-center mb-2 font-mono ${getPhaseClass()}`}>
              {getPhaseText()}
            </h1>
             <div className={`font-mono text-8xl mt-2 tabular-nums  text-center  ${getPhaseClass()}`}>
                {mmss(state.secondsLeft)}
              </div>

            <div className="text-center space-y-2 my-4">
              <div className="font-bold font-mono text-4xl">
                ROUND: {state.currentRound} OF {state.targetRounds}
              </div>

              <div className="text-muted-foreground font-bold font-mono">
                NEXT ROUND: {state.currentRound >= state.targetRounds ? '–' : state.currentRound + 1} MINUTES OF WORK
              </div>
             
            </div>

            <div className="text-center text-xl font-mono">
              <span className="text-3xl">{hms(state.elapsedSeconds)}</span>
            </div>
          </main>

          {state.targetRounds > 0 && (
            <section className="max-w-3xl mx-auto mt-6">
              <Carousel 
                setApi={setCarouselApi}
                opts={{
                  align: "start",
                  loop: false,
                  watchDrag: false,
                }}
                className="w-full"
              >
                <CarouselContent>
                  {generateTableData(state.targetRounds).map((item, index) => (
                    <CarouselItem key={item.round} className="md:basis-1/2 lg:basis-1/3">
                      <Card className={`${index === state.currentRound - 1 ? 'ring-2 ring-green-500' : ''}`}>
                        <CardHeader>
                          <CardTitle className="text-center font-mono">
                            ROUND {item.round} ({item.workMinutes} MINUTES)
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 font-mono">
                          <div className="text-center">
                            <div className="font-bold">WORK: {mmss(item.workMinutes * 60)}</div>
                            <div className="font-bold">REST: {mmss(60)}</div>
                            <div className="font-bold text-sm text-muted-foreground">
                              ELAPSED TIME ON COMPLETION: {mmss(item.elapsedTimeOnCompletion * 60)}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>
            </section>
          )}
        </>
      )}
    </div>
  )
}
