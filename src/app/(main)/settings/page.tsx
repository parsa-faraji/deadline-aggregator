"use client";

import { useEffect, useState, useCallback } from "react";
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  Bell,
  Mail,
  Phone,
  Smartphone,
} from "lucide-react";

interface Integration {
  id: string;
  type: string;
  status: string;
  lastSync: string | null;
  error: string | null;
}

interface NotifPrefs {
  emailEnabled: boolean;
  pushEnabled: boolean;
  smsEnabled: boolean;
  dailyDigest: boolean;
  reminderHours: number;
  urgentHours: number;
}

export default function SettingsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [prefs, setPrefs] = useState<NotifPrefs>({
    emailEnabled: true,
    pushEnabled: false,
    smsEnabled: false,
    dailyDigest: true,
    reminderHours: 24,
    urgentHours: 2,
  });
  const [canvasToken, setCanvasToken] = useState("");
  const [canvasUrl, setCanvasUrl] = useState("");
  const [edToken, setEdToken] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const [intRes, prefsRes] = await Promise.all([
      fetch("/api/integrations"),
      fetch("/api/notifications/prefs"),
    ]);
    setIntegrations(await intRes.json());
    setPrefs(await prefsRes.json());
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const saveCanvasIntegration = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "CANVAS",
        token: canvasToken,
        baseUrl: canvasUrl,
      }),
    });
    setCanvasToken("");
    setSaving(false);
    fetchData();
  };

  const saveEdIntegration = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "ED_DISCUSSION",
        token: edToken,
      }),
    });
    setEdToken("");
    setSaving(false);
    fetchData();
  };

  const saveNotifPrefs = async () => {
    setSaving(true);
    await fetch("/api/notifications/prefs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prefs),
    });
    setSaving(false);
  };

  const syncSource = async (source: string) => {
    setSyncing(source);
    await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source }),
    });
    setSyncing(null);
    fetchData();
  };

  const subscribePush = async () => {
    if (!("serviceWorker" in navigator)) {
      alert("Push notifications are not supported in this browser.");
      return;
    }

    const registration = await navigator.serviceWorker.register("/sw.js");
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    });

    await fetch("/api/notifications/push-subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription.toJSON()),
    });

    setPrefs({ ...prefs, pushEnabled: true });
    await saveNotifPrefs();
  };

  const getIntegration = (type: string) =>
    integrations.find((i) => i.type === type);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* Integrations */}
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Integrations
        </h2>

        {/* Google Calendar - auto-connected via OAuth */}
        <div className="mb-4 flex items-center justify-between rounded-lg border border-gray-100 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
              <span className="text-sm font-bold text-blue-600">G</span>
            </div>
            <div>
              <p className="font-medium text-gray-900">Google Calendar</p>
              <p className="text-xs text-gray-500">
                Connected via Google sign-in
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getIntegration("GOOGLE_CALENDAR") ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <span className="text-xs text-gray-400">Not synced yet</span>
            )}
            <button
              onClick={() => syncSource("GOOGLE_CALENDAR")}
              disabled={syncing === "GOOGLE_CALENDAR"}
              className="rounded-lg border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${
                  syncing === "GOOGLE_CALENDAR" ? "animate-spin" : ""
                }`}
              />
            </button>
          </div>
        </div>

        {/* Gmail */}
        <div className="mb-4 flex items-center justify-between rounded-lg border border-gray-100 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-100">
              <Mail className="h-4 w-4 text-yellow-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Gmail</p>
              <p className="text-xs text-gray-500">
                Scans for deadline keywords
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getIntegration("GMAIL") ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <span className="text-xs text-gray-400">Not synced yet</span>
            )}
            <button
              onClick={() => syncSource("GMAIL")}
              disabled={syncing === "GMAIL"}
              className="rounded-lg border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${
                  syncing === "GMAIL" ? "animate-spin" : ""
                }`}
              />
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="rounded-lg border border-gray-100 p-3">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
                <span className="text-sm font-bold text-red-600">C</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Canvas LMS</p>
                <p className="text-xs text-gray-500">
                  {getIntegration("CANVAS")?.status === "ACTIVE"
                    ? "Connected"
                    : "Requires API token"}
                </p>
              </div>
            </div>
            {getIntegration("CANVAS")?.status === "ACTIVE" && (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <button
                  onClick={() => syncSource("CANVAS")}
                  disabled={syncing === "CANVAS"}
                  className="rounded-lg border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${
                      syncing === "CANVAS" ? "animate-spin" : ""
                    }`}
                  />
                </button>
              </div>
            )}
          </div>

          {getIntegration("CANVAS")?.error && (
            <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-50 p-2 text-sm text-red-700">
              <XCircle className="h-4 w-4" />
              {getIntegration("CANVAS")!.error}
            </div>
          )}

          <form onSubmit={saveCanvasIntegration} className="space-y-2">
            <input
              type="url"
              value={canvasUrl}
              onChange={(e) => setCanvasUrl(e.target.value)}
              placeholder="Canvas URL (e.g. https://canvas.university.edu)"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
            />
            <input
              type="password"
              value={canvasToken}
              onChange={(e) => setCanvasToken(e.target.value)}
              placeholder="Canvas API Token"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
            />
            <p className="text-xs text-gray-400">
              Get your token from Canvas → Account → Settings → New Access Token
            </p>
            <button
              type="submit"
              disabled={saving || !canvasToken || !canvasUrl}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Canvas Integration"}
            </button>
          </form>
        </div>

        {/* Ed Discussion */}
        <div className="mt-4 rounded-lg border border-gray-100 p-3">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100">
                <span className="text-sm font-bold text-purple-600">E</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Ed Discussion</p>
                <p className="text-xs text-gray-500">
                  {getIntegration("ED_DISCUSSION")?.status === "ACTIVE"
                    ? "Connected"
                    : "Scans announcements for deadlines"}
                </p>
              </div>
            </div>
            {getIntegration("ED_DISCUSSION")?.status === "ACTIVE" && (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <button
                  onClick={() => syncSource("ED_DISCUSSION")}
                  disabled={syncing === "ED_DISCUSSION"}
                  className="rounded-lg border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${
                      syncing === "ED_DISCUSSION" ? "animate-spin" : ""
                    }`}
                  />
                </button>
              </div>
            )}
          </div>

          {getIntegration("ED_DISCUSSION")?.error && (
            <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-50 p-2 text-sm text-red-700">
              <XCircle className="h-4 w-4" />
              {getIntegration("ED_DISCUSSION")!.error}
            </div>
          )}

          <form onSubmit={saveEdIntegration} className="space-y-2">
            <input
              type="password"
              value={edToken}
              onChange={(e) => setEdToken(e.target.value)}
              placeholder="Ed Discussion API Token"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
            />
            <p className="text-xs text-gray-400">
              Get your token from edstem.org → Settings → API Tokens
            </p>
            <button
              type="submit"
              disabled={saving || !edToken}
              className="rounded-lg bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Ed Integration"}
            </button>
          </form>
        </div>
      </section>

      {/* Notification Preferences */}
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Bell className="h-5 w-5" />
          Notifications
        </h2>

        <div className="space-y-4">
          <label className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-700">Email notifications</span>
            </div>
            <input
              type="checkbox"
              checked={prefs.emailEnabled}
              onChange={(e) =>
                setPrefs({ ...prefs, emailEnabled: e.target.checked })
              }
              className="h-4 w-4 rounded border-gray-300"
            />
          </label>

          <label className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-700">Daily digest email</span>
            </div>
            <input
              type="checkbox"
              checked={prefs.dailyDigest}
              onChange={(e) =>
                setPrefs({ ...prefs, dailyDigest: e.target.checked })
              }
              className="h-4 w-4 rounded border-gray-300"
            />
          </label>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-700">Push notifications</span>
            </div>
            {prefs.pushEnabled ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <button
                onClick={subscribePush}
                className="rounded-lg bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
              >
                Enable
              </button>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-700">SMS notifications</span>
            </div>
            <input
              type="checkbox"
              checked={prefs.smsEnabled}
              onChange={(e) =>
                setPrefs({ ...prefs, smsEnabled: e.target.checked })
              }
              className="h-4 w-4 rounded border-gray-300"
            />
          </div>

          {prefs.smsEnabled && (
            <div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs text-gray-500">
                Reminder (hours before deadline)
              </label>
              <input
                type="number"
                min="1"
                value={prefs.reminderHours}
                onChange={(e) =>
                  setPrefs({
                    ...prefs,
                    reminderHours: parseInt(e.target.value) || 24,
                  })
                }
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500">
                Urgent reminder (hours before)
              </label>
              <input
                type="number"
                min="1"
                value={prefs.urgentHours}
                onChange={(e) =>
                  setPrefs({
                    ...prefs,
                    urgentHours: parseInt(e.target.value) || 2,
                  })
                }
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            onClick={saveNotifPrefs}
            disabled={saving}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Notification Settings"}
          </button>
        </div>
      </section>
    </div>
  );
}
