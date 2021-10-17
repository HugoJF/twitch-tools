# Twitch Tools

Cool library to work with Twitch stuff


[![test](https://img.shields.io/github/v/tag/hugojf/twitch-tools?label=version)](https://codecov.io/gh/HugoJF/twitch-clip-downloader)
[![test](https://img.shields.io/github/workflow/status/hugojf/twitch-tools/Run%20tests?label=tests)](https://codecov.io/gh/HugoJF/twitch-clip-downloader)
[![test](https://img.shields.io/github/issues/hugojf/twitch-tools)](https://codecov.io/gh/HugoJF/twitch-clip-downloader)
[![test](https://img.shields.io/github/license/hugojf/twitch-tools)](https://codecov.io/gh/HugoJF/twitch-clip-downloader)

There is ALOT of work currently being done in the library. I try to follow Semver but don't expect anything for it, there are alot of APIs that are far from what I want and I sometimes get carried away changing stuff.

Expect alot of undocumented things, so feel free to explore the source code to find stuff you might need. I'm just documenting parts that I actually use in other projects (for now).

## Clips downloader

Fetches clips from a specific channel and downloads them in parallel to increase throughput.

#### Example
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
- `clip-downloaded(void)`: emitted after each Clip is downloaded.

## Video downloader

Fetches .m3u8 playlist for specific video and downloads each fragment in parallel to increase network throughput. You can also download the entire chat of a VOD.

#### Example
```typescript
const videoDownloader = new VideoDownloader(videoOrUrl, options);

await videoDownloader.download();
await videoDownloader.downloadChat();
```

##### Constructor
- `videoOrUrl`: Video object (fetched from API) or video URL;
- `options`:
   - `parallelDownloads`: how many fragments should be downloaded at the same time (default = 20, higher = more CPU and more network throughput).

##### Methods
- `download()`: download video; 
- `downloadChat()`: download chat.

##### Events
- `fragments-fetched(fragmentCount: number)`: emits the total fragment count parsed from playlist;
- `fragment-downloaded(void)`: emitted when a fragment is download;
- `page-downloaded(void)`: emmited when a chat page is downloaded;
- `speed(speed: number)`: emitted every second during downloads with speed in Bps.

## FAQ
#### How to fetch `userId`

The main reason a few APIs still require `userId` is to avoid calling Twitch's API multiple times without the need for it. Since each part of this repository can be used separately, I just decided to avoid implementing some kind of caching just for this.
