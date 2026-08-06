import { describe, expect, it } from 'bun:test'
import { ReelScribe } from './client'
import type { Transcription, TranscriptionList } from './types'

/**
 * Regression cover for the v1.0.4 break.
 *
 * `GET /v1/transcriptions` became cursor-paginated on 2026-07-31. The SDK kept
 * sending a bare request and reading `{ transcriptions, total }`, so a caller
 * with more than one page silently received only the first — no error, no
 * warning, and `total` reading as a plausible library count made it look right.
 *
 * These tests fail against the 1.0.4 shapes: at runtime (the client dropped
 * `cursor`/`limit` from the query string) and at compile time (`nextCursor` and
 * `hasMore` did not exist on `TranscriptionList`).
 */

function stubTranscription(id: string): Transcription {
  return {
    id,
    requestId: null,
    url: `https://www.instagram.com/reel/${id}/`,
    platform: 'instagram',
    status: 'completed',
    transcription: 'text',
    createdAt: 0,
    completedAt: null,
    caption: null,
    hashtags: null,
    mentions: null,
    owner: null,
    duration: null,
    stats: null,
    segments: null,
    thumbnailUrl: null,
    videoTimestamp: null,
    errorMessage: null,
    errorType: null,
  }
}

/** A fetch stub that records every URL it is called with. */
function stubFetch(pages: TranscriptionList[]) {
  const calls: string[] = []
  let next = 0
  const fetch = (async (url: string | URL) => {
    calls.push(String(url))
    const body = pages[Math.min(next++, pages.length - 1)]
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }) as unknown as typeof globalThis.fetch
  return { fetch, calls }
}

describe('listTranscriptions', () => {
  it('sends limit and cursor to the server', async () => {
    const { fetch, calls } = stubFetch([
      { transcriptions: [], total: 0, nextCursor: null, hasMore: false },
    ])
    const rs = new ReelScribe('rs_test', { fetch })

    await rs.listTranscriptions({ limit: 200, cursor: 'cur_abc', status: 'completed' })

    const query = new URL(calls[0]!).searchParams
    // Against 1.0.4 both of these were dropped, so every call re-fetched page 1.
    expect(query.get('limit')).toBe('200')
    expect(query.get('cursor')).toBe('cur_abc')
    expect(query.get('status')).toBe('completed')
  })

  it('omits cursor on the first page', async () => {
    const { fetch, calls } = stubFetch([
      { transcriptions: [], total: 0, nextCursor: null, hasMore: false },
    ])
    const rs = new ReelScribe('rs_test', { fetch })

    await rs.listTranscriptions()

    expect(calls[0]).toBe('https://reelscribe.app/v1/transcriptions')
  })

  it('walks every page to fetch a full library', async () => {
    const { fetch, calls } = stubFetch([
      {
        transcriptions: [stubTranscription('a'), stubTranscription('b')],
        total: 2,
        nextCursor: 'cur_1',
        hasMore: true,
      },
      {
        transcriptions: [stubTranscription('c')],
        total: 1,
        nextCursor: null,
        hasMore: false,
      },
    ])
    const rs = new ReelScribe('rs_test', { fetch })

    // The documented idiom, verbatim from the README.
    const all: Transcription[] = []
    let cursor: string | null = null
    do {
      const page: TranscriptionList = await rs.listTranscriptions({ cursor, limit: 200 })
      all.push(...page.transcriptions)
      cursor = page.nextCursor
    } while (cursor)

    expect(all.map(t => t.id)).toEqual(['a', 'b', 'c'])
    expect(calls).toHaveLength(2)
    expect(new URL(calls[1]!).searchParams.get('cursor')).toBe('cur_1')
  })

  it('reports total as the page length, never the library size', async () => {
    const { fetch } = stubFetch([
      {
        transcriptions: [stubTranscription('a'), stubTranscription('b')],
        total: 2,
        nextCursor: 'cur_1',
        hasMore: true,
      },
    ])
    const rs = new ReelScribe('rs_test', { fetch })

    const page = await rs.listTranscriptions({ limit: 2 })

    // The trap: `total` here is 2 while more rows exist. Anything that treats it
    // as a library count is wrong, which is what `hasMore` is for.
    expect(page.total).toBe(page.transcriptions.length)
    expect(page.hasMore).toBe(true)
  })
})
