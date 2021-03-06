import pool from 'tiny-async-pool';
import * as fns from 'date-fns';
import {instance} from './twitch';
import {EventEmitter} from 'events';
import {formatRFC7231} from 'date-fns';
import {
    checkCache,
    Clip,
    Dict,
    generateBatches,
    getCache,
    iterable,
    logger,
    pathableDate,
    Period,
    saveCache,
    sleep,
    splitPeriod,
    TwitchClipsApiResponse
} from '..';

export class ClipFetcher extends EventEmitter {
    private readonly userId: string;

    private readonly clips: Dict<Clip>;
    private readonly apiInstances = 20;
    private readonly batchClipThreshold = 500;

    constructor(userId: string) {
        super();

        this.userId = userId;
        this.clips = {};
    }

    private async paginate(period: Period, cursor: undefined | string): Promise<TwitchClipsApiResponse | false> {
        try {
            const {left, right} = period;

            const response = await instance().api().clips({
                broadcaster_id: this.userId,
                first: 100,
                after: cursor,
                started_at: fns.formatRFC3339(left),
                ended_at: fns.formatRFC3339(right)
            });

            const {headers, status, data} = response;

            if (status !== 200) {
                logger.error(`Error while fetching clips [code ${status}]: ${data.data}`);
                process.exit(1);
            }

            return data;
        } catch (e) {
            logger.error('Error while paginating the API', e);

            return false;
        }
    }

    private async fetchClipsFromBatch(period: Period) {
        const {left, right} = period;
        const clipsFromBatch: Dict<Clip> = {};
        let cursor;

        logger.verbose(`Fetching clips from period ${period.left} ~ ${period.right}`);

        do {
            // This somehow fixes type-hinting in PhpStorm
            const responsePromise = this.paginate(period, cursor);
            const response = await responsePromise;

            logger.verbose({cursor, response});

            if (response === false) {
                logger.error('Error while paginating, waiting a few seconds before continuing...');
                await sleep(10000);

                continue;
            }

            if (!iterable(response.data)) {
                logger.error('API returned 200 but data is not iterable, waiting before trying again...');
                await sleep(10000);

                continue;
            }

            for (const clip of response.data) {
                clipsFromBatch[clip.id] = clip;
                this.clips[clip.id] = clip;
            }

            this.emitClipCount();

            cursor = response?.pagination?.cursor;
        } while (cursor);

        const clipCount = Object.keys(clipsFromBatch).length;

        logger.verbose(`Period ${formatRFC7231(left)} to ${formatRFC7231(right)} resulted in ${clipCount} clips`);

        if (clipCount > this.batchClipThreshold) {
            logger.info(`Found ${clipCount} in one period, which is above the ${this.batchClipThreshold} limit, splitting period...`);
            const newPeriods = splitPeriod(period);

            const newClipsDicts: Dict<Clip>[] = [];

            for (const newPeriod of newPeriods) {
                logger.verbose(`Fetching clips from ${newPeriod.left} to ${newPeriod.right}`);

                newClipsDicts.push(await this.fetchClipsFromBatch(newPeriod));
            }

            const newClips = newClipsDicts.reduce((total, part) => ({...total, ...part}), {});

            logger.info(`After splitting period, found ${Object.keys(newClips).length} (from period ${clipCount})`);

            // this.clips = {...this.clips, ...newClips};
            for (const [key, value] of Object.entries(newClips)) {
                this.clips[key] = value;
            }
            this.emitClipCount();

            return newClips;
        }

        return clipsFromBatch;
    }

    async start(): Promise<Dict<Clip>> {
        const batches = generateBatches();

        this.emit('batch-generated', batches.length);

        const process = async (period: Period) => {
            let clips;
            // Build the cache file path
            const leftDate = pathableDate(period.left);
            const rightDate = pathableDate(period.right);
            const cacheKey = `${leftDate}+${rightDate}`;
            const cacheDir = `${this.userId}-clips`;
            const cacheExists = await checkCache(cacheDir, cacheKey);

            let loaded = false;

            if (!cacheExists) {
                logger.verbose(`Could not find cache for key ${cacheKey}`);
            }

            if (cacheExists) {
                logger.verbose(`Found cache for key ${cacheKey}`);
                const buffer = await getCache(cacheDir, cacheKey);
                try {
                    clips = JSON.parse(buffer);
                    loaded = true;
                } catch (e) {
                    logger.error(`Error parsing JSON from ${cacheKey}: ${e}`);
                    logger.verbose({e});
                }
            }

            if (!loaded) {
                clips = await this.fetchClipsFromBatch(period);
                saveCache(cacheDir, cacheKey, JSON.stringify(clips));
            }

            // this.clips = {...this.clips, ...clips};
            for (const [key, value] of Object.entries(clips)) {
                this.clips[key] = value as Clip;
            }

            this.emitClipCount();

            this.emit('batch-finished');
        };

        await pool(this.apiInstances, batches, process);

        return this.clips;
    }

    private emitClipCount() {
        this.emit('clip-count', Object.keys(this.clips).length);
    }
}
