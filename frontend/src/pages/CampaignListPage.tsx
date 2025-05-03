import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Campaign, CampaignListResponse, ErrorResponse } from "../types/api";
import { API_BASE_URL } from "../types/api";
import { FaTrash, FaEye } from "react-icons/fa"; // Removed FaEdit as it was unused

// --- API Fetching Functions ---

const fetchCampaigns = async (): Promise<Campaign[]> => {
  // Assuming the backend runs on the same origin or is proxied
  // Adjust the URL if your backend runs elsewhere (e.g., http://localhost:8000/v1/campaign)
  const response = await fetch(`${API_BASE_URL}/v1/campaign`);
  if (!response.ok) {
    const errorData: ErrorResponse = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }
  const data: CampaignListResponse = await response.json();
  return data.campaigns || []; // Return empty array if campaigns is undefined
};

const deleteCampaign = async (campaignId: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/v1/campaign/${campaignId}`, {
    method: "DELETE",
  });
  if (!response.ok && response.status !== 204) { // 204 No Content is success for DELETE
    const errorData: ErrorResponse = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }
  // No need to return content for DELETE
};

// --- Component Implementation ---

const CampaignListPage: React.FC = () => {
  const queryClient = useQueryClient();

  // Query to fetch campaigns
  const { data: campaigns, error, isLoading, isFetching } = useQuery<Campaign[], Error>({ // Explicitly type useQuery
    queryKey: ["campaigns"], // Key for caching
    queryFn: fetchCampaigns,
  });

  // Mutation for deleting a campaign
  const deleteMutation = useMutation<void, Error, number>({ // Type: return type, error type, input type
    mutationFn: deleteCampaign,
    onSuccess: () => {
      // Invalidate the campaigns query cache to refetch the list after deletion
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      // TODO: Add success notification (e.g., using react-toastify)
      console.log("Campaign deleted successfully");
    },
    onError: (err) => {
      // TODO: Add error notification
      console.error("Error deleting campaign:", err.message);
    },
  });

  const handleDelete = (id: number, name: string) => {
    // Simple confirmation dialog
    if (window.confirm(`Are you sure you want to delete campaign "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="theme-glass-container p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white/90">Campaign Management</h1>
        <Link
          to="/campaigns/new"
          className="theme-glass-button"
        >
          Create New Campaign
        </Link>
      </div>

      {/* Loading and Error States */}
      {isLoading && <p className="theme-text">Loading campaigns...</p>}
      {isFetching && !isLoading && <p className="text-white/60 text-sm italic">Updating list...</p>}
      {error && <p className="theme-text-error">Error fetching campaigns: {error.message}</p>}
      {deleteMutation.isError && (
         <p className="text-red-500 mb-4">Error deleting campaign: {deleteMutation.error.message}</p>
      )}

      {/* Campaign Table */}
      {!isLoading && !error && (
        <div className="overflow-x-auto mt-6">
          <table className="theme-glass-table">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-5 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">ID</th>
                <th className="px-5 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Name</th>
                <th className="px-5 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns && campaigns.length > 0 ? (
                campaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4 border-b border-gray-200 bg-white text-black text-sm">{campaign.id}</td>
                    <td className="px-5 py-4 border-b border-gray-200 bg-white text-black text-sm text-left">{campaign.name}</td>
                    <td className="px-5 py-4 border-b border-gray-200 bg-white text-black text-sm">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          campaign.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {campaign.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-4 border-b border-gray-200 bg-white text-sm">
                      <Link
                        to="/campaigns/$campaignId"
                        params={{ campaignId: campaign.id }} // Fixed: Convert number to string for param
                        className="text-indigo-600 hover:text-indigo-900 mr-3 inline-flex items-center" title="View/Edit Details"
                      >
                        <FaEye className="mr-1" /> View/Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(campaign.id, campaign.name)}
                        className="text-red-600 hover:text-red-900 inline-flex items-center" title="Delete Campaign"
                        disabled={deleteMutation.isPending && deleteMutation.variables === campaign.id} // Fixed: Changed isLoading to isPending
                      >
                         {deleteMutation.isPending && deleteMutation.variables === campaign.id ? "Deleting..." : <><FaTrash className="mr-1" /> Delete</>} {/* Fixed: Changed isLoading to isPending */}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-5 py-5 border-b border-gray-200 bg-white text-sm text-center text-gray-500">
                    No campaigns found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CampaignListPage;
