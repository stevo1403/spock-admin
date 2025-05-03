import React from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate, useLoaderData, Link } from "@tanstack/react-router";
import {
  Content,
  ContentCreateRequest,
  ContentUpdateRequest,
  ErrorResponse,
  API_BASE_URL,
} from "../types/api";
import "../styles/theme.css";

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

// Upload Content Image
const uploadContentImage = async (contentId: number, file: File): Promise<Content> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/v1/content/${contentId}/image`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    const errorData: ErrorResponse = await response.json().catch(() => ({ message: "Unknown error uploading image" }));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }
  const result: { content: Content } = await response.json();
  return result.content;
};

// --- Component Implementation ---

// Define the expected form input structure
type ContentFormInputs = {
  title: string;
  content_type: string;
  order: number;
  description?: string;
  subtitle?: string;
  button_text?: string;
  button_link?: string;
  start_date?: string;
  end_date?: string;
  external_url?: string;
};

// Helper to format Date objects to YYYY-MM-DDTHH:mm string for datetime-local input
const formatDateForInput = (dateString: string | null | undefined): string => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch (e) {
    console.error("Error formatting date:", dateString, e);
    return "";
  }
};

// Base form component that will be used by both create and edit components
const ContentFormBase: React.FC<{
  isEditing: boolean;
  campaignId: number;
  campaignIdStr: string;
  initialValues?: Content;
  contentId?: number;
}> = ({ isEditing, campaignId, campaignIdStr, initialValues, contentId }) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = React.useState<string | null>(
    initialValues?.image_url ? `${API_BASE_URL}${initialValues.image_url}` : null
  );

  const { register, handleSubmit, formState: { errors, isSubmitting, isDirty } } = useForm<ContentFormInputs>({
    defaultValues: {
      title: "",
      content_type: "",
      order: 0,
      description: "",
      subtitle: "",
      button_text: "",
      button_link: "",
      start_date: "",
      end_date: "",
      external_url: "",
    },
    values: isEditing && initialValues ? {
      title: initialValues.title,
      content_type: initialValues.content_type,
      order: initialValues.order ?? 0,
      description: initialValues.description ?? "",
      subtitle: initialValues.subtitle ?? "",
      button_text: initialValues.button_text ?? "",
      button_link: initialValues.button_link ?? "",
      start_date: formatDateForInput(initialValues.start_date),
      end_date: formatDateForInput(initialValues.end_date),
      external_url: initialValues.external_url ?? "",
    } : undefined,
  });

  const mutationOptions = {
    onSuccess: (savedContent: Content) => {
      queryClient.invalidateQueries({ queryKey: ['content', 'all'] });
      queryClient.setQueryData(['content', 'detail', savedContent.id], savedContent);
      navigate({ to: "/campaigns/$campaignId", params: { campaignId: Number(campaignIdStr) }, replace: true });
    },
    onError: (error: Error) => {
      console.error(`Failed to ${isEditing ? 'update' : 'create'} content:`, error.message);
    },
  };

  const createMutation = useMutation<Content, Error, ContentCreateRequest>({
    mutationFn: createContent,
    ...mutationOptions,
  });

  const updateMutation = useMutation<Content, Error, { id: number; data: ContentUpdateRequest }>({
    mutationFn: updateContent,
    ...mutationOptions,
  });

  const onSubmit: SubmitHandler<ContentFormInputs> = async (data) => {
    const payload = {
      ...data,
      start_date: data.start_date ? new Date(data.start_date).toISOString() : null,
      end_date: data.end_date ? new Date(data.end_date).toISOString() : null,
      campaign_id: campaignId,
    };

    try {
      let savedContent: Content;
      if (isEditing && contentId) {
        savedContent = await updateMutation.mutateAsync({ id: contentId, data: payload });
      } else {
        savedContent = await createMutation.mutateAsync(payload as ContentCreateRequest);
      }

      // Upload image if selected
      if (selectedFile && savedContent.id) {
        await uploadContentImage(savedContent.id, selectedFile);
      }

      mutationOptions.onSuccess(savedContent);
    } catch (error) {
      console.error('Error saving content or uploading image:', error);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Create preview URL
      setCurrentImageUrl(URL.createObjectURL(file));
    }
  };

  return (
    <div className="min-h-screen p-8 theme-gradient-bg">
      <div className="max-w-2xl mx-auto theme-glass-container px-8 pt-6 pb-8 mb-4">
        <h1 className="text-2xl font-bold theme-text mb-6">
          {isEditing ? `Edit Content (ID: ${contentId})` : "Create New Content"} for Campaign {campaignIdStr}
        </h1>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-6 p-4 rounded-xl bg-white/5 backdrop-blur-sm">
            <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
              <label className="theme-text text-sm font-medium text-left">Title *</label>
              <div className="flex flex-col">
                <input
                  {...register("title", { required: "Title is required" })}
                  className="theme-glass-input"
                />
                {errors.title && <p className="theme-text-error text-xs mt-1">{errors.title.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
              <label className="theme-text text-sm font-medium text-left">Content Type *</label>
                <div className="flex flex-col">
                <select
                  {...register("content_type", { required: "Content type is required" })}
                  className="theme-glass-input"
                >
                  <option value="" className="text-black">Select Content Type</option>
                  <option value="card" className="text-black">Card</option>
                  <option value="banner" className="text-black">Banner</option>
                  <option value="image" className="text-black" selected>Image</option>
                  <option value="modal" className="text-black">Modal</option>
                </select>
                {errors.content_type && <p className="theme-text-error text-xs mt-1">{errors.content_type.message}</p>}
                </div>
            </div>

            <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
              <label className="theme-text text-sm font-medium text-left">Order *</label>
              <div className="flex flex-col">
              <input
                type="number"
                {...register("order", { required: "Order is required", valueAsNumber: true })}
                className="theme-glass-input"
              />
              {errors.order && <p className="theme-text-error text-xs mt-1">{errors.order.message}</p>}
              <p className="text-gray-400 text-xs mt-1 text-left">This number determines the display order of content items. Lower numbers appear first. No two content/slide/item can have the same order.</p>
              </div>
            </div>

            <div className="grid grid-cols-[200px_1fr] gap-4 items-start">
              <label className="theme-text text-sm font-medium text-left pt-2">Description</label>
              <textarea
                {...register("description")}
                className="theme-glass-input"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
              <label className="theme-text text-sm font-medium text-left">Subtitle</label>
              <input
                {...register("subtitle")}
                className="theme-glass-input"
              />
            </div>

            <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
              <label className="theme-text text-sm font-medium text-left">Button Text</label>
              <input
                {...register("button_text")}
                className="theme-glass-input"
              />
            </div>

            <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
              <label className="theme-text text-sm font-medium text-left">Button Link</label>
              <input
                {...register("button_link")}
                className="theme-glass-input"
              />
            </div>

            <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
              <label className="theme-text text-sm font-medium text-left">External URL</label>
              <input
                {...register("external_url")}
                className="theme-glass-input"
              />
            </div>

            <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
              <label className="theme-text text-sm font-medium text-left">Start Date</label>
              <input
                type="datetime-local"
                {...register("start_date")}
                className="theme-glass-input"
              />
            </div>

            <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
              <label className="theme-text text-sm font-medium text-left">End Date</label>
              <input
                type="datetime-local"
                {...register("end_date")}
                className="theme-glass-input"
              />
            </div>

            <div className="grid grid-cols-[200px_1fr] gap-4 items-start">
              <label className="theme-text text-sm font-medium text-left">Image</label>
              <div className="flex flex-col gap-2">
                {currentImageUrl && (
                  <img 
                    src={currentImageUrl} 
                    alt="Content preview" 
                    className="max-w-xs rounded-lg shadow-lg"
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="theme-glass-input pt-1"
                />
              </div>
            </div>

          </div>
          
          <div className="flex items-center justify-between pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="theme-glass-button"
            >
              {isSubmitting ? 'Saving...' : (isEditing ? 'Update' : 'Create')}
            </button>
            <Link
              to="/campaigns/$campaignId"
              params={{ campaignId: Number(campaignIdStr) }}
              className="theme-text hover:text-white font-medium text-sm hover:underline transition-colors duration-200"
            >
              Cancel
            </Link>
          </div>
          {isDirty && <p className="theme-text-warning text-xs italic">You have unsaved changes</p>}
        </form>
      </div>
    </div>
  );
};

// Create content component
const ContentCreatePage: React.FC = () => {
  const params = useParams({ from: "/campaigns/$campaignId/content/new" });
  const { campaignId: campaignIdStr } = params || {};
  const campaignId = Number(campaignIdStr);
  
  if (isNaN(campaignId)) {
    return <div className="text-red-600 p-4">Error: Invalid campaign ID</div>;
  }

  return (
    <ContentFormBase 
      isEditing={false} 
      campaignId={campaignId} 
      campaignIdStr={campaignId.toString()}
    />
  );
};

// Edit content component
const ContentEditPage: React.FC = () => {
  const params = useParams({ from: "/campaigns/$campaignId/content/$contentId/edit" });
  const { campaignId: campaignIdStr, contentId: contentIdStr } = params || {};
  const campaignId = Number(campaignIdStr);
  const contentId = Number(contentIdStr);
  
  const loaderData = useLoaderData({ from: "/campaigns/$campaignId/content/$contentId/edit" }) as { content?: Content } | undefined;
  const existingContent = loaderData?.content;
  
  if (isNaN(campaignId) || isNaN(contentId)) {
    return <div className="text-red-600 p-4">Error: Invalid campaign or content ID</div>;
  }
  
  if (!existingContent) {
    return <div className="text-red-600 p-4">Error: Content data not found. It might have been deleted.</div>;
  }

  return (
    <ContentFormBase 
      isEditing={true} 
      campaignId={campaignId} 
      campaignIdStr={Number(campaignIdStr).toString()}
      initialValues={existingContent}
      contentId={contentId}
    />
  );
};

// Export both components
export { ContentCreatePage, ContentEditPage };

const ContentFormPage: React.FC = () => {
  const editParams = useParams({ from: "/campaigns/$campaignId/content/$contentId/edit" });
  
  if (editParams?.contentId) {
    return <ContentEditPage />;
  }
  
  return <ContentCreatePage />;
};

export default ContentFormPage;
