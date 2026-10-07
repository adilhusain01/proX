'use client'

// PRD section 43: the completed protection report.

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ErrorCard } from '@/components/error-card'
import { Loader } from '@/components/loader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'
import { bpsPercent, duration, money, signedMoney, when } from '@/lib/format'

export default function ReceiptPage() {
  const { id } = useParams<{ id: string }>()
  const receipt = useQuery({ queryKey: ['receipt', id], queryFn: () => api.receipt(id), retry: false })

  if (receipt.isError) return <ErrorCard title="No receipt yet" message={(receipt.error as Error).message} />
  if (!receipt.data) return <Loader label="Building the receipt" />
  const r = receipt.data.receipt
  const ticker = r.asset.replace(/\.US$/, '')

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <header>
        <p className="text-[0.76rem] tracking-[1px] text-ink-faint uppercase">Protection completed</p>
        <h1 className="font-heading text-[clamp(2rem,8vw,2.6rem)] leading-[1.04] font-semibold tracking-[-0.3px]">
          {ticker} · {bpsPercent(r.protectionBps)} · {duration(r.durationSec)}
        </h1>
        <p className="text-sm text-muted-foreground">
          {when(r.openedAt)} to {when(r.closedAt)} · closed because {r.closeReason.toLowerCase()}
        </p>
      </header>

      <Card>
        <CardContent className="pt-6">
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <Row label="Starting stock value" value={money(r.startingStockValue)} sub={`${r.stockQuantity} shares at ${money(r.startingStockPrice)}`} />
            <Row label="Ending stock value" value={money(r.endingStockValue)} sub={`at ${money(r.endingStockPrice)}`} />
            <Row label="Underlying PnL" value={signedMoney(r.underlyingPnl)} />
            <Row label="Hedge PnL" value={signedMoney(r.hedgePnl)} sub={`${r.hedgeQuantity} short from ${money(r.entryPrice)} to ${money(r.exitPrice)}`} />
            <Row label="Funding" value={signedMoney(r.funding)} />
            <Row label="Fees" value={signedMoney(-Number(r.fees))} />
            <Row label="Borrow interest (account)" value={signedMoney(r.borrowInterest)} />
          </dl>
          <div className="mt-4 border-t pt-4">
            <dl className="grid grid-cols-2 gap-y-2">
              <Row label="Net protected value" value={money(r.netProtectedValue)} strong />
              <Row label="Tracking difference" value={signedMoney(r.trackingDifference)} strong />
            </dl>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Proof</CardTitle>
          <CardDescription>Backpack order ids and the Solana Memo transactions carrying this receipt&apos;s hashes.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <ul className="flex flex-col gap-1">
            {r.orders.map((o, i) => (
              <li key={i} className="flex flex-wrap gap-x-3">
                <span className="font-medium">{o.purpose}</span>
                <span>
                  {o.side === 'Ask' ? 'sold' : 'bought'} {o.quantity} at {money(o.avgPrice)} · fee {money(o.fee, true)}
                </span>
                <span className="font-mono text-xs text-muted-foreground">{o.backpackOrderId}</span>
              </li>
            ))}
          </ul>
          <ul className="flex flex-col gap-1">
            {receipt.data.anchors.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-x-3">
                <span className="font-medium">{a.kind}</span>
                <Badge variant="outline">{a.status}</Badge>
                <span className="font-mono text-xs text-muted-foreground">sha256 {a.digest.slice(0, 20)}…</span>
                {a.signature && (
                  <a className="underline" href={`https://explorer.solana.com/tx/${a.signature}`} target="_blank" rel="noreferrer">
                    view on Solana
                  </a>
                )}
              </li>
            ))}
            {receipt.data.anchors.length === 0 && <li className="text-muted-foreground">No Solana anchors were written (anchoring off or no SOL).</li>}
          </ul>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button nativeButton={false} render={<Link href={`/protection/${id}`} />} variant="outline">Back to protection</Button>
        <Button nativeButton={false} render={<Link href="/" />}>Portfolio</Button>
      </div>
    </div>
  )
}

function Row({ label, value, sub, strong }: { label: string; value: string; sub?: string; strong?: boolean }) {
  return (
    <>
      <dt className="text-muted-foreground">
        {label}
        {sub && <span className="block text-xs">{sub}</span>}
      </dt>
      <dd className={`text-right ${strong ? 'font-heading text-2xl font-medium text-gold-deep' : 'font-mono text-[0.875rem] tracking-[0.3px]'}`}>{value}</dd>
    </>
  )
}
