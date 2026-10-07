'use client'

// PRD sections 41 and 42: the live protection screen and its health card.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ErrorCard } from '@/components/error-card'
import { Loader } from '@/components/loader'
import { PnlChart } from '@/components/pnl-chart'
import { RiskBadge } from '@/components/risk-badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useStream } from '@/hooks/use-stream'
import { api, ApiError, type PnlPoint, type PolicyDetail } from '@/lib/api'
import { basis, bpsPercent, money, percent, SESSION_LABEL, signedMoney, STATUS_LABEL, when } from '@/lib/format'

const CAN_CLOSE = new Set(['ACTIVE', 'PARTIAL', 'WAIT_REOPEN', 'WAIT_CONVERGENCE', 'EXPIRED', 'EMERGENCY', 'CLOSING'])
const CAN_DEMO = new Set(['ACTIVE', 'PARTIAL', 'WAIT_REOPEN'])

export default function ProtectionPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const detail = useQuery({ queryKey: ['policy', id], queryFn: () => api.policy(id), refetchInterval: 10_000 })
  const health = useQuery({ queryKey: ['policy-health', id], queryFn: () => api.policyHealth(id), refetchInterval: 10_000 })
  const appHealth = useQuery({ queryKey: ['health'], queryFn: api.health })
  const stream = useStream(true)
  const [confirmClose, setConfirmClose] = useState(false)

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['policy', id] })
    void queryClient.invalidateQueries({ queryKey: ['policies'] })
  }
  const close = useMutation({
    mutationFn: () => api.close(id),
    onSuccess: () => {
      toast.success('Close submitted')
      setConfirmClose(false)
      refresh()
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : (e as Error).message),
  })
  const demoReopen = useMutation({
    mutationFn: () => api.demoReopen(id),
    onSuccess: () => {
      toast.success('Session override set: convergence checks run now')
      refresh()
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : (e as Error).message),
  })

  const live = stream.pnl[id]
  const points = useMemo<PnlPoint[]>(() => {
    const base = detail.data?.pnl ?? []
    if (!live) return base
    return [...base, { at: new Date().toISOString(), ...live }]
  }, [detail.data?.pnl, live])

  if (detail.isError) return <ErrorCard title="Protection not found" message={(detail.error as Error).message} />
  if (!detail.data) return <Loader label="Reading the protection" />
  const { policy, leg } = detail.data
  const ticker = leg.stockSymbol.replace(/\.US$/, '')
  const underlyingPnl = live?.underlyingPnl ?? lastOf(detail.data.pnl)?.underlyingPnl ?? '0'
  const hedgePnl = live?.hedgePnl ?? leg.pnl
  const costs = live?.costs ?? (Number(leg.fees) - Number(leg.funding)).toString()
  const net = Number(underlyingPnl) + Number(hedgePnl) - Number(costs)
  const protectedValue = Number(leg.stockMarketValue) + net

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start gap-4">
        <div>
          <p className="text-[0.76rem] tracking-[1px] text-ink-faint uppercase">Protected value</p>
          <p className="font-heading text-[clamp(3rem,12vw,4.2rem)] leading-none font-medium tracking-[-1px]">{money(protectedValue)}</p>
          <p className="text-sm text-muted-foreground">
            {ticker} · {bpsPercent(policy.actualProtectionBps)} protected · {policy.mode.toLowerCase()} window
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Badge variant="outline">{STATUS_LABEL[policy.status] ?? policy.status}</Badge>
          <RiskBadge state={health.data?.riskState ?? policy.riskState} />
          {policy.demoOverride && <Badge variant="secondary">Demo session override</Badge>}
          {policy.status === 'CLOSED' && (
            <Button nativeButton={false} render={<Link href={`/protection/${id}/receipt`} />} size="sm">View receipt</Button>
          )}
          {appHealth.data?.demoMode && CAN_DEMO.has(policy.status) && (
            <Button size="sm" variant="secondary" disabled={demoReopen.isPending} onClick={() => demoReopen.mutate()}>
              Demo reopen
            </Button>
          )}
          {CAN_CLOSE.has(policy.status) && (
            <Button size="sm" variant="destructive" onClick={() => setConfirmClose(true)}>
              Close now
            </Button>
          )}
        </div>
      </header>

      {policy.status === 'FAILED' && (
        <Alert variant="destructive">
          <AlertTitle>The hedge was not opened</AlertTitle>
          <AlertDescription>{policy.failureReason ?? 'No fill'}</AlertDescription>
        </Alert>
      )}
      {policy.status === 'PARTIAL' && (
        <Alert>
          <AlertTitle>Partial fill</AlertTitle>
          <AlertDescription>
            {leg.actualQuantity} of {leg.targetQuantity} filled, so protection is {bpsPercent(policy.actualProtectionBps)} rather than {bpsPercent(policy.requestedProtectionBps)}.
          </AlertDescription>
        </Alert>
      )}

      <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>{ticker} underlying and hedge</CardTitle>
            <CardDescription>
              Underlying {money(live?.stockPrice ?? leg.currentStockPrice ?? leg.stockMarkPrice)} · perp {money(live?.perpPrice ?? leg.currentPerpPrice ?? leg.entryPrice)}
              {stream.connected ? ' · live' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
              <Figure label="Underlying PnL" value={signedMoney(underlyingPnl)} />
              <Figure label="Hedge PnL" value={signedMoney(hedgePnl)} />
              <Figure label="Fees and funding" value={signedMoney(-Number(costs))} />
              <Figure label="Net move" value={signedMoney(net)} strong />
            </dl>
            {points.length > 1 ? <PnlChart points={points} /> : <p className="text-sm text-muted-foreground">The chart fills in as the monitor records points every 30 seconds.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Protection health</CardTitle>
            <CardDescription>Cross-margin figures from Backpack, refreshed every few seconds.</CardDescription>
          </CardHeader>
          <CardContent>
            {health.data ? (
              <dl className="grid grid-cols-2 gap-y-1.5 text-sm">
                <Row label="Risk" value={<RiskBadge state={health.data.riskState} />} />
                <Row label="Portfolio value" value={money(health.data.portfolioValue)} />
                <Row label="Net equity" value={money(health.data.netEquity)} />
                <Row label="Available equity" value={money(health.data.netEquityAvailable)} />
                <Row label="Initial margin" value={percent(health.data.imr)} />
                <Row label="Maintenance margin" value={percent(health.data.mmr)} />
                <Row label="Borrow liability" value={money(health.data.borrowLiability)} />
                <Row label="Execution leverage" value={`${health.data.executionLeverage}x`} />
                <Row label="Account limit" value={`${health.data.accountLeverageLimit}x`} />
                <Row label="Basis" value={basis(stream.basis[id]?.basisBps ?? health.data.basisBps)} />
                <Row label="Convergence checks" value={`${health.data.convergenceCount} of needed`} />
              </dl>
            ) : (
              <Loader compact />
            )}
          </CardContent>
        </Card>
      </section>

      <Tabs defaultValue="timeline">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="checks">Convergence checks</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="anchors">Solana anchors</TabsTrigger>
        </TabsList>
        <TabsContent value="timeline">
          <Timeline detail={detail.data} />
        </TabsContent>
        <TabsContent value="checks">
          <Checks detail={detail.data} />
        </TabsContent>
        <TabsContent value="orders">
          <Orders detail={detail.data} />
        </TabsContent>
        <TabsContent value="anchors">
          <Anchors detail={detail.data} />
        </TabsContent>
      </Tabs>

      <Dialog open={confirmClose} onOpenChange={setConfirmClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close the hedge now?</DialogTitle>
            <DialogDescription>
              Sends a reduce-only buy of {leg.actualQuantity} {leg.perpSymbol} on Backpack at the current market. The stock stays in the account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="destructive" disabled={close.isPending} onClick={() => close.mutate()}>
              {close.isPending ? 'Closing…' : 'Close hedge'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Figure({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <dt className="text-[0.76rem] tracking-[0.5px] text-ink-faint uppercase">{label}</dt>
      <dd className={strong ? 'font-heading text-2xl font-medium text-gold-deep' : 'font-mono text-[0.98rem] tracking-[0.3px]'}>{value}</dd>
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

function Timeline({ detail }: { detail: PolicyDetail }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <ol className="flex flex-col gap-2 text-sm">
          {[...detail.events].reverse().map((e) => (
            <li key={e.id} className="flex flex-wrap gap-x-3">
              <span className="w-40 shrink-0 text-muted-foreground">{when(e.at)}</span>
              <span className="font-medium">{STATUS_LABEL[e.toStatus] ?? e.toStatus}</span>
              {e.detail && <span className="text-muted-foreground">{JSON.stringify(e.detail)}</span>}
            </li>
          ))}
        </ol>
        <p className="mt-4 text-xs text-muted-foreground">
          Reopen {when(detail.policy.reopenAt)} · cooldown {detail.policy.cooldownSec}s · hard stop {when(detail.policy.maxEndAt)}
        </p>
      </CardContent>
    </Card>
  )
}

function Checks({ detail }: { detail: PolicyDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>
          Each row is one signed observation from the Chainlink CRE oracle. A check counts only in the regular session, after the cooldown, when it agrees with the backend&apos;s own prices.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {detail.checks.length === 0 && <p className="text-sm text-muted-foreground">No oracle observations for this protection yet.</p>}
        <ol className="flex flex-col gap-1.5 text-sm">
          {[...detail.checks].reverse().map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-x-3">
              <span className="w-40 shrink-0 text-muted-foreground">{when(c.observedAt)}</span>
              <span className="tabular-nums">{basis(c.basisBps)}</span>
              <span className="text-muted-foreground">{SESSION_LABEL[c.session] ?? c.session}</span>
              {c.counted ? (
                <Badge variant={c.passed ? 'default' : 'outline'}>{c.passed ? `pass ${c.countAfter}` : 'reset'}</Badge>
              ) : (
                <Badge variant="secondary">{c.rejectReason?.toLowerCase().replace(/_/g, ' ')}</Badge>
              )}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}

function Orders({ detail }: { detail: PolicyDetail }) {
  return (
    <Card>
      <CardContent className="pt-6">
        {detail.orders.length === 0 && <p className="text-sm text-muted-foreground">No orders yet.</p>}
        <ol className="flex flex-col gap-1.5 text-sm">
          {detail.orders.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center gap-x-3">
              <span className="w-40 shrink-0 text-muted-foreground">{when(o.createdAt)}</span>
              <span className="font-medium">
                {o.purpose} {o.side === 'Ask' ? 'sell' : 'buy'} {o.quantity}
              </span>
              <span className="tabular-nums">
                filled {o.executedQuantity}
                {o.avgPrice ? ` at ${money(o.avgPrice)}` : ''} · fee {money(o.fee, true)}
              </span>
              <Badge variant="outline">{o.status}</Badge>
              {o.error && <span className="text-destructive">{o.error}</span>}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}

function Anchors({ detail }: { detail: PolicyDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>Hashes of the open record, the converging oracle checks and the receipt, written to Solana mainnet as Memo transactions.</CardDescription>
      </CardHeader>
      <CardContent>
        {detail.anchors.length === 0 && <p className="text-sm text-muted-foreground">Nothing anchored yet.</p>}
        <ol className="flex flex-col gap-2 text-sm">
          {detail.anchors.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-x-3">
              <span className="font-medium">{a.kind}</span>
              <Badge variant="outline">{a.status}</Badge>
              <span className="font-mono text-xs text-muted-foreground">{a.digest.slice(0, 16)}…</span>
              {a.signature && (
                <a className="underline" href={`https://explorer.solana.com/tx/${a.signature}`} target="_blank" rel="noreferrer">
                  explorer
                </a>
              )}
              {a.error && <span className="text-destructive">{a.error}</span>}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}

function lastOf<T>(items: T[]): T | undefined {
  return items[items.length - 1]
}
