import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const FRONTEND_URL = process.env.SMOKE_FRONTEND_URL || "http://127.0.0.1:5174";
const DEBUG_PORT = Number(process.env.SMOKE_CHROME_DEBUG_PORT || 9259);
const CHROME_PATH =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitFor(check, message, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(message);
}

async function stopProcess(processRef) {
  if (!processRef || processRef.exitCode !== null) return;
  processRef.kill("SIGTERM");
  await waitFor(() => processRef.exitCode !== null, "Chrome did not stop", 5_000).catch(
    () => processRef.kill("SIGKILL"),
  );
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
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description || "Browser evaluation failed");
  }
  return result.result?.value;
}

async function navigateAndReadBrand(client, path) {
  await client.call("Page.navigate", { url: `${FRONTEND_URL}${path}` });
  await waitFor(
    async () => (await evaluate(client, "document.readyState")) === "complete",
    `Page did not load: ${path}`,
  );
  await new Promise((resolve) => setTimeout(resolve, 250));
  return evaluate(
    client,
    `({
      title: document.title,
      icon: document.querySelector('link[rel="icon"]')?.href || "",
    })`,
  );
}

async function main() {
  assert(existsSync(CHROME_PATH), "Google Chrome executable was not found");
  const profileDir = mkdtempSync(join(tmpdir(), "sts-branding-chrome-"));
  let chrome;
  let client;

  try {
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

    const sts = await navigateAndReadBrand(client, "/login");
    assert(sts.title === "STS", `Expected STS title, received ${sts.title}`);
    assert(
      new URL(sts.icon).pathname === "/branding/sts-favicon-64.png",
      `Expected STS favicon, received ${sts.icon}`,
    );

    const araId = await navigateAndReadBrand(client, "/araid");
    assert(araId.title === "AraID", `Expected AraID title, received ${araId.title}`);
    assert(
      new URL(araId.icon).pathname === "/branding/araid-favicon-64.png",
      `Expected AraID favicon, received ${araId.icon}`,
    );

    const restored = await navigateAndReadBrand(client, "/login");
    assert(restored.title === "STS", `Expected restored STS title, received ${restored.title}`);
    assert(
      new URL(restored.icon).pathname === "/branding/sts-favicon-64.png",
      `Expected restored STS favicon, received ${restored.icon}`,
    );

    console.log("smoke:branding-browser ok (STS -> AraID -> STS)");
  } finally {
    client?.close();
    await stopProcess(chrome);
    rmSync(profileDir, { force: true, maxRetries: 5, recursive: true, retryDelay: 100 });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
