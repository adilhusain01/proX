'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Suspense, type ReactNode } from 'react'
import { Loader } from '@/components/loader'
import { SignInGate, useSession } from '@/components/sign-in-gate'
import { Badge } from '@/components/ui/badge'
import { useStream } from '@/hooks/use-stream'
import { api } from '@/lib/api'
import { SESSION_LABEL, shortAddress } from '@/lib/format'

const NAV = [
  { href: '/', label: 'Portfolio' },
  { href: '/protect', label: 'Protect' },
  { href: '/advanced', label: 'Advanced' },
]

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[1040px] flex-col px-[22px] pt-[22px] pb-[30px] sm:pt-[30px]">
      {/* URL hooks only resolve at request time; Suspense lets the shell prerender around them. */}
      <Suspense fallback={<div className="h-9" />}>
        <Header />
      </Suspense>
      <main className="flex-1">
        <SignInGate>
          <Suspense fallback={<Loader />}>{children}</Suspense>
        </SignInGate>
      </main>
    </div>
  )
}

function Header() {
  const pathname = usePathname()
  const session = useSession()
  const health = useQuery({ queryKey: ['health'], queryFn: api.health, refetchInterval: 30_000 })
  const stream = useStream(!!session.data?.wallet)
  const queryClient = useQueryClient()
  const { disconnect } = useWallet()
  // Clear the session cookie, then drop the wallet so the gate does not sign straight back in.
  const signOut = useMutation({
    mutationFn: api.logout,
    onSuccess: async () => {
      await disconnect().catch(() => undefined)
      queryClient.clear()
    },
  })
  const marketState = stream.account?.session ?? health.data?.session.state
  const signedIn = !!session.data?.wallet
  const section = NAV.find((item) => (item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)))?.href ?? (pathname.startsWith('/protection') ? '/' : null)

  return (
    <header>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <Link href="/" className="font-heading text-[1.32rem] font-semibold tracking-[0.2px] text-ink no-underline">
          ProX
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {marketState && <Badge variant="outline">{SESSION_LABEL[marketState] ?? marketState}</Badge>}
          {health.data && !health.data.tradingEnabled && <Badge variant="destructive">Trading off</Badge>}
          {health.data?.demoMode && <Badge variant="outline">Demo</Badge>}
          {signedIn && (
            <>
              <Badge variant="outline">{shortAddress(session.data!.wallet!)}</Badge>
              <button
                onClick={() => signOut.mutate()}
                disabled={signOut.isPending}
                className="h-7 cursor-pointer rounded-full px-3 font-mono text-[0.74rem] text-ink-soft shadow-[inset_0_0_0_1.5px_var(--line)] transition-[color,box-shadow] duration-[260ms] ease-umbra hover:text-ink hover:shadow-[inset_0_0_0_1.5px_var(--ink)] disabled:opacity-50"
              >
                Sign out
              </button>
            </>
          )}
        </div>
      </div>
      {signedIn && (
        <nav className="mx-auto mt-[14px] mb-[18px] flex w-full max-w-[460px] gap-1 rounded-full bg-paper-3 p-1 shadow-[inset_0_0_0_1px_var(--line)]">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={section === item.href ? 'page' : undefined}
              className={`flex-1 rounded-full px-1.5 py-[9px] text-center text-sm font-bold no-underline transition-[color,background-color] duration-[260ms] ease-umbra ${
                section === item.href ? 'bg-ink text-paper shadow-card' : 'text-ink-soft hover:text-ink'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  )
}
