import { describe, expect, it } from 'vitest'
import type { StockHoliday, StockSession } from '@prox/core'
import type { Backpack } from '../src/backpack'
import { MarketSessionService } from '../src/market/market-session.service'

// Session hours as Backpack returns them from GET /api/v1/stockSessions.
const TZ = 'America/New_York'
const sessions: StockSession[] = [
  { name: 'US_EQUITIES_PRE_MARKET', startTime: '04:00:00', endTime: '09:30:00', startWeekday: 1, endWeekday: 5, timezone: TZ },
  { name: 'US_EQUITIES_REGULAR', startTime: '09:30:00', endTime: '16:00:00', startWeekday: 1, endWeekday: 5, timezone: TZ },
  { name: 'US_EQUITIES_POST_MARKET', startTime: '16:00:00', endTime: '20:00:00', startWeekday: 1, endWeekday: 5, timezone: TZ },
  { name: 'US_EQUITIES_OVERNIGHT', startTime: '20:00:00', endTime: '04:00:00', startWeekday: 7, endWeekday: 4, timezone: TZ },
]
const holidays: StockHoliday[] = []
const backpack = { stocks: { calendar: async () => ({ sessions, holidays }) } } as unknown as Backpack
const service = new MarketSessionService(backpack)

// Wednesday 2026-10-07, 03:00 ET: the overnight session.
const now = Date.parse('2026-10-07T07:00:00Z')
const iso = (d: Date) => d.toISOString()

describe('MarketSessionService.reopenFor', () => {
  it('TONIGHT for one day ends at the next regular open', async () => {
    expect(iso(await service.reopenFor('TONIGHT', now))).toBe('2026-10-07T13:30:00.000Z')
    expect(iso(await service.reopenFor('TONIGHT', now, undefined, 1))).toBe('2026-10-07T13:30:00.000Z')
  })

  it('TONIGHT for three days ends at the third regular open', async () => {
    expect(iso(await service.reopenFor('TONIGHT', now, undefined, 3))).toBe('2026-10-09T13:30:00.000Z')
  })

  it('TONIGHT for five days carries over the weekend', async () => {
    expect(iso(await service.reopenFor('TONIGHT', now, undefined, 5))).toBe('2026-10-13T13:30:00.000Z')
  })

  it('WEEKEND ignores the day count: it always ends at the first open after the weekend', async () => {
    expect(iso(await service.reopenFor('WEEKEND', now, undefined, 5))).toBe('2026-10-12T13:30:00.000Z')
  })

  it('CUSTOM ends at the chosen time whatever the day count', async () => {
    const end = new Date(now + 4 * 3_600_000)
    expect(iso(await service.reopenFor('CUSTOM', now, end, 3))).toBe(iso(end))
  })
})
