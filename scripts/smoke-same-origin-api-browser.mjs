import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const FRONTEND_URL = "http://127.0.0.1:5174";
const DEBUG_PORT = 9257;
const CHROME_PATH =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function stopProcess(processRef) {
  if (!processRef || processRef.exitCode !== null) return;
  processRef.kill("SIGTERM");
  await waitFor(() => processRef.exitCode !== null, "Child process did not stop", 5_000).catch(
    () => processRef.kill("SIGKILL"),
  );
}

async function waitFor(check, message, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(message);
}

class CdpClient {
  constructor(url) {
    this.nextId = 1;
    this.pending = new Map();
    this.socket = new WebSocket(url);
  }

  async connect() {
    await new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result || {});
    });
  }

  call(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.socket.close();
  }
}

async function evaluate(client, expression) {
  const result = await client.call("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description || "Browser evaluation failed");
  }
  return result.result?.value;
}

async function main() {
  assert(existsSync("dist/index.html"), "Run pnpm build before this smoke test");
  assert(existsSync(CHROME_PATH), "Google Chrome executable was not found");

  const profileDir = mkdtempSync(join(tmpdir(), "sts-same-origin-chrome-"));
  const preview = spawn(
    "pnpm",
    ["preview", "--host", "127.0.0.1", "--port", "5174", "--strictPort"],
    { stdio: "ignore" },
  );
  let chrome;
  let client;

  try {
    await waitFor(async () => {
      try {
        return (await fetch(FRONTEND_URL)).ok;
      } catch {
        return false;
      }
    }, "Frontend preview did not start");

    chrome = spawn(
      CHROME_PATH,
      [
        "--headless=new",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        "--remote-allow-origins=*",
        `--remote-debugging-port=${DEBUG_PORT}`,
        `--user-data-dir=${profileDir}`,
        "about:blank",
      ],
      { stdio: "ignore" },
    );

    await waitFor(async () => {
      try {
        return (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).ok;
      } catch {
        return false;
      }
    }, "Chrome DevTools endpoint did not start");

    const targets = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`).then((res) =>
      res.json(),
    );
    const target = targets.find((item) => item.type === "page");
    assert(target?.webSocketDebuggerUrl, "Chrome page target was not available");
    client = new CdpClient(target.webSocketDebuggerUrl);
    await client.connect();
    await client.call("Page.navigate", { url: `${FRONTEND_URL}/line-link` });

    let requestUrl;
    await waitFor(async () => {
      requestUrl = await evaluate(
        client,
        `performance.getEntriesByType("resource")
          .map((entry) => entry.name)
          .find((url) => url.includes("/api/line/link/status")) || ""`,
      );
      return Boolean(requestUrl);
    }, "LINE status request was not observed");

    const parsed = new URL(requestUrl);
    assert(
      parsed.origin === FRONTEND_URL,
      `Expected same-origin API request, received ${requestUrl}`,
    );
    assert(
      parsed.pathname === "/api/line/link/status",
      `Expected /api/line/link/status, received ${parsed.pathname}`,
    );
    console.log(`smoke:same-origin-api-browser ok (${requestUrl})`);
  } finally {
    client?.close();
    await stopProcess(chrome);
    await stopProcess(preview);
    rmSync(profileDir, {
      force: true,
      maxRetries: 5,
      recursive: true,
      retryDelay: 100,
    });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
