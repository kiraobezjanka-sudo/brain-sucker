import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";

const outputDirectory = new URL("./dist/", import.meta.url);
const clientDirectory = new URL("./dist/client/", import.meta.url);
const serverDirectory = new URL("./dist/server/", import.meta.url);

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(clientDirectory, { recursive: true });
await mkdir(serverDirectory, { recursive: true });

for (const file of ["index.html", "styles.css", "game.js"]) {
  await copyFile(new URL(`./${file}`, import.meta.url), new URL(file, clientDirectory));
}

const workerSource = `export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
    const assetUrl = new URL(requestedPath, request.url);
    const response = await env.ASSETS.fetch(new Request(assetUrl, request));

    if (response.status !== 404) return response;
    return env.ASSETS.fetch(new Request(new URL("/index.html", request.url), request));
  },
};
`;

await writeFile(new URL("index.js", serverDirectory), workerSource, "utf8");
console.log("Sites build ready");
