import React from "react";
import { useEffect } from "react";
import { useLoaderData, useParams, Link } from "@tanstack/react-router"; // Removed useNavigate
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, SubmitHandler } from "react-hook-form";
import {
  Campaign,
  CampaignUpdateRequest,
  Content,
  ErrorResponse,
  API_BASE_URL,
} from "../types/api";
import { FaEdit, FaTrash, FaPlus } from "react-icons/fa";

import { ToastProvider, useToast } from "../components/ToastProvider";

import "../styles/theme.css"; // Ensure this path is correct
// --- API Functions ---

// Update campaign details
const updateCampaign = async ({
  id,
  data,
}: {
  id: number;
  data: CampaignUpdateRequest;
}): Promise<Campaign> => {
  const response = await fetch(`${API_BASE_URL}/v1/campaign/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorData: ErrorResponse = await response
      .json()
      .catch(() => ({ message: "Unknown error updating campaign" }));
    throw new Error(
      errorData.message || `HTTP error! status: ${response.status}`
    );
  }
  const result: { campaign: Campaign } = await response.json();
  return result.campaign;
};

// Delete content
const deleteContent = async (contentId: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/v1/content/${contentId}`, {
    method: "DELETE",
  });
  if (!response.ok && response.status !== 204) {
    const errorData: ErrorResponse = await response
      .json()
      .catch(() => ({ message: "Unknown error deleting content" }));
    throw new Error(
      errorData.message || `HTTP error! status: ${response.status}`
    );
  }
};

// --- Component Implementation ---

// Define the expected shape of the loader data
interface CampaignFormInputs {
  name: string;
  active: boolean;
}

// Content Thumbnail Component
const ContentThumbnail: React.FC<{ content: Content }> = ({ content }) => {
  const [imageError, setImageError] = React.useState(false);

  const getImageUrl = () => {
    if (!imageError && content.image_url) {
      return `${API_BASE_URL}${content.image_url}`;
    }
    return content.external_url || null;
  };

  const imageUrl = getImageUrl();

  return imageUrl ? (
    <img
      src={imageUrl}
      alt={content.title}
      className="w-10 h-10 object-cover rounded"
      onError={() => setImageError(true)}
    />
  ) : (
    <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
      <span className="text-gray-400 text-xs">No image</span>
    </div>
  );
};

const CampaignDetailPage: React.FC = () => {
  const { campaignId } = useParams({ from: "/campaigns/$campaignId" });
  const { showToast } = useToast();
  const id = Number(campaignId);

  // Use the loader data instead of a separate query
  const { campaign, content: campaignContent } = useLoaderData({
    from: "/campaigns/$campaignId",
  }) as { campaign: Campaign; content: Content[] };

  console.log(
    "Campaign Detail Page Loaded with ID:",
    id,
    "Campaign Data:",
    campaign,
    "Content Data:",
    campaignContent
  );
  const queryClient = useQueryClient();

  // Form setup for editing campaign details
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm<CampaignFormInputs>({
    defaultValues: {
      name: campaign?.name ?? "",
      active: campaign?.active ?? false,
    },
    values: { name: campaign?.name ?? "", active: campaign?.active ?? false },
  });

  // Mutation for updating the campaign
  const updateMutation = useMutation<
    Campaign,
    Error,
    { id: number; data: CampaignUpdateRequest }
  >({
    mutationFn: updateCampaign,
    onSuccess: (updatedCampaign) => {
      queryClient.setQueryData(["campaign", id], updatedCampaign);
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      reset({ name: updatedCampaign.name, active: updatedCampaign.active });
      console.log("Campaign updated successfully");
    },
    onError: (error) => {
      console.error("Update failed:", error.message);
    },
  });

  // Mutation for deleting content
  const deleteContentMutation = useMutation<void, Error, number>({
    mutationFn: deleteContent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content", "all"] });
      console.log("Content deleted successfully");
    },
    onError: (error) => {
      console.error("Failed to delete content:", error.message);
    },
  });

  // Handler for submitting campaign update form
  const onCampaignSubmit: SubmitHandler<CampaignFormInputs> = (data) => {
    updateMutation.mutate({ id, data });
  };

  // Handler for deleting content
  const handleContentDelete = (contentId: number, title: string) => {
    if (window.confirm(`Are you sure you want to delete content "${title}"?`)) {
      deleteContentMutation.mutate(contentId);
    }
  };

  // useEffect(() => {
  //   if (deleteContentMutation.isError) {
  //     showToast(
  //       "error",
  //       deleteContentMutation.error?.message || "Failed to delete content."
  //     );
  //   }
  // }, [deleteContentMutation.isError]);

  return (
    <div className="space-y-8">
      {/* Campaign Edit Form */}
      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8">
        <h1 className="text-2xl font-bold text-gray-700 mb-6">
          Edit Campaign: {campaign.name} (ID: {campaignId})
        </h1>

        {updateMutation.isError && (
          <div
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
            role="alert"
          >
            <strong className="font-bold">Update Error: </strong>
            <span className="block sm:inline">
              {updateMutation.error?.message || "Failed to update campaign."}
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit(onCampaignSubmit)} className="space-y-4">
          <div className="flex items-center gap-4">
            <label
              htmlFor="name"
              className="text-gray-700 text-sm font-bold w-1/4 text-left"
            >
              Campaign Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              {...register("name", { required: "Campaign name is required" })}
              className={`shadow appearance-none border ${
                errors.name ? "border-red-500" : "border-gray-200"
              } rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline flex-grow`}
              disabled={isSubmitting || updateMutation.isPending}
            />
          </div>
          {errors.name && (
            <p className="text-red-500 text-xs italic mt-1 ml-1/4">
              {errors.name.message}
            </p>
          )}

          <div className="flex items-center gap-4">
            <label
              htmlFor="active"
              className="text-gray-700 text-sm font-bold w-1/4 text-left"
            >
              Status
            </label>
            <div className="flex items-center gap-2">
              <input
                id="active"
                type="checkbox"
                {...register("active")}
                className="rounded h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 shadow-sm"
                disabled={isSubmitting || updateMutation.isPending}
              />
              <span className="text-sm text-gray-700">Active</span>
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 ease-in-out"
              disabled={isSubmitting || updateMutation.isPending || !isDirty}
            >
              {isSubmitting || updateMutation.isPending
                ? "Saving..."
                : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={() => reset()}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 ease-in-out"
              disabled={!isDirty || isSubmitting || updateMutation.isPending}
            >
              Cancel Changes
            </button>
          </div>
        </form>
      </div>

      {/* Content Management Section */}
      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-l font-semibold text-gray-700">
            Content Management
          </h2>
          <Link
            to="/campaigns/$campaignId/content/new"
            params={{ campaignId }}
            search={{}}
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-1 rounded focus:outline-none focus:shadow-outline inline-flex items-center transition duration-150 ease-in-out"
          >
            <FaPlus className="mr-1" /> Add New Content
          </Link>
        </div>

        {deleteContentMutation.isError && (
          <div
            className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg flex items-center space-x-2 animate-fade-in animate-shimmer"
            role="alert"
          >
            <span className="text-lg">❌</span>
            <div>
              <strong className="font-bold">Delete Error: </strong>
              <span>
                {deleteContentMutation.error?.message ||
                  "Failed to delete content."}
              </span>
            </div>
          </div>
        )}

        {/* Content Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full leading-normal">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-5 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Preview
                </th>
                <th className="px-5 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-5 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-5 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-5 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {campaignContent && campaignContent.length > 0 ? (
                campaignContent.map((content: Content) => (
                  <tr key={content.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4 border-b border-gray-200 bg-white">
                      <ContentThumbnail content={content} />
                    </td>
                    <td className="px-5 py-4 border-b border-gray-200 bg-white text-sm text-black text-left">
                      {content.id}
                    </td>
                    <td className="px-5 py-4 border-b border-gray-200 bg-white text-sm text-black text-left">
                      {content.title}
                    </td>
                    <td className="px-5 py-4 border-b border-gray-200 bg-white text-sm text-black text-left">
                      {content.content_type}
                    </td>
                    <td className="px-5 py-4 border-b border-gray-200 bg-white text-sm text-black text-left">
                      <Link
                        // Point to the 'edit' route path pattern defined in routes.tsx
                        to="/campaigns/$campaignId/content/$contentId/edit"
                        // Ensure params are strings
                        params={{
                          campaignId: campaignId,
                          contentId: content.id,
                        }}
                        className="text-indigo-600 hover:text-indigo-900 mr-3 inline-flex items-center"
                        title="Edit Content"
                      >
                        <FaEdit className="mr-1" /> Edit
                      </Link>
                      <button
                        onClick={() =>
                          handleContentDelete(content.id, content.title)
                        }
                        className="text-red-600 hover:text-red-900 inline-flex items-center"
                        title="Delete Content"
                        // Explicitly ensure variables is treated as number if type inference fails
                        disabled={
                          deleteContentMutation.isPending &&
                          Number(deleteContentMutation.variables) === content.id
                        }
                      >
                        {deleteContentMutation.isPending &&
                        Number(deleteContentMutation.variables) ===
                          content.id ? (
                          "Deleting..."
                        ) : (
                          <>
                            <FaTrash className="mr-1" /> Delete
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-5 border-b border-gray-200 bg-white text-sm text-center text-gray-500"
                  >
                    No content found for this campaign.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CampaignDetailPage;
