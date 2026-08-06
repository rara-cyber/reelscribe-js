import { ReelScribeError } from './errors'
import type {
  Credits,
  DuplicateResult,
  GetTranscriptionOptions,
  HealthCheck,
  ListTranscriptionsOptions,
  ReelScribeOptions,
  Settings,
  TranscribeOptions,
  TranscribeResult,
  Transcription,
  TranscriptionList,
} from './types'

const DEFAULT_BASE_URL = 'https://reelscribe.app'

/**
 * ReelScribe API client.
 *
 * @example
 * ```ts
 * const rs = new ReelScribe('rs_your_api_key')
 * const { requestId } = await rs.transcribe({ url: 'https://www.instagram.com/reel/ABC123/' })
 * const result = await rs.getTranscription({ requestId })
 * ```
 *
 * @see https://reelscribe.app/api — full API documentation
 */
export class ReelScribe {
  private readonly apiKey: string
  private readonly baseUrl: string
  private readonly _fetch: typeof globalThis.fetch

  constructor(apiKey: string, options?: ReelScribeOptions) {
    if (!apiKey) throw new Error('An API key is required. Get one at https://reelscribe.app/api')
    this.apiKey = apiKey
    this.baseUrl = (options?.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '')
    this._fetch = options?.fetch ?? globalThis.fetch
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}/v1/${path}`
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    }

    const res = await this._fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    const json = await res.json()

    if (!res.ok) {
      throw new ReelScribeError(json.error ?? { code: 'UNKNOWN', message: res.statusText, status: res.status })
    }

    return json as T
  }

  // -------------------------------------------------------------------------
  // Public methods
  // -------------------------------------------------------------------------

  /**
   * Submit a video URL for transcription. Costs 1 credit.
   *
   * If the video was already transcribed, returns a `DuplicateResult` instead.
   *
   * @see https://reelscribe.app/api — POST /v1/transcribe
   */
  async transcribe(options: TranscribeOptions): Promise<TranscribeResult | DuplicateResult> {
    return this.request('POST', 'transcribe', options)
  }

  /**
   * Fetch a single transcription by Convex document ID or requestId.
   *
   * @see https://reelscribe.app/api — GET /v1/transcriptions?id=...
   */
  async getTranscription(options: GetTranscriptionOptions): Promise<Transcription> {
    const params = new URLSearchParams()
    if (options.id) params.set('id', options.id)
    if (options.requestId) params.set('requestId', options.requestId)
    return this.request('GET', `transcriptions?${params}`)
  }

  /**
   * Fetch one page of your transcriptions, newest first.
   *
   * This returns a **single page** — at most `limit` rows (default 100, max
   * 200) — not your whole library. `total` is the length of this page; there is
   * no library count. To read everything, loop on `hasMore`/`nextCursor`:
   *
   * @example
   * ```ts
   * const all = []
   * let cursor: string | null = null
   * do {
   *   const page = await rs.listTranscriptions({ cursor, limit: 200 })
   *   all.push(...page.transcriptions)
   *   cursor = page.nextCursor
   * } while (cursor)
   * ```
   *
   * @see https://reelscribe.app/api — GET /v1/transcriptions
   */
  async listTranscriptions(options?: ListTranscriptionsOptions): Promise<TranscriptionList> {
    const params = new URLSearchParams()
    if (options?.status) params.set('status', options.status)
    if (options?.limit != null) params.set('limit', String(options.limit))
    if (options?.cursor) params.set('cursor', options.cursor)
    const qs = params.toString()
    return this.request('GET', `transcriptions${qs ? `?${qs}` : ''}`)
  }

  /**
   * Check your credit balance, subscription tier, storage usage and retention.
   *
   * `storageLimit` is always `-1` — there is no storage cap on any tier.
   * Read `retention` to learn how long transcriptions are kept.
   *
   * @see https://reelscribe.app/api — GET /v1/credits
   */
  async getCredits(): Promise<Credits> {
    return this.request('GET', 'credits')
  }

  /**
   * Read your account settings, which are now reporting-only: the response
   * contains your retention policy and nothing else.
   *
   * There is no counterpart writer. `autoPruneStorage` — the only setting this
   * endpoint ever had — was removed when storage moved from per-tier count
   * limits to time-based retention, so `PATCH /v1/settings` always fails.
   *
   * @see https://reelscribe.app/api — GET /v1/settings
   */
  async getSettings(): Promise<Settings> {
    return this.request('GET', 'settings')
  }

  /**
   * Check whether the API is healthy. Does not require authentication.
   *
   * @see https://reelscribe.app/api — GET /v1/health
   */
  async health(): Promise<HealthCheck> {
    const res = await this._fetch(`${this.baseUrl}/v1/health`)
    return res.json()
  }
}
