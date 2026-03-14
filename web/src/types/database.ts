export type Database = {
  public: {
    Tables: {
      madha: {
        Row: Madha;
        Insert: MadhaInsert;
        Update: Partial<MadhaInsert>;
      };
      madiheen: {
        Row: Madih;
        Insert: MadihInsert;
        Update: Partial<MadihInsert>;
      };
      ruwat: {
        Row: Rawi;
        Insert: RawiInsert;
        Update: Partial<RawiInsert>;
      };
      turuq: {
        Row: Tariqa;
        Insert: TariqaInsert;
        Update: Partial<TariqaInsert>;
      };
      funun: {
        Row: Fan;
        Insert: FanInsert;
        Update: Partial<FanInsert>;
      };
      collections: {
        Row: Collection;
        Insert: CollectionInsert;
        Update: Partial<CollectionInsert>;
      };
      collection_items: {
        Row: CollectionItem;
        Insert: CollectionItemInsert;
        Update: Partial<CollectionItemInsert>;
      };
      user_profiles: {
        Row: UserProfile;
        Insert: UserProfileInsert;
        Update: Partial<UserProfileInsert>;
      };
      user_roles: {
        Row: UserRole;
        Insert: UserRoleInsert;
        Update: Partial<UserRoleInsert>;
      };
      user_favorites: {
        Row: UserFavorite;
        Insert: UserFavoriteInsert;
        Update: Partial<UserFavoriteInsert>;
      };
      user_plays: {
        Row: UserPlay;
        Insert: UserPlayInsert;
        Update: Partial<UserPlayInsert>;
      };
      listening_history: {
        Row: ListeningHistory;
        Insert: ListeningHistoryInsert;
        Update: Partial<ListeningHistoryInsert>;
      };
      pending_imports: {
        Row: PendingImport;
        Insert: PendingImportInsert;
        Update: Partial<PendingImportInsert>;
      };
    };
  };
};

// ============================================
// Status enums
// ============================================

export type ApprovalStatus = "pending" | "approved" | "rejected";
export type ImportStatus = "pending" | "processing" | "completed" | "failed" | "rejected";
export type UserRoleType = "superuser" | "admin" | "user";

// ============================================
// Madha (المدحة - main content)
// ============================================

export interface Madha {
  id: string;
  title: string;
  madih: string;
  writer: string | null;
  madih_id: string | null;
  rawi_id: string | null;
  audio_url: string | null;
  image_url: string | null;
  user_id: string | null;
  status: ApprovalStatus;
  needs_processing: boolean;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  source_url: string | null;
  lyrics: string | null;
  recording_place: string | null;
  tariqa_id: string | null;
  fan_id: string | null;
  play_count: number;
  duration_seconds: number | null;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface MadhaInsert {
  title: string;
  madih: string;
  writer?: string | null;
  madih_id?: string | null;
  rawi_id?: string | null;
  audio_url?: string | null;
  image_url?: string | null;
  user_id?: string | null;
  status?: ApprovalStatus;
  needs_processing?: boolean;
  rejection_reason?: string | null;
  source_url?: string | null;
  lyrics?: string | null;
  recording_place?: string | null;
  tariqa_id?: string | null;
  fan_id?: string | null;
  duration_seconds?: number | null;
}

// ============================================
// Madiheen (المادحين - performers)
// ============================================

export interface Madih {
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

export interface MadihInsert {
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

export interface Rawi {
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

export interface RawiInsert {
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

export interface Tariqa {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface TariqaInsert {
  name: string;
  description?: string | null;
}

// ============================================
// Funun (الفنون - taar tones/music styles)
// ============================================

export interface Fan {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface FanInsert {
  name: string;
  description?: string | null;
}

// ============================================
// Collections (المجموعات)
// ============================================

export interface Collection {
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

export interface CollectionInsert {
  name: string;
  name_en?: string | null;
  description?: string | null;
  image_url?: string | null;
  is_active?: boolean;
  display_order?: number;
  created_by?: string | null;
}

export interface CollectionItem {
  collection_id: string;
  madha_id: string;
  position: number;
  added_at: string;
}

export interface CollectionItemInsert {
  collection_id: string;
  madha_id: string;
  position?: number;
}

// ============================================
// User Profiles
// ============================================

export interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  country: string;
  city: string | null;
  tariqa_id: string | null;
  email_notifications: boolean;
  created_at: string;
  last_active_at: string | null;
}

export interface UserProfileInsert {
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

export interface UserRole {
  id: string;
  user_id: string;
  role: UserRoleType;
  created_at: string;
}

export interface UserRoleInsert {
  user_id: string;
  role: UserRoleType;
}

// ============================================
// User Favorites
// ============================================

export interface UserFavorite {
  id: string;
  user_id: string;
  madha_id: string;
  created_at: string;
}

export interface UserFavoriteInsert {
  user_id: string;
  madha_id: string;
}

// ============================================
// User Plays (analytics)
// ============================================

export interface UserPlay {
  id: string;
  user_id: string | null;
  madha_id: string;
  played_at: string;
  duration_seconds: number | null;
  completed: boolean;
  device_type: string | null;
}

export interface UserPlayInsert {
  user_id?: string | null;
  madha_id: string;
  duration_seconds?: number | null;
  completed?: boolean;
  device_type?: string | null;
}

// ============================================
// Listening History
// ============================================

export interface ListeningHistory {
  id: string;
  user_id: string;
  madha_id: string;
  listened_at: string;
}

export interface ListeningHistoryInsert {
  user_id: string;
  madha_id: string;
}

// ============================================
// Pending Imports
// ============================================

export interface PendingImport {
  id: string;
  youtube_url: string;
  title: string;
  madih_id: string | null;
  madih_name: string | null;
  rawi_id: string | null;
  rawi_name: string | null;
  submitted_by: string;
  status: ImportStatus;
  error_message: string | null;
  created_at: string;
  processed_at: string | null;
  madha_id: string | null;
}

export interface PendingImportInsert {
  youtube_url: string;
  title: string;
  madih_id?: string | null;
  madih_name?: string | null;
  rawi_id?: string | null;
  rawi_name?: string | null;
  submitted_by: string;
  status?: ImportStatus;
  error_message?: string | null;
  madha_id?: string | null;
}

// ============================================
// Joined query types (for common queries with relations)
// ============================================

export interface MadhaWithRelations extends Madha {
  madiheen?: Madih | null;
  ruwat?: Rawi | null;
  turuq?: Tariqa | null;
  funun?: Fan | null;
}

export interface CollectionWithItems extends Collection {
  collection_items?: (CollectionItem & { madha: Madha })[];
}
