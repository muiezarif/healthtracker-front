import axios from "axios"

export default axios.create({
    baseURL:"http://localhost:8800/api"
    // baseURL:"https://healthtrackerapp.novam.us/api"
});