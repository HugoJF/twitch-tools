import fs from 'fs';
import axios from 'axios';
import {EventEmitter} from 'events';
import {TransferSpeedCalculator} from './transfer-speed-calculator';
import {appPath} from './utils';
import {logger} from './logger';
import { retry } from '@lifeomic/attempt';

let dryRunning = false;

export function dryRuns(enabled = true) {
    dryRunning = enabled;
}

export class Downloader extends EventEmitter {
    private readonly url: string;
    private readonly path: string;

    private tries: number;
    private maxTries: number;

    private speed: TransferSpeedCalculator;

    constructor(url: string, path: string) {
        super();

        this.url = url;
        this.path = appPath(path);

        this.tries = 0;
        this.maxTries = 0;

        this.speed = new TransferSpeedCalculator;

        // Bubble 'progress' event up
        this.speed.on('progress', this.emit.bind(this, 'progress'));
    }

    async download(): Promise<boolean> {
        do {
            try {
                await this.startDownload();

                return true;
            } catch (e) {
                logger.error(`[${this.tries}/${this.maxTries}] Error while starting download`);
                logger.error(e);
            }
        } while (++this.tries < this.maxTries);

        return false;
    }

    private startDownload() {
        return new Promise(async (res, rej) => {
            const method = dryRunning ? 'HEAD' : 'GET';
            const {data} = await axios({
                url: this.url,
                method: method,
                responseType: 'stream'
            });

            // TODO: type this
            data.on('data', (chunk: any) => {
                this.speed.data(chunk.length);
            });

            data.on('close', async () => {
                logger.verbose(`Download ${this.url} finished on ${this.path}`);
                await retry(async () => fs.renameSync(`${this.path}.progress`, `${this.path}`), {
                    delay: 200,
                    factor: 2,
                    maxDelay: 1000,
                });
                res(this.path);
            });

            data.pipe(fs.createWriteStream(`${this.path}.progress`));
        });
    }
}
