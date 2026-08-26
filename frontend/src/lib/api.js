import axios from "axios";
import { startRequest, endRequest } from "./pendingRequests";

// Single axios instance for the whole app. baseURL + the auth token used to be
// re-derived at all 124 call sites; the interceptor reads the token per request
// so a fresh login is picked up without remounting anything.
const getBaseURL = () => {
  const url = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
  if (typeof window !== "undefined" && url.includes("localhost") && window.location.hostname !== "localhost") {
    return url.replace("localhost", window.location.hostname);
  }
  return url;
};

const api = axios.create({
  baseURL: getBaseURL(),
});

api.interceptors.request.use(
  (config) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    startRequest();
    return config;
  },
  (error) => {
    // A request that never left (bad config) still has to release the counter.
    endRequest();
    return Promise.reject(error);
  }
);

// An expired/invalid token used to surface as a raw AxiosError crash overlay on
// whichever page happened to fetch first — the user had no idea they were simply
// logged out. Every page checks for a token on mount but nothing checked whether
// the server still accepts it, so the dead token sat in localStorage forever.
// Handling it here covers all call sites at once.
api.interceptors.response.use(
  (res) => {
    endRequest();
    return res;
  },
  (error) => {
    endRequest();
    const status = error?.response?.status;
    const code = error?.response?.data?.code;
    const url = error?.config?.url || "";
    // Skip the login calls themselves: a 401 there means "wrong password", which
    // the login form shows inline — redirecting would wipe the message.
    const isAuthCall = /\/auth\/(login|mock-login)/.test(url);
    if ((status === 401 || code === "PENDING_APPROVAL" || code === "ACCESS_REJECTED") && !isAuthCall && typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");
      if (!window.location.pathname.startsWith("/login")) {
        const target = code === "PENDING_APPROVAL"
          ? "/login?pendingApproval=1"
          : code === "ACCESS_REJECTED"
            ? "/login?approval=rejected"
            : "/login?expired=1";
        window.location.replace(target);
      }
    }
    return Promise.reject(error);
  }
);

// Uploads are served from the backend root, not /api — turn a stored "/uploads/x"
// into an absolute URL. Already-absolute and data: URLs pass through untouched.
export function assetUrl(path) {
  if (!path) return "";
  if (path.startsWith("http") || path.startsWith("data:")) return path;
  return api.defaults.baseURL.replace(/\/api$/, "") + path;
}

export default api;
