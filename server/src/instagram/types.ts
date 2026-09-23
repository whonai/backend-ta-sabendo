/** Contratos da camada de coleta — independentes de Instagrapi / OCR concreto. */

export type InstagramProfileInfo = {
  username: string;
  fullName?: string;
  biography?: string;
  profilePicUrl?: string;
  externalUrl?: string;
};

export type InstagramMediaType = 'image' | 'video';

export type InstagramStoryItem = {
  mediaId: string;
  username: string;
  mediaType: InstagramMediaType;
  mediaUrl: string;
  thumbnailUrl?: string;
  timestamp: string;
  permalink?: string;
};

export type InstagramPostItem = {
  mediaId: string;
  username: string;
  mediaType: InstagramMediaType;
  mediaUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  timestamp: string;
  permalink?: string;
};

export type InstagramSearchUserItem = {
  username: string;
  fullName?: string;
  profilePicUrl?: string;
};

export interface InstagramAdapter {
  getProfile(username: string): Promise<InstagramProfileInfo>;
  getStories(username: string): Promise<InstagramStoryItem[]>;
  getPosts(username: string, limit?: number): Promise<InstagramPostItem[]>;
  searchUsers(query: string, limit?: number): Promise<InstagramSearchUserItem[]>;
}

export type StoryProcessingStatus =
  | 'NEW'
  | 'PROCESSING'
  | 'PROCESSED'
  | 'IGNORED'
  | 'ERROR';

export type PipelineErrorStage =
  | 'COLLECTION_ERROR'
  | 'OCR_ERROR'
  | 'EVENT_EXTRACTION_ERROR';

export type ExtractedEventDraft = {
  title: string | null;
  description: string | null;
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  price: number | null;
  venue: string | null;
  artist: string | null;
  /** Nomes extraídos do OCR (show, com, listas). */
  artists?: string[];
  category: string | null;
  source: 'instagram';
  sourceUrl: string | null;
  establishmentId: string;
};

export type EventExtractionResult =
  | {
      isEvent: true;
      confidence: number;
      event: ExtractedEventDraft;
      incompleteFields: string[];
    }
  | {
      isEvent: false;
      confidence: number;
      reason?: string;
    };

export type OcrResult = {
  text: string;
  confidence?: number;
  engine?: string;
};

export interface OcrService {
  extractTextFromImage(imagePath: string): Promise<OcrResult>;
}
