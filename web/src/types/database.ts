// Hand-maintained mirror of the live schema (table renames landed in
// migration 025: madha→tracks, madiheen→artists, ruwat→authors, and the
// *_id columns followed). Keep the keys here in sync with what the code
// actually queries — a missing entry makes supabase-js resolve the whole
// query to `never`, which is how stale entries get caught by `pnpm
// type-check`. Regenerating via `supabase gen types` would replace this.
export type Database = {
  public: {
    Tables: {
      tracks: {
        Row: Madha;
        Insert: MadhaInsert;
        Update: Partial<MadhaInsert>;
        Relationships: [];
      };
      artists: {
        Row: Madih;
        Insert: MadihInsert;
        Update: Partial<MadihInsert>;
        Relationships: [];
      };
      authors: {
        Row: Rawi;
        Insert: RawiInsert;
        Update: Partial<RawiInsert>;
        Relationships: [];
      };
      turuq: {
        Row: Tariqa;
        Insert: TariqaInsert;
        Update: Partial<TariqaInsert>;
        Relationships: [];
      };
      funun: {
        Row: Fan;
        Insert: FanInsert;
        Update: Partial<FanInsert>;
        Relationships: [];
      };
      collections: {
        Row: Collection;
        Insert: CollectionInsert;
        Update: Partial<CollectionInsert>;
        Relationships: [];
      };
      collection_items: {
        Row: CollectionItem;
        Insert: CollectionItemInsert;
        Update: Partial<CollectionItemInsert>;
        Relationships: [];
      };
      user_profiles: {
        Row: UserProfile;
        Insert: UserProfileInsert;
        Update: Partial<UserProfileInsert>;
        Relationships: [];
      };
      user_roles: {
        Row: UserRole;
        Insert: UserRoleInsert;
        Update: Partial<UserRoleInsert>;
        Relationships: [];
      };
      user_favorites: {
        Row: UserFavorite;
        Insert: UserFavoriteInsert;
        Update: Partial<UserFavoriteInsert>;
        Relationships: [];
      };
      user_plays: {
        Row: UserPlay;
        Insert: UserPlayInsert;
        Update: Partial<UserPlayInsert>;
        Relationships: [];
      };
      // listening_history table removed — use v_recent_listens view instead
      pending_imports: {
        Row: PendingImport;
        Insert: PendingImportInsert;
        Update: Partial<PendingImportInsert>;
        Relationships: [];
      };
      hero_images: {
        Row: HeroImage;
        Insert: HeroImageInsert;
        Update: Partial<HeroImageInsert>;
        Relationships: [];
      };
      track_curation: {
        Row: TrackCuration;
        Insert: TrackCurationUpsert;
        Update: Partial<TrackCurationUpsert>;
        Relationships: [];
      };
      track_reviews: {
        Row: TrackReview;
        Insert: Partial<TrackReview> & { track_id: string; decision: "approved" | "rejected" };
        Update: Partial<TrackReview>;
        Relationships: [];
      };
      // Written via the record_lyrics_view RPC; read by analytics only.
      lyrics_views: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      user_follows: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
    };
    Views: {
      /** Public read view — approved tracks only, joined with relations. */
      v_tracks: { Row: MadhaWithRelations; Relationships: [] };
      /** Admin view — all statuses + curation columns (RLS gates rows). */
      v_tracks_admin: { Row: MadhaWithRelations; Relationships: [] };
      v_artists: { Row: Madih & { track_count: number }; Relationships: [] };
      v_narrators: { Row: Rawi & { track_count: number }; Relationships: [] };
      v_recent_listens: {
        Row: { user_id: string; track_id: string; listened_at: string };
        Relationships: [];
      };
      /** user_plays minus internal users (see migration 036). */
      v_user_plays_external: { Row: UserPlay; Relationships: [] };
      v_user_favorites_external: { Row: UserFavorite; Relationships: [] };
      v_download_events_external: { Row: Record<string, unknown>; Relationships: [] };
    };
    Functions: {
      get_trending_tracks: { Args: { days_window: number; max_results: number }; Returns: Madha[] };
      get_collection_tracks: { Args: { p_collection_id: string }; Returns: Madha[] };
      get_home_data: { Args: { p_limit: number }; Returns: unknown };
      // Stats RPCs return one JSON blob each; shapes live in analytics.ts.
      get_stats_overview: { Args: Record<string, unknown>; Returns: unknown };
      get_completion_stats: { Args: Record<string, unknown>; Returns: unknown };
      get_lyrics_stats: { Args: Record<string, unknown>; Returns: unknown };
      is_admin_or_superuser: { Args: Record<string, never>; Returns: boolean };
      record_lyrics_view: { Args: Record<string, unknown>; Returns: unknown };
      search_all: { Args: Record<string, unknown>; Returns: unknown };
    };
  };
};

// ============================================
// Status enums
// ============================================

// "internal" = staff-only; "hidden" = temporarily pulled. Only "approved"
// reaches end users (enforced by v_tracks' WHERE clause). See migration 051.
export type ApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "internal"
  | "hidden";
export type ImportStatus = "pending" | "processing" | "completed" | "failed" | "rejected";
export type UserRoleType = "superuser" | "admin" | "user";

// ============================================
// Madha (المدحة - main content)
// ============================================

export type Madha = {
  id: string;
  title: string;
  madih: string;
  writer: string | null;
  artist_id: string | null;
  author_id: string | null;
  audio_url: string | null;
  image_url: string | null;
  thumbnail_url: string | null;
  uploader_id: string | null;
  status: ApprovalStatus;
  needs_processing: boolean;
  source_url: string | null;
  lyrics: string | null;
  recording_place: string | null;
  tariqa_id: string | null;
  fan_id: string | null;
  play_count: number;
  duration_seconds: number | null;
  file_size_bytes: number | null;
  content_type: ContentType | null;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

export type ContentType = "madha" | "quran" | "lecture" | "dhikr" | "inshad";

export const CONTENT_TYPES: { value: ContentType; label: string; icon: string }[] = [
  { value: "madha", label: "مدحة", icon: "🎵" },
  { value: "quran", label: "قرآن", icon: "📖" },
  { value: "lecture", label: "درس", icon: "🎓" },
  { value: "dhikr", label: "ذكر", icon: "📿" },
  { value: "inshad", label: "إنشاد", icon: "🎤" },
];

export type MadhaInsert = {
  title: string;
  madih: string;
  writer?: string | null;
  artist_id?: string | null;
  author_id?: string | null;
  audio_url?: string | null;
  image_url?: string | null;
  uploader_id?: string | null;
  status?: ApprovalStatus;
  needs_processing?: boolean;
  source_url?: string | null;
  lyrics?: string | null;
  recording_place?: string | null;
  tariqa_id?: string | null;
  fan_id?: string | null;
  duration_seconds?: number | null;
  content_type?: ContentType | null;
  thumbnail_url?: string | null;
}

// ============================================
// Track curation (migration 054) — admin-only editorial state, 1:1 with
// tracks, lazily created. A missing row means unreviewed / unrated (the
// v_tracks_admin view coalesces the defaults).
// ============================================

export type LyricsStatus = "unreviewed" | "needs_work" | "reviewed";
export type AudioQuality = "excellent" | "good" | "poor";

export type TrackCuration = {
  track_id: string;
  lyrics_status: LyricsStatus;
  audio_quality: AudioQuality | null;
  notes: string | null;
  updated_by: string | null;
  updated_at: string;
}

export type TrackCurationUpsert = {
  track_id: string;
  lyrics_status?: LyricsStatus;
  audio_quality?: AudioQuality | null;
  notes?: string | null;
  updated_by?: string | null;
}

// Append-only moderation log (migration 051). One row per review action.
// Not yet wired into a promote-to-approve flow — tracks.status is still the
// source of truth for current state.
export type TrackReview = {
  id: string;
  track_id: string;
  reviewer_id: string | null;
  decision: "approved" | "rejected";
  notes: string | null;
  created_at: string;
}

// ============================================
// Madiheen (المادحين - performers)
// ============================================

export type Madih = {
  id: string;
  name: string;
  status: ApprovalStatus;
  bio: string | null;
  image_url: string | null;
  birth_year: number | null;
  death_year: number | null;
  is_verified: boolean;
  tariqa_id: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  created_by: string | null;
}

export type MadihInsert = {
  name: string;
  status?: ApprovalStatus;
  bio?: string | null;
  image_url?: string | null;
  birth_year?: number | null;
  death_year?: number | null;
  is_verified?: boolean;
  tariqa_id?: string | null;
  created_by?: string | null;
}

// ============================================
// Ruwat (الرواة - narrators/writers)
// ============================================

export type Rawi = {
  id: string;
  name: string;
  status: ApprovalStatus;
  bio: string | null;
  image_url: string | null;
  birth_year: number | null;
  death_year: number | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  created_by: string | null;
}

export type RawiInsert = {
  name: string;
  status?: ApprovalStatus;
  bio?: string | null;
  image_url?: string | null;
  birth_year?: number | null;
  death_year?: number | null;
  created_by?: string | null;
}

// ============================================
// Turuq (الطرق الصوفية - Sufi orders)
// ============================================

export type Tariqa = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export type TariqaInsert = {
  name: string;
  description?: string | null;
}

// ============================================
// Funun (الفنون - taar tones/music styles)
// ============================================

export type Fan = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export type FanInsert = {
  name: string;
  description?: string | null;
}

// ============================================
// Collections (المجموعات)
// ============================================

export type Collection = {
  id: string;
  name: string;
  name_en: string | null;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  created_by: string | null;
}

export type CollectionInsert = {
  name: string;
  name_en?: string | null;
  description?: string | null;
  image_url?: string | null;
  is_active?: boolean;
  display_order?: number;
  created_by?: string | null;
}

export type CollectionItem = {
  collection_id: string;
  track_id: string;
  position: number;
  added_at: string;
}

export type CollectionItemInsert = {
  collection_id: string;
  track_id: string;
  position?: number;
}

// ============================================
// Hero Images (صور الواجهة)
// ============================================

export type HeroImage = {
  id: string;
  image_url: string;
  title: string | null;
  link_url: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export type HeroImageInsert = {
  image_url: string;
  title?: string | null;
  link_url?: string | null;
  is_active?: boolean;
  display_order?: number;
}

// ============================================
// User Profiles
// ============================================

export type UserProfile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  country: string;
  city: string | null;
  tariqa_id: string | null;
  email_notifications: boolean;
  /** Staff flag — rows excluded from analytics (migration 036). */
  is_internal: boolean;
  created_at: string;
  last_active_at: string | null;
}

export type UserProfileInsert = {
  id: string;
  display_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  country?: string;
  city?: string | null;
  tariqa_id?: string | null;
  email_notifications?: boolean;
}

// ============================================
// User Roles
// ============================================

export type UserRole = {
  id: string;
  user_id: string;
  role: UserRoleType;
  created_at: string;
}

export type UserRoleInsert = {
  user_id: string;
  role: UserRoleType;
}

// ============================================
// User Favorites
// ============================================

export type UserFavorite = {
  id: string;
  user_id: string;
  track_id: string;
  created_at: string;
}

export type UserFavoriteInsert = {
  user_id: string;
  track_id: string;
}

// ============================================
// User Plays (analytics)
// ============================================

export type UserPlay = {
  id: string;
  user_id: string | null;
  track_id: string;
  played_at: string;
  duration_seconds: number | null;
  completed: boolean;
  device_type: string | null;
}

export type UserPlayInsert = {
  /** Client-generated UUID so related events can link pre-insert. */
  id?: string;
  user_id?: string | null;
  track_id: string;
  played_at?: string;
  duration_seconds?: number | null;
  completed?: boolean;
  device_type?: string | null;
}

// ListeningHistory table removed — listening history is now derived
// from user_plays via the v_recent_listens database view.

// ============================================
// Pending Imports
// ============================================

export type PendingImport = {
  id: string;
  youtube_url: string;
  title: string;
  artist_id: string | null;
  madih_name: string | null;
  author_id: string | null;
  rawi_name: string | null;
  submitted_by: string;
  status: ImportStatus;
  error_message: string | null;
  created_at: string;
  processed_at: string | null;
  madha_id: string | null;
}

export type PendingImportInsert = {
  youtube_url: string;
  title: string;
  artist_id?: string | null;
  madih_name?: string | null;
  author_id?: string | null;
  rawi_name?: string | null;
  submitted_by: string;
  status?: ImportStatus;
  error_message?: string | null;
  madha_id?: string | null;
}

// ============================================
// Joined query types (for common queries with relations)
// ============================================

export type MadhaWithRelations = Madha & {
  madiheen?: Madih | null;
  ruwat?: Rawi | null;
  turuq?: Tariqa | null;
  funun?: Fan | null;
  // Curation state — only present on v_tracks_admin reads (migration 054).
  lyrics_status?: LyricsStatus;
  audio_quality?: AudioQuality | null;
  curation_notes?: string | null;
}

export type CollectionWithItems = Collection & {
  collection_items?: (CollectionItem & { madha: Madha })[];
}
