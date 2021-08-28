require('dotenv').config();
import {ClipDownloader} from '../src/twitch/clip-downloader';
import {bootLogger, dryRuns, instance, loadInstance, YoutubedlDownloader} from '../src';

test('test clip downloader will not raise exception', async () => {
    bootLogger(true);
    await loadInstance(process.env.TW_CLIENT_ID as string, process.env.TW_CLIENT_SECRET as string);
    await instance().load();

    // Ensure youtubeDl is installed as ClipDownloader needs it
    const youtubedlDownloader = new YoutubedlDownloader();
    await youtubedlDownloader.download();

    // Avoid full downloads
    dryRuns();

    const clipUrl = 'https://clips.twitch.tv/SassyKawaiiMallardTTours-7vNzQmvsJDGoicMB?tt_content=url&tt_medium=clips_api';
    const clipDownloader = new ClipDownloader(clipUrl);

    await clipDownloader.download();
});
