import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "https://client-jet-three-66.vercel.app/"
})

export default api;
