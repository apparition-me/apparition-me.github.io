"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { RoundSelectionDrawer } from "@/components/round-selection-drawer"
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Spinner } from "@/components/ui/spinner"
import { TimerReset, Play, Pause, CheckCircle } from "lucide-react"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'

interface LadderbataTimerProps {
  chartSize?: {
    w: string
    h: string
    smW?: string
    smH?: string
  }
  cutout?: string
}

interface TimerState {
  targetRounds: number
  currentRound: number
  phase: 'idle' | 'countdown' | 'work' | 'rest' | 'done' | 'timer_completion'
  secondsLeft: number
  elapsedSeconds: number
  phaseStartElapsed: number
  elapsedMilliseconds: number
  paused: boolean
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

export function LadderbataTimer({
  chartSize = { w: 'w-80', h: 'h-80', smW: 'sm:w-96', smH: 'sm:h-96' },
  cutout = '80%'
}: LadderbataTimerProps = {}) {
  const [state, setState] = React.useState<TimerState>({
    targetRounds: 3,
    currentRound: 0,
    phase: 'idle',
    secondsLeft: 0,
    elapsedSeconds: 0,
    phaseStartElapsed: 0,
    elapsedMilliseconds: 0,
    paused: false,
  })

  const [queue, setQueue] = React.useState<QueueItem[]>([])
  const [tick, setTick] = React.useState<NodeJS.Timeout | null>(null)
  const [countdownTick, setCountdownTick] = React.useState<NodeJS.Timeout | null>(null)
  const [carouselApi, setCarouselApi] = React.useState<CarouselApi>()
  const [currentCarouselIndex, setCurrentCarouselIndex] = React.useState(0)
  const [countdownSeconds, setCountdownSeconds] = React.useState(10)
  const [pausedTime, setPausedTime] = React.useState(0)

  // Register Chart.js components
  React.useEffect(() => {
    ChartJS.register(ArcElement, Tooltip, Legend)
  }, [])

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
      // Last round has no rest period
      const completionTime = r === rounds ? restStart : restStart + 1
      
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
      // Last round has no rest period
      const completionTime = r === rounds ? restStart : restStart + 1
      
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
      // Last round has no rest period
      const completionTime = r === total ? restStart : restStart + 1
      
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


  // Calculate total work time across all completed rounds
  const calculateTotalWorkTime = (rounds: number) => {
    let totalWorkSeconds = 0
    for (let r = 1; r <= rounds; r++) {
      totalWorkSeconds += r * 60 // Each round is r minutes of work
    }
    return totalWorkSeconds
  }

  const complete = () => {
    clearTimer()
    setState(prev => ({
      ...prev,
      phase: 'timer_completion',
      secondsLeft: 0,
    }))
    setQueue([])
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
    const startTime = Date.now() - pausedTime
    setState(prev => ({
      ...prev,
      phase: 'work',
      secondsLeft: prev.currentRound * 60,
      phaseStartElapsed: prev.elapsedSeconds,
      elapsedMilliseconds: pausedTime,
      paused: false,
    }))
    
    const workTick = setInterval(() => {
      setState(prev => {
        if (prev.paused) return prev
        
        const currentTime = Date.now()
        const totalElapsedMs = currentTime - startTime
        const newElapsed = Math.floor(totalElapsedMs / 1000)
        const phaseDuration = prev.phase === 'work' ? prev.currentRound * 60 : 60
        const elapsedInPhase = newElapsed - prev.phaseStartElapsed
        const newSecondsLeft = Math.max(0, phaseDuration - elapsedInPhase)
        

        if (newSecondsLeft === 0) {
          if (prev.phase === 'work') {
            // Check if this is the final round - if so, complete directly
            if (prev.currentRound >= prev.targetRounds) {
              complete()
              return {
                ...prev,
                elapsedSeconds: newElapsed,
                phase: 'done',
                secondsLeft: 0,
              }
            }
            // Transition to rest for non-final rounds
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

  const togglePause = () => {
    setState(prev => {
      const newPaused = !prev.paused
      if (newPaused) {
        // Pausing - store current elapsed time
        setPausedTime(prev.elapsedMilliseconds)
        // Clear the existing timer
        if (tick) {
          clearInterval(tick)
          setTick(null)
        }
      } else {
        // Resuming - restart timer from where we left off
        const resumeTime = Date.now()
        const pausedDuration = pausedTime
        
        const workTick = setInterval(() => {
          setState(current => {
            if (current.paused) return current
            
            const currentTime = Date.now()
            const totalElapsedMs = pausedDuration + (currentTime - resumeTime)
            const newElapsed = Math.floor(totalElapsedMs / 1000)
            const phaseDuration = current.phase === 'work' ? current.currentRound * 60 : 60
            const elapsedInPhase = newElapsed - current.phaseStartElapsed
            const newSecondsLeft = Math.max(0, phaseDuration - elapsedInPhase)
            
            if (newSecondsLeft === 0) {
              if (current.phase === 'work') {
                // Check if this is the final round - if so, complete directly
                if (current.currentRound >= current.targetRounds) {
                  complete()
                  return {
                    ...current,
                    elapsedSeconds: newElapsed,
                    phase: 'done',
                    secondsLeft: 0,
                  }
                }
                // Transition to rest for non-final rounds
                return {
                  ...current,
                  elapsedSeconds: newElapsed,
                  phase: 'rest',
                  secondsLeft: 60,
                  phaseStartElapsed: newElapsed,
                }
              } else if (current.phase === 'rest') {
                if (current.currentRound >= current.targetRounds) {
                  complete()
                  return {
                    ...current,
                    elapsedSeconds: newElapsed,
                    phase: 'done',
                    secondsLeft: 0,
                  }
                } else {
                  const nextRound = current.currentRound + 1
                  return {
                    ...current,
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
              ...current,
              elapsedSeconds: newElapsed,
              secondsLeft: newSecondsLeft,
              elapsedMilliseconds: totalElapsedMs,
            }
          })
        }, 100)
        setTick(workTick)
      }
      return { ...prev, paused: newPaused }
    })
  }

  const getPhaseText = () => {
    switch (state.phase) {
      case 'idle': return 'READY'
      case 'work': return 'WORK'
      case 'rest': return 'REST'
      case 'done': return 'COMPLETED'
      case 'timer_completion': return 'WORKOUT COMPLETE'
      default: return 'READY'
    }
  }

  const getPhaseClass = () => {
    switch (state.phase) {
      case 'work': return 'text-green-600'
      case 'rest': return 'text-red-500'
      case 'done': return 'text-gray-900'
      case 'timer_completion': return 'text-green-600'
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
      
      {/* Timer Completion State */}
      {state.phase === 'timer_completion' && (
        <div className="flex items-center justify-center min-h-[60vh]">
          <Empty className="max-w-md">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CheckCircle className="size-16 text-black" />
              </EmptyMedia>
              <EmptyTitle className="text-2xl font-mono font-bold my-4">
                {state.targetRounds} ROUNDS COMPLETE
              </EmptyTitle>
              <EmptyDescription className="text-2xl font-mono font-bold">
                Total Work: {hms(calculateTotalWorkTime(state.targetRounds))} minutes
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button 
                onClick={() => window.location.reload()}
                className="font-mono font-bold"
              >
                <TimerReset className="mr-2 h-4 w-4" />
                RESET TIMER
              </Button>
            </EmptyContent>
          </Empty>
        </div>
      )}

      {/* Timer interface - only show when NOT in idle/done/countdown/timer_completion states */}
      {state.phase !== 'idle' && state.phase !== 'done' && state.phase !== 'countdown' && state.phase !== 'timer_completion' && (
        <>
          <main className="max-w-3xl mx-auto bg-card  rounded-2xl p-0">



          {state.targetRounds > 0 && (
            <section className="max-w-3xl mx-auto mb-6">
              
              <Carousel 
                setApi={setCarouselApi}
                opts={{
                  align: "center",
                  loop: false,
                  watchDrag: false,
                }}
                className="w-full"
              >
                <CarouselContent className="justify-center ml-0">
                  {generateCarouselData(state.targetRounds, state.currentRound).map((item, index) => {
                    const isActiveCard = index === 0
                    const textClass = isActiveCard 
                      ? (state.phase === 'rest' ? 'text-red-500' : 'text-green-500')
                      : 'text-muted-foreground'
                    const mutedTextClass = isActiveCard 
                      ? (state.phase === 'rest' ? 'text-red-500' : 'text-green-500')
                      : 'text-muted-foreground'
                    const underlineClass = isActiveCard 
                      ? (state.phase === 'rest' ? 'border-b-[5px] border-red-500' : 'border-b-[5px] border-green-500')
                      : ''
                    
                    const remainingItems = generateCarouselData(state.targetRounds, state.currentRound).length
                    const basisClass = remainingItems === 1 ? 'basis-1/3' : remainingItems === 2 ? 'basis-1/2' : remainingItems === 3 ? 'basis-1/3' : remainingItems === 4 ? 'basis-1/4' : 'basis-1/5'
                    
                    return (
                      <CarouselItem key={item.round} className={`${basisClass} flex justify-center`}>
                        <Card className="p-4 aspect-square rounded-full flex flex-col items-center justify-center bg-transparent">
                          <CardTitle className={`text-center font-mono text-xl uppercase ${mutedTextClass} ${underlineClass} pb-2`}>
                              ROUND
                              <h1 className={`text-center font-mono text-4xl ${mutedTextClass}`}>{item.round}</h1>
                              
                            </CardTitle>
                        </Card>

                      </CarouselItem>
                    )
                  })}
                </CarouselContent>
              </Carousel>
            </section>
          )}


            {/* Visual Clock Pie Chart */}
            <div className="flex justify-center mb-6">
              <div className={`relative ${chartSize.w} ${chartSize.h} ${chartSize.smW || ''} ${chartSize.smH || ''}`}>
                <Doughnut
                  data={{
                    datasets: [{
                      data: [
                        state.secondsLeft,
                        (state.phase === 'work' ? state.currentRound * 60 : 60) - state.secondsLeft
                      ],
                      backgroundColor: [
                        state.phase === 'work' ? '#22c55e' : '#ef4444',
                        '#e5e7eb'
                      ],
                      borderWidth: 0
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: true,
                    cutout: cutout,
                    plugins: {
                      legend: {
                        display: false
                      },
                      tooltip: {
                        enabled: false
                      }
                    },
                    rotation: -90,
                    circumference: 360,
                    animation: {
                      animateRotate: false,
                      animateScale: false
                    }
                  }}
                />
                {/* Timer text overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className={`font-mono font-bold text-6xl tabular-nums text-center ${getPhaseClass()}`}>
                    {mmss(state.secondsLeft)}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-center pt-4">
              <div className="flex items-center gap-2 p-4 font-mono bg-gray-500">
                <span className="text-3xl font-bold tabular-nums text-white">{hmsWithMilliseconds(state.elapsedMilliseconds)}</span>
              </div>
            </div>
          </main>


          {/* Timer Control Buttons */}
          <div className="flex justify-center gap-4 mt-6">
            <Button 
              onClick={togglePause}
              variant={state.paused ? "default" : "secondary"}
              className={state.paused ? "bg-green-600 text-white font-mono font-bold hover:bg-green-700" : "bg-muted text-black font-mono font-bold"}
            >
              {state.paused ? (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  RESUME
                </>
              ) : (
                <>
                  <Pause className="mr-2 h-4 w-4 text-black" />
                  PAUSE
                </>
              )}
            </Button>
            <Button 
              onClick={() => window.location.reload()}
              variant="secondary"
              className="bg-muted text-black font-mono font-bold"
            >
              <TimerReset className="mr-2 h-4 w-4 text-black" />
              RESET
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
