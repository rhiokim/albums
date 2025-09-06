import * as fs from 'fs';
import * as path from 'path';

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

export async function getMusicData(): Promise<MusicData[]> {
  const dataDir = path.join(process.cwd(), 'data');
  const filePath = path.join(dataDir, 'music.json');

  if (!fs.existsSync(filePath)) {
    console.warn('data/music.json not found. Returning empty array.');
    return [];
  }

  const fileContents = fs.readFileSync(filePath, 'utf8');
  const musicData: MusicData[] = JSON.parse(fileContents);
  return musicData;
}
