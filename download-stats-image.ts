import { parse } from "jsr:@std/xml@0.1.2";

const url = "https://ghstats.17lai.site/?username=louislam&show_icons=true&number_format=long&border_radius=20&rank_icon=percentile&ring_color=75C3FD&hide=issues";
const res = await fetch(url);

// 200 & SVG only
if (
    res.status == 200 && res.body &&
    res.headers.get("content-type")?.includes("image/svg+xml")
) {
    console.log("Downloading image...");
    Deno.writeTextFileSync("stats.svg", await res.text());

    // Test parsing the SVG to ensure it's valid
    parse(Deno.readTextFileSync("stats.svg"));

    console.log("Image downloaded successfully!");
} else {
    throw new Error("Failed to download image. Status: " + res.status);
}
