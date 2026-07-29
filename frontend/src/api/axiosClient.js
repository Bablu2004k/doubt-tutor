import axios from "axios";

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("doubt_tutor_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If the token is missing/invalid/expired, the backend's requireAuth
// middleware returns 401 on every request. Without this, the UI still
// thinks the user is logged in (ProtectedRoute only checks that a user
// object exists in localStorage, not that the token is still valid), so
// every action would silently fail with "Invalid or expired token"
// forever, with no way to recover except manually clearing storage.
// Auto-logout and send them back to /login so they can get a fresh token.
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && window.location.pathname !== "/login") {
      localStorage.removeItem("doubt_tutor_token");
      localStorage.removeItem("doubt_tutor_user");
      window.location.assign("/login");
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
