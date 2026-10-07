'use client'

// PRD section 40: the portfolio dashboard.

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LineRow, SectionLabel, StatTile } from '@/components/umbra'
import { api, type PolicyWithLeg } from '@/lib/api'
import { bpsPercent, money, percent, STATUS_LABEL } from '@/lib/format'
import { RiskBadge } from '@/components/risk-badge'
import { ErrorCard } from '@/components/error-card'
import { Loader } from '@/components/loader'

const LIVE = new Set(['OPENING', 'ACTIVE', 'PARTIAL', 'WAIT_REOPEN', 'WAIT_CONVERGENCE', 'REDUCING', 'EMERGENCY', 'EXPIRED', 'CLOSING'])

export default function PortfolioPage() {
  const portfolio = useQuery({ queryKey: ['portfolio'], queryFn: api.portfolio, refetchInterval: 15_000 })
  const policies = useQuery({ queryKey: ['policies'], queryFn: api.policies, refetchInterval: 15_000 })

  if (portfolio.isError) return <ErrorCard title="Could not read the Backpack account" message={(portfolio.error as Error).message} />
  if (!portfolio.data) return <Loader label="Reading the portfolio" />

  const live = (policies.data ?? []).filter((p) => LIVE.has(p.policy.status))
  const protectedValue = live.reduce((sum, p) => sum + Number(p.leg.stockMarketValue) * (p.policy.actualProtectionBps / 10_000), 0)
  const stockValue = portfolio.data.holdings.reduce((sum, h) => sum + Number(h.marketValue), 0)

  const health = portfolio.data.health
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col items-center gap-1.5 pt-2.5 pb-1 text-center">
        <span className="text-[0.76rem] tracking-[1px] text-ink-faint uppercase">Portfolio value</span>
        <span className={`relative font-heading text-[clamp(3.4rem,16vw,5rem)] leading-[0.95] font-medium tracking-[-1px] ${live.length ? 'pb-3' : ''}`}>
          {money(health.portfolioValue)}
          {/* Umbra's one stroke of gold: here it marks a portfolio with a live hedge. */}
          {live.length > 0 && <span className="absolute right-[18%] bottom-0 left-[18%] h-0.5 bg-gold opacity-85" />}
        </span>
        <span className="text-[0.72rem] font-bold tracking-[3px] text-ink-faint uppercase">
          {live.length ? (STATUS_LABEL[live[0]!.policy.status] ?? live[0]!.policy.status) : 'Nothing hedged'}
        </span>
      </section>

      <section className="flex flex-wrap gap-2.5">
        <StatTile label="Protected" value={money(protectedValue)} hint="Covered by a live hedge" />
        <StatTile label="Exposed" value={money(Math.max(0, stockValue - protectedValue))} hint="Still moving with the market" />
        <StatTile label="Available equity" value={money(health.netEquityAvailable)} hint="Free margin on Backpack" />
      </section>

      <section className="flex flex-col gap-0.5">
        <SectionLabel
          className="mb-1.5"
          action={
            <Link href="/protect" className="text-gold-deep underline">
              Protect a stock
            </Link>
          }
        >
          Stocks
        </SectionLabel>
        {portfolio.data.holdings.length === 0 && <p className="px-0.5 py-3.5 font-heading text-sm text-ink-faint italic">No tokenized stocks are held in this account.</p>}
        {portfolio.data.holdings.map((h) => {
          const policy = live.find((p) => p.leg.stockSymbol === h.symbol)
          const ticker = h.symbol.replace(/\.US$/, '')
          return (
            <div key={h.symbol} className="flex flex-wrap items-center gap-3 border-b border-line-soft px-1 py-3.5 last:border-b-0">
              <span className="grid size-[34px] flex-none place-items-center rounded-full bg-paper font-heading text-base font-semibold shadow-[inset_0_0_0_1.5px_var(--line)]">{ticker[0]}</span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[0.98rem] font-bold tracking-[0.2px]">{ticker}</span>
                <span className="text-[0.76rem] text-ink-faint">
                  {h.name} · {money(h.collateralValue)} collateral at {percent(h.collateralWeight, 0)}
                </span>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <span className="font-mono text-[0.98rem] tracking-[0.3px]">{h.quantity}</span>
                <span className="text-[0.76rem] text-ink-faint">
                  {money(h.marketValue)} at {money(h.markPrice)}
                </span>
              </div>
              {policy ? (
                <Button nativeButton={false} render={<Link href={`/protection/${policy.policy.id}`} />} variant="outline" size="sm" className="rounded-full">
                  {bpsPercent(policy.policy.actualProtectionBps)} protected
                </Button>
              ) : (
                <Button nativeButton={false} render={<Link href={`/protect?symbol=${encodeURIComponent(h.symbol)}`} />} size="sm" className="rounded-full">
                  Protect
                </Button>
              )}
            </div>
          )
        })}
      </section>

      <div className="h-px bg-line" />

      <div className="grid gap-x-9 gap-y-6 md:grid-cols-2">
        <section>
          <SectionLabel className="mb-1.5">Account health</SectionLabel>
          <LineRow label="Risk" value={<RiskBadge state={health.risk} />} />
          <LineRow label="Net equity" value={money(health.netEquity)} />
          <LineRow label="Maintenance margin" value={percent(health.mmr)} />
          <LineRow label="Initial margin" value={percent(health.imr)} />
          <LineRow label="Borrow liability" value={money(health.borrowLiability)} />
          <LineRow label="Leverage limit" value={`${health.leverageLimit}x`} />
        </section>
        <RecentPolicies policies={policies.data ?? []} />
      </div>
    </div>
  )
}

function RecentPolicies({ policies }: { policies: PolicyWithLeg[] }) {
  return (
    <section>
      <SectionLabel className="mb-1.5">Protections</SectionLabel>
      {policies.length === 0 && <p className="px-0.5 py-3.5 font-heading text-sm text-ink-faint italic">No protections yet.</p>}
      {policies.slice(0, 6).map(({ policy, leg }) => (
        <Link
          key={policy.id}
          href={policy.status === 'CLOSED' ? `/protection/${policy.id}/receipt` : `/protection/${policy.id}`}
          className="flex items-center gap-3 rounded-md border-b border-line-soft px-1 py-3 text-ink no-underline transition-colors duration-[260ms] ease-umbra last:border-b-0 hover:bg-ink/[0.04]"
        >
          <span className="text-sm font-bold">{leg.stockSymbol.replace(/\.US$/, '')}</span>
          <span className="font-mono text-sm text-ink-soft">{bpsPercent(policy.actualProtectionBps || policy.requestedProtectionBps)}</span>
          <span className="ml-auto text-[0.76rem] text-ink-faint">{STATUS_LABEL[policy.status] ?? policy.status}</span>
        </Link>
      ))}
    </section>
  )
}
