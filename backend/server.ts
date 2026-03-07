// Simple Express Proxy/Scraper for Zamayl.com
import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import axios from 'axios';
import * as cheerio from 'cheerio';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Endpoint to search and scrape files
app.get('/api/scrape/zamayl', async (req: Request, res: Response) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: "Missing query parameter 'q'" });

    try {
        console.log(`Scraping Zamayl for: ${query}`);
        // 1. Search for the course
        const searchUrl = `https://www.zamayl.com/courses/course-search?title=${encodeURIComponent(query as string)}`;
        const searchResponse = await axios.get(searchUrl);
        const $ = cheerio.load(searchResponse.data);

        // Find course links from the search results
        const courseLinks: string[] = [];
        $('a[href*="/course/"]').each((_i, el) => {
            const href = $(el).attr('href');
            if (href && !courseLinks.includes(href)) {
                // Ensure full URL
                courseLinks.push(href.startsWith('http') ? href : `https://www.zamayl.com${href}`);
            }
        });

        console.log(`Found ${courseLinks.length} potential courses.`);

        let allFiles: { name: string, url: string }[] = [];

        // 2. For each course found, scrape the files
        // (Limit to first 3 to avoid taking too long/getting banned)
        for (const courseUrl of courseLinks.slice(0, 3)) {
            try {
                const courseRes = await axios.get(courseUrl);
                const $course = cheerio.load(courseRes.data);

                // Usually files are in links containing 'download' or ending in .pdf/.docx
                $course('a').each((_i, el) => {
                    const href = $course(el).attr('href');
                    const text = $course(el).text().trim() || 'ملف';

                    if (href && (href.includes('/download') || href.endsWith('.pdf') || href.endsWith('.docx') || href.endsWith('.doc'))) {
                        const fullUrl = href.startsWith('http') ? href : `https://www.zamayl.com${href}`;
                        allFiles.push({ name: text, url: fullUrl });
                    }
                });
            } catch (e) {
                console.error(`Error scraping course ${courseUrl}`, e);
            }
        }

        // Remove duplicates
        const uniqueFiles = Array.from(new Set(allFiles.map(f => f.url)))
            .map(url => allFiles.find(f => f.url === url)!);

        res.json({ success: true, files: uniqueFiles });

    } catch (error: any) {
        console.error("Scraping error:", error.message);
        res.status(500).json({ error: "Failed to scrape Zamayl", details: error.message });
    }
});

// ==========================================
// V9 Deep OSINT Engine (Ashok & OpenClaw)
// ==========================================

// 1. Ashok: Deep Web & Google Crawler
app.get('/api/osint/search', async (req: Request, res: Response) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: "Missing query parameter 'q'" });

    try {
        console.log(`[Ashok] Deep Searching: ${query}`);
        // Simple Google Scraper logic (simulating Ashok OSINT)
        const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query as string)}`;
        const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };
        const response = await axios.get(searchUrl, { headers });
        const $ = cheerio.load(response.data);

        const results: { title: string, snippet: string, link: string }[] = [];
        $('.result').each((i, el) => {
            if (i >= 5) return; // Top 5
            const title = $(el).find('.result__title').text().trim();
            const snippet = $(el).find('.result__snippet').text().trim();
            const link = $(el).find('.result__url').attr('href') || '';
            if (title && snippet) results.push({ title, snippet, link });
        });

        res.json({ source: 'Ashok-OSINT', query, results });
    } catch (error: any) {
        res.status(500).json({ error: "OSINT Search failed", details: error.message });
    }
});

// 2. Ashok: Wayback Machine Crawler
app.get('/api/osint/wayback', async (req: Request, res: Response) => {
    const domain = req.query.domain;
    if (!domain) return res.status(400).json({ error: "Missing domain parameter" });

    try {
        const response = await axios.get(`http://web.archive.org/cdx/search/cdx?url=${domain}/*&output=json&limit=5`);
        res.json({ source: 'Ashok-Wayback', domain, snapshots: response.data });
    } catch (error: any) {
        res.status(500).json({ error: "Wayback failed", details: error.message });
    }
});

// 3. Ashok: GitHub Info Extractor
app.get('/api/osint/github', async (req: Request, res: Response) => {
    const user = req.query.user;
    if (!user) return res.status(400).json({ error: "Missing user" });

    try {
        const response = await axios.get(`https://api.github.com/users/${user}`);
        res.json({ source: 'Ashok-GitHub', info: response.data });
    } catch (error: any) {
        res.status(500).json({ error: "GitHub extraction failed", details: error.message });
    }
});

// 4. API Radar: API Discovery Engine
app.get('/api/radar/discover', async (req: Request, res: Response) => {
    const topic = req.query.topic;
    res.json({
        source: 'APIRadar',
        description: `Simulated API Discovery for Bazinga Engine on topic: ${topic || 'General'}`,
        suggested_apis: [
            { name: "Publicis APIs", type: "REST", link: "https://apiradar.live" },
            { name: "OpenMeteo Weather", type: "REST", link: "https://open-meteo.com" }
        ]
    });
});

app.listen(PORT, () => {
    console.log(`Zamayl & OSINT (Ashok Engine) proxy running on http://localhost:${PORT}`);
});
