import axios from 'axios';

// API_BASE is only needed in development.
// We do NOT define it at the top level to prevent the "localhost" string 
// from leaking into the production bundle and triggering network permission prompts.

export const fetchFileList = async () => {
    // Completely remove this block in production
    /*
    if (import.meta.env.PROD) return {};
    
    // This code only runs in DEV
    const API_BASE = 'http://localhost:3001/api';
    try {
        const response = await axios.get(`${API_BASE}/files`);
        return response.data;
    } catch (error) {
        console.error("Failed to fetch file list", error);
        return {};
    }
    */
    return {};
};

export const fetchData = async (district, startDate, endDate) => {
    try {
        if (!district || !startDate || !endDate) return [];

        let data = [];

        // 1. Try fetching from Backend API (ONLY IN DEVELOPMENT)
        /*
        if (import.meta.env.DEV) {
            const API_BASE = 'http://localhost:3001/api';
            try {
                const response = await axios.get(`${API_BASE}/data`, {
                    params: { district, startDate, endDate }
                });
                if (Array.isArray(response.data)) {
                    return response.data;
                }
            } catch (err) {
                console.warn("Backend API failed, falling back to static data", err);
            }
        }
        */

        // 2. Fallback / Static Mode: Fetch data.json
        console.log("Fetching static data from /data.json via BASE_URL");
        const response = await axios.get(`${import.meta.env.BASE_URL}data.json`);

        if (Array.isArray(response.data)) {
            // Client-side filtering
            data = response.data.filter(item => {
                const itemDate = item['날짜'];
                const itemDistrict = item['지점']; // Added in export_json.js

                // District check
                const districtMatch = itemDistrict === district;

                // Date Range check
                const dateMatch = itemDate >= startDate && itemDate <= endDate;

                return districtMatch && dateMatch;
            });
            return data;
        } else {
            console.error("Invalid data format in data.json");
            return [];
        }

    } catch (error) {
        console.error("Failed to fetch data", error);
        return [];
    }
};

export const fetchStaffList = async (district) => {
    try {
        console.log(`Fetching staff list for district: ${district}`);
        // Fetch from district-specific static JSON
        // fallback to empty if district is not provided, or handle 'unknown'
        if (!district) return [];

        // Use relative path (no leading slash) and add timestamp to bust cache
        const response = await axios.get(`${import.meta.env.BASE_URL}staff_list_${district}.json?t=${Date.now()}`);

        if (Array.isArray(response.data)) {
            return response.data;
        }
        return [];
    } catch (error) {
        console.error(`Failed to fetch staff list for ${district}`, error);
        return [];
    }
};

export const fetchHolidays = async () => {
    try {
        // 1. Try Backend API (ONLY IN DEVELOPMENT)
        /*
        if (import.meta.env.DEV) {
            const API_BASE = 'http://localhost:3001/api';
            try {
                const response = await axios.get(`${API_BASE}/holidays`);
                return response.data;
            } catch (error) {
                console.warn("Backend API for holidays failed, falling back to static data", error);
            }
        }
        */

        // 2. Fallback to static JSON
        const response = await axios.get(`${import.meta.env.BASE_URL}holidays.json`);
        return response.data;
    } catch (staticError) {
        console.error("Failed to fetch holidays from static file", staticError);
        return [];
    }
};
