# ReelScribe Node.js SDK

Official Node.js/TypeScript client for the [ReelScribe](https://www.reelscribe.app) API — transcribe Instagram Reels, TikTok videos, and YouTube Shorts programmatically.

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
const { requestId } = await rs.transcribe({
  url: 'https://www.instagram.com/reel/ABC123/',
})

// Poll for the result
const transcription = await rs.getTranscription({ requestId })
console.log(transcription.transcription)
```

> Get your API key from the [ReelScribe dashboard](https://www.reelscribe.app/api).

## Usage

### Transcribe a Video

Submit an Instagram Reel, TikTok video, or YouTube Short for transcription. Costs 1 credit per request.

```ts
const result = await rs.transcribe({
  url: 'https://www.youtube.com/shorts/dQw4w9WgXcQ',
})

console.log(result.requestId) // use this to check status
```

#### With Webhook

Instead of polling, provide a `resumeUrl` to receive a POST when the transcription is ready:

```ts
const result = await rs.transcribe({
  url: 'https://www.tiktok.com/@user/video/1234567890',
  resumeUrl: 'https://your-server.com/webhook',
})
```

Your server will receive the full transcription result as a POST request. See the [webhook docs](https://www.reelscribe.app/api) for the payload format.

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

```ts
// All transcriptions
const { transcriptions, total } = await rs.listTranscriptions()

// Filter by status
const completed = await rs.listTranscriptions({ status: 'completed' })
```

### Check Credits

```ts
const credits = await rs.getCredits()

console.log(credits.credits)            // 450
console.log(credits.tier)               // 'creator'
console.log(credits.subscriptionStatus) // 'active'
console.log(credits.storageUsed)        // 42
console.log(credits.storageLimit)       // 100
```

### Settings

```ts
// Read settings
const settings = await rs.getSettings()
console.log(settings.autoPruneStorage) // true

// Update settings
await rs.updateSettings({ autoPruneStorage: false })
```

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
| `STORAGE_LIMIT` | 403 | Transcript storage full |
| `NOT_FOUND` | 404 | Transcription not found |
| `SERVICE_ERROR` | 503 | Transcription service unavailable (credit refunded) |

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

## Requirements

- Node.js 18+ (uses native `fetch`)
- A [ReelScribe](https://www.reelscribe.app) account with API access

## Links

- [ReelScribe](https://www.reelscribe.app) — Video transcription for content creators
- [API Documentation](https://www.reelscribe.app/api) — Full endpoint reference & API key management
- [Pricing](https://www.reelscribe.app/pricing) — Plans starting at $9.99/month

## License

[MIT](LICENSE)
