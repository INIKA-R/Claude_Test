import axios from "axios";
import { ApiErrorResponse } from "../types";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const data = error.response?.data;
    if (data?.error) {
      const details = Array.isArray(data.details) ? `: ${data.details.join(", ")}` : "";
      return `${data.error}${details}`;
    }
    if (error.code === "ERR_NETWORK") {
      return "Cannot reach the server. Is the backend running?";
    }
    return error.message;
  }
  return error instanceof Error ? error.message : "Something went wrong";
}
