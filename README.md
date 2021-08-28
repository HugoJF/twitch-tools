# Twitch Tools

Cool library to work with Twitch stuff


[![test](https://img.shields.io/github/v/tag/hugojf/twitch-tools?label=version)](https://codecov.io/gh/HugoJF/twitch-clip-downloader)
[![test](https://img.shields.io/github/workflow/status/hugojf/twitch-tools/Run%20tests?label=tests)](https://codecov.io/gh/HugoJF/twitch-clip-downloader)
[![test](https://img.shields.io/github/issues/hugojf/twitch-tools)](https://codecov.io/gh/HugoJF/twitch-clip-downloader)
[![test](https://img.shields.io/github/license/hugojf/twitch-tools)](https://codecov.io/gh/HugoJF/twitch-clip-downloader)

There is ALOT of work currently being done in the library. I try to follow Semver but don't expect anything for it, there are alot of APIs that are far from what I want and I sometimes get carried away changing stuff.

Expect alot of undocumented things, so feel free to explore the source code to find stuff you might need. I'm just documenting parts that I actually use in other projects (for now).

## Tools available

#### Clips downloader

Fetches clips from a specific channel and downloads them in parallel to increase throughput.

##### Example
```typescript
const clipsDownloader = new ClipsDownloader(channel, userId, [options])

await clipsDownloader.start();
```

##### Constructor
 - `channel`: channel name;
 - `userId`: user ID for that channel [(information)](#how-to-fetch-userid);
 - `options`:
   - `parallelDownloads`: how many clips should be downloaded at the same time (default = 20, higher = more CPU and more network throughput).

##### Methods
 - `start()`: downloads every Clip from specified channel. Payload is `clip: Clip`.

##### Events
 - `clip-downloaded`: emitted after each Clip is downloaded.

## FAQ
#### How to fetch `userId`

The main reason a few APIs still require `userId` is to avoid calling Twitch's API multiple times without the need for it. Since each part of this repository can be used separately, I just decided to avoid implementing some kind of caching just for this.
