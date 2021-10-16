import pool from 'tiny-async-pool';
import ffmpeg from 'fluent-ffmpeg';
import {EventEmitter} from 'events';
import {
    appPath,
    bpsToHuman,
    Dict,
    Downloader,
    ensureAppDirectoryExists,
    existsSync,
    instance,
    logger,
    TransferSpeedCalculator,
    twitchVideoUrlToId,
    Video,
    videosPath,
    writeFile
} from '..';
import {VideoFragmentsFetcher} from './video-fragments-fetcher';
import {ChatDownloader} from './chat-downloader';

type ExtraOptions = {
    parallelDownloads?: number;
}

export class VideoDownloader extends EventEmitter {
    private videoOrUrl: Video | string;

    private readonly downloadInstances: number;

    private readonly speed: TransferSpeedCalculator;

    constructor(video: Video|string, options: ExtraOptions = {}) {
        super();

        this.videoOrUrl = video;

        this.downloadInstances = options.parallelDownloads ?? 20;

        this.speed = new TransferSpeedCalculator;

        this.speed.on('speed', this.emit.bind(this, 'speed'));
    }

    async resolveVideo() {
        if (typeof this.videoOrUrl === 'string') {
            const id = twitchVideoUrlToId(this.videoOrUrl);
            logger.verbose(`Extracted ID ${id} from URL ${this.videoOrUrl}`);
            const response = await instance().api().videos({id});
            this.videoOrUrl = response.data.data[0];
        }
    }

    transcode(): Promise<void> {
        const video = this.videoOrUrl as Video;
        return new Promise((res, rej) => {
            logger.info(`Started video ${video.id} transcode`);
            ffmpeg()
                .input(appPath(`videos/${video.id}.all.ts`))
                .inputOption('-safe 0')
                .inputFormat('concat')
                .addOption('-bsf:a', 'aac_adtstoasc')
                .videoCodec('copy')
                .on('start', logger.verbose.bind(logger))
                .on('progress', logger.verbose.bind(logger))
                .on('stderr', logger.error.bind(logger))
                .on('error', (e) => {
                    logger.error.bind(logger);
                    rej(e);
                })
                .on('end', () => {
                    logger.verbose(`Transcode of ${video.id} finished`);
                    res();
                })
                .save(appPath(`videos/${video.id}.mp4`));

            logger.info(`Finished video ${video.id} transcode`);
        });

    }

    async downloadChat(): Promise<void> {
        const chatDownloader = new ChatDownloader(this.videoOrUrl as Video);

        await chatDownloader.download();
    }

    async download(): Promise<void> {
        await this.resolveVideo();
        const video = this.videoOrUrl as Video;

        logger.info(`Starting video download [${video.id}]: ${video.title}`);
        const urls = await (new VideoFragmentsFetcher(video.url)).fragments();

        // Video metadata
        writeFile(videosPath(`${video.id}.meta`), JSON.stringify(video));

        // Fragments ID with URL
        writeFile(videosPath(`${video.id}.fragments`), JSON.stringify(urls));

        // Fragment list for ffmpeg
        const ffmpegInput = Object.keys(urls).map(id => {
            const fragPath = videosPath(`${video.id}/${id}'`);

            return `file '${fragPath}'`;
        }).join('\n');
        writeFile(videosPath(`${video.id}.all.ts`), ffmpegInput);

        this.emit('fragments-fetched', Object.values(urls).length);
        logger.info(`Found ${Object.values(urls).length} fragments`);
        logger.verbose({urls});

        ensureAppDirectoryExists(`videos/${video.id}`);

        this.speed.reset();
        this.speed.on('speed', bps => logger.verbose(`Downloading at ${bpsToHuman(bps)}`));

        await this.downloadFragments(urls);

        logger.verbose('Starting download pool');
    }

    private async downloadFragments(fragmentsUrl: Dict<string>): Promise<void> {
        await pool<[string, string], string>(
            this.downloadInstances,
            Object.entries(fragmentsUrl),
            this.downloadFragment.bind(this)
        );
    }

    private async downloadFragment(fragmentData: [string, string]): Promise<string> {
        const video = this.videoOrUrl as Video;
        const [name, url] = fragmentData;
        const path = `videos/${video.id}/${name}`;

        if (!existsSync(appPath(path))) {
            const downloader = new Downloader(url, path);

            downloader.on('progress', this.speed.data.bind(this.speed));

            await downloader.download();
        } else {
            logger.verbose(`Skipped download of ${url}, already exists`);
        }

        this.emit('fragment-downloaded', name);

        return name;
    }
}
