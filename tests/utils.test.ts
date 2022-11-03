import {twitchClipUrlToId} from '../src';

const urls = [
    [
        'https://clips.twitch.tv/SassyKawaiiMallardTTours-7vNzQmvsJDGoicMB',
        'SassyKawaiiMallardTTours-7vNzQmvsJDGoicMB',
    ], [
        'https://clips.twitch.tv/EnthusiasticAnnoyingCockroachNotLikeThis-HJPYZFxKOH5mF2oP',
        'EnthusiasticAnnoyingCockroachNotLikeThis-HJPYZFxKOH5mF2oP'
    ]
];

test.each(urls)('clip id is extracted from url', async (url, expectedId) => {
    const id = twitchClipUrlToId(url);

    expect(id).toStrictEqual(expectedId);
});
