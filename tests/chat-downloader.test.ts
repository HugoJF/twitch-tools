require('dotenv').config();
import {bootLogger, ChatDownloader, instance, loadInstance} from '../src';
import {Video} from '../src';

test('test', async () => {
    bootLogger(true);
    await loadInstance(process.env.TW_CLIENT_ID as string, process.env.TW_CLIENT_SECRET as string);
    await instance().load();

    const chatDownloader = new ChatDownloader({
        id: '270958036',
        url: 'https://www.twitch.tv/videos/270958036',
    } as Video);

    const comments = await chatDownloader.download();

    expect(comments.length).toBeGreaterThan(0);
});