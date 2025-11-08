"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { RoundSelectionDrawer } from "@/components/round-selection-drawer"
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Spinner } from "@/components/ui/spinner"
import { TimerReset } from "lucide-react"

interface TimerState {
  targetRounds: number
  currentRound: number
  phase: 'idle' | 'countdown' | 'work' | 'rest' | 'done'
  secondsLeft: number
  elapsedSeconds: number
  phaseStartElapsed: number
  elapsedMilliseconds: number
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
    targetRounds: 3,
    currentRound: 0,
    phase: 'idle',
    secondsLeft: 0,
    elapsedSeconds: 0,
    phaseStartElapsed: 0,
    elapsedMilliseconds: 0,
  })

  const [queue, setQueue] = React.useState<QueueItem[]>([])
  const [tick, setTick] = React.useState<NodeJS.Timeout | null>(null)
  const [countdownTick, setCountdownTick] = React.useState<NodeJS.Timeout | null>(null)
  const [carouselApi, setCarouselApi] = React.useState<CarouselApi>()
  const [currentCarouselIndex, setCurrentCarouselIndex] = React.useState(0)
  const [countdownSeconds, setCountdownSeconds] = React.useState(10)

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

  const hmsWithMilliseconds = (totalMs: number) => {
    const h = Math.floor(totalMs / 3600000).toString().padStart(2, '0')
    const m = Math.floor((totalMs % 3600000) / 60000).toString().padStart(2, '0')
    const s = Math.floor((totalMs % 60000) / 1000).toString().padStart(2, '0')
    const ms = Math.floor((totalMs % 1000) / 10).toString().padStart(2, '0')
    return `${h}:${m}:${s}.${ms}`
  }

  const clearTimer = () => {
    if (tick) {
      clearInterval(tick)
      setTick(null)
    }
    if (countdownTick) {
      clearInterval(countdownTick)
      setCountdownTick(null)
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

  // Generate carousel data - only show current and future rounds
  const generateCarouselData = (rounds: number, currentRound: number) => {
    const tableRows = []
    let cumulativeTime = 0
    
    for (let r = 1; r <= rounds; r++) {
      const workStart = cumulativeTime
      const workMinutes = r
      const restStart = cumulativeTime + workMinutes
      const completionTime = restStart + 1 // 1 min rest
      
      // Only include current and future rounds
      if (r >= currentRound) {
        tableRows.push({
          round: r,
          workStart,
          restStart,
          workMinutes,
          elapsedTimeOnCompletion: completionTime,
        })
      }
      
      cumulativeTime = completionTime
    }
    
    return tableRows
  }

  const buildQueue = (total: number) => {
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
    
    setQueue(newQueue)
  }


  const reset = () => {
    window.location.reload()
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

  // COMPLETELY ISOLATED COUNTDOWN TIMER - NO INTERFERENCE WITH MAIN TIMER
  const startCountdown = () => {
    setState(prev => ({
      ...prev,
      phase: 'countdown',
      currentRound: 1,
      elapsedSeconds: 0,
    }))
    
    buildQueue(state.targetRounds)
    setCountdownSeconds(10)
    
    // ISOLATED countdown timer - uses its own variable, no shared state
    let countdownValue = 10
    const countdownInterval = setInterval(() => {
      countdownValue--
      setCountdownSeconds(countdownValue)
      
      if (countdownValue <= 0) {
        clearInterval(countdownInterval)
        // Start the main timer COMPLETELY SEPARATELY
        startMainTimer()
      }
    }, 1000)
    
    setCountdownTick(countdownInterval)
  }

  // COMPLETELY SEPARATE MAIN TIMER FUNCTION
  const startMainTimer = () => {
    const startTime = Date.now()
    setState(prev => ({
      ...prev,
      phase: 'work',
      secondsLeft: prev.currentRound * 60,
      phaseStartElapsed: prev.elapsedSeconds,
      elapsedMilliseconds: 0,
    }))
    
    const workTick = setInterval(() => {
      setState(prev => {
        const currentTime = Date.now()
        const totalElapsedMs = currentTime - startTime
        const newElapsed = Math.floor(totalElapsedMs / 1000)
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
          elapsedMilliseconds: totalElapsedMs,
        }
      })
    }, 100)
    
    setTick(workTick)
    
  }

  const handleRoundsChange = (rounds: number) => {
    setState(prev => ({ ...prev, targetRounds: rounds }))
  }

  const handleStart = () => {
    if (state.phase === 'idle' || state.phase === 'done') {
      startCountdown()
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

      {/* Countdown Dialog */}
      <Dialog open={state.phase === 'countdown'}>
        <DialogContent className="bg-white border-none max-w-md [&>button]:hidden shadow-none">
          <div className="flex flex-col items-center justify-center py-8">
            <h1 className="text-9xl font-bold text-black font-mono mb-6">
              {countdownSeconds}
            </h1>
            <Progress 
              value={((10 - countdownSeconds) / 10) * 100} 
              className="w-full h-4 bg-gray-200"
            />
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Timer interface - only show when NOT in idle/done/countdown states */}
      {state.phase !== 'idle' && state.phase !== 'done' && state.phase !== 'countdown' && (
        <>
          <main className="max-w-3xl mx-auto bg-card  rounded-2xl p-0">
            <header 
              className="flex items-center justify-center mb-6 w-full py-3 rounded-lg"
              style={getProgressStyle()}
            >
              <div className="font-bold text-lg font-mono text-white bg-black p-2">LADDERBATA</div>
            </header>

            <h1 className={` text-8xl font-bold text-center mb-2 font-mono ${getPhaseClass()}`}>
              {getPhaseText()}
            </h1>
             <div className={`font-mono font-bold text-6xl sm:text-8xl lg:text-9xl mt-2 tabular-nums text-center ${getPhaseClass()}`}>
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

            <div className="flex justify-center">

              <div className="flex items-center gap-2 px-6 py-4 font-mono bg-black">
                <span className="text-lg font-bold uppercase text-white">Clock Time:</span>
                <span className="text-lg font-bold tabular-nums text-white">{hmsWithMilliseconds(state.elapsedMilliseconds)}</span>
                <Spinner className="text-white" />
              </div>
            
            
            
            
            </div>
          </main>

          {state.targetRounds > 0 && (
            <section className="max-w-3xl mx-auto mt-6">
              <Carousel 
                setApi={setCarouselApi}
                opts={{
                  align: "center",
                  loop: false,
                  watchDrag: false,
                }}
                className="w-full"
              >
                <CarouselContent>
                  {generateCarouselData(state.targetRounds, state.currentRound).map((item, index) => {
                    const isActiveCard = index === 0
                    const cardBgClass = isActiveCard 
                      ? (state.phase === 'rest' ? 'bg-red-500' : 'bg-green-500')
                      : ''
                    const textClass = isActiveCard ? 'text-white' : ''
                    const mutedTextClass = isActiveCard ? 'text-white' : 'text-muted-foreground'
                    
                    return (
                      <CarouselItem key={item.round} className="md:basis-1/2 lg:basis-1/3">
                        <Card className={cardBgClass}>
                          <CardHeader>
                            
                            <CardTitle className={`text-center font-mono text-4xl uppercase ${textClass}`}>
                              ROUND
                              <h1 className={`text-center font-mono text-8xl ${textClass}`}>{item.round}</h1>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2 font-mono">
                            <div className="text-center">
                              <div className={`font-bold ${textClass}`}>WORK: {mmss(item.workMinutes * 60)}</div>
                              <div className={`font-bold ${textClass}`}>REST: {mmss(60)}</div>
                              <div className={`font-bold text-sm uppercase tracking-tight mt-4 ${mutedTextClass}`}>
                                CLOCK TIME: {mmss(item.elapsedTimeOnCompletion * 60)}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </CarouselItem>
                    )
                  })}
                </CarouselContent>
              </Carousel>
            </section>
          )}

          {/* Reset Timer Button */}
          <div className="flex justify-center mt-6">
            <Button 
              onClick={() => window.location.reload()}
              variant="secondary"
              className="bg-muted text-black font-mono font-bold"
            >
              <TimerReset className="mr-2 h-4 w-4 text-black" />
              RESET TIMER
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
