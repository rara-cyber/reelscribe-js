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
  UpdateSettingsOptions,
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
   * List all your transcriptions, optionally filtered by status.
   *
   * @see https://reelscribe.app/api — GET /v1/transcriptions
   */
  async listTranscriptions(options?: ListTranscriptionsOptions): Promise<TranscriptionList> {
    const params = new URLSearchParams()
    if (options?.status) params.set('status', options.status)
    const qs = params.toString()
    return this.request('GET', `transcriptions${qs ? `?${qs}` : ''}`)
  }

  /**
   * Check your credit balance, subscription tier, and storage usage.
   *
   * @see https://reelscribe.app/api — GET /v1/credits
   */
  async getCredits(): Promise<Credits> {
    return this.request('GET', 'credits')
  }

  /**
   * Get your current settings.
   *
   * @see https://reelscribe.app/api — GET /v1/settings
   */
  async getSettings(): Promise<Settings> {
    return this.request('GET', 'settings')
  }

  /**
   * Update your settings (e.g. auto-prune storage).
   *
   * @see https://reelscribe.app/api — PATCH /v1/settings
   */
  async updateSettings(options: UpdateSettingsOptions): Promise<Settings> {
    return this.request('PATCH', 'settings', options)
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
