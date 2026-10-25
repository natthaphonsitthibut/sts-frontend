// Browser regression with intercepted fixtures; no backend or production writes.
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const EXTERNAL_FRONTEND_URL = process.env.SMOKE_FRONTEND_URL || "";
const FRONTEND_URL = EXTERNAL_FRONTEND_URL || "http://127.0.0.1:5186";
const DEBUG_PORT = Number(process.env.SMOKE_CHROME_DEBUG_PORT || 9522);
const CHROME_PATH =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

// All requests are intercepted fixtures (AUTOMATED_TEST), never production data.
const SCHOOL_FILTER = {
  schoolId: "12",
  schoolName: "โรงเรียนทดสอบ",
  province: "",
  district: "",
  subDistrict: "",
  userId: 7,
};
const user = {
  id: 7,
  username: "smoke.staff",
  FirstName: "Smoke",
  LastName: "Staff",
  roles: ["CUSTOM_ROLE"],
  permissions: ["manage-classroom-links"],
  data_scope: { school_ids: [12] },
};
const LINK_ID = "00000000-0000-4000-8000-000000000001";
const TEACHER_NAME = "ครูทดสอบอัตโนมัติ";
const api = {
  requests: [],
  unlinkCalls: 0,
  linked: true,
  unlinkFailure: false,
  approveMessage: "",
};
const row = {
  id: LINK_ID,
  schoolId: 12,
  schoolName: SCHOOL_FILTER.schoolName,
  schoolTermId: 20,
  academicYear: 2569,
  semester: 1,
  teacherMembershipId: 31,
  teacherId: "41",
  teacherName: TEACHER_NAME,
  assignedClassroomId: null,
  assignedClassroomSubjectId: null,
  assignedClassroomLabel: null,
  assignedSubjectName: null,
  opensAt: null,
  expiresAt: null,
  assignmentNote: null,
  teacherPhotoUrl: null,
  classroomCount: 1,
  classrooms: [{ classroomId: "51", label: "ม.1/1" }],
  status: "ACTIVE",
  issuedAt: null,
  rotatedAt: null,
  lastUsedAt: null,
};
function answer({ method, path }) {
  if (method === "OPTIONS") return { status: 204, body: null };
  if (path === "/users/me") return { status: 200, body: user };
  let data = [];
  if (["/attendance/schools", "/school-structure/schools"].includes(path))
    data = [{ id: 12, name: SCHOOL_FILTER.schoolName }];
  if (path === "/attendance/terms")
    data = [
      {
        id: "20",
        academicYear: 2569,
        semester: 1,
        status: "ACTIVE",
        label: "2569/1",
      },
    ];
  if (path === "/line/link/status") data = { enabled: true };
  if (path === "/classroom-attendance-links/line-group-invitation") data = null;
  if (path === "/classroom-attendance-links")
    return {
      status: 200,
      body: {
        success: true,
        data: [
          {
            ...row,
            lineDelivery: {
              status: "SENT",
              failureCode: null,
              accountState: api.linked ? "FRIEND" : "NOT_VERIFIED",
              attemptCount: 1,
              deliveredAt: null,
              lastAttemptedAt: null,
              canRetry: api.linked,
              recipientTeacherMembershipId: "31",
              recipientTeacherName: TEACHER_NAME,
            },
          },
        ],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      },
    };
  if (path === `/classroom-attendance-links/${LINK_ID}/unlink-line`) {
    api.unlinkCalls++;
    if (api.unlinkFailure)
      return {
        status: 403,
        body: { message: "ครูมีโรงเรียนที่ใช้งานอยู่นอกขอบเขตของคุณ" },
      };
    const unlinked = api.linked;
    api.linked = false;
    data = { id: LINK_ID, unlinked };
  }
  if (path === "/araid/session/me")
    data = { id: "fixture-profile", fullName: TEACHER_NAME };
  if (path === "/line/link/araid/challenge/details")
    data = {
      challengeToken: "fixture-challenge-token-for-smoke",
      status: "PENDING",
      schoolName: SCHOOL_FILTER.schoolName,
    };
  if (path === "/line/link/araid/challenge/begin")
    data = { expiresAt: new Date(Date.now() + 60000).toISOString() };
  if (path === "/line/link/araid/challenge/approve" && api.approveMessage)
    return { status: 409, body: { message: api.approveMessage } };
  return {
    status: 200,
    body: { success: true, data, rows: [], unreadCount: 0, unseenCount: 0 },
  };
}
async function bodyHas(client, text) {
  return evaluate(
    client,
    `document.body.innerText.includes(${JSON.stringify(text)})`,
  );
}
async function clickButton(client, label, dialog = false) {
  return evaluate(
    client,
    `(() => { const root = ${dialog ? 'document.querySelector("[role=dialog]")' : "document"};
 const b = [...(root?.querySelectorAll('button') || [])].find(n => n.getClientRects().length && (n.getAttribute('aria-label') === ${JSON.stringify(label)} || n.innerText.trim() === ${JSON.stringify(label)})); if (!b) throw new Error('Missing button: ' + ${JSON.stringify(label)}); b.click(); })()`,
  );
}
async function checkUnlink(client) {
  await seedStaffSession(client, user);
  await navigate(client, "/attendance/classroom-links");
  const label = `ยกเลิกการเชื่อม LINE ของ ${TEACHER_NAME}`;
  await waitFor(() => bodyHas(client, TEACHER_NAME), "Teacher list not loaded");
  await clickButton(client, label);
  await waitFor(
    () => bodyHas(client, "ลิงก์เช็กชื่อเดิมยังใช้งานได้"),
    "Confirmation missing",
  );
  await clickButton(client, "ยกเลิก", true);
  assert(api.unlinkCalls === 0, "Cancel performed unlink");
  api.unlinkFailure = true;
  await clickButton(client, label);
  await clickButton(client, "ยกเลิกการเชื่อม LINE", true);
  await waitFor(
    () => bodyHas(client, "ครูมีโรงเรียนที่ใช้งานอยู่นอกขอบเขตของคุณ"),
    "Server denial not shown",
  );
  assert(api.linked, "Failed unlink changed the binding");
  api.unlinkFailure = false;
  await clickButton(client, label);
  await clickButton(client, "ยกเลิกการเชื่อม LINE", true);
  await waitFor(
    async () =>
      !(await evaluate(
        client,
        `Boolean([...document.querySelectorAll('button')].find(n => n.getAttribute('aria-label') === ${JSON.stringify(label)}))`,
      )),
    "Unlink button not refreshed away",
  );
  assert(
    api.unlinkCalls === 2 && !api.linked,
    "Confirm did not unlink exactly once",
  );
  await client.call("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  api.linked = true;
  await navigate(client, "/attendance/classroom-links");
  await waitFor(
    () => bodyHas(client, TEACHER_NAME),
    "Mobile teacher list not loaded",
  );
  await clickButton(client, label);
  await clickButton(client, "ยกเลิก", true);
  assert(
    !(await evaluate(
      client,
      "document.documentElement.scrollWidth > innerWidth",
    )),
    "Mobile horizontal overflow",
  );
  console.log(
    "ok unlink: confirmation/cancel, server denial, success refresh, mobile",
  );
}
async function checkAraId(client) {
  let scenario = 0;
  for (const message of [
    "บัญชีนี้เชื่อม LINE แล้ว หากต้องการเปลี่ยนกรุณาติดต่อผู้ดูแลระบบ",
    "ไม่พบข้อมูลครูที่ตรงกับ AraID ในโรงเรียนนี้",
    "การยืนยัน AraID หมดอายุแล้ว",
  ]) {
    api.approveMessage = message;
    await navigate(
      client,
      `/line-link/araid-authorize?scenario=${scenario++}#challenge=fixture-challenge-token-for-smoke`,
    );
    await waitFor(
      () => bodyHas(client, message),
      "Actual AraID cause not displayed",
    );
    assert(
      !(await bodyHas(client, "ข้อมูล AraID ไม่ตรงกับครูประจำชั้น")),
      "Misleading error remains",
    );
  }
  api.approveMessage = "";
  await navigate(
    client,
    `/line-link/araid-authorize?scenario=${scenario++}#challenge=fixture-challenge-token-for-smoke`,
  );
  await waitFor(
    () => bodyHas(client, "ยืนยันผ่าน AraID สำเร็จ"),
    "Valid AraID approval regressed",
  );
  console.log("ok AraID: already-linked/mismatch/expired and success");
}
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
    "Child process did not stop",
    5_000,
  ).catch(() => processRef.kill("SIGKILL"));
}

class CdpClient {
  constructor(url) {
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    this.socket = new WebSocket(url);
  }

  async connect() {
    await new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (!message.id) {
        this.listeners.get(message.method)?.(message.params || {});
        return;
      }
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result || {});
    });
  }

  on(method, listener) {
    this.listeners.set(method, listener);
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
    throw new Error(
      result.exceptionDetails.exception?.description ||
        "Browser evaluation failed",
    );
  }
  return result.result?.value;
}

async function navigate(client, path) {
  await client.call("Page.navigate", { url: `${FRONTEND_URL}${path}` });
  await waitFor(
    async () => (await evaluate(client, "document.readyState")) === "complete",
    `Page did not load: ${path}`,
  );
}

function pathname(client) {
  return evaluate(client, "window.location.pathname");
}

/** Signs the placeholder staff account in, from a page that calls no API. */
async function seedStaffSession(client, user, extra = {}) {
  await navigate(client, "/about");
  await evaluate(
    client,
    `(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
      window.localStorage.setItem("sts_user", ${JSON.stringify(JSON.stringify(user))});
      window.localStorage.setItem("admin_access", "true");
      window.localStorage.setItem(
        "sts_school_filter",
        ${JSON.stringify(JSON.stringify(SCHOOL_FILTER))},
      );
      for (const [key, value] of Object.entries(${JSON.stringify(extra)})) {
        window.localStorage.setItem(key, value);
      }
    })()`,
  );
}

async function serveApi(client) {
  client.on("Fetch.requestPaused", (event) => {
    const url = new URL(event.request.url);
    const headers = Object.fromEntries(
      Object.entries(event.request.headers).map(([name, value]) => [
        name.toLowerCase(),
        value,
      ]),
    );
    const request = {
      method: event.request.method,
      path: url.pathname.replace(/^.*?\/api(?=\/)/, ""),
      headers,
    };
    api.requests.push(`${request.method} ${request.path}`);
    const { status, body } = answer(request);
    void client
      .call("Fetch.fulfillRequest", {
        requestId: event.requestId,
        responseCode: status,
        responseHeaders: [
          { name: "content-type", value: "application/json; charset=utf-8" },
          {
            name: "access-control-allow-origin",
            value: headers.origin || FRONTEND_URL,
          },
          { name: "access-control-allow-credentials", value: "true" },
          {
            name: "access-control-allow-headers",
            value: headers["access-control-request-headers"] || "*",
          },
          {
            name: "access-control-allow-methods",
            value: "GET,POST,PATCH,PUT,DELETE,OPTIONS",
          },
        ],
        body:
          body === null
            ? ""
            : Buffer.from(JSON.stringify(body)).toString("base64"),
      })
      .catch(() => undefined);
  });
  await client.call("Fetch.enable", { patterns: [{ urlPattern: "*/api/*" }] });
}

async function main() {
  assert(existsSync(CHROME_PATH), "Google Chrome executable was not found");
  if (!EXTERNAL_FRONTEND_URL) {
    assert(
      existsSync("dist/index.html"),
      "Build the frontend before this smoke",
    );
  }

  const profileDir = mkdtempSync(join(tmpdir(), "sts-teacher-line-chrome-"));
  const preview = EXTERNAL_FRONTEND_URL
    ? null
    : spawn(
        "pnpm",
        ["preview", "--host", "127.0.0.1", "--port", "5186", "--strictPort"],
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
    }, "Frontend did not start");

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
    await client.call("Page.enable");
    await serveApi(client);

    await checkUnlink(client);
    await checkAraId(client);
    console.log(
      "smoke:teacher-line-browser ok (cancel/confirm/error/refresh/mobile + AraID causes)",
    );
  } catch (error) {
    console.error("Fixture requests:", api.requests);
    if (client)
      console.error(
        await evaluate(client, "document.body.innerText.slice(0, 3000)"),
      );
    throw error;
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
