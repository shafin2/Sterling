import type { Config } from 'tailwindcss';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const preset = require('@sterling/config/tailwind').default;
import animate from 'tailwindcss-animate';

const config: Config = {
  presets: [preset],
  content: ['./src/**/*.{ts,tsx}'],
  plugins: [animate],
};

export default config;
