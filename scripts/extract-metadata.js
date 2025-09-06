const fs = require('fs');
const path = require('path');
const jsmediatags = require('jsmediatags');

const musicDir = path.join(__dirname, '..', 'public', 'music');
const dataDir = path.join(__dirname, '..', 'data');
const outputFile = path.join(dataDir, 'music.json');

async function extractMetadata() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }

  const files = fs.readdirSync(musicDir).filter(file => file.endsWith('.mp3'));
  const allMusicData = [];

  for (const file of files) {
    const filePath = path.join(musicDir, file);
    try {
      const tags = await new Promise((resolve, reject) => {
        jsmediatags.read(filePath, {
          onSuccess: function(tag) {
            resolve(tag.tags);
          },
          onError: function(error) {
            console.error(`Error reading tags from ${file}:`, error.type, error.info);
            resolve(null); // Resolve with null to continue processing other files
          }
        });
      });

      if (tags) {
        const musicData = {
          id: path.parse(file).name, // Use filename as ID
          title: tags.title || path.parse(file).name,
          artist: tags.artist || 'Unknown Artist',
          album: tags.album || 'Unknown Album',
          genre: tags.genre || 'Unknown Genre',
          year: tags.year || 'Unknown Year',
          duration: null, // jsmediatags doesn't directly provide duration, will need another library or calculate
          filePath: `/music/${file}`, // Path relative to public directory
          // Add cover art if available
          coverArt: tags.picture ? `data:${tags.picture.format};base64,${Buffer.from(tags.picture.data).toString('base64')}` : null,
        };
        allMusicData.push(musicData);
      }
    } catch (error) {
      console.error(`Failed to process ${file}:`, error);
    }
  }

  fs.writeFileSync(outputFile, JSON.stringify(allMusicData, null, 2));
  console.log(`Metadata extracted and saved to ${outputFile}`);
}

extractMetadata();