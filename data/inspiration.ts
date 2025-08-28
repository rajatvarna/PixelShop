/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export interface Inspiration {
    id: string;
    prompt: string;
    type: 'filters' | 'adjust';
    before: string;
    after: string;
}

export const inspirationData: Inspiration[] = [
    {
        id: 'cartoonify',
        prompt: 'Turn this into a vibrant, animated cartoon character with bold outlines and cel-shading.',
        type: 'filters',
        before: 'https://storage.googleapis.com/maker-suite-gallery/pixel-shop/inspiration/cartoon_before.jpg',
        after: 'https://storage.googleapis.com/maker-suite-gallery/pixel-shop/inspiration/cartoon_after.jpg',
    },
    {
        id: 'studio-light',
        prompt: 'Add dramatic, professional studio lighting to the main subject.',
        type: 'adjust',
        before: 'https://storage.googleapis.com/maker-suite-gallery/pixel-shop/inspiration/studiolight_before.jpg',
        after: 'https://storage.googleapis.com/maker-suite-gallery/pixel-shop/inspiration/studiolight_after.jpg',
    },
    {
        id: 'watercolor',
        prompt: 'Convert the image into a soft, textured watercolor painting with blended colors and soft edges.',
        type: 'filters',
        before: 'https://storage.googleapis.com/maker-suite-gallery/pixel-shop/inspiration/watercolor_before.jpg',
        after: 'https://storage.googleapis.com/maker-suite-gallery/pixel-shop/inspiration/watercolor_after.jpg',
    },
    {
        id: 'synthwave',
        prompt: 'Apply a vibrant 80s synthwave aesthetic with neon magenta and cyan glows, and subtle scan lines.',
        type: 'filters',
        before: 'https://storage.googleapis.com/maker-suite-gallery/pixel-shop/inspiration/synthwave_before.jpg',
        after: 'https://storage.googleapis.com/maker-suite-gallery/pixel-shop/inspiration/synthwave_after.jpg',
    },
    {
        id: 'golden-hour',
        prompt: 'Adjust the color temperature to give the image warmer, golden-hour style lighting.',
        type: 'adjust',
        before: 'https://storage.googleapis.com/maker-suite-gallery/pixel-shop/inspiration/goldenhour_before.jpg',
        after: 'https://storage.googleapis.com/maker-suite-gallery/pixel-shop/inspiration/goldenhour_after.jpg',
    },
    {
        id: 'pixel-art',
        prompt: 'Transform this photo into 16-bit pixel art, like a character from a classic video game.',
        type: 'filters',
        before: 'https://storage.googleapis.com/maker-suite-gallery/pixel-shop/inspiration/pixelart_before.jpg',
        after: 'https://storage.googleapis.com/maker-suite-gallery/pixel-shop/inspiration/pixelart_after.jpg',
    },
];
