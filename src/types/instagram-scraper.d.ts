import { InstagramScraper } from '@aduptive/instagram-scraper';

// Add more specific types for Instagram post data
export interface InstagramPost {
  id: string;
  shortcode?: string;
  display_url?: string;
  image_url?: string;
  url?: string;
  caption?: string;
  timestamp?: number;
  likes_count?: number;
  comments_count?: number;
  is_video?: boolean;
  video_url?: string;
  location?: {
    name?: string;
    id?: string;
  };
  owner?: {
    id?: string;
    username?: string;
  };
}

export interface ScraperResult {
  success: boolean;
  posts?: InstagramPost[];
  error?: string;
  message?: string;
}

// Extend the original InstagramScraper interface if needed
declare module '@aduptive/instagram-scraper' {
  interface InstagramScraper {
    getPosts(username: string, count?: number): Promise<ScraperResult>;
  }
} 