// Browser regression for two client-side rules that only a real page load
// exercises end to end:
//
//   1. Recovery — a stale referral-link session (401) on /referral-report/:token
//      sends the agency back to the access gate and leaves the staff session
//      and school filter in the same browser untouched; "ลองเปิดอีกครั้ง" on a
//      failed load asks the server again; a genuine staff 401 still signs out.
//   2. Destination — a watchlist notification opens a page the account can
//      enter (the student profile, or the watchlist report as the fallback).
//
// Every /api request is answered here through the DevTools Fetch domain, so the
// run needs no backend, writes no data and leaves nothing to clean up. The link
// and session values below are placeholders, never real credentials.
//
// Run (same-origin build, like smoke:same-origin-api-browser):
//   VITE_API_BASE_URL= pnpm exec vite build --logLevel warn
//   node scripts/smoke-referral-recovery-browser.mjs
// Against an already running frontend: SMOKE_FRONTEND_URL=http://127.0.0.1:5173

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const EXTERNAL_FRONTEND_URL = process.env.SMOKE_FRONTEND_URL || "";
const FRONTEND_URL = EXTERNAL_FRONTEND_URL || "http://127.0.0.1:5174";
const DEBUG_PORT = Number(process.env.SMOKE_CHROME_DEBUG_PORT || 9261);
const CHROME_PATH =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const STALE_TOKEN = "smoke-stale-link";
const RETRY_TOKEN = "smoke-retry-link";
const STUDENT_UUID = "00000000-0000-4000-8000-000000000001";
const WATCHLIST_TITLE = "SMOKE-WATCHLIST นักเรียนเข้ากลุ่มเฝ้าระวัง";
const SCHOOL_FILTER = {
  province: "",
  district: "",
  subDistrict: "",
  schoolId: "12",
  schoolName: "โรงเรียนทดสอบ",
  userId: 7,
};

function staffUser(permissions) {
  return {
    id: 7,
    username: "smoke.staff",
    FirstName: "Smoke",
    LastName: "Staff",
    roles: ["DIRECTOR"],
    permissions,
    data_scope: { school_ids: [12] },
  };
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

function readStorage(client) {
  return evaluate(
    client,
    `({
      user: window.localStorage.getItem("sts_user"),
      adminAccess: window.localStorage.getItem("admin_access"),
      schoolId: JSON.parse(
        window.localStorage.getItem("sts_school_filter") || "{}",
      ).schoolId ?? null,
      referralSession: window.localStorage.getItem(
        "magic_session_referral:${STALE_TOKEN}",
      ),
    })`,
  );
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

const referral = {
  agency_name: "หน่วยงานทดสอบ",
  agency_kind_label: "สาธารณสุข",
  starts_at: "2026-10-01T02:00:00.000Z",
  expires_at: "2026-12-31T10:00:00.000Z",
};
const lockedLink = {
  auth_required: true,
  referral,
  student_name: "ด.ช. ท*** ส***",
  student_school: "โรงเรียนทดสอบ",
};

const openLink = {
  ...lockedLink,
  auth_required: false,
  reporter_name: "ผู้รายงานทดสอบ",
  student_photo_url: null,
  student_grade: null,
  student_room: null,
  student_phone: null,
  reason_flagged: null,
  case_display_status_label: null,
  follow_up_history: [],
  contact_channels: [],
};
const DRAFT_NOTE = "หน่วยงานติดตามแล้ว ข้อมูลต้องอยู่หลังยืนยันใหม่";

/** What the fake API answers; each scenario swaps the parts it is about. */
const api = {
  user: staffUser(["home", "dashboard"]),
  staffSessionExpired: false,
  retryAttempts: 0,
  requests: [],
  reportRejected: false,
  reportAttempts: 0,
  markReadCalls: 0,
};

function answer({ method, path, headers }) {
  if (method === "OPTIONS") return { status: 204, body: null };

  if (path === `/referral-links/${STALE_TOKEN}` && method === "GET") {
    const verified =
      headers["x-referral-session"] === "smoke-new-session" ||
      (headers["x-referral-session"] === "smoke-stale-session" &&
        !api.reportRejected);
    return { status: 200, body: { data: verified ? openLink : lockedLink } };
  }
  if (path === `/referral-links/${STALE_TOKEN}/report` && method === "POST") {
    api.reportAttempts++;
    if (headers["x-referral-session"] === "smoke-stale-session") {
      api.reportRejected = true;
      return { status: 401, body: { message: "เซสชันหมดอายุ" } };
    }
    assert(
      headers["x-referral-session"] === "smoke-new-session",
      "Report must use the reverified session",
    );
    return { status: 201, body: { success: true } };
  }
  if (
    path === `/referral-links/${STALE_TOKEN}/araid/challenge` &&
    method === "POST"
  ) {
    return {
      status: 201,
      body: {
        data: {
          challengeToken: "smoke-challenge",
          referenceCode: "FIXTURE",
          expiresAt: "2099-01-01T00:00:00Z",
          verificationUrl: "https://example.test/verify",
          qrDataUrl: "data:image/png;base64,",
        },
      },
    };
  }
  if (path === "/referral-links/araid/challenge/status") {
    return {
      status: 201,
      body: { data: { status: "APPROVED", sessionToken: "smoke-new-session" } },
    };
  }
  if (path === `/referral-links/${RETRY_TOKEN}` && method === "GET") {
    api.retryAttempts += 1;
    return api.retryAttempts === 1
      ? { status: 500, body: { message: "ระบบขัดข้องชั่วคราว" } }
      : { status: 200, body: { data: lockedLink } };
  }

  if (api.staffSessionExpired) {
    return { status: 401, body: { message: "Unauthorized" } };
  }
  if (path === "/notifications/smoke-notification/read" && method === "PATCH") {
    api.markReadCalls++;
    return { status: 200, body: { success: true } };
  }
  if (path === "/users/me") return { status: 200, body: api.user };
  if (path === "/notifications" && method === "GET") {
    const row = {
      id: "smoke-notification",
      type_code: "STUDENT_WATCHLIST_ALERT",
      type_label: "กลุ่มเฝ้าระวัง",
      title: WATCHLIST_TITLE,
      student_person_uuid: "smoke-person",
      case_id: null,
      case_status_code: null,
      student_name_snapshot: "นักเรียน ทดสอบ",
      reason_text: "หัวข้อปัญหา: ทดสอบ",
      ref_entity: "classroom_student_comments",
      ref_id: "1",
      student_uuid: STUDENT_UUID,
      concern_level_code: "WATCH",
      read_at: null,
      seen_at: "2026-10-01T03:00:00.000Z",
      created_at: "2026-10-01T02:00:00.000Z",
    };
    return {
      status: 200,
      body: {
        rows: [row],
        totalCount: 1,
        page: 1,
        limit: 10,
        unreadCount: 1,
        unseenCount: 0,
      },
    };
  }
  // Everything else the shell asks for: an empty, well-formed answer.
  return { status: 200, body: { success: true, data: [], rows: [] } };
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

async function checkStaleReferralSession(client) {
  await seedStaffSession(client, api.user, {
    [`magic_session_referral:${STALE_TOKEN}`]: "smoke-stale-session",
  });
  await navigate(client, `/referral-report/${STALE_TOKEN}`);
  await waitFor(
    () =>
      evaluate(
        client,
        'Boolean(document.querySelector("[data-referral-report-form] textarea"))',
      ),
    "Report form did not open",
  );
  await evaluate(
    client,
    `(() => {
    document.querySelector('[data-referral-report-form] input[value="SUCCEEDED"]').click();
    const field = document.querySelector('[data-referral-report-form] textarea');
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(field, ${JSON.stringify(DRAFT_NOTE)});
    field.dispatchEvent(new Event('input', { bubbles: true }));
  })()`,
  );
  await evaluate(
    client,
    "document.querySelector('[data-referral-report-form] button[type=submit]').click()",
  );

  await waitFor(async () => {
    const current = await pathname(client);
    assert(
      !current.startsWith("/login"),
      "Stale referral session sent the staff account to /login",
    );
    return evaluate(
      client,
      `Boolean(document.querySelector("[data-referral-reverify-notice]")) &&
        Boolean(document.querySelector("#referral-access-code"))`,
    );
  }, "Access gate with the re-verify notice did not appear");

  const storage = await readStorage(client);
  assert(storage.user, "Staff session was cleared by a stale referral session");
  assert(storage.adminAccess === "true", "Staff admin access flag was cleared");
  assert(
    storage.schoolId === SCHOOL_FILTER.schoolId,
    `School filter was not preserved (schoolId=${storage.schoolId})`,
  );
  assert(
    !storage.referralSession,
    "Stale referral session was left in storage",
  );
  assert(
    (await pathname(client)) === `/referral-report/${STALE_TOKEN}`,
    "Page left the referral report link",
  );
  assert(
    api.reportAttempts === 1,
    "First report should fail exactly once with 401",
  );
  await evaluate(
    client,
    `(() => {
    const field = document.querySelector('#referral-access-code');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(field, '123456');
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.closest('form').querySelector('button[type=submit]').click();
  })()`,
  );
  await waitFor(
    () =>
      evaluate(
        client,
        'Boolean(document.querySelector("[data-referral-report-form] textarea"))',
      ),
    "Re-verification did not restore the report form",
  );
  const restored = await evaluate(
    client,
    `({
    note: document.querySelector('[data-referral-report-form] textarea').value,
    checked: document.querySelector('[data-referral-report-form] input[value="SUCCEEDED"]').checked
  })`,
  );
  assert(
    restored.note === DRAFT_NOTE && restored.checked,
    "Draft was lost after re-verification",
  );
  await evaluate(
    client,
    "document.querySelector('[data-referral-report-form] button[type=submit]').click()",
  );
  await waitFor(
    () =>
      evaluate(
        client,
        "document.body.innerText.includes('ส่งรายงานเรียบร้อย')",
      ),
    "Reverified report did not submit",
  );
  assert(
    api.reportAttempts === 2,
    "Report should be retried once after verifying",
  );
  const after = await readStorage(client);
  assert(
    after.user && after.schoolId === SCHOOL_FILTER.schoolId,
    "Staff identity/filter must survive report recovery",
  );
  console.log(
    "ok  POST 401: staff session kept, gate shown, draft restored, reverified resubmit",
  );
}

async function checkLoadErrorRetry(client) {
  api.retryAttempts = 0;
  await navigate(client, `/referral-report/${RETRY_TOKEN}`);

  const findRetry = `[...document.querySelectorAll("button")].find((button) =>
    button.textContent.includes("ลองเปิดอีกครั้ง"))`;
  await waitFor(
    () => evaluate(client, `Boolean(${findRetry})`),
    "Retry button did not appear after the failed load",
  );
  assert(api.retryAttempts === 1, "Expected exactly one failed load");

  await evaluate(client, `${findRetry}.click()`);
  await waitFor(
    () =>
      evaluate(
        client,
        `Boolean(document.querySelector("#referral-access-code"))`,
      ),
    "Retry did not reach the access gate",
  );
  assert(
    api.retryAttempts === 2,
    `Retry should ask the server once more (requests=${api.retryAttempts})`,
  );
  console.log("ok  load error: retry refetched and recovered");
}

async function openWatchlistNotification(client, permissions) {
  api.user = staffUser(permissions);
  await seedStaffSession(client, api.user);
  await navigate(client, "/notifications?status=all");

  const findRow = `[...document.querySelectorAll("li > button")].find((button) =>
    button.textContent.includes(${JSON.stringify(WATCHLIST_TITLE)}))`;
  await waitFor(
    () => evaluate(client, `Boolean(${findRow})`),
    `Notification row did not render for [${permissions.join(", ")}]`,
  );
  await evaluate(client, `${findRow}.click()`);
  await waitFor(
    async () => (await pathname(client)) !== "/notifications",
    `Notification did not navigate for [${permissions.join(", ")}]`,
  );
  // Let a route guard redirect, if one is going to.
  await new Promise((resolve) => setTimeout(resolve, 500));
  return pathname(client);
}

async function openCenterNotification(client, permissions) {
  api.user = staffUser(permissions);
  await seedStaffSession(client, api.user);
  await navigate(client, "/notifications?status=all");
  await waitFor(
    () =>
      evaluate(
        client,
        'Boolean(document.querySelector("button[aria-controls=notification-center]"))',
      ),
    "Notification bell did not render",
  );
  await evaluate(
    client,
    'document.querySelector("button[aria-controls=notification-center]").click()',
  );
  const row = `[...document.querySelectorAll('#notification-center li > button')].find(button => button.textContent.includes(${JSON.stringify(WATCHLIST_TITLE)}))`;
  await waitFor(
    () => evaluate(client, `Boolean(${row})`),
    "Center watchlist row did not render",
  );
  await evaluate(client, `${row}.click()`);
  const related = `[...document.querySelectorAll('#notification-center button')].find(button => button.textContent.includes('ไปยังหน้าที่เกี่ยวข้อง') && button.getClientRects().length)`;
  await waitFor(
    () => evaluate(client, `Boolean(${related})`),
    "Center related action did not render",
  );
  await evaluate(client, `${related}.click()`);
  await waitFor(
    async () => (await pathname(client)) !== "/notifications",
    "Center related action did not navigate",
  );
  await new Promise((resolve) => setTimeout(resolve, 500));
  return pathname(client);
}

async function checkNotificationDestinations(client) {
  const profile = await openWatchlistNotification(client, ["home", "students"]);
  assert(
    profile === `/students/${STUDENT_UUID}`,
    `students-only account should open the student profile, got ${profile}`,
  );

  const fallback = await openWatchlistNotification(client, [
    "home",
    "dashboard",
  ]);
  assert(
    fallback === "/student-risk-report/watchlist",
    `dashboard-only account should fall back to the watchlist report, got ${fallback}`,
  );
  assert(
    (await openCenterNotification(client, ["home", "students"])) === profile,
    "Inbox and center must choose the same student profile",
  );
  assert(
    (await openCenterNotification(client, ["home", "dashboard"])) === fallback,
    "Inbox and center must choose the same watchlist fallback",
  );
  assert(
    api.markReadCalls === 4,
    "Inbox and center must mark each opened unread item once",
  );
  console.log(
    "ok  inbox + center: same allowed destinations, mark-read retained",
  );
}

async function checkGenuineStaffExpiry(client) {
  api.user = staffUser(["home", "dashboard"]);
  await seedStaffSession(client, api.user);
  api.staffSessionExpired = true;
  await navigate(client, "/notifications?status=all");

  await waitFor(
    async () => (await pathname(client)) === "/login",
    "A lapsed staff session did not reach /login",
  );
  const storage = await readStorage(client);
  assert(!storage.user, "Lapsed staff session was left in storage");
  assert(!storage.schoolId, "School filter survived a lapsed staff session");
  api.staffSessionExpired = false;
  console.log("ok  genuine staff 401: signed out, filter cleared");
}

async function main() {
  assert(existsSync(CHROME_PATH), "Google Chrome executable was not found");
  if (!EXTERNAL_FRONTEND_URL) {
    assert(
      existsSync("dist/index.html"),
      "Build the frontend before this smoke",
    );
  }

  const profileDir = mkdtempSync(
    join(tmpdir(), "sts-referral-recovery-chrome-"),
  );
  const preview = EXTERNAL_FRONTEND_URL
    ? null
    : spawn(
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

    await checkStaleReferralSession(client);
    await checkLoadErrorRetry(client);
    await checkNotificationDestinations(client);
    await checkGenuineStaffExpiry(client);
    console.log("smoke:referral-recovery-browser ok");
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
