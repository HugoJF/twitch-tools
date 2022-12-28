import {EventEmitter} from 'events';
import {ensureDirectoryExists, existsSync, writeFile} from '../helpers/filesystem';
import {TransferSpeedCalculator} from '../helpers/transfer-speed-calculator';
import {getClipUrl} from './clip-url-fetcher';
import {appPath, Clip, Downloader, instance, logger, twitchClipUrlToId} from '..';


export class ClipDownloader extends EventEmitter {
    private clipOrUrl: Clip | string;

    public readonly speed: TransferSpeedCalculator;

    constructor(clipOrUrl: Clip | string) {
        super();
        this.clipOrUrl = clipOrUrl;

        this.speed = new TransferSpeedCalculator;
    }

    async resolveClip() {
        if (typeof this.clipOrUrl === 'string') {
            const id = twitchClipUrlToId(this.clipOrUrl);
            logger.verbose(`Extracted ID ${id} from URL ${this.clipOrUrl}`);
            const response = await instance().api().clips({id});
            this.clipOrUrl = response.data.data[0];
        }
    }

    async download(): Promise<Clip> {
        await this.resolveClip();

        const clip = this.clipOrUrl as Clip;
        const mp4Path = `clips/${clip.id}.mp4`;
        const metaPath = `clips/${clip.id}.meta`;

        ensureDirectoryExists(appPath('clips'));

        if (existsSync(appPath(mp4Path))) {
            logger.verbose(`Clip ${clip.title} found at ${appPath(mp4Path)}`);

            return clip;
        }

        const promises: Promise<any>[] = [];
        const url = await getClipUrl(clip);

        // TODO: writing individual meta file
        promises.push(writeFile(appPath(metaPath), JSON.stringify(clip)));

        if (url) {
            const downloader = new Downloader(url, mp4Path);

            downloader.on('progress', bytes => {
                this.speed.data(bytes);
            });

            logger.verbose(`Downloading clip ${clip.title}`);
            promises.push(downloader.download());
        }

        await Promise.all(promises);

        return clip;
    }
}
