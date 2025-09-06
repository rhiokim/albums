import * as fs from 'fs';
import * as path from 'path';
import * as jsmediatags from 'jsmediatags';
import { PictureType } from 'jsmediatags/types'; // Import necessary types

interface MusicData {
  id: string;
  title: string;
  artist: string;
  album: string;
  genre: string;
  year: string;
  duration: number | null;
  filePath: string;
  coverArt: string | null;
}

// Define a custom type for the object returned by jsmediatags.read().onSuccess
interface JsMediaTagsSuccessResponse {
  tags: {
    title?: string;
    artist?: string;
    album?: string;
    genre?: string;
    year?: string;
    picture?: PictureType;
    // Add other properties you might need from the tags object
  };
}

const musicDir: string = path.join(__dirname, '..', 'public', 'music');
const dataDir: string = path.join(__dirname, '..', 'data');
const outputFile: string = path.join(dataDir, 'music.json');

async function extractMetadata(): Promise<void> {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }

  const files: string[] = fs.readdirSync(musicDir).filter((file: string) => file.endsWith('.mp3'));
  const allMusicData: MusicData[] = [];

  for (const file of files) {
    const filePath: string = path.join(musicDir, file);
    try {
      const tags: JsMediaTagsSuccessResponse['tags'] | null = await new Promise((resolve, reject) => {
        jsmediatags.read(filePath, {
          onSuccess: function(response: JsMediaTagsSuccessResponse) {
            resolve(response.tags);
          },
          onError: function(error: { type: string; info: string }) {
            console.error(`Error reading tags from ${file}:`, error.type, error.info);
            resolve(null); // Resolve with null to continue processing other files
          }
        });
      });

      if (tags) {
        const musicData: MusicData = {
          id: path.parse(file).name,
          title: tags.title || path.parse(file).name,
          artist: tags.artist || 'Unknown Artist',
          album: tags.album || 'Unknown Album',
          genre: tags.genre || 'Unknown Genre',
          year: tags.year || 'Unknown Year',
          duration: null,
          filePath: `/music/${file}`,
          coverArt: tags.picture ? `data:${tags.picture.format};base64,${Buffer.from(tags.picture.data as number[]).toString('base64')}` : null,
        };
        allMusicData.push(musicData);
      }
    } catch (error: any) {
      console.error(`Failed to process ${file}:`, error);
    }
  }

  fs.writeFileSync(outputFile, JSON.stringify(allMusicData, null, 2));
  console.log(`Metadata extracted and saved to ${outputFile}`);
}

extractMetadata();