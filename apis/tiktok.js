const express = require("express");
const axios = require("axios");
const router = express.Router();

const tiktokRoute = "/tiktok";

router.get(tiktokRoute, async (req, res) => {
    const { search, limit } = req.query;

    if (!search) {
        return res.status(400).json({ error: "Search parameter is required" });
    }

    try {
        const response = await axios.post(
            "https://www.tikwm.com/api/feed/search",
            new URLSearchParams({
                keywords: search,
                count: limit || 20,
                cursor: "0",
                web: "1",
                hd: "1",
            }),
            {
                headers: {
                    authority: "www.tikwm.com",
                    accept: "application/json, text/javascript, */*; q=0.01",
                    "accept-language": "en-US,en;q=0.9",
                    "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                    origin: "https://www.tikwm.com",
                    referer: "https://www.tikwm.com/",
                    "sec-ch-ua": '"Not)A;Brand";v="24", "Chromium";v="118"',
                    "sec-ch-ua-mobile": "?1",
                    "sec-ch-ua-platform": '"Generic"',
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "same-origin",
                    "user-agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
                    "x-requested-with": "XMLHttpRequest",
                },
            }
        );

        const data = response.data.data.videos.map((video) => ({
            title: video.title,
            video: `https://www.tikwm.com${video.play}`,
        }));

        res.json({ data });
    } catch (error) {
        console.error("Error fetching TikTok data:", error);
        res.status(500).json({ error: "Failed to fetch TikTok data" });
    }
});

module.exports = router;
