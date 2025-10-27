// Merkezi tip tanımları
export interface BaseEntity {
  id: number;
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    pages: number;
  };
}

export interface FilterOptions {
  search?: string;
  page?: number;
  per_page?: number;
  [key: string]: any;
}

// Form durumları
export type FormMode = 'create' | 'edit' | 'view';

// Modal props için temel interface
export interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: FormMode;
}

// Tablo props için temel interface
export interface BaseTableProps<T> {
  items: T[];
  loading?: boolean;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  onToggleStatus?: (item: T) => void;
}

export interface SocialMediaChannel {
  id: number;
  name: string;
  platform: string;
  type: string;
  channel_id: string;
  chat_id: string;
  channel_username?: string;
  member_count: number;
  is_active: boolean;
  telegram_bot_id?: number;
  brand_id: number;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  avatar_url?: string;
  last_post_at?: string;
  brand_name?: string;
  last_activity?: string;
}