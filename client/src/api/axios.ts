import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "https://backend-1e2b.vercel.app/"
})

export default api;
