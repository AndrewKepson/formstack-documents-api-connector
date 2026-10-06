import { appendFileSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const manifest = JSON.parse(readFileSync("package.json", "utf8"));
if (manifest.private || manifest.name !== process.env.EXPECTED_PACKAGE || !manifest.version) {
  throw new Error("Unexpected release package identity.");
}
if (!process.env.NODE_AUTH_TOKEN || spawnSync("npm", ["whoami"], { encoding: "utf8" }).status !== 0) {
  throw new Error("A valid npm read token is required to verify release state.");
}
const published = spawnSync("npm", ["view", `${manifest.name}@${manifest.version}`, "--json"], {
  encoding: "utf8",
  maxBuffer: 4000000,
});
let shouldPublish = false;
if (published.status === 0) {
  const metadata = JSON.parse(published.stdout);
  if (metadata.name !== manifest.name || metadata.version !== manifest.version) {
    throw new Error("Published package identity differs from the release candidate.");
  }
  const pins = (section) => JSON.stringify(Object.entries(section ?? {})
    .filter(([name]) => name.startsWith("@redrockswebdevelopment/"))
    .sort(([left], [right]) => left.localeCompare(right)));
  for (const section of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"]) {
    if (pins(manifest[section]) !== pins(metadata[section])) {
      throw new Error("Published Red Rocks dependency pins differ. Bump the package version.");
    }
  }
} else if (/E404/.test(published.stderr)) {
  shouldPublish = true;
} else {
  throw new Error("Cannot verify npm release state. Check npm read access.");
}
appendFileSync(process.env.GITHUB_OUTPUT, `package_name=${manifest.name}
package_version=${manifest.version}
dist_tag=${manifest.publishConfig?.tag ?? "latest"}
should_publish=${shouldPublish}
`);
