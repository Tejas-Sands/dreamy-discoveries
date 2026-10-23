import { Config } from "@remotion/cli/config";
import {VIDEO_ENCODING} from './scripts/lib/render-profile.mjs';

Config.setEntryPoint("src/index.ts");
Config.setVideoImageFormat("jpeg");
Config.setColorSpace(VIDEO_ENCODING.colorSpace);
Config.setPixelFormat(VIDEO_ENCODING.pixelFormat);
Config.overrideFfmpegCommand(VIDEO_ENCODING.ffmpegOverride);
Config.setOverwriteOutput(true);
