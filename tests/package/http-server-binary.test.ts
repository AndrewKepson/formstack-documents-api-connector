import assert from "node:assert/strict";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { test } from "node:test";

const START_TIMEOUT_MS = 5_000;
const EXIT_TIMEOUT_MS = 5_000;

interface ProcessExit {
  code: number | null;
  signal: NodeJS.Signals | null;
}

function waitForServerPort(child: ChildProcessWithoutNullStreams): Promise<number> {
  return new Promise((resolve, reject) => {
    let output = "";
    const timeout = setTimeout(() => {
      reject(new Error(`Timed out waiting for server startup. Output: ${output}`));
    }, START_TIMEOUT_MS);

    child.stdout.on("data", (chunk: Buffer) => {
      output += chunk.toString();
      const match = output.match(/listening on http:\/\/127\.0\.0\.1:(\d+)/);
      if (match?.[1]) {
        clearTimeout(timeout);
        resolve(Number(match[1]));
      }
    });

    child.stderr.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });

    child.once("exit", (code, signal) => {
      clearTimeout(timeout);
      reject(new Error(`Server exited before startup (code ${code}, signal ${signal}). Output: ${output}`));
    });
    child.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

function waitWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms`)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timeout);
        reject(error);
      }
    );
  });
}

test("built Hono server serves health and shuts down cleanly", async () => {
  const child = spawn(process.execPath, ["dist/server.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: "0",
      ALLOW_ENV_CREDENTIAL_FALLBACK: "false"
    }
  });
  const exit = new Promise<ProcessExit>((resolve) => {
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });

  try {
    const port = await waitForServerPort(child);
    const response = await fetch(`http://127.0.0.1:${port}/health`);

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      ok: true,
      service: "formstack-documents-api-connector"
    });

    assert.equal(child.kill("SIGTERM"), true);
    assert.deepEqual(await waitWithTimeout(exit, EXIT_TIMEOUT_MS), { code: 0, signal: null });
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill("SIGKILL");
      await exit;
    }
  }
});
