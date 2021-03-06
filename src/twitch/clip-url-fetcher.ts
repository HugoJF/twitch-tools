import {Clip, logger, YoutubeDlClipDump} from '..';
import youtubedl                         from '../youtube-dl/youtubedl';

export async function getClipUrl(clip: Clip): Promise<string | null> {
    logger.verbose(`Fetching clip URL for: ${clip.title}`);

    // Use YoutubeDL to fetch manifest URL
    try {
        const meta = (await youtubedl().getVideoInfo(clip.url)) as YoutubeDlClipDump;
        logger.verbose(`youtube-dl: ${clip.title} .mp4 file URL: ${meta.url}`);

        return meta.url;
    } catch (e) {
        logger.verbose(`youtube-dl: Failed to retrieve the clip URL for ${clip.title}: ${e}`);

        return null;
    }
}
