const url = 'https://ghstats.17lai.site/?username=louislam&show_icons=true&number_format=long&border_radius=20&rank_icon=percentile&ring_color=75C3FD&hide=issues';
const res = await fetch(url);
const fileStream = Deno.openSync('stats.svg', { write: true, create: true });
const writableStream = fileStream.writable;

// 200 & SVG only
if (res.status == 200 && res.body && res.headers.get('content-type')?.includes('image/svg+xml')) {
    console.log('Downloading image...');
    await res.body.pipeTo(writableStream);
    console.log('Image downloaded successfully!');
} else {
    console.error('Failed to download image. Status:', res.status);
}



