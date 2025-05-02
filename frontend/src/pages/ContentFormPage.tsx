import React from "react";
import { useForm, SubmitHandler } from "react-hook-form"; // Removed Controller
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate, useLoaderData, Link } from "@tanstack/react-router";
import {
  Content,
  ContentCreateRequest,
  ContentUpdateRequest,
  ErrorResponse,
  API_BASE_URL,
} from "../types/api";

// --- API Functions ---

// Create Content
const createContent = async (data: ContentCreateRequest): Promise<Content> => {
  const response = await fetch(`${API_BASE_URL}/v1/content`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorData: ErrorResponse = await response.json().catch(() => ({ message: "Unknown error creating content" }));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }
  const result: { content: Content } = await response.json();
  return result.content;
};

// Update Content
const updateContent = async ({ id, data }: { id: number; data: ContentUpdateRequest }): Promise<Content> => {
  const response = await fetch(`${API_BASE_URL}/v1/content/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorData: ErrorResponse = await response.json().catch(() => ({ message: "Unknown error updating content" }));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }
  const result: { content: Content } = await response.json();
  return result.content;
};

// --- Component Implementation ---

// Define the expected form input structure
// Match this closely with ContentCreateRequest & ContentUpdateRequest
type ContentFormInputs = {
  title: string;
  content_type: string; // Consider using a select dropdown
  order: number;
  description?: string;
  subtitle?: string;
  button_text?: string;
  button_link?: string;
  start_date?: string; // Use string for date input, convert if needed
  end_date?: string;
  external_url?: string;
  // campaign_id is handled separately via route param
};

// Helper to format Date objects to YYYY-MM-DDTHH:mm string for datetime-local input
// Or just YYYY-MM-DD for date input
// Adjust based on the actual input type you choose
const formatDateForInput = (dateString: string | null | undefined): string => {
    if (!dateString) return "";
    try {
        // Assuming the date string is ISO 8601 format from the backend
        const date = new Date(dateString);
        // Format for datetime-local input: YYYY-MM-DDTHH:mm
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        // If you use <input type="date">, use: `${year}-${month}-${day}`
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch (e) {
        console.error("Error formatting date:", dateString, e);
        return ""; // Return empty string if formatting fails
    }
};

const ContentFormPage: React.FC = () => {
  // Get campaignId and contentId from validated route parameters
  const params = useParams();
  // For create route, contentId won't be present
  // campaignId from params is a string, contentId might be undefined or string
  const { campaignId: campaignIdStr, contentId: contentIdStr } = params;
  const campaignId = Number(campaignIdStr); // Convert campaignId to number
  const contentId = contentIdStr ? Number(contentIdStr) : undefined; // Convert contentId to number if present
  const isEditing = contentId !== undefined;

  // Get pre-loaded content data if editing
  // Type assertion needed as loader data structure depends on the route matched
  const loaderData = useLoaderData() as { content?: Content, campaignId?: number } | undefined; // Adjust type based on ALL loaders using this component
  const existingContent = loaderData?.content;

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // --- Form Setup ---
  // Removed control, reset from destructuring
  const { register, handleSubmit, formState: { errors, isSubmitting, isDirty } } = useForm<ContentFormInputs>({
    defaultValues: {
      title: "",
      content_type: "", // Maybe default to a common type?
      order: 0,
      description: "",
      subtitle: "",
      button_text: "",
      button_link: "",
      start_date: "",
      end_date: "",
      external_url: "",
    },
    // Populate form with existing data if editing
    values: isEditing && existingContent ? {
        title: existingContent.title,
        content_type: existingContent.content_type,
        // Handle potential missing order field based on API definition
        order: (existingContent as any).order ?? 0, // Use any if order isn't strictly typed in Content
        description: existingContent.description ?? "",
        subtitle: existingContent.subtitle ?? "",
        button_text: existingContent.button_text ?? "",
        button_link: existingContent.button_link ?? "",
        start_date: formatDateForInput(existingContent.start_date),
        end_date: formatDateForInput(existingContent.end_date),
        external_url: existingContent.external_url ?? "",
    } : undefined,
  });

  // --- Mutations ---
  const mutationOptions = {
    onSuccess: (savedContent: Content) => {
      console.log(`Content ${isEditing ? 'updated' : 'created'}:`, savedContent);
      // Invalidate the 'all content' list to ensure CampaignDetailPage updates
      queryClient.invalidateQueries({ queryKey: ['content', 'all'] });
      // Update the specific content cache entry
      queryClient.setQueryData(['content', 'detail', savedContent.id], savedContent);
      // TODO: Add success notification
      // Navigate back to the campaign detail page
      navigate({ to: "/campaigns/$campaignId", params: { campaignId: campaignIdStr }, replace: true }); // Use string param for navigation
    },
    onError: (error: Error) => {
      console.error(`Failed to ${isEditing ? 'update' : 'create'} content:`, error.message);
      // Error is displayed via mutation.error below
      // TODO: Add error notification (toast)
    },
  };

  const createMutation = useMutation<Content, Error, ContentCreateRequest>(
    {
      mutationFn: createContent,
      ...mutationOptions,
    }
  );

  const updateMutation = useMutation<Content, Error, { id: number; data: ContentUpdateRequest }>(
    {
      mutationFn: updateContent,
      ...mutationOptions,
    }
  );

  // --- Submission Handler ---
  const onSubmit: SubmitHandler<ContentFormInputs> = (data) => {
    // Convert date strings to ISO format or null if empty, required by backend
    const startDateISO = data.start_date ? new Date(data.start_date).toISOString() : null;
    const endDateISO = data.end_date ? new Date(data.end_date).toISOString() : null;

    const payload = {
        ...data,
        // Ensure nullable fields are sent as null if empty
        description: data.description || null,
        subtitle: data.subtitle || null,
        button_text: data.button_text || null,
        button_link: data.button_link || null,
        external_url: data.external_url || null,
        start_date: startDateISO,
        end_date: endDateISO,
        order: Number(data.order) || 0, // Ensure order is a number
    };

    if (isEditing) {
      console.log("Updating content with:", payload);
      // Type assertion needed if ContentUpdateRequest differs significantly
      updateMutation.mutate({ id: contentId!, data: payload as ContentUpdateRequest });
    } else {
      console.log("Creating content with:", payload);
      const createPayload: ContentCreateRequest = {
        ...payload,
        campaign_id: campaignId, // Use numeric campaignId for creation payload
      };
      createMutation.mutate(createPayload);
    }
  };

  const mutationInProgress = createMutation.isPending || updateMutation.isPending; // Changed isLoading to isPending
  const mutationError = createMutation.error || updateMutation.error;

  // If editing and the loader didn't find content (e.g., invalid ID in URL)
  if (isEditing && !existingContent && !loaderData) {
      // This state might occur briefly if loader fails, route errorComponent should ideally catch this.
      return <div className="text-red-600 p-4">Error: Content data not found. It might have been deleted.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
      <h1 className="text-2xl font-bold text-gray-700 mb-6">
        {isEditing ? `Edit Content (ID: ${contentId})` : "Create New Content"} for Campaign {campaignIdStr}
      </h1>

      {mutationError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{mutationError.message || "Failed to save content."}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Title Field */}
        <div>
          <label htmlFor="title" className="block text-gray-700 text-sm font-bold mb-2">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            {...register("title", { required: "Title is required" })}
            className={`input-field ${errors.title ? 'border-red-500' : 'border-gray-300'}`}
            disabled={mutationInProgress}
          />
          {errors.title && <p className="error-text">{errors.title.message}</p>}
        </div>

        {/* Content Type Field */}
        <div>
          <label htmlFor="content_type" className="block text-gray-700 text-sm font-bold mb-2">
            Content Type <span className="text-red-500">*</span>
          </label>
          {/* TODO: Consider replacing with a <select> dropdown with predefined types */}
          <input
            id="content_type"
            {...register("content_type", { required: "Content type is required" })}
            className={`input-field ${errors.content_type ? 'border-red-500' : 'border-gray-300'}`}
            disabled={mutationInProgress}
            placeholder="e.g., banner, notification, article"
          />
          {errors.content_type && <p className="error-text">{errors.content_type.message}</p>}
        </div>

        {/* Order Field */}
        <div>
          <label htmlFor="order" className="block text-gray-700 text-sm font-bold mb-2">
            Order
          </label>
          <input
            id="order"
            type="number"
            {...register("order", { valueAsNumber: true, min: { value: 0, message: "Order must be non-negative" } })}
            className={`input-field ${errors.order ? 'border-red-500' : 'border-gray-300'}`}
            disabled={mutationInProgress}
          />
          {errors.order && <p className="error-text">{errors.order.message}</p>}
        </div>

        {/* Subtitle Field */}
        <div>
          <label htmlFor="subtitle" className="block text-gray-700 text-sm font-bold mb-2">Subtitle</label>
          <input
            id="subtitle"
            {...register("subtitle")}
            className="input-field border-gray-300"
            disabled={mutationInProgress}
          />
        </div>

        {/* Description Field */}
        <div>
          <label htmlFor="description" className="block text-gray-700 text-sm font-bold mb-2">Description</label>
          <textarea
            id="description"
            {...register("description")}
            rows={3}
            className="input-field border-gray-300"
            disabled={mutationInProgress}
          />
        </div>

        {/* Button Text Field */}
        <div>
          <label htmlFor="button_text" className="block text-gray-700 text-sm font-bold mb-2">Button Text</label>
          <input
            id="button_text"
            {...register("button_text")}
             className="input-field border-gray-300"
             disabled={mutationInProgress}
          />
        </div>

        {/* Button Link Field */}
        <div>
          <label htmlFor="button_link" className="block text-gray-700 text-sm font-bold mb-2">Button Link URL</label>
          <input
            id="button_link"
             type="url"
            {...register("button_link")}
             className="input-field border-gray-300"
             disabled={mutationInProgress}
             placeholder="https://example.com"
          />
        </div>

        {/* External URL Field */}
        <div>
          <label htmlFor="external_url" className="block text-gray-700 text-sm font-bold mb-2">External URL</label>
          <input
            id="external_url"
             type="url"
            {...register("external_url")}
             className="input-field border-gray-300"
             disabled={mutationInProgress}
             placeholder="https://external-link.com"
          />
        </div>

        {/* Start Date Field */}
        <div>
          <label htmlFor="start_date" className="block text-gray-700 text-sm font-bold mb-2">Start Date/Time</label>
          <input
            id="start_date"
            type="datetime-local" // Use datetime-local for date and time
            {...register("start_date")}
            className="input-field border-gray-300"
            disabled={mutationInProgress}
          />
        </div>

        {/* End Date Field */}
        <div>
          <label htmlFor="end_date" className="block text-gray-700 text-sm font-bold mb-2">End Date/Time</label>
          <input
            id="end_date"
            type="datetime-local"
            {...register("end_date")}
            className="input-field border-gray-300"
            disabled={mutationInProgress}
          />
           {/* TODO: Add validation: end_date must be after start_date */}
        </div>

        {/* Image Fields (Placeholder - requires file handling logic) */}
        {/*
        <div className="p-4 border border-dashed border-gray-300 rounded mt-4">
            <p className="text-sm text-gray-500">Image Upload (Not Implemented)</p>
            {isEditing && existingContent?.image_url && (
                <div className="mt-2">
                    <p className="text-xs">Current Image:</p>
                    <img src={existingContent.image_url} alt="Current content image" className="max-h-20 mt-1"/>
                </div>
            )}
             Add file input and upload logic here
        </div>
        */}

        {/* Submit/Cancel Buttons */}
        <div className="flex items-center justify-between mt-6">
          <button
            type="submit"
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50 transition duration-150 ease-in-out"
            // Re-added isSubmitting check for form-level state, combined with mutation state
            disabled={isSubmitting || mutationInProgress || (isEditing && !isDirty)} 
          >
            {/* Display 'Saving...' based on mutation state, not form state */}
            {mutationInProgress ? "Saving..." : (isEditing ? "Save Changes" : "Create Content")}
          </button>
          <Link
             to="/campaigns/$campaignId"
             params={{ campaignId: campaignIdStr }} // Use original string param for Link
             className="inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
};

// Add helper CSS classes (or define in index.css/App.css)
const InputFieldStyles = `
  .input-field {
    @apply shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline;
  }
  .error-text {
    @apply text-red-500 text-xs italic mt-1;
  }
`;

// Inject styles (alternative: add to global CSS)
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = InputFieldStyles;
document.head.appendChild(styleSheet);


export default ContentFormPage;
