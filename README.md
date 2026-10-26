# ReelScribe Node.js SDK

Official Node.js/TypeScript client for the [ReelScribe](https://reelscribe.app) API — transcribe Instagram Reels, TikTok videos, YouTube Shorts, Facebook Reels, and Threads, LinkedIn, X and Bluesky videos programmatically.

[![npm version](https://img.shields.io/npm/v/reelscribe)](https://www.npmjs.com/package/reelscribe)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

## Installation

```bash
npm install reelscribe
```

## Quick Start

```ts
import { ReelScribe } from 'reelscribe'

const rs = new ReelScribe('rs_your_api_key')

// Submit a video for transcription
const result = await rs.transcribe({
  url: 'https://www.instagram.com/reel/ABC123/',
})

if ('duplicate' in result) {
  // Already transcribed — the text comes straight back, no credit spent.
  console.log(result.transcription.transcription)
} else {
  // Poll for the result
  const transcription = await rs.getTranscription({ requestId: result.requestId })
  console.log(transcription.transcription)
}
```

> Get your API key from the [ReelScribe dashboard](https://reelscribe.app/api).

## Usage

### Transcribe a Video

Submit an Instagram Reel, TikTok video, YouTube Short, Facebook Reel, or a Threads, LinkedIn, X or Bluesky video for transcription. Costs 1 credit per request.

`transcribe()` returns either a `TranscribeResult` or — when you have already
transcribed that URL — a `DuplicateResult` carrying the existing text, with no
credit spent. Narrow on the `duplicate` field before reading `requestId`:

```ts
const result = await rs.transcribe({
  url: 'https://www.youtube.com/shorts/dQw4w9WgXcQ',
})

if ('duplicate' in result) {
  console.log(result.transcription.id) // already have it
} else {
  console.log(result.requestId)        // use this to check status
}
```

#### With Webhook

Instead of polling, provide a `resumeUrl` to receive a POST when the transcription is ready:

```ts
const result = await rs.transcribe({
  url: 'https://www.tiktok.com/@user/video/1234567890',
  resumeUrl: 'https://your-server.com/webhook',
})
```

Your server will receive the full transcription result as a POST request. See the [webhook docs](https://reelscribe.app/api) for the payload format.

### Get a Transcription

Retrieve a transcription by the `requestId` returned from `transcribe()`:

```ts
const t = await rs.getTranscription({ requestId: '550e8400-...' })

console.log(t.status)         // 'completed'
console.log(t.transcription)  // 'The full transcription text...'
console.log(t.caption)        // Original post caption
console.log(t.hashtags)       // ['tag1', 'tag2']
console.log(t.stats)          // { likes: 1234, views: 56789, comments: 42 }
console.log(t.segments)       // [{ start: 0, end: 2.5, text: 'Hello...' }]
```

Or fetch by Convex document ID:

```ts
const t = await rs.getTranscription({ id: 'abc123' })
```

### List Transcriptions

`listTranscriptions()` is cursor-paginated and returns **one page** — at most
`limit` rows, newest first. `limit` defaults to 100 and is clamped to 200.

```ts
const page = await rs.listTranscriptions({ limit: 50 })

console.log(page.transcriptions) // up to 50 rows
console.log(page.hasMore)        // true if further pages remain
console.log(page.nextCursor)     // pass back to fetch the next page
```

> **`total` is the length of the page you just received, not the size of your
> library.** The API deliberately does not report a library count. Branch on
> `hasMore`, never on `total`.

To read a whole library, keep passing `nextCursor` back until it is `null`:

```ts
const all = []
let cursor: string | null = null

do {
  const page = await rs.listTranscriptions({ cursor, limit: 200 })
  all.push(...page.transcriptions)
  cursor = page.nextCursor
} while (cursor)

console.log(all.length) // every transcription in the account
```

Filtering by status pages the same way:

```ts
const completed = await rs.listTranscriptions({ status: 'completed', limit: 200 })
```

### Check Credits

```ts
const credits = await rs.getCredits()

console.log(credits.credits)            // 450
console.log(credits.tier)               // 'creator'
console.log(credits.subscriptionStatus) // 'active'
console.log(credits.storageUsed)        // 42  — completed transcriptions stored
console.log(credits.storageUsedCapped)  // false — true means the real figure is higher
console.log(credits.storageLimit)       // -1  — always; there is no storage cap
```

There are no storage caps on any tier, and nothing is deleted on any plan.

`credits.retention` is still returned so older clients keep working, but it is
deprecated and no longer describes real behavior. The 30-day retention policy
was retracted on 2026-10-26. Ignore the whole object, `deletesAfter` in
particular.

`storageUsed` is a bounded probe (up to 2,000 rows). When `storageUsedCapped`
is `true`, treat `storageUsed` as a floor rather than an exact count.

### Settings

Settings are read-only. The response holds only the deprecated `retention`
object, kept for older clients. Nothing is deleted on any plan, so ignore it.

```ts
const settings = await rs.getSettings()
```

There is no `updateSettings()`. `autoPruneStorage` was the only writable
setting and it no longer exists.

### Health Check

```ts
const health = await rs.health()
console.log(health.healthy) // true
```

## Error Handling

All API errors throw a `ReelScribeError` with a machine-readable `code` and HTTP `status`:

```ts
import { ReelScribe, ReelScribeError } from 'reelscribe'

try {
  await rs.transcribe({ url: 'https://www.instagram.com/reel/ABC123/' })
} catch (err) {
  if (err instanceof ReelScribeError) {
    console.log(err.code)    // 'INSUFFICIENT_CREDITS'
    console.log(err.status)  // 402
    console.log(err.message) // 'You need at least 1 credit'
  }
}
```

| Code | Status | Description |
|------|--------|-------------|
| `INVALID_REQUEST` | 400 | Bad request body or missing fields |
| `INVALID_URL` | 400 | Unsupported video platform |
| `UNAUTHORIZED` | 401 | Missing or invalid API key |
| `INSUFFICIENT_CREDITS` | 402 | No credits remaining |
| `NOT_FOUND` | 404 | Transcription not found |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `SERVICE_ERROR` | 503 | Transcription service unavailable (credit refunded) |

> `STORAGE_LIMIT` (403) is retired. Nothing returns it — there are no storage
> caps, so no upload is ever rejected on count. If you branch on it, that branch
> is dead.

## Upgrading from 1.x

The public API changed on 2026-07-31; **1.0.4 and earlier are broken against it**.
Storage moved from per-tier count caps to time-based retention, and
`GET /v1/transcriptions` became cursor-paginated.

| 1.x | 2.0 | What to do |
|-----|-----|------------|
| `listTranscriptions()` returned the whole library | Returns **one page** (default 100, max 200) | Loop on `nextCursor` while it is non-`null` — see [List Transcriptions](#list-transcriptions) |
| `total` read as a library count | `total` is the **page** length | Branch on `hasMore` instead |
| `updateSettings({ autoPruneStorage })` | **Removed** | Delete the call. `PATCH /v1/settings` now always returns 400 |
| `Settings.autoPruneStorage` | `Settings.retention` (deprecated) | Nothing to read: nothing is deleted on any plan |
| `Credits.storageLimit` was a per-tier number | Always `-1` | Drop any "storage full" logic; there is nothing to check |
| `STORAGE_LIMIT` (403) error | **Retired** | Remove the branch — nothing returns it |
| — | `Credits.storageUsedCapped` added | `storageUsed` is a floor when this is `true` |
| — | `Platform` includes `'facebook'` | Widen any exhaustive `switch` on `platform` |

The silent one is pagination: on 1.0.4 a caller with more than 100
transcriptions receives only the first page, with no error, and `total` looks
like a plausible library count. If you list transcriptions, you must upgrade.

## Upgrading from 2.0

2.1 is additive. `Platform` now also includes `'threads'`, `'linkedin'`, `'x'`
and `'bluesky'`, so widen any exhaustive `switch` on `platform`. `RetentionInfo`
and `RetentionMode` are deprecated but unchanged: the API still returns
`retention`, nothing is deleted on any plan, and you should ignore it.

## Configuration

```ts
const rs = new ReelScribe('rs_your_api_key', {
  // Override the base URL (useful for testing)
  baseUrl: 'https://staging.reelscribe.app',
  // Provide a custom fetch implementation
  fetch: myCustomFetch,
})
```

## Supported Platforms

| Platform | Example URL |
|----------|-------------|
| Instagram Reels | `https://www.instagram.com/reel/ABC123/` |
| TikTok Videos | `https://www.tiktok.com/@user/video/1234567890` |
| YouTube Shorts | `https://www.youtube.com/shorts/dQw4w9WgXcQ` |
| YouTube Videos | `https://www.youtube.com/watch?v=dQw4w9WgXcQ` |
| Facebook Reels | `https://www.facebook.com/reel/1234567890/` |
| Threads | `https://www.threads.com/@nasa/post/DeMqtuYgkaL` |
| LinkedIn | `https://www.linkedin.com/posts/someone_slug-activity-7439430699750674432-gKvQ` |
| X | `https://x.com/elonmusk/status/1585341984679469056` |
| Bluesky | `https://bsky.app/profile/theonion.com/post/3myfyiza3yf2y` |

## Requirements

- Node.js 18+ (uses native `fetch`)
- A [ReelScribe](https://reelscribe.app) account with API access

## Links

- [ReelScribe](https://reelscribe.app) — Video transcription for content creators
- [API Documentation](https://reelscribe.app/api) — Full endpoint reference & API key management
- [Pricing](https://reelscribe.app/pricing) — Plans starting at $9.99/month

## License

[MIT](LICENSE)

---

Built by [SIÁN Agency](https://www.sian-agency.online)
