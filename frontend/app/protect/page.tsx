'use client'

// PRD sections 2 and 16: choose stock, protection level and duration, see the live preview, activate.

import { useMutation, useQuery } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ErrorCard } from '@/components/error-card'
import { Loader } from '@/components/loader'
import { RiskBadge } from '@/components/risk-badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { api, ApiError, type MarketRow, type Preview, type ProtectRequest } from '@/lib/api'
import { basis, bpsPercent, money, percent, SESSION_LABEL, when } from '@/lib/format'

const PRESETS = [2500, 5000, 7500, 10_000]
// What the user picks. "4 hours" is a custom window that ends four hours after it was chosen.
type Range = 'AFTER_HOURS' | 'FOUR_HOURS' | 'WEEKEND' | 'CUSTOM'
const RANGES: { value: Range; label: string; hint: string }[] = [
  { value: 'AFTER_HOURS', label: 'After hours', hint: 'Until the market opens' },
  { value: 'FOUR_HOURS', label: '4 hours', hint: 'From now' },
  { value: 'WEEKEND', label: 'Weekend', hint: 'Until Monday\u2019s open' },
  { value: 'CUSTOM', label: 'Custom', hint: 'Until a time you pick' },
]
const DAYS = [1, 3, 5] as const
const fourHoursFromNow = () => new Date(Date.now() + 4 * 3_600_000).toISOString()

export default function ProtectPage() {
  return (
    <Suspense fallback={<Loader />}>
      <ProtectForm />
    </Suspense>
  )
}

function ProtectForm() {
  const router = useRouter()
  const params = useSearchParams()
  const markets = useQuery({ queryKey: ['markets'], queryFn: api.markets, refetchInterval: 30_000 })
  const [symbol, setSymbol] = useState<string | null>(params.get('symbol'))
  const [bps, setBps] = useState(10_000)
  const [range, setRange] = useState<Range>('AFTER_HOURS')
  const [days, setDays] = useState<(typeof DAYS)[number]>(1)
  const [customEndAt, setCustomEndAt] = useState('')
  // Fixed when "4 hours" is picked, so the preview does not drift while the user reads it.
  const [fourHourEnd, setFourHourEnd] = useState<string | null>(null)
  const pickRange = (value: Range) => {
    setRange(value)
    if (value === 'FOUR_HOURS') setFourHourEnd(fourHoursFromNow())
  }

  const rows = markets.data ?? []
  const selected = rows.find((r) => r.symbol === symbol) ?? rows.find((r) => r.eligible) ?? rows[0]
  const request = useMemo<ProtectRequest | null>(() => {
    if (!selected) return null
    const base = { stockSymbol: selected.symbol, protectionBps: bps }
    if (range === 'AFTER_HOURS') return { ...base, mode: 'TONIGHT', days }
    if (range === 'WEEKEND') return { ...base, mode: 'WEEKEND' }
    if (range === 'FOUR_HOURS') return fourHourEnd ? { ...base, mode: 'CUSTOM', customEndAt: fourHourEnd } : null
    return customEndAt ? { ...base, mode: 'CUSTOM', customEndAt: new Date(customEndAt).toISOString() } : null
  }, [selected, bps, range, days, fourHourEnd, customEndAt])

  const preview = useQuery({
    queryKey: ['preview', request],
    queryFn: () => api.preview(request!),
    enabled: !!request,
    refetchInterval: 10_000,
    retry: false,
  })

  const activate = useMutation({
    mutationFn: () => api.activate(request!),
    onSuccess: (created) => {
      toast.success(created.policy.status === 'FAILED' ? 'The hedge did not fill' : 'Protection activated')
      router.push(`/protection/${created.policy.id}`)
    },
    onError: (error) => toast.error(error instanceof ApiError ? [error.message, ...error.blockers].join(' ') : (error as Error).message),
  })

  if (markets.isError) return <ErrorCard title="Could not load eligible stocks" message={(markets.error as Error).message} />
  if (!markets.data) return <Loader label="Finding stocks you can protect" />
  if (!selected) return <ErrorCard title="Nothing to protect" message="The Backpack account holds no tokenized stock." />

  const blockedPreview = preview.error instanceof ApiError ? preview.error : null

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Stock</CardTitle>
            <CardDescription>Only stocks the account holds, with a matching Backpack perpetual.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {rows.map((row) => (
              <StockChip key={row.symbol} row={row} selected={row.symbol === selected.symbol} onSelect={() => setSymbol(row.symbol)} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Protection</CardTitle>
            <CardDescription>Share of the position offset by the hedge. Levels the perp cannot size exactly are greyed out.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-4 gap-2">
              {PRESETS.map((value) => {
                const preset = selected.presets.find((p) => p.bps === value)
                const disabled = !preset?.available
                return (
                  <Button
                    key={value}
                    variant={bps === value ? 'default' : 'outline'}
                    disabled={disabled}
                    onClick={() => setBps(value)}
                    title={disabled ? presetReason(preset?.reason, selected) : undefined}
                  >
                    {bpsPercent(value)}
                  </Button>
                )
              })}
            </div>
            {selected.presets.some((p) => !p.available) && (
              <p className="text-xs text-muted-foreground">
                {selected.presets
                  .filter((p) => !p.available)
                  .map((p) => `${bpsPercent(p.bps)}: ${presetReason(p.reason, selected)}`)
                  .join(' · ')}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Time range</CardTitle>
            <CardDescription>When the window ends, the hedge closes once the perp and the cash price have converged.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {RANGES.map((r) => (
                <Button
                  key={r.value}
                  variant={range === r.value ? 'default' : 'outline'}
                  aria-pressed={range === r.value}
                  onClick={() => pickRange(r.value)}
                  className="h-auto flex-col items-start whitespace-normal py-2 text-left"
                >
                  <span>{r.label}</span>
                  <span className="text-xs font-normal opacity-70">{r.hint}</span>
                </Button>
              ))}
            </div>
            {range === 'AFTER_HOURS' && (
              <div className="flex flex-col gap-2">
                <p className="text-[0.76rem] tracking-[1.2px] text-ink-faint uppercase">Keep it on for</p>
                <div className="grid grid-cols-3 gap-2">
                  {DAYS.map((d) => (
                    <Button key={d} variant={days === d ? 'default' : 'outline'} aria-pressed={days === d} onClick={() => setDays(d)}>
                      {d === 1 ? '1 day' : `${d} days`}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {days === 1
                    ? 'The hedge closes after the next market open.'
                    : `The hedge stays on through ${days} market opens and closes after the last one.`}
                </p>
              </div>
            )}
            {range === 'CUSTOM' && (
              <label className="flex flex-col gap-[7px] text-[0.76rem] tracking-[1.2px] text-ink-faint uppercase">
                Protect until
                <input
                  type="datetime-local"
                  value={customEndAt}
                  onChange={(e) => setCustomEndAt(e.target.value)}
                  className="rounded-lg bg-paper px-[15px] py-[13px] text-base shadow-[inset_0_0_0_1.5px_var(--line)] outline-none focus:shadow-[inset_0_0_0_1.5px_var(--ink)]"
                />
              </label>
            )}
          </CardContent>
        </Card>
      </div>

      <PreviewCard
        preview={preview.data}
        loading={preview.isPending && !!request}
        blocked={blockedPreview}
        onActivate={() => activate.mutate()}
        activating={activate.isPending}
      />
    </div>
  )
}

function StockChip({ row, selected, onSelect }: { row: MarketRow; selected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex min-w-40 cursor-pointer flex-col items-start rounded-lg px-4 py-3 text-left transition-shadow duration-[260ms] ease-umbra ${selected ? 'shadow-[inset_0_0_0_1.5px_var(--ink)]' : 'shadow-[inset_0_0_0_1.5px_var(--line)] hover:shadow-[inset_0_0_0_1.5px_var(--ink)]'}`}
    >
      <span className="font-heading text-xl font-semibold">{row.symbol.replace(/\.US$/, '')}</span>
      <span className="text-xs text-muted-foreground">
        {row.quantity} shares · {money(row.marketValue)}
      </span>
      {!row.eligible && <span className="mt-1 text-xs text-destructive">{row.reasons.join(', ')}</span>}
    </button>
  )
}

function presetReason(reason: string | null | undefined, row: MarketRow): string {
  if (reason === 'BELOW_MINIMUM') return `below the perp minimum of ${row.minQuantity}`
  if (reason === 'OFF_GRID') return `perp trades in steps of ${row.stepSize}`
  return reason ?? 'unavailable'
}

function PreviewCard({
  preview,
  loading,
  blocked,
  onActivate,
  activating,
}: {
  preview: Preview | undefined
  loading: boolean
  blocked: ApiError | null
  onActivate: () => void
  activating: boolean
}) {
  if (blocked) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cannot protect this stock</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 text-sm">{(blocked.blockers.length ? blocked.blockers : [blocked.message]).map((b) => <li key={b}>{b}</li>)}</ul>
        </CardContent>
      </Card>
    )
  }
  if (!preview) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>{loading ? 'Reading the account and the perp book' : 'Pick a stock, level and time range.'}</CardDescription>
        </CardHeader>
        {loading && (
          <CardContent>
            <Loader compact />
          </CardContent>
        )}
      </Card>
    )
  }
  const costVariable = 'Funding and borrow interest change over time and are shown as current rates.'
  return (
    <Card className="lg:sticky lg:top-6">
      <CardHeader>
        <div className="flex items-baseline justify-between">
          <CardTitle className="text-[2rem]">{preview.stockSymbol.replace(/\.US$/, '')}</CardTitle>
          <span className="font-heading text-[2rem] font-medium tracking-[-0.5px]">{money(preview.stockMarkPrice)}</span>
        </div>
        <CardDescription>
          {preview.stockQuantity} shares worth {money(preview.stockValue)} · {SESSION_LABEL[preview.session.state]}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-sm">
        <div className="grid grid-cols-3 gap-3 rounded-lg bg-paper p-4 shadow-[inset_0_0_0_1px_var(--line)]">
          <Figure label="Protected" value={money(preview.targetNotional)} />
          <Figure label="Still exposed" value={money(preview.netExposureAfter)} />
          <Figure label="Until" value={when(preview.reopenAt)} small />
        </div>
        <dl className="grid grid-cols-2 gap-y-1.5">
          <Row label="Protection" value={bpsPercent(preview.requestedProtectionBps)} />
          <Row label="Hedge" value={`Short ${preview.orderQuantity} ${preview.perpSymbol.replace(/(\.US)?_USDC_PERP$/, '')} perp`} />
          <Row label="Leverage" value={preview.leverage ? `${preview.leverage}x` : '—'} />
          <Row label="Estimated risk" value={preview.projectedRisk ? <RiskBadge state={preview.projectedRisk} /> : '—'} />
          <Row label="Closes anyway by" value={when(preview.maxEndAt)} />
        </dl>
        <details className="rounded-lg p-3.5 shadow-[inset_0_0_0_1.5px_var(--line)]">
          <summary className="cursor-pointer text-[0.76rem] tracking-[1px] text-ink-faint uppercase">Margin and pricing detail</summary>
          <dl className="mt-2 grid grid-cols-2 gap-y-1.5">
            <Row label="Collateral value" value={money(preview.collateralValue)} />
            <Row label="Available equity" value={money(preview.account.netEquityAvailable)} />
            <Row label="Current MMR" value={percent(preview.account.mmr)} />
            <Row label="Projected MMR" value={percent(preview.projectedMmr)} />
            <Row label="Perp mark / index" value={`${money(preview.perpMarkPrice)} / ${money(preview.perpIndexPrice)}`} />
            <Row label="Basis now" value={basis(((Number(preview.perpMarkPrice) - Number(preview.stockMarkPrice)) / Number(preview.stockMarkPrice)) * 10_000)} />
          </dl>
        </details>
        <div className="rounded-lg p-3.5 shadow-[inset_0_0_0_1.5px_var(--line)]">
          <p className="mb-1.5 text-[0.76rem] tracking-[1px] text-ink-faint uppercase">Costs</p>
          <dl className="grid grid-cols-2 gap-y-1">
            <Row label="Trading fee (open and close)" value={money(preview.costs.tradingFeeRoundTrip, true)} />
            <Row label="Funding, hourly" value={preview.costs.fundingRateHourly ? `${(Number(preview.costs.fundingRateHourly) * 100).toFixed(4)}% (variable)` : 'variable'} />
            <Row label="Borrow interest" value="variable" />
          </dl>
          <p className="mt-2 text-xs text-muted-foreground">{costVariable}</p>
        </div>
        {preview.safeProtectionBps < preview.requestedProtectionBps && (
          <Alert>
            <AlertTitle>Backpack limits this order</AlertTitle>
            <AlertDescription>
              Requested {bpsPercent(preview.requestedProtectionBps)}, safe protection available {bpsPercent(preview.safeProtectionBps)} (max {preview.maxOrderQuantity}).
            </AlertDescription>
          </Alert>
        )}
        {preview.blockers.length > 0 && (
          <Alert variant="destructive">
            <AlertTitle>Not ready</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-4">{preview.blockers.map((b) => <li key={b}>{b}</li>)}</ul>
            </AlertDescription>
          </Alert>
        )}
        <Button size="lg" className="w-full" disabled={!preview.canActivate || activating} onClick={onActivate}>
          {activating ? 'Placing the hedge…' : 'Activate protection'}
        </Button>
        <p className="text-xs text-muted-foreground">
          Places a real short of {preview.orderQuantity} {preview.perpSymbol} on Backpack as an IOC limit order at or above {money(preview.orderLimitPrice)}.
        </p>
      </CardContent>
    </Card>
  )
}

function Figure({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-[0.76rem] tracking-[0.5px] text-ink-faint uppercase">{label}</span>
      <span className={small ? 'text-sm leading-7 font-bold' : 'font-heading text-[1.5rem] leading-7 font-medium tracking-[-0.3px]'}>{value}</span>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-mono text-[0.875rem] tracking-[0.3px]">{value}</dd>
    </>
  )
}
