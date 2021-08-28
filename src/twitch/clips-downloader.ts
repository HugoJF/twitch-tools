import pool                                                     from 'tiny-async-pool';
import {EventEmitter}                                           from 'events';
import {ensureAppDirectoryExists, write} from '../helpers/filesystem';
import {TransferSpeedCalculator}                                from '../helpers/transfer-speed-calculator';
import {ClipFetcher}                                            from './clip-fetcher';
import {Clip, Dict} from '..';
import {appPath} from '..';
import {logger}  from '..';
import {ClipDownloader} from './clip-downloader';
import {emit} from 'cluster';

type ExtraOptions = {
    parallelDownloads?: number;
}

export class ClipsDownloader extends EventEmitter {
    private readonly channel: string;
    private readonly userId: string;

    public readonly clipsFetcher: ClipFetcher;
    public readonly speed: TransferSpeedCalculator;

    private readonly parallelDownloads: number;

    constructor(channel: string, userId: string, options: ExtraOptions = {}) {
        super();

        this.channel = channel;
        this.userId = userId;

        this.clipsFetcher = new ClipFetcher(this.userId);
        this.speed = new TransferSpeedCalculator;

        this.parallelDownloads = options.parallelDownloads ?? 20;
    }

    fetchClips(): Promise<Dict<Clip>> {
        return this.clipsFetcher.start();
    }

    writeMetaFile = async (channel: string, data: any): Promise<void> => {
        logger.info('Writing meta data to disk');
        return write(appPath(`${channel}.meta`), JSON.stringify(data));
    };

    // clips
    async downloadClips(clips: Dict<Clip>): Promise<void> {
        const clipCount = Object.values(clips).length;

        ensureAppDirectoryExists('clips');

        await pool(
            this.parallelDownloads,
            Object.values(clips),
            this.downloadClip.bind(this)
        );

        logger.info(`Finished download of ${clipCount} clips!`);
    }

    private async downloadClip(clip: Clip): Promise<void> {
        const clipDownloader = new ClipDownloader(clip);
        await clipDownloader.download();

        this.emit('clip-downloaded', clip);
    }

    async start() {
        const clips = await this.fetchClips();

        await this.downloadClips(clips);
    }
}
