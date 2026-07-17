import axios from "axios";

const getBaseURL = () => {
    return import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/";
};

const API = axios.create({
    baseURL: getBaseURL(),
});

API.interceptors.request.use(
    async (config) => {
        let access = localStorage.getItem("access");
        const refresh = localStorage.getItem("refresh");

        if (access) {
            try {
                const payload = JSON.parse(atob(access.split(".")[1]));
                const expiry = payload.exp * 1000;

                if (Date.now() >= expiry && refresh) {
                    const response = await axios.post(
                        `${getBaseURL()}accounts/refresh/`,
                        {
                            refresh,
                        }
                    );

                    access = response.data.access;
                    localStorage.setItem("access", access);
                }

                config.headers.Authorization = `Bearer ${access}`;
            } catch (error) {
                console.log("Token refresh failed", error);

                localStorage.removeItem("access");
                localStorage.removeItem("refresh");

                window.location.href = "/";
            }
        }

        return config;
    },
    (error) => Promise.reject(error)
);

export const getNotifications = () => API.get("notifications/");
export const getUnreadNotifications = () => API.get("notifications/unread/");
export const markRead = (id) => API.post(`notifications/${id}/mark-read/`);
export const markAllRead = () => API.post("notifications/mark-all-read/");

export const searchCourses = (params) => API.get("search/courses/", { params });
export const searchMentors = (params) => API.get("search/mentors/", { params });
export const autocomplete = (q) => API.get("search/autocomplete/", { params: { q } });

export default API;