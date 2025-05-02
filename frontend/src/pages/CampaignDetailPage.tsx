import React, { useMemo } from "react";
import { useLoaderData, useParams, Link } from "@tanstack/react-router"; // Removed useNavigate
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, SubmitHandler } from "react-hook-form";
import { Campaign, CampaignUpdateRequest, Content, ErrorResponse } from "../types/api";
import { FaEdit, FaTrash, FaPlus } from "react-icons/fa";
import { API_BASE_URL } from "../types/api";

// --- API Functions ---

// Update campaign details
const updateCampaign = async ({ id, data }: { id: number; data: CampaignUpdateRequest }): Promise<Campaign> => {
  const response = await fetch(`${API_BASE_URL}/v1/campaign/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorData: ErrorResponse = await response.json().catch(() => ({ message: "Unknown error updating campaign" }));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
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
        const errorData: ErrorResponse = await response.json().catch(() => ({ message: "Unknown error deleting content" }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
};

// --- Component Implementation ---

// Define the expected shape of the loader data
interface CampaignDetailLoaderData {
  campaign: Campaign;
  allContent: Content[];
}

interface CampaignFormInputs {
  name: string;
  active: boolean;
}

const CampaignDetailPage: React.FC = () => {
  // Explicitly type the loader data using the interface
  const loaderData = useLoaderData({ from: '/campaigns/$campaignId/' }) as CampaignDetailLoaderData | undefined;
  const initialCampaignData = loaderData?.campaign;
  const allContent = loaderData?.allContent;

  const params = useParams({ from: '/campaigns/$campaignId' }); // Get string ID from validated params
  const campaignIdStr = params.campaignId;
  const campaignId = Number(campaignIdStr); // Convert to number for internal use

  const queryClient = useQueryClient();

  // Get the latest campaign data from the query cache, falling back to loader data
  const { data: campaign } = useQuery<Campaign, Error, Campaign>({
      queryKey: ['campaign', campaignId],
      // Corrected fallback object to match Campaign interface
      initialData: initialCampaignData ?? { id: campaignId, name: 'Loading...', active: false } 
  });

  // Filter content specific to this campaign
  const campaignContent = useMemo(() => {
      return allContent?.filter((content: Content) => content.campaign_id === campaignId) || [];
  }, [allContent, campaignId]);

  // Form setup for editing campaign details
  const { register, handleSubmit, formState: { errors, isSubmitting, isDirty }, reset } = useForm<CampaignFormInputs>({
    defaultValues: {
      name: campaign?.name ?? "",
      active: campaign?.active ?? false,
    },
    // Reset form if campaign data changes (e.g., after successful mutation)
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
      queryClient.setQueryData(['campaign', campaignId], updatedCampaign);
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      reset({ name: updatedCampaign.name, active: updatedCampaign.active });
      console.log("Campaign updated successfully");
      // TODO: Add success notification
    },
    onError: (error) => {
      console.error("Update failed:", error.message);
      // TODO: Add error notification
    },
  });

  // Mutation for deleting content
  const deleteContentMutation = useMutation<void, Error, number>({
      mutationFn: deleteContent,
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['content', 'all'] });
          console.log("Content deleted successfully");
          // TODO: Add success notification
      },
      onError: (error) => {
          console.error("Failed to delete content:", error.message);
          // TODO: Add error notification
      },
  });

  // Handler for submitting campaign update form
  const onCampaignSubmit: SubmitHandler<CampaignFormInputs> = (data) => {
    console.log("Updating campaign with:", data);
    updateMutation.mutate({ id: campaignId, data }); // Use numeric campaignId
  };

  // Handler for deleting content
  const handleContentDelete = (id: number, title: string) => {
      if (window.confirm(`Are you sure you want to delete content "${title}"?`)) {
          deleteContentMutation.mutate(id);
      }
  };

  // UseQuery manages the loading state, campaign should have initialData
  if (!campaign && !initialCampaignData) {
      return <div>Loading campaign data...</div>; // Or show error component if query failed
  }

  // Use campaign from useQuery which is kept up-to-date
  const currentCampaign = campaign || initialCampaignData;

  return (
    <div className="space-y-8">
      {/* Campaign Edit Form */}
      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8">
        <h1 className="text-2xl font-bold text-gray-700 mb-6">Edit Campaign: {currentCampaign?.name} (ID: {campaignIdStr})</h1>

        {updateMutation.isError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <strong className="font-bold">Update Error: </strong>
            <span className="block sm:inline">{updateMutation.error?.message || "Failed to update campaign."}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onCampaignSubmit)} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">
              Campaign Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              {...register("name", { required: "Campaign name is required" })}
              className={`shadow appearance-none border ${errors.name ? 'border-red-500' : 'border-gray-200'} rounded py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:shadow-outline`}
              disabled={isSubmitting || updateMutation.isPending}
            />
            {errors.name && <p className="text-red-500 text-xs italic mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">Status</label>
            {/* <label htmlFor="active" className="inline-flex items-center mt-1"> */}
              <input
                id="active"
                type="checkbox"
                {...register("active")}
                className="rounded h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 shadow-sm"
                disabled={isSubmitting || updateMutation.isPending}
              />
              <span className="ml-2 text-sm text-gray-700">Active</span>
            {/* </label> */}
          </div>

          <div className="flex items-center gap-4">
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 ease-in-out"
              disabled={isSubmitting || updateMutation.isPending || !isDirty}
            >
              {isSubmitting || updateMutation.isPending ? "Saving..." : "Save Changes"}
            </button>
             <button
                type="button"
                onClick={() => reset()} // Reset to original values
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
          <h2 className="text-l font-semibold text-gray-700">Content Management</h2>
          <Link
            to="/campaigns/$campaignId/content/new"
            params={{ campaignId: campaignIdStr }}
            search={{}} // Added empty search object to satisfy types
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-1 rounded focus:outline-none focus:shadow-outline inline-flex items-center transition duration-150 ease-in-out"
          >
            <FaPlus className="mr-1"/> Add New Content
          </Link>
        </div>

         {deleteContentMutation.isError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <strong className="font-bold">Delete Error: </strong>
            <span className="block sm:inline">{deleteContentMutation.error?.message || "Failed to delete content."}</span>
          </div>
        )}

        {/* Content Table */}  
        <div className="overflow-x-auto">
           <table className="min-w-full leading-normal">
             <thead>
              <tr className="bg-gray-100">
                 <th className="px-5 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ID</th>
                 <th className="px-5 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Title</th>
                 <th className="px-5 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
                 <th className="px-5 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
               </tr>
             </thead>
             <tbody>
               {campaignContent.length > 0 ? (
                 campaignContent.map((content: Content) => (
                   <tr key={content.id} className="hover:bg-gray-50">
                     <td className="px-5 py-4 border-b border-gray-200 bg-white text-sm">{content.id}</td>
                     <td className="px-5 py-4 border-b border-gray-200 bg-white text-sm">{content.title}</td>
                     <td className="px-5 py-4 border-b border-gray-200 bg-white text-sm">{content.content_type}</td>
                     <td className="px-5 py-4 border-b border-gray-200 bg-white text-sm">
                       <Link
                        // Point to the 'edit' route path pattern defined in routes.tsx
                         to="/campaigns/$campaignId/content/$contentId/edit"
                         // Ensure params are strings
                         params={{ campaignId: campaignIdStr, contentId: content.id }}
                         className="text-indigo-600 hover:text-indigo-900 mr-3 inline-flex items-center" 
                         title="Edit Content"
                       >
                         <FaEdit className="mr-1" /> Edit
                       </Link>
                       <button
                         onClick={() => handleContentDelete(content.id, content.title)}
                         className="text-red-600 hover:text-red-900 inline-flex items-center" title="Delete Content"
                         // Explicitly ensure variables is treated as number if type inference fails
                         disabled={deleteContentMutation.isPending && Number(deleteContentMutation.variables) === content.id}
                       >
                           {deleteContentMutation.isPending && Number(deleteContentMutation.variables) === content.id ? "Deleting..." : <><FaTrash className="mr-1"/> Delete</>}
                       </button>
                     </td>
                   </tr>
                 ))
               ) : (
                 <tr>
                   <td colSpan={4} className="px-5 py-5 border-b border-gray-200 bg-white text-sm text-center text-gray-500">
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
