/** Supported video platforms. */
export type Platform = 'instagram' | 'tiktok' | 'youtube'

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
  /** Instagram, TikTok, or YouTube URL (max 2048 chars). */
  url: string
  /** Optional HTTPS webhook URL — receives a POST when the job finishes. */
  resumeUrl?: string
}

export interface ListTranscriptionsOptions {
  /** Filter by status. */
  status?: TranscriptionStatus
}

export interface GetTranscriptionOptions {
  /** Convex document ID. */
  id?: string
  /** The requestId returned from `transcribe()`. */
  requestId?: string
}

export interface UpdateSettingsOptions {
  /** Enable or disable automatic storage pruning. */
  autoPruneStorage: boolean
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

export interface TranscriptionList {
  transcriptions: Transcription[]
  total: number
}

export interface Credits {
  credits: number
  tier: Tier
  subscriptionStatus: string | null
  storageUsed: number
  storageLimit: number
}

export interface Settings {
  autoPruneStorage: boolean
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
  /** Override the base URL (default: `https://www.reelscribe.app`). */
  baseUrl?: string
  /** Override the global `fetch` implementation. */
  fetch?: typeof globalThis.fetch
}
