import axios from "axios";

// In production (Vercel), call the Cloudflare Worker directly.
// In development, use the local Vite proxy.
const API_BASE = import.meta.env.PROD
  ? "https://fundipro-api.andrewwekesa675.workers.dev/api"
  : "/api";

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("fundipro_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function errMsg(err, fallback = "Something went wrong. Please try again.") {
  return err?.response?.data?.error || fallback;
}

export default api;
