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

/**
 * Recursively gets all MP3 files from a directory.
 * @param dir The directory to search.
 * @param fileList The list of files found so far.
 * @returns A list of absolute paths to MP3 files.
 */
function getMp3FilesRecursive(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      getMp3FilesRecursive(filePath, fileList);
    } else if (file.endsWith('.mp3')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

async function extractMetadata(): Promise<void> {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }

  // Use the recursive function to get all MP3 files
  const mp3FilePaths: string[] = getMp3FilesRecursive(musicDir);
  const allMusicData: MusicData[] = [];

  for (const filePath of mp3FilePaths) {
    // Calculate the relative path for filePath in MusicData
    const relativeFilePath = path.relative(path.join(__dirname, '..', 'public'), filePath).replace(/\\/g, '/');

    try {
      const tags: JsMediaTagsSuccessResponse['tags'] | null = await new Promise((resolve, reject) => {
        jsmediatags.read(filePath, {
          onSuccess: function(response: JsMediaTagsSuccessResponse) {
            resolve(response.tags);
          },
          onError: function(error: { type: string; info: string }) {
            console.error(`Error reading tags from ${filePath}:`, error.type, error.info);
            resolve(null); // Resolve with null to continue processing other files
          }
        });
      });

      if (tags) {
        const musicData: MusicData = {
          id: path.parse(filePath).name, // Use filename as ID
          title: tags.title || path.parse(filePath).name,
          artist: tags.artist || 'Unknown Artist',
          album: tags.album || 'Unknown Album',
          genre: tags.genre || 'Unknown Genre',
          year: tags.year || 'Unknown Year',
          duration: null,
          filePath: `/${relativeFilePath}`,
          coverArt: tags.picture ? `data:${tags.picture.format};base64,${Buffer.from(tags.picture.data as number[]).toString('base64')}` : null,
        };
        allMusicData.push(musicData);
      }
    } catch (error: any) {
      console.error(`Failed to process ${filePath}:`, error);
    }
  }

  fs.writeFileSync(outputFile, JSON.stringify(allMusicData, null, 2));
  console.log(`Metadata extracted and saved to ${outputFile}`);
}

extractMetadata();