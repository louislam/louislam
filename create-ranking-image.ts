import { DOMParser } from "jsr:@b-fuze/deno-dom@0.1.56";

const username = "louislam";

/**
 * Offset rows above and below target user
 */
const offsetRows = 2;

interface UserEntry {
    rank: number;
    username: string;
    stars: number;
    avatarUrl: string;
}

async function fetchHTML(url: string): Promise<string> {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`HTTP ${res.status} fetching ${url}`);
    }
    return res.text();
}

async function fetchAvatarAsDataUri(url: string): Promise<string> {
    const res = await fetch(url);
    if (!res.ok) {
        console.warn(`Failed to fetch avatar ${url}: ${res.status}`);
        return "";
    }
    const contentType = res.headers.get("content-type") || "image/png";
    const buffer = await res.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    return `data:${contentType};base64,${base64}`;
}

async function getUserRank(username: string): Promise<number> {
    const html = await fetchHTML(`https://gitstar-ranking.com/${username}`);
    const doc = new DOMParser().parseFromString(html, "text/html")!;

    for (const row of doc.querySelectorAll(".row")) {
        const attr = row.querySelector(".user_attribute");
        if (attr?.textContent?.trim() === "Rank") {
            const val = row.querySelector(".user_value")?.textContent?.trim();
            if (val) return parseInt(val);
        }
    }
    throw new Error(`Could not parse rank for ${username}`);
}

async function getRankingPage(page: number): Promise<UserEntry[]> {
    const url = page <= 1 ? "https://gitstar-ranking.com/users" : `https://gitstar-ranking.com/users?page=${page}`;

    const html = await fetchHTML(url);
    const doc = new DOMParser().parseFromString(html, "text/html")!;

    const users: UserEntry[] = [];

    for (const item of doc.querySelectorAll("a.list-group-item.paginated_item")) {
        const avatarUrl = item.querySelector("img.avatar_image_big")?.getAttribute("src") ?? "";
        const href = item.getAttribute("href") ?? "";
        const username = href.replace(/^\//, "");

        const nameText = item.querySelector("span.name")?.textContent ?? "";
        const rankMatch = nameText.match(/(\d+)\./);
        const rank = rankMatch ? parseInt(rankMatch[1]) : 0;

        const starsText = item.querySelector("span.stargazers_count")?.textContent ?? "";
        const stars = parseInt(starsText.replace(/\D/g, "")) || 0;

        if (rank > 0 && username) {
            users.push({ rank, username, stars, avatarUrl });
        }
    }

    return users;
}

function generateSvg(users: UserEntry[], targetUser: string, avatarDataUri: string): string {
    const W = 440;
    const ROW_H = 58;
    const PAD = 14;
    const AVATAR_R = 18;
    const H = ROW_H * users.length + PAD * 2;
    const BG = "#0d1117";
    const ROW_EVEN = "#161b22";
    const ROW_ODD = "#0d1117";
    const HIGHLIGHT = "#1f6feb";
    const TEXT_PRIMARY = "#e6edf3";
    const STAR_COLOR = "#e3b341";
    const STAR_COLOR_HI = "#ffd700";

    let clipDefs = "";
    let rows = "";

    for (const user of users) {
        const i = users.indexOf(user);
        const y = PAD + i * ROW_H;
        const isTarget = user.username.toLowerCase() === targetUser.toLowerCase();
        const rowBg = isTarget ? HIGHLIGHT : i % 2 === 0 ? ROW_EVEN : ROW_ODD;
        const textColor = isTarget ? "#ffffff" : TEXT_PRIMARY;
        const starColor = isTarget ? STAR_COLOR_HI : STAR_COLOR;
        const cx = PAD + 12 + AVATAR_R;
        const cy = y + ROW_H / 2;
        clipDefs += `<clipPath id="av${i}"><circle cx="${cx}" cy="${cy}" r="${AVATAR_R}"/></clipPath>\n    `;
        const textX = cx + AVATAR_R + 12;
        const starsText = "★ " + user.stars;
        if (isTarget && avatarDataUri) {
            const avatarEl = `<image href="${avatarDataUri}" x="${cx - AVATAR_R}" y="${cy - AVATAR_R}" width="${AVATAR_R * 2}" height="${AVATAR_R * 2}" clip-path="url(#av${i})"/>`;
            rows += `
  <rect x="${PAD}" y="${y + 3}" width="${W - PAD * 2}" height="${ROW_H - 6}" rx="8" fill="${rowBg}"/>
  ${avatarEl}`;
        } else {
            const avatarColor = isTarget ? "#1f6feb" : "#30363d";
            rows += `
  <rect x="${PAD}" y="${y + 3}" width="${W - PAD * 2}" height="${ROW_H - 6}" rx="8" fill="${rowBg}"/>
  <circle cx="${cx}" cy="${cy}" r="${AVATAR_R}" fill="${avatarColor}" clip-path="url(#av${i})"/>`;
        }
        rows += `
  <text x="${textX}" y="${cy + 6}" font-size="15" fill="${textColor}" font-weight="${isTarget ? "700" : "400"}" font-family="'Segoe UI',system-ui,sans-serif">#${user.rank} ${user.username}</text>
  <text x="${W - PAD - 6}" y="${cy + 1}" font-size="13" fill="${starColor}" font-family="Segoe UI',system-ui,sans-serif" text-anchor="end" dominant-baseline="middle">${starsText}</text>`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    ${clipDefs}
  </defs>
  <rect width="${W}" height="${H}" rx="12" fill="${BG}"/>
${rows}
</svg>`;
}

console.log(`Fetching rank for ${username}...`);
const rank = await getUserRank(username);
console.log(`${username} is ranked #${rank}`);

const page = Math.ceil(rank / 100);
console.log(`Fetching ranking page ${page}...`);
const allUsers = await getRankingPage(page);

const targetIdx = allUsers.findIndex(
    (u) => u.username.toLowerCase() === username.toLowerCase(),
);
if (targetIdx === -1) throw new Error(`${username} not found in parsed page`);

const start = Math.max(0, targetIdx - offsetRows);
const end = Math.min(allUsers.length, targetIdx + offsetRows + 1);
const users = allUsers.slice(start, end);

console.log(`Showing ranks ${users[0].rank}–${users[users.length - 1].rank}`);
console.log("Fetching avatar...");
const targetUser = users.find((u) => u.username.toLowerCase() === username.toLowerCase());
let avatarDataUri = "";
if (targetUser?.avatarUrl) {
    avatarDataUri = await fetchAvatarAsDataUri(targetUser.avatarUrl);
    console.log("Avatar fetched successfully.");
}
const svg = generateSvg(users, username, avatarDataUri);
Deno.writeTextFileSync("ranking.svg", svg);
console.log("ranking.svg generated successfully!");
