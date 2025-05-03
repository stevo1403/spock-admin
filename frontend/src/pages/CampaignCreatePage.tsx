import React from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, Link } from "@tanstack/react-router"; // Import Link
import {
  CampaignCreateRequest,
  Campaign,
  ErrorResponse,
  API_BASE_URL,
} from "../types/api";

// --- API Mutation Function ---

const createCampaign = async (
  data: CampaignCreateRequest
): Promise<Campaign> => {
  const response = await fetch(`${API_BASE_URL}/v1/campaign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData: ErrorResponse = await response
      .json()
      .catch(() => ({ message: "Unknown error during creation" }));
    // Enhance error message with status if possible
    throw new Error(
      errorData.message || `HTTP error! status: ${response.status}`
    );
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

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormInputs>({
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
    <div className="theme-glass-container max-w-xl mx-auto p-8 space-y-8">
      <h1 className="text-2xl font-bold text-white/90 mb-6">
        Create New Campaign
      </h1>

      {createMutation.isError && (
        <div
          className="bg-red-500/20 border border-red-500/50 text-white/90 px-4 py-3 rounded-lg relative mb-4"
          role="alert"
        >
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">
            {createMutation.error?.message}
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex items-center gap-4">
          <label className="w-1/3 text-white/90 text-sm font-bold text-left">
            Campaign Name <span className="text-pink-400">*</span>
          </label>
          <div className="w-2/3">
            <input
              {...register("name", { required: "Campaign name is required" })}
              className="theme-glass-input w-full"
            />
            {errors.name && (
              <p className="theme-text-error text-xs mt-1">
                {errors.name.message}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <label className="w-1/3 text-white/90 text-sm font-bold text-left">
            Status
          </label>
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center hover:cursor-pointer">
              <input
                type="checkbox"
                {...register("active")}
                className="rounded h-5 w-5 text-purple-500 focus:ring-purple-500/50 border-white/20 bg-white/10"
              />
              <span className="ml-2 text-white/90">Active</span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-4 pt-4">
          <Link
            to="/"
            className="text-white/80 hover:text-white font-medium text-sm hover:underline transition-colors duration-200"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="theme-glass-button min-w-[120px]"
            disabled={isSubmitting || createMutation.isPending}
          >
            {isSubmitting || createMutation.isPending
              ? "Creating..."
              : "Create Campaign"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CampaignCreatePage;
