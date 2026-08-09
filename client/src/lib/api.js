import axios from "axios";

const api = axios.create({ 
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "https://fundipro-v2.onrender.com/api" : "/api")
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("fundipro_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function errMsg(err, fallback = "Something went wrong. Please try again.") {
  return err?.response?.data?.error || fallback;
}

export default api;
