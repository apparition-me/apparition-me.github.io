"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { RoundSelectionDrawer } from "@/components/round-selection-drawer"

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

  const popTopRow = () => {
    setQueue(prev => prev.slice(1))
  }

  const reset = () => {
    clearTimer()
    setState({
      targetRounds: state.targetRounds,
      currentRound: 0,
      phase: 'idle',
      secondsLeft: 0,
      elapsedSeconds: 0,
      phaseStartElapsed: 0,
    })
    setQueue([])
  }

  const beginWork = () => {
    const workMinutes = state.currentRound
    setState(prev => ({
      ...prev,
      phase: 'work',
      secondsLeft: workMinutes * 60,
      phaseStartElapsed: prev.elapsedSeconds,
    }))
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
  }

  const startFlow = () => {
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
            popTopRow()
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
        }
      })
    }, 1000)
    
    setTick(newTick)
    beginWork()
  }

  const handleRoundsChange = (rounds: number) => {
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

  return (
    <div className="min-h-screen bg-background p-7">
      {/* Single drawer instance that handles all states */}
      <RoundSelectionDrawer
        currentRounds={state.targetRounds}
        onRoundsChange={handleRoundsChange}
        onStart={handleStart}
        onReset={handleStart}
        isRunning={state.phase === 'work' || state.phase === 'rest'}
      />
      
      {/* Timer interface - only show when NOT in idle/done states */}
      {state.phase !== 'idle' && state.phase !== 'done' && (
        <>
          <main className="max-w-3xl mx-auto bg-card border rounded-2xl shadow-lg p-6">
            <header className="flex items-center justify-between mb-6">
              <div className="font-bold text-lg font-mono">LADDERBATA</div>
            </header>

            <h1 className={`text-5xl font-bold text-center mb-2 font-mono ${getPhaseClass()}`}>
              {getPhaseText()}
            </h1>

            <div className="text-center space-y-2 mb-4">
              <div className="font-bold font-mono">
                ROUND: {state.currentRound} OF {state.targetRounds}
              </div>
              <div className="font-bold font-mono">
                CURRENT ROUND: {state.currentRound} MINUTES OF WORK
              </div>
              <div className="text-muted-foreground font-bold font-mono">
                NEXT ROUND: {state.currentRound >= state.targetRounds ? '–' : state.currentRound + 1} MINUTES OF WORK
              </div>
              <div className="text-muted-foreground font-mono text-6xl mt-2 tabular-nums">
                {mmss(state.secondsLeft)}
              </div>
            </div>

            <div className="text-center text-xl font-mono">
              TOTAL ELAPSED: <span className="text-2xl">{hms(state.elapsedSeconds)}</span>
            </div>
          </main>

          {queue.length > 0 && (
            <section className="max-w-3xl mx-auto mt-6">
              <div className="bg-card border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left p-3 font-bold">Round</th>
                      <th className="text-left p-3 font-bold">Work Start</th>
                      <th className="text-left p-3 font-bold">Rest Start</th>
                      <th className="text-left p-3 font-bold">Work Minutes</th>
                      <th className="text-left p-3 font-bold">Elapsed Time on Completion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queue.map((item, index) => (
                      <tr 
                        key={item.round} 
                        className={index === 0 ? 'bg-green-50' : ''}
                      >
                        <td className="p-3 border-b border-border/50">{item.round}</td>
                        <td className="p-3 border-b border-border/50">{item.workStart}</td>
                        <td className="p-3 border-b border-border/50">{item.restStart}</td>
                        <td className="p-3 border-b border-border/50">{item.workMinutes}</td>
                        <td className="p-3 border-b border-border/50">{item.completionTime}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
