import React from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, Link } from "@tanstack/react-router"; // Import Link
import { CampaignCreateRequest, Campaign, ErrorResponse, API_BASE_URL } from "../types/api";

// --- API Mutation Function ---

const createCampaign = async (data: CampaignCreateRequest): Promise<Campaign> => {
  const response = await fetch(`${API_BASE_URL}/v1/campaign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData: ErrorResponse = await response.json().catch(() => ({ message: "Unknown error during creation" }));
    // Enhance error message with status if possible
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  // Assuming the backend returns the created campaign object in CampaignResponse format
  // Adjust if the API returns something different (e.g., just status or ID)
  const result: { campaign: Campaign } = await response.json();
  return result.campaign;
};

// --- Component Implementation ---

interface FormInputs {
  name: string;
  active: boolean;
}

const CampaignCreatePage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate({ from: "/campaigns/new" }); // Hook for navigation

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<FormInputs>({
    defaultValues: {
      name: "",
      active: true, // Default new campaigns to active
    },
  });

  const createMutation = useMutation<Campaign, Error, CampaignCreateRequest>({
    mutationFn: createCampaign,
    onSuccess: (newCampaign) => {
      // Invalidate the campaigns list cache so it refetches with the new item
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      // Optionally, pre-populate the cache for the new campaign's detail view
      // queryClient.setQueryData(['campaign', newCampaign.id], newCampaign);

      // TODO: Add success notification
      console.log("Campaign created:", newCampaign);
      reset(); // Clear the form
      // Navigate back to the campaign list page after successful creation
      navigate({ to: "/", replace: true }); // Use replace to avoid back button going to the form
    },
    onError: (error) => {
      // Error handling is done within the component UI below
      console.error("Creation failed:", error.message);
      // TODO: Add more specific error notification (e.g., toast)
    },
  });

  // Handler for form submission
  const onSubmit: SubmitHandler<FormInputs> = (data) => {
    console.log("Form data submitted:", data);
    createMutation.mutate(data); // Trigger the mutation
  };

  return (
    <div className="max-w-md mx-auto bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
      <h1 className="text-2xl font-bold text-gray-700 mb-6">Create New Campaign</h1>

      {/* Display general mutation errors */}
      {createMutation.isError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{createMutation.error?.message || "Failed to create campaign."}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Campaign Name Field */}
        <div className="mb-4">
          <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">
            Campaign Name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            {...register("name", { required: "Campaign name is required" })}
            className={`shadow appearance-none border ${errors.name ? 'border-red-500' : 'border-gray-200'} rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline`}
            disabled={isSubmitting || createMutation.isPending} // Changed isLoading to isPending
          />
          {errors.name && <p className="text-red-500 text-xs italic mt-1">{errors.name.message}</p>}
        </div>

        {/* Active Status Field */}
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Status
          </label>
          <div className="mt-2">
            <label htmlFor="active" className="inline-flex items-center">
              <input
                id="active"
                type="checkbox"
                {...register("active")}
                className="rounded h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 shadow-sm"
                disabled={isSubmitting || createMutation.isPending} // Changed isLoading to isPending
              />
              <span className="ml-2 text-sm text-gray-700">Active</span>
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-between">
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50 transition duration-150 ease-in-out"
            disabled={isSubmitting || createMutation.isPending} // Changed isLoading to isPending
          >
            {isSubmitting || createMutation.isPending ? "Creating..." : "Create Campaign"} {/* Changed isLoading to isPending */}
          </button>
          <Link
            to="/"
            className="inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
};

export default CampaignCreatePage;
