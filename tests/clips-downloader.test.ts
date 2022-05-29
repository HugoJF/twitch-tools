import {bootLogger, ClipsDownloader, dryRuns, instance, loadInstance, YoutubedlDownloader} from '../src';

test('test clip downloader will not raise exception', async () => {
    bootLogger(true);
    await loadInstance(process.env.TW_CLIENT_ID as string, process.env.TW_CLIENT_SECRET as string);
    await instance().load();

    // Ensure youtubeDl is installed as ClipDownloader needs it
    const youtubedlDownloader = new YoutubedlDownloader();
    await youtubedlDownloader.download();

    // Avoid full downloads
    dryRuns();

    const channel = 'teaguenho';
    const user = await instance().api().users({login: channel});
    const userId = user.data.data[0].id;
    let eventCounter = 0;

    const clipDownloader = new ClipsDownloader(channel, userId);
    clipDownloader.on('clip-downloaded', clip => eventCounter++);
    await clipDownloader.start();

    expect(eventCounter).toBeGreaterThan(0);
},600000);
