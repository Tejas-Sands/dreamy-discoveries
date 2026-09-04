/**
 * Minimal Microsoft Edge "Read Aloud" TTS client (the same free service the
 * Edge browser uses). No API key needed. Returns MP3 audio plus real
 * word-boundary timestamps, which drive the karaoke highlighting.
 *
 * The Sec-MS-GEC token is required since late 2024: SHA-256 of the Windows
 * file time (rounded down to 5 minutes) concatenated with the client token.
 */
import crypto from "node:crypto";
import fs from "node:fs";

const TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
const CHROMIUM_FULL_VERSION = "143.0.3650.75";
const CHROMIUM_MAJOR = CHROMIUM_FULL_VERSION.split(".")[0];
const OUTPUT_FORMAT = "audio-24khz-96kbitrate-mono-mp3";

const WSS_HEADERS = {
  Pragma: "no-cache",
  "Cache-Control": "no-cache",
  Origin: "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold",
  "User-Agent":
    `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36` +
    ` (KHTML, like Gecko) Chrome/${CHROMIUM_MAJOR}.0.0.0 Safari/537.36 Edg/${CHROMIUM_MAJOR}.0.0.0`,
  "Accept-Language": "en-US,en;q=0.9",
};

function secMsGec() {
  let ticks = BigInt(Math.floor(Date.now() / 1000) + 11644473600);
  ticks -= ticks % 300n;
  ticks *= 10000000n;
  return crypto
    .createHash("sha256")
    .update(`${ticks}${TRUSTED_CLIENT_TOKEN}`, "ascii")
    .digest("hex")
    .toUpperCase();
}

const connectionId = () => crypto.randomUUID().replace(/-/g, "");

const escapeXml = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/'/g, "&apos;").replace(/"/g, "&quot;");

/**
 * @returns {Promise<{words: {text: string, start: number, end: number}[]}>}
 *   `start`/`end` are seconds relative to the start of the audio file.
 */
export async function edgeSynthesize({ text, voice, outputPath, rate = "+0%", pitch = "+0Hz" }) {
  const url =
    `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1` +
    `?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}` +
    `&Sec-MS-GEC=${secMsGec()}` +
    `&Sec-MS-GEC-Version=1-${CHROMIUM_FULL_VERSION}` +
    `&ConnectionId=${connectionId()}`;

  // Node's built-in WebSocket is undici's, which accepts a non-standard
  // `headers` option — the service rejects connections without Edge-like headers.
  const ws = new WebSocket(url, { headers: WSS_HEADERS });
  ws.binaryType = "arraybuffer";
  const audioChunks = [];
  const words = [];
  let finished = false;

  await new Promise((resolve, reject) => {
    const fail = (err) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      try {
        ws.close();
      } catch {}
      reject(err);
    };
    const timeout = setTimeout(() => fail(new Error("edge-tts timed out after 30s")), 30000);

    ws.onopen = () => {
      const ts = new Date().toString();
      ws.send(
        `X-Timestamp:${ts}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
          JSON.stringify({
            context: {
              synthesis: {
                audio: {
                  metadataoptions: { sentenceBoundaryEnabled: "false", wordBoundaryEnabled: "true" },
                  outputFormat: OUTPUT_FORMAT,
                },
              },
            },
          }) +
          "\r\n"
      );
      const ssml =
        `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>` +
        `<voice name='${voice}'><prosody pitch='${pitch}' rate='${rate}' volume='+0%'>` +
        escapeXml(text) +
        `</prosody></voice></speak>`;
      ws.send(
        `X-RequestId:${connectionId()}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${ts}Z\r\nPath:ssml\r\n\r\n${ssml}`
      );
    };

    ws.onmessage = (ev) => {
      if (typeof ev.data === "string") {
        if (ev.data.includes("Path:audio.metadata")) {
          const body = ev.data.slice(ev.data.indexOf("\r\n\r\n") + 4);
          try {
            for (const m of JSON.parse(body).Metadata ?? []) {
              if (m.Type === "WordBoundary") {
                words.push({
                  text: m.Data.text.Text,
                  start: m.Data.Offset / 1e7,
                  end: (m.Data.Offset + m.Data.Duration) / 1e7,
                });
              }
            }
          } catch {}
        } else if (ev.data.includes("Path:turn.end")) {
          finished = true;
          clearTimeout(timeout);
          ws.close();
          resolve();
        }
      } else {
        const buf = Buffer.from(ev.data);
        const headerLen = buf.readUInt16BE(0);
        if (buf.subarray(2, 2 + headerLen).toString("utf8").includes("Path:audio")) {
          audioChunks.push(buf.subarray(2 + headerLen));
        }
      }
    };

    ws.onerror = () => fail(new Error("edge-tts websocket error (connection refused?)"));
    ws.onclose = (ev) => fail(new Error(`edge-tts connection closed early (code ${ev.code})`));
  });

  if (audioChunks.length === 0) {
    throw new Error("edge-tts returned no audio");
  }
  fs.writeFileSync(outputPath, Buffer.concat(audioChunks));
  return { words };
}
