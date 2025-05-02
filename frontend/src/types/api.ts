

export const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

/**
 * Types based on backend/openapi.json definitions
 */

// From #/definitions/Campaign
export interface Campaign {
  id: number;
  name: string;
  active?: boolean; // Optional based on schema
}

// From #/definitions/CampaignListResponse
export interface CampaignListResponse {
  campaigns?: Campaign[]; // Optional based on schema
}

// From #/definitions/CampaignCreateRequest
export interface CampaignCreateRequest {
  name: string;
  active?: boolean;
}

// From #/definitions/CampaignUpdateRequest
export interface CampaignUpdateRequest {
  name?: string;
  active?: boolean;
}

// From #/definitions/Content
export interface Content {
  id: number;
  title: string;
  content_type: string;
  campaign_id?: number | null;
  description?: string | null;
  subtitle?: string | null;
  button_text?: string | null;
  button_link?: string | null;
  start_date?: string | null; // Assuming ISO date string
  end_date?: string | null; // Assuming ISO date string
  external_url?: string | null;
  image_filename?: string | null;
  image_path?: string | null;
  image_url?: string | null;
  // Note: 'order' might be missing from the Content definition, but present in create/update
  // If it should be part of Content, add: order: number;
}

// From #/definitions/ContentListResponse
export interface ContentListResponse {
  contents?: Content[]; // Optional based on schema
}

// From #/definitions/ContentCreateRequest
export interface ContentCreateRequest {
  title: string;
  content_type: string;
  campaign_id: number; // Required for creation within a campaign
  order: number;
  description?: string | null;
  subtitle?: string | null;
  button_text?: string | null;
  button_link?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  external_url?: string | null;
}

// From #/definitions/ContentUpdateRequest
export interface ContentUpdateRequest {
  title?: string | null;
  content_type?: string;
  campaign_id?: number | null;
  order?: number | null;
  description?: string | null;
  subtitle?: string | null;
  button_text?: string | null;
  button_link?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  external_url?: string | null;
  image_filename?: string | null;
  image_path?: string | null;
  image_url?: string | null;
}

// From #/definitions/ErrorResponse
export interface ErrorResponse {
  message: string;
  error?: string | null;
}
