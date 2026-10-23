import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const FRONTEND_URL = process.env.SMOKE_FRONTEND_URL || "http://127.0.0.1:5186";
const DEBUG_PORT = Number(process.env.SMOKE_CHROME_DEBUG_PORT || 9265);
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
  await waitFor(
    () => processRef.exitCode !== null,
    "Chrome did not stop",
    5_000,
  ).catch(() => processRef.kill("SIGKILL"));
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
    throw new Error(
      result.exceptionDetails.exception?.description ||
        "Browser evaluation failed",
    );
  }
  return result.result?.value;
}

// Removal-only smoke uses an anonymous session and never submits credentials.
async function main() {
  assert(existsSync(CHROME_PATH), "Google Chrome executable was not found");
  const profileDir = mkdtempSync(join(tmpdir(), "sts-presentation-removal-"));
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
    const targets = await fetch(
      `http://127.0.0.1:${DEBUG_PORT}/json/list`,
    ).then((res) => res.json());
    const target = targets.find((item) => item.type === "page");
    assert(
      target?.webSocketDebuggerUrl,
      "Chrome page target was not available",
    );
    client = new CdpClient(target.webSocketDebuggerUrl);
    await client.connect();
    for (const width of [390, 1440]) {
      await client.call("Emulation.setDeviceMetricsOverride", {
        deviceScaleFactor: 1,
        height: 900,
        mobile: width < 500,
        width,
      });
      await client.call("Page.navigate", { url: `${FRONTEND_URL}/login` });
      await waitFor(
        async () =>
          evaluate(
            client,
            `Boolean(document.querySelector('input[type="password"]'))`,
          ),
        "Login form did not render",
      );
      const state = await evaluate(
        client,
        `({
        buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()),
        inputs: Array.from(document.querySelectorAll('form input')).map(i => ({ type: i.type, value: i.value })),
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
      })`,
      );
      for (const role of [
        "ผู้ดูแลระบบสภา",
        "ผู้บริหารสภา",
        "ผู้ดูแลระบบโรงเรียน",
        "ผู้อำนวยการ",
      ]) {
        assert(
          !state.buttons.includes(role),
          "Presentation role login button remains",
        );
      }
      assert(
        state.buttons.some((label) => label.includes("AraID")),
        "AraID login is missing",
      );
      assert(
        state.buttons.some((label) => label.includes("เข้าสู่ระบบ")),
        "Normal login is missing",
      );
      assert(
        state.inputs.length >= 2 &&
          state.inputs.every((input) => input.value === ""),
        "Login inputs must start empty",
      );
      assert(!state.overflow, "Login page has horizontal overflow");
    }
    console.log(
      "PASS: normal login + AraID remain; demo roles removed; inputs empty; mobile/desktop layout",
    );
  } finally {
    client?.close();
    await stopProcess(chrome);
    rmSync(profileDir, { recursive: true, force: true });
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
