/**
 * EASIR API DOCUMENTATION CONFIGURAITON
 * 
 * This file allows you to easily manage the API documentation displayed on the frontend.
 * You can add new categories, endpoints, and descriptions here.
 * 
 * TIPS FOR EDITING:
 * 1. Text should be inside quotes: "Like this" or 'Like this'
 * 2. You can use standard comments like this block to leave notes.
 * 3. If you break this file, the API docs page will default to an error state.
 */

module.exports = {
    // Defines the total count displayed in the header (Auto-calculated if you want using Object.keys, but manual here for simplicity)
    total: 1,

    categories: {

        // --- CATEGORY: SOCIAL MEDIA SEARCH ---
        "Social Media Search": [
            {
                name: "TikTok Search",
                description: "Allows users to search for TikTok content based on the provided search term.",
                path: "/api/tiktok",
                method: "get", // 'get', 'post', 'put', 'delete'

                // Parameters required for this endpoint
                params: [
                    {
                        name: "search",
                        type: "string", // text, number, boolean
                        required: true,
                        description: "Search term to find relevant TikTok content (e.g. 'funny cats')"
                    }
                ]
            }
            // Add more endpoints to this category here...
        ],

        // --- CATEGORY: EXAMPLE (You can copy-paste this to make new sections) ---
        // "System Tools": [
        //     {
        //         name: "Server Status",
        //         description: "Check if the server is running.",
        //         path: "/api/status",
        //         method: "get",
        //         params: []
        //     }
        // ]

    }
};
