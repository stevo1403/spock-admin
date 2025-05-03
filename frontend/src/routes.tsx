import {
  createRootRoute,
  createRoute,
  createRouter,
  NotFoundRoute,
  // Removed unused redirect
} from "@tanstack/react-router";
import { QueryClient, queryOptions } from "@tanstack/react-query";
import App from "./App";
import CampaignListPage from "./pages/CampaignListPage";
import CampaignDetailPage from "./pages/CampaignDetailPage";
import CampaignCreatePage from "./pages/CampaignCreatePage";
import ContentFormPage, { ContentCreatePage, ContentEditPage } from "./pages/ContentFormPage";
import { 
  Campaign,
  ErrorResponse,
  Content,
  ContentListResponse,
  API_BASE_URL,
} from "./types/api";

// --- API Fetching Functions ---

// Fetches a single campaign by ID
const fetchCampaignById = async (campaignId: number): Promise<Campaign> => {
  const response = await fetch(`${API_BASE_URL}/v1/campaign/${campaignId}`);
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Campaign with ID ${campaignId} not found`);
    }
    const errorData: ErrorResponse = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }
  const data: { campaign: Campaign } = await response.json();
  return data.campaign;
};

// Add new fetch functions
const fetchActiveCampaign = async (): Promise<Campaign> => {
  const response = await fetch(`${API_BASE_URL}/v1/campaigns/active`);
  if (!response.ok) {
    const errorData: ErrorResponse = await response.json().catch(() => ({ message: "Unknown error fetching active campaign" }));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }
  const data: { campaign: Campaign } = await response.json();
  return data.campaign;
};

const fetchCampaignContent = async (campaignId: number): Promise<Content[]> => {
  const response = await fetch(`${API_BASE_URL}/v1/campaign/${campaignId}/content`);
  if (!response.ok) {
    const errorData: ErrorResponse = await response.json().catch(() => ({ message: "Unknown error fetching campaign content" }));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }
  const data: ContentListResponse = await response.json();
  return data.contents || [];
};

// Fetches all content
const fetchAllContent = async (): Promise<Content[]> => {
  const response = await fetch(`${API_BASE_URL}/v1/content`);
  if (!response.ok) {
    const errorData: ErrorResponse = await response.json().catch(() => ({ message: "Unknown error fetching content" }));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }
  const data: ContentListResponse = await response.json();
  return data.contents || [];
};

// Fetches a single content item by ID
const fetchContentById = async (contentId: number): Promise<Content> => {
  const response = await fetch(`${API_BASE_URL}/v1/content/${contentId}`);
  if (!response.ok) {
    if (response.status === 404) {
       throw new Error(`Content with ID ${contentId} not found`);
    }
    const errorData: ErrorResponse = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }
  const data: { content: Content } = await response.json();
  return data.content;
};


// --- Query Options (for prefetching/loading) ---

const campaignQueryOptions = (campaignId: number) => queryOptions({
  queryKey: ['campaign', campaignId],
  queryFn: () => fetchCampaignById(campaignId),
});

const allContentQueryOptions = queryOptions({
    queryKey: ['content', 'all'],
    queryFn: fetchAllContent,
});

// Specific content query - might be useful for direct fetching or cache updates
const contentQueryOptions = (contentId: number) => queryOptions({
    queryKey: ['content', 'detail', contentId],
    queryFn: () => fetchContentById(contentId),
});

// Add new query options
const activeCampaignQueryOptions = queryOptions({
  queryKey: ['campaign', 'active'],
  queryFn: fetchActiveCampaign,
});

const campaignContentQueryOptions = (campaignId: number) => queryOptions({
  queryKey: ['campaign', campaignId, 'content'],
  queryFn: () => fetchCampaignContent(campaignId),
});

// Reusable QueryClient instance
const queryClient = new QueryClient();

// --- Route Definitions ---

const rootRoute = createRootRoute({
  component: App,
});

const campaignListRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: CampaignListPage,
});

const campaignCreateRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/campaigns/new",
  component: CampaignCreatePage,
});

// Base route for campaign details - loads campaign and ALL content
const campaignDetailBaseRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/campaigns/$campaignId",
  // Parse campaignId to number
  parseParams: (params: { campaignId: string }) => ({
    campaignId: parseInt(params.campaignId, 10),
  }),
  // Removed loaderDeps: Loader automatically re-runs when path params change.
  // Loader uses the correctly typed number campaignId
  loader: async ({ params: { campaignId } }) => {
    console.log(`Loading data for campaign: ${campaignId}`);
    if (isNaN(campaignId)) {
        throw new Error("Invalid campaign ID provided");
    }
    const [campaign, campaignContent] = await Promise.all([
      queryClient.ensureQueryData(campaignQueryOptions(campaignId)),
      queryClient.ensureQueryData(campaignContentQueryOptions(campaignId))
    ]);
    return {
      campaign,
      content: campaignContent // Keep the same property name for compatibility
    };
  },
  errorComponent: ({ error }) => {
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      return <div className="text-red-600 p-4">Error loading campaign details: {message}</div>;
  },
});

// Index route for campaign details page
const campaignDetailIndexRoute = createRoute({
    getParentRoute: () => campaignDetailBaseRoute,
    path: '/',
    component: CampaignDetailPage,
});

// Route for content creation with a campaign ID in the path
const contentCreateRoute = createRoute({
  getParentRoute: () => campaignDetailBaseRoute, 
  path: "content/new", // Relative path
  parseParams: () => ({}), // No additional parameters
  loader: ({ params: { campaignId } }) => {
    if (isNaN(campaignId)) {
      throw new Error("Invalid campaign ID provided in content creation route");
    }
    return { campaignId }; // Pass the campaignId from query params
  },
  component: ContentCreatePage, // Use the create-specific component
});

// Route for editing content
const contentEditRoute = createRoute({
  getParentRoute: () => campaignDetailBaseRoute, // Nested under campaign detail
  path: "content/$contentId/edit", // Relative path
  // Parse only contentId to number. campaignId is inherited numerically from parent.
  parseParams: (params: { contentId: string }) => ({ // Corrected: Only contentId is in the raw params for this route
      contentId: parseInt(params.contentId, 10),
  }),
  // Removed loaderDeps: Loader automatically re-runs when path params change.
  // Loader receives merged params: { campaignId: number, contentId: number }
  loader: async ({ params: { contentId } }) => { // contentId is number here
    console.log(`Looking for content ${contentId} in cache...`);
    if (isNaN(contentId)) { // Added NaN check for contentId
        throw new Error("Invalid content ID provided");
    }
    // Attempt to get all content from cache first (should be loaded by parent)
    const allContent = queryClient.getQueryData<Content[]>(allContentQueryOptions.queryKey);
    const content = allContent?.find(c => c.id === contentId);

    if (content) {
        console.log(`Found content ${contentId} in cache.`);
        queryClient.setQueryData(['content', 'detail', contentId], content);
        return { content };
    } else {
        // If not found in cache (e.g., direct navigation), fetch it directly
        console.log(`Content ${contentId} not in cache, fetching directly...`);
        try {
            const fetchedContent = await queryClient.ensureQueryData(contentQueryOptions(contentId));
            return { content: fetchedContent };
        } catch (error) {
            console.error("Error fetching content directly:", error);
            if (error instanceof Error && error.message.includes("not found")) {
                throw new Error(`Content with ID ${contentId} not found`);
            }
            throw new Error(`Failed to load content ${contentId}`);
        }
    }
  },
   errorComponent: ({ error }) => {
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      return <div className="text-red-600 p-4">Error loading content: {message}</div>;
  },
  component: ContentEditPage, // Use the edit-specific component
});

// Index route for content details page - Use a placeholder component for now
const contentDetailIndexRoute = createRoute({
  getParentRoute: () => campaignDetailBaseRoute,
  path: "content/$contentId",  // Relative path to parent
  parseParams: (params: { contentId: string }) => ({ 
    contentId: parseInt(params.contentId, 10),
  }),
  loader: async ({ params: { contentId } }) => {
    console.log(`Looking for content ${contentId} in cache...`);
    if (isNaN(contentId)) {
      throw new Error("Invalid content ID provided");
    }
    const allContent = queryClient.getQueryData<Content[]>(allContentQueryOptions.queryKey);
    const content = allContent?.find(c => c.id === contentId);

    if (content) {
      console.log(`Found content ${contentId} in cache.`);
      queryClient.setQueryData(['content', 'detail', contentId], content);
      return { content };
    } else {
      console.log(`Content ${contentId} not in cache, fetching directly...`);
      try {
        const fetchedContent = await queryClient.ensureQueryData(contentQueryOptions(contentId));
        return { content: fetchedContent };
      } catch (error) {
        console.error("Error fetching content directly:", error);
        if (error instanceof Error && error.message.includes("not found")) {
          throw new Error(`Content with ID ${contentId} not found`);
        }
        throw new Error(`Failed to load content ${contentId}`);
      }
    }
  },
  errorComponent: ({ error }) => {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    return <div className="text-red-600 p-4">Error loading content: {message}</div>;
  },
  component: () => <div>Content Detail View - Placeholder</div>, // Changed component here
});


// Not found route
const notFoundRoute = new NotFoundRoute({
    getParentRoute: () => rootRoute,
    component: () => <div className="p-4 text-center">Page Not Found</div>,
});


// Route tree
const routeTree = rootRoute.addChildren([
  campaignListRoute,
  campaignCreateRoute,
  campaignDetailBaseRoute.addChildren([
      campaignDetailIndexRoute,
      contentCreateRoute,
      contentDetailIndexRoute,
      contentEditRoute,
  ]),
]);

// Router instance
export const router = createRouter({
    routeTree,
    notFoundRoute,
    context: {
        queryClient, // Provide queryClient in context
    }
});

// Register router types
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
