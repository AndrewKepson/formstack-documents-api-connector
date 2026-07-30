import { createRequire } from "node:module";

interface PackageMetadata {
  name: string;
  version: string;
}

const packageMetadata = createRequire(import.meta.url)("../package.json") as PackageMetadata;

export const PACKAGE_NAME = packageMetadata.name;
export const PACKAGE_VERSION = packageMetadata.version;
