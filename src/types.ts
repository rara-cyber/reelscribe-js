/** Supported video platforms. */
export type Platform =
  | 'instagram'
  | 'tiktok'
  | 'youtube'
  | 'facebook'
  | 'threads'
  | 'linkedin'
  | 'x'
  | 'bluesky'

/** Transcription lifecycle status. */
export type TranscriptionStatus =
  | 'submitted'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'

/** Subscription tier. */
export type Tier = 'free' | 'creator' | 'agency' | 'enterprise'

// ---------------------------------------------------------------------------
// Request types
// ---------------------------------------------------------------------------

export interface TranscribeOptions {
  /** Instagram, TikTok, YouTube, Facebook, Threads, LinkedIn, X, or Bluesky URL (max 2048 chars). */
  url: string
  /** Optional HTTPS webhook URL — receives a POST when the job finishes. */
  resumeUrl?: string
}

export interface ListTranscriptionsOptions {
  /** Filter by status. */
  status?: TranscriptionStatus
  /**
   * Page size. Defaults to 100; the server clamps to 1…200 rather than
   * rejecting out-of-range values.
   */
  limit?: number
  /**
   * The `nextCursor` from the previous page. Omit for the first page.
   *
   * A single call returns at most one page — to walk a whole library, keep
   * passing `nextCursor` back while `hasMore` is true.
   */
  cursor?: string | null
}

export interface GetTranscriptionOptions {
  /** Convex document ID. */
  id?: string
  /** The requestId returned from `transcribe()`. */
  requestId?: string
}

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

export interface TranscribeResult {
  requestId: string
  status: 'submitted'
  message: string
}

export interface DuplicateResult {
  duplicate: true
  message: string
  transcription: {
    id: string
    status: TranscriptionStatus
    transcription: string | null
    createdAt: number
  }
}

export interface VideoStats {
  likes: number | null
  views: number | null
  comments: number | null
}

export interface Segment {
  start: number
  end: number
  text: string
}

export interface Transcription {
  id: string
  requestId: string | null
  url: string
  platform: Platform | null
  status: TranscriptionStatus
  transcription: string | null
  createdAt: number
  completedAt: number | null
  caption: string | null
  hashtags: string[] | null
  mentions: string[] | null
  owner: string | null
  duration: number | null
  stats: VideoStats | null
  segments: Segment[] | null
  thumbnailUrl: string | null
  videoTimestamp: string | null
  errorMessage: string | null
  errorType: string | null
}

/** One page of transcriptions. */
export interface TranscriptionList {
  /** This page's rows, newest first. At most `limit` (default 100, max 200). */
  transcriptions: Transcription[]
  /**
   * The length of `transcriptions` — **this page only, not your library total**.
   *
   * The API deliberately does not report a library total: counting every row is
   * exactly the read that pagination exists to avoid. Use `hasMore` to decide
   * whether to fetch again, never `total`.
   */
  total: number
  /** Pass to `listTranscriptions({ cursor })` for the next page. `null` when exhausted. */
  nextCursor: string | null
  /** True while further pages remain. */
  hasMore: boolean
}

/**
 * Legacy retention mode.
 *
 * @deprecated Kept for compatibility with older clients. Nothing is deleted on
 * any plan (the 30-day retention policy was retracted on 2026-10-26), so every
 * mode, including `rolling` and `lapsing`, describes a policy that no longer
 * runs. Do not branch on it.
 */
export type RetentionMode = 'unlimited' | 'rolling' | 'lapsing'

/**
 * Legacy retention object. The API still returns it so older clients keep
 * working, but it no longer describes real behavior: nothing is deleted on any
 * plan. Ignore every field, `deletesAfter` in particular.
 *
 * @deprecated Kept for compatibility only.
 */
export interface RetentionInfo {
  /** @deprecated Kept for compatibility. Nothing is deleted on any plan. */
  mode: RetentionMode
  /**
   * @deprecated Ignore this. Nothing is deleted on any plan, so no deletion
   * date applies even if this is set.
   */
  deletesAfter: number | null
  /** @deprecated Kept for compatibility. Nothing is deleted on any plan. */
  retentionDays: number
  /** @deprecated Kept for compatibility. Nothing is deleted on any plan. */
  policyDate: number
}

export interface Credits {
  credits: number
  tier: Tier
  subscriptionStatus: string | null
  /**
   * Completed transcriptions currently stored, probed up to 2,000.
   * See `storageUsedCapped`.
   */
  storageUsed: number
  /** True when the real figure is above the probe, i.e. `storageUsed` is a floor. */
  storageUsedCapped: boolean
  /**
   * Always `-1` ("no limit").
   *
   * @deprecated Retained only so 1.x callers keep compiling. There is no
   * storage cap on any tier and nothing rejects an upload on count.
   */
  storageLimit: -1
  /**
   * Legacy field, returned for older clients. Nothing is deleted on any plan.
   *
   * @deprecated Ignore it, including `deletesAfter`.
   */
  retention: RetentionInfo
}

export interface Settings {
  /**
   * Legacy field, returned for older clients. There are no writable settings,
   * and nothing is deleted on any plan.
   *
   * @deprecated Ignore it, including `deletesAfter`.
   */
  retention: RetentionInfo
}

export interface HealthCheck {
  healthy: boolean
  timestamp: string
}

// ---------------------------------------------------------------------------
// Error
// ---------------------------------------------------------------------------

export interface ApiErrorBody {
  code: string
  message: string
  status: number
}

// ---------------------------------------------------------------------------
// Client options
// ---------------------------------------------------------------------------

export interface ReelScribeOptions {
  /** Override the base URL (default: `https://reelscribe.app`). */
  baseUrl?: string
  /** Override the global `fetch` implementation. */
  fetch?: typeof globalThis.fetch
}
