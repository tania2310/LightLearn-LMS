import axios from "axios";

const API = axios.create({
    baseURL: "http://127.0.0.1:8000/api/",
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
                        "http://127.0.0.1:8000/api/accounts/refresh/",
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

export default API;