module.exports = {
    total: 1,

    categories: {
        "Social Media Search": [
            {
                name: "TikTok Search",
                description: "Allows users to search for TikTok content based on the provided search term.",
                path: "/api/tiktok",
                method: "get",

                params: [
                    {
                        name: "search",
                        type: "string",
                        required: true,
                        description: "Search term to find relevant TikTok content (e.g. 'funny cats')"
                    }
                ]
            }
        ]
    }
};
