import axios from 'axios';
import {
    apiDelay,
    convert,
    HelixOptions,
    logger,
    OAuth2Options,
    readFile,
    sleep,
    TwitchClipsApiParams,
    TwitchClipsApiResponse,
    TwitchUsersApiParams,
    TwitchUsersApiResponse,
    TwitchVideosApiParams,
    TwitchVideosApiResponse,
    writeFile
} from '..';

let _instance: Twitch;

export async function loadInstance(clientId: string, clientSecret: string): Promise<void> {
    _instance = new Twitch(clientId, clientSecret);

    return _instance.load();
}

export function instance(): Twitch {
    return _instance;
}

export class Twitch {
    private token: string;

    constructor(
        private readonly clientId: string,
        private readonly clientSecret: string,
        private readonly apiTokenPath = 'token.txt'
    ) {
        this.token = '';
    }

    async load(): Promise<void> {
        try {
            const buffer = await readFile(this.apiTokenPath);
            this.token = buffer.toString();
            logger.info(`Read Twitch API OAuth2 token (${this.token}) from file.`);
        } catch (e) {
            logger.info('Could not read Twich API OAuth2 token from file, generating another one...');

            await this.generateToken();
        }
    }

    async helix<T>(options: HelixOptions) {
        const request = await axios.request<T>({
            baseURL: 'https://api.twitch.tv/helix',
            headers: {
                Authorization: `Bearer ${this.token}`,
                'Client-ID': this.clientId,
            },
            ...options
        });

        const rateLimitRemaining = request.headers?.['ratelimit-remaining'];
        const rateLimitLimit = request.headers?.['ratelimit-limit'];

        if (rateLimitLimit && rateLimitRemaining) {
            const delay = apiDelay(
                parseInt(rateLimitRemaining),
                parseInt(rateLimitLimit),
                convert(60).seconds.to.millis()
            );
            logger.info(`Delaying API response by ${delay}ms. Rate limit ${rateLimitRemaining}/${rateLimitLimit}`);
            await sleep(delay);
        } else {
            logger.warning('Could not read API rate-limit headers', request.headers);
        }

        return request;
    }

    api() {
        return ({
            clips: (params: TwitchClipsApiParams) => {
                return this.helix<TwitchClipsApiResponse>({
                    url: 'clips',
                    params
                });
            },
            users: (params: TwitchUsersApiParams) => {
                return this.helix<TwitchUsersApiResponse>({
                    url: 'users',
                    params
                });
            },
            videos: (params: TwitchVideosApiParams) => {
                return this.helix<TwitchVideosApiResponse>({
                    url: 'videos',
                    params,
                });
            },
        });
    }

    tokenRequest(options: OAuth2Options) {
        return axios.request({
            baseURL: 'https://id.twitch.tv/oauth2/token',
            method: 'POST',
            ...options
        });
    }

    async generateToken(): Promise<string> {
        const response = await this.tokenRequest({
            params: {
                client_id: this.clientId,
                client_secret: this.clientSecret,
                scope: '',
                grant_type: 'client_credentials'
            }
        });

        if (response.status !== 200 && response.status !== 201) {
            logger.info(`Failed to generate Twitch API token, response status: ${response.status}`);
            logger.verbose({responseData: response.data});
            throw new Error(response.statusText);
        }

        this.token = response.data?.access_token;

        logger.info(`Received token ${this.token.substr(0, 5)}`);

        if (!this.token) {
            logger.error('API did not generate an access_token');
            logger.error(response.data);
            throw new Error('API did not generate an access_token');
        }

        writeFile(this.apiTokenPath, this.token);

        return this.token.toString();
    }
}
