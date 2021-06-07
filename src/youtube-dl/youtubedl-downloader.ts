import os                                                                  from 'os';
import fs                                                                  from 'fs';
import {binPath, Downloader, ensureDirectoryExists, exists, logger, sleep} from '..';
import {YOUTUBEDL_URL}                                                     from '../configs';

export class YoutubedlDownloader {
    async download(permission: fs.Mode = 0o755): Promise<void> {
        const output = this.path();
        const url = this.url();

        ensureDirectoryExists(binPath());

        if (await exists(output)) {
            return;
        }

        const downloader = new Downloader(url, output);

        logger.verbose(`youtubedl: Download latest version ${url} to ${output}`);
        await downloader.download();

        // TODO: move this to downloader
        fs.chmodSync(output, permission);

        // Delay return to avoid EBUSY errors
        await sleep(1000);
    }

    url(): string {
        return YOUTUBEDL_URL.replace('{filename}', this.filename());
    }

    path(): string {
        return binPath(this.filename());
    }

    filename(): string {
        if (os.platform() === 'win32') {
            return 'youtube-dl.exe';
        } else {
            return 'youtube-dl';
        }
    }
}
