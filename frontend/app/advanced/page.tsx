'use client'

// Optional account and margin detail, straight from Backpack (PRD section 39).

import { useQuery } from '@tanstack/react-query'
import { ErrorCard } from '@/components/error-card'
import { Loader } from '@/components/loader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { api, API_URL } from '@/lib/api'
import { when } from '@/lib/format'

export default function AdvancedPage() {
  const advanced = useQuery({ queryKey: ['advanced'], queryFn: api.advanced, refetchInterval: 15_000 })
  const health = useQuery({ queryKey: ['health'], queryFn: api.health, refetchInterval: 15_000 })
  const reports = useQuery({ queryKey: ['attestations'], queryFn: api.attestations, refetchInterval: 15_000 })
  if (advanced.isError) return <ErrorCard title="Could not read the account" message={(advanced.error as Error).message} />
  if (!advanced.data) return <Loader label="Reading the account" />
  const sections: [string, string, unknown][] = [
    ['Account settings', 'GET /api/v1/account', advanced.data.account],
    ['Collateral and margin', 'GET /api/v1/capital/collateral', advanced.data.collateral],
    ['Open positions', 'GET /api/v1/position', advanced.data.positions],
    ['Open orders', 'GET /api/v1/orders', advanced.data.openOrders],
    ['Balances', 'GET /api/v1/capital', advanced.data.balances],
    ['Backend', '/api/health', { ...health.data, anchorBalanceLamports: advanced.data.anchorBalanceLamports }],
  ]
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {sections.map(([title, source, value]) => (
        <Card key={title}>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{source}</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="max-h-96 overflow-auto rounded-md border border-line bg-paper p-3 font-mono text-[0.76rem] leading-[1.5]">{JSON.stringify(value, null, 2)}</pre>
          </CardContent>
        </Card>
      ))}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Oracle reports</CardTitle>
          <CardDescription>The latest signed CRE reports. Each hash opens the stored report.</CardDescription>
        </CardHeader>
        <CardContent>
          {!reports.data?.length && <p className="text-sm text-muted-foreground">No reports received yet.</p>}
          <ul className="flex flex-col gap-2 text-xs">
            {reports.data?.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <a className="font-mono text-gold-deep underline underline-offset-2" href={`${API_URL}/api/attestations/${r.reportHash}`} target="_blank" rel="noreferrer">
                  {r.reportHash.slice(0, 10)}…{r.reportHash.slice(-8)}
                </a>
                <span className="text-muted-foreground">{when(r.observedAt)}</span>
                <span className="text-muted-foreground">{r.mode === 'DON' ? `DON, ${r.validSignatures} signatures` : 'Simulation'}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
