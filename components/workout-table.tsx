"use client"

import * as React from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface WorkoutTableRow {
  id: string
  description: string
  quantity: number
  price: number
  total: number
  // Additional fields from original table
  workStart?: number
  restStart?: number
  workMinutes?: number
  elapsedTimeOnCompletion?: number
}

interface WorkoutTableProps {
  data: WorkoutTableRow[]
  currentRound?: number
}

export function WorkoutTable({ data, currentRound }: WorkoutTableProps) {
  const [hasError, setHasError] = React.useState(false)

  try {
    if (!data || data.length === 0) {
      return <div className="text-center text-muted-foreground p-4">No workout data available</div>
    }

    return (
      <div className="bg-card border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-bold">ROUND</TableHead>
              <TableHead className="font-bold">WORK START</TableHead>
              <TableHead className="font-bold">REST START</TableHead>
              <TableHead className="font-bold">WORK MINUTES</TableHead>
              <TableHead className="font-bold">ELAPSED TIME ON COMPLETION</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item, index) => (
              <TableRow 
                key={item.id} 
                className={index === 0 && currentRound ? 'bg-green-50' : ''}
              >
                <TableCell className="border-b border-border/50">{item.workMinutes}</TableCell>
                <TableCell className="border-b border-border/50">{item.workStart}</TableCell>
                <TableCell className="border-b border-border/50">{item.restStart}</TableCell>
                <TableCell className="border-b border-border/50">{item.workMinutes}</TableCell>
                <TableCell className="border-b border-border/50">{item.elapsedTimeOnCompletion}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  } catch (error) {
    console.error('Table rendering error:', error)
    setHasError(true)
    return <div className="text-center text-red-500 p-4">Table failed to load.</div>
  }
}
