export type CaptureType = "article" | "video" | "pdf" | "image" | "github";

export type Capture = {
  id: string;
  user_id: string;
  url: string;
  title: string | null;
  type: CaptureType | null;
  description: string | null;
  thumbnail_url: string | null;
  content: string | null;
  summary: string | null;
  category_id: string | null;
  category: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
};

export type Category = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type User = {
  id: string;
  email: string;
};

export type AuthResponse = {
  user: User;
  accessToken: string;
  refreshToken: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
};

export type SearchMode = "keyword" | "semantic" | "hybrid";
export type SortOrder = "newest" | "oldest";
