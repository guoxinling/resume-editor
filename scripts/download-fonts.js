const https = require('https');
const fs = require('fs');
const path = require('path');

const fonts = [
  {
    name: 'NotoSansSC-Regular.ttf',
    url: 'https://github.com/googlefonts/noto-cjk/releases/download/Sans2.004/03_NotoSansCJKsc.zip',
  },
];

// We need TTF files for Noto Sans SC. Let's use a direct reliable source.
const downloads = [
  {
    file: 'public/fonts/NotoSansSC-Regular.ttf',
    url: 'https://raw.githubusercontent.com/notofonts/noto-cjk/main/Sans/OTF/SimplifiedChinese/NotoSansCJKsc-Regular.otf',
  },
  {
    file: 'public/fonts/NotoSansSC-Bold.ttf',
    url: 'https://raw.githubusercontent.com/notofonts/noto-cjk/main/Sans/OTF/SimplifiedChinese/NotoSansCJKsc-Bold.otf',
  },
  {
    file: 'public/fonts/NotoSans-Regular.ttf',
    url: 'https://raw.githubusercontent.com/notofonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf',
  },
];

// Create dir
fs.mkdirSync('public/fonts', { recursive: true });

function download(url, dest) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading ${url}...`);
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        file.close();
        fs.unlinkSync(dest);
        download(res.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`Saved ${dest}`);
        resolve();
      });
    }).on('error', (err) => {
      file.close();
      fs.unlinkSync(dest, () => {});
      reject(err);
    });
  });
}

async function main() {
  for (const d of downloads) {
    if (fs.existsSync(d.file)) {
      console.log(`Skip ${d.file} (exists)`);
      continue;
    }
    try {
      await download(d.url, d.file);
    } catch (e) {
      console.error(`Failed: ${d.url} - ${e.message}`);
    }
  }
  console.log('Done');
}

main();
