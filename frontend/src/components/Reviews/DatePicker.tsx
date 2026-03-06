import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface DatePickerProps {
  value: string // YYYY-MM-DD
  onChange: (date: string) => void
}

const ITEM_HEIGHT = 40 // px per wheel item
const PADDING_ITEMS = 2 // empty items above/below for visual padding
const SNAP_DELAY = 120 // ms after scroll stops before snapping

function rangeArr(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

/** A single scroll wheel column */
function Wheel({
  values,
  selected,
  formatter,
  onSelect,
}: {
  values: number[]
  selected: number
  formatter: (v: number) => string
  onSelect: (v: number) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const snapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isUserScrolling = useRef(false)

  // Scroll to selected value on mount or when values/selected change
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const idx = values.indexOf(selected)
    if (idx >= 0) {
      // Directly set scrollTop without smooth behavior to avoid fighting with user scroll
      requestAnimationFrame(() => {
        if (!isUserScrolling.current) {
          container.scrollTop = idx * ITEM_HEIGHT
        }
      })
    }
  }, [values, selected])

  const handleScroll = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    isUserScrolling.current = true

    if (snapTimerRef.current) clearTimeout(snapTimerRef.current)
    snapTimerRef.current = setTimeout(() => {
      const idx = Math.round(container.scrollTop / ITEM_HEIGHT)
      container.scrollTo({ top: idx * ITEM_HEIGHT, behavior: 'smooth' })

      // Report selected value (skip padding items)
      const valueIdx = idx
      if (valueIdx >= 0 && valueIdx < values.length) {
        onSelect(values[valueIdx])
      }

      // Allow programmatic scroll again after snap settles
      setTimeout(() => {
        isUserScrolling.current = false
      }, 200)
    }, SNAP_DELAY)
  }, [values, onSelect])

  return (
    <div className="relative flex-1">
      {/* Selection highlight bar */}
      <div
        className="pointer-events-none absolute left-0 right-0 z-10 rounded-lg border-y border-accent/30 bg-accent/5"
        style={{
          top: PADDING_ITEMS * ITEM_HEIGHT,
          height: ITEM_HEIGHT,
        }}
      />

      {/* Scrollable wheel */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="no-scrollbar overflow-y-auto"
        style={{
          height: (PADDING_ITEMS * 2 + 1) * ITEM_HEIGHT,
          scrollSnapType: 'y mandatory',
        }}
      >
        {/* Top padding */}
        {Array.from({ length: PADDING_ITEMS }).map((_, i) => (
          <div
            key={`pad-top-${i}`}
            style={{ height: ITEM_HEIGHT }}
            aria-hidden
          />
        ))}

        {/* Value items */}
        {values.map((v) => (
          <div
            key={v}
            className="flex items-center justify-center text-sm font-medium text-text-primary"
            style={{
              height: ITEM_HEIGHT,
              lineHeight: `${ITEM_HEIGHT}px`,
              scrollSnapAlign: 'start',
            }}
          >
            {formatter(v)}
          </div>
        ))}

        {/* Bottom padding */}
        {Array.from({ length: PADDING_ITEMS }).map((_, i) => (
          <div
            key={`pad-bot-${i}`}
            style={{ height: ITEM_HEIGHT }}
            aria-hidden
          />
        ))}
      </div>
    </div>
  )
}

export function DatePicker({ value, onChange }: DatePickerProps) {
  const { t } = useTranslation()

  // Parse initial value
  const [parsedY, parsedM, parsedD] = value
    .split('-')
    .map((s) => parseInt(s, 10))

  const today = new Date()
  const currentYear = today.getFullYear()

  const [year, setYear] = useState(parsedY || currentYear)
  const [month, setMonth] = useState(parsedM || today.getMonth() + 1)
  const [day, setDay] = useState(parsedD || today.getDate())

  // Year range: 2 years back to current year
  const years = rangeArr(currentYear - 2, currentYear)
  const months = rangeArr(1, 12)
  const maxDay = daysInMonth(year, month)
  const days = rangeArr(1, maxDay)

  // Clamp day when month/year changes
  const clampedDay = Math.min(day, maxDay)

  // Emit change
  useEffect(() => {
    const mm = String(month).padStart(2, '0')
    const dd = String(clampedDay).padStart(2, '0')
    const dateStr = `${year}-${mm}-${dd}`
    if (dateStr !== value) {
      onChange(dateStr)
    }
  }, [year, month, clampedDay, value, onChange])

  // Update day if clamped
  useEffect(() => {
    if (clampedDay !== day) {
      setDay(clampedDay)
    }
  }, [clampedDay, day])

  const formatYear = useCallback(
    (v: number) => t('date.yearFmt', { 0: v }),
    [t],
  )
  const formatMonth = useCallback(
    (v: number) => t('date.monthFmt', { 0: v }),
    [t],
  )
  const formatDay = useCallback(
    (v: number) => t('date.dayFmt', { 0: v }),
    [t],
  )

  return (
    <div className="flex gap-1 rounded-xl border border-border bg-surface p-2">
      <Wheel
        values={years}
        selected={year}
        formatter={formatYear}
        onSelect={setYear}
      />
      <Wheel
        values={months}
        selected={month}
        formatter={formatMonth}
        onSelect={setMonth}
      />
      <Wheel
        values={days}
        selected={clampedDay}
        formatter={formatDay}
        onSelect={setDay}
      />
    </div>
  )
}
