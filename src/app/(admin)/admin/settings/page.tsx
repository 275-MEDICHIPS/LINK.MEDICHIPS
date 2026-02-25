"use client";

import { useState } from "react";
import {
  Globe,
  Shield,
  Bell,
  Palette,
  Database,
  Key,
  Save,
  Check,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SettingsTab = "general" | "security" | "notifications" | "appearance";

const tabs: { key: SettingsTab; label: string; icon: React.ElementType }[] = [
  { key: "general", label: "General", icon: Globe },
  { key: "security", label: "Security", icon: Shield },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "appearance", label: "Appearance", icon: Palette },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 800);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Platform configuration and preferences
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Tab Navigation */}
        <Card className="lg:col-span-1">
          <CardContent className="p-2">
            <nav className="space-y-0.5">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-brand-50 text-brand-700"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <tab.icon
                      className={`h-4 w-4 ${isActive ? "text-brand-500" : "text-gray-400"}`}
                    />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </CardContent>
        </Card>

        {/* Content */}
        <div className="space-y-6 lg:col-span-3">
          {activeTab === "general" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Platform Settings</CardTitle>
                  <CardDescription>
                    General platform configuration
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label
                      htmlFor="platform-name"
                      className="mb-1.5 block text-sm font-medium text-gray-700"
                    >
                      Platform Name
                    </label>
                    <Input
                      id="platform-name"
                      defaultValue="MEDICHIPS-LINK"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="default-locale"
                      className="mb-1.5 block text-sm font-medium text-gray-700"
                    >
                      Default Language
                    </label>
                    <select
                      id="default-locale"
                      defaultValue="en"
                      className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    >
                      <option value="en">English</option>
                      <option value="ko">Korean</option>
                      <option value="fr">French</option>
                      <option value="sw">Swahili</option>
                      <option value="am">Amharic</option>
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="timezone"
                      className="mb-1.5 block text-sm font-medium text-gray-700"
                    >
                      Timezone
                    </label>
                    <select
                      id="timezone"
                      defaultValue="Asia/Seoul"
                      className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    >
                      <option value="Asia/Seoul">Asia/Seoul (KST)</option>
                      <option value="Africa/Addis_Ababa">Africa/Addis Ababa (EAT)</option>
                      <option value="Africa/Nairobi">Africa/Nairobi (EAT)</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">AI Configuration</CardTitle>
                  <CardDescription>
                    Settings for AI-powered features
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label
                      htmlFor="ai-model"
                      className="mb-1.5 block text-sm font-medium text-gray-700"
                    >
                      AI Model
                    </label>
                    <select
                      id="ai-model"
                      defaultValue="claude-sonnet-4-6"
                      className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    >
                      <option value="claude-sonnet-4-6">Claude Sonnet 4.6 (Recommended)</option>
                      <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 (Faster)</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Auto-generate thumbnails</p>
                      <p className="text-xs text-gray-500">Automatically create gradient thumbnails for new courses</p>
                    </div>
                    <button className="relative h-6 w-11 rounded-full bg-brand-500 transition-colors">
                      <span className="absolute left-[22px] top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">AI content review required</p>
                      <p className="text-xs text-gray-500">AI-generated content must be reviewed before publishing</p>
                    </div>
                    <button className="relative h-6 w-11 rounded-full bg-brand-500 transition-colors">
                      <span className="absolute left-[22px] top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {activeTab === "security" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Authentication</CardTitle>
                  <CardDescription>
                    Configure login and security options
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">PIN Login</p>
                      <p className="text-xs text-gray-500">Allow 8-character PIN login for learners</p>
                    </div>
                    <button className="relative h-6 w-11 rounded-full bg-brand-500 transition-colors">
                      <span className="absolute left-[22px] top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">OAuth (Google)</p>
                      <p className="text-xs text-gray-500">Allow Google login for admin/instructor accounts</p>
                    </div>
                    <button className="relative h-6 w-11 rounded-full bg-brand-500 transition-colors">
                      <span className="absolute left-[22px] top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform" />
                    </button>
                  </div>
                  <div>
                    <label
                      htmlFor="session-timeout"
                      className="mb-1.5 block text-sm font-medium text-gray-700"
                    >
                      Session Timeout
                    </label>
                    <select
                      id="session-timeout"
                      defaultValue="24h"
                      className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    >
                      <option value="1h">1 hour</option>
                      <option value="8h">8 hours</option>
                      <option value="24h">24 hours</option>
                      <option value="7d">7 days</option>
                    </select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Content Security</CardTitle>
                  <CardDescription>
                    Risk-based content review settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { level: "L1 (Low Risk)", desc: "General health education", approvals: "1 approval" },
                    { level: "L2 (Medium Risk)", desc: "Clinical procedures, medication", approvals: "2 approvals" },
                    { level: "L3 (High Risk)", desc: "Emergency protocols, dosage", approvals: "3 approvals" },
                  ].map((item) => (
                    <div key={item.level} className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.level}</p>
                        <p className="text-xs text-gray-500">{item.desc}</p>
                      </div>
                      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                        {item.approvals}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          )}

          {activeTab === "notifications" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notification Preferences</CardTitle>
                <CardDescription>
                  Configure when and how you receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: "New user registrations", desc: "Get notified when new users join" },
                  { label: "Content submissions", desc: "When content is submitted for review" },
                  { label: "Course completions", desc: "When learners complete courses" },
                  { label: "System alerts", desc: "Service degradation or downtime" },
                  { label: "AI job completion", desc: "When AI course builder or video jobs finish" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.label}</p>
                      <p className="text-xs text-gray-500">{item.desc}</p>
                    </div>
                    <button className="relative h-6 w-11 rounded-full bg-brand-500 transition-colors">
                      <span className="absolute left-[22px] top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform" />
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {activeTab === "appearance" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Theme & Branding</CardTitle>
                <CardDescription>
                  Customize the platform appearance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Primary Color
                  </label>
                  <div className="flex gap-2">
                    {["#2563EB", "#0EA5E9", "#10B981", "#8B5CF6", "#F59E0B"].map((color) => (
                      <button
                        key={color}
                        className="h-8 w-8 rounded-lg border-2 border-transparent ring-2 ring-transparent hover:ring-gray-300"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Logo
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100">
                      <Palette className="h-6 w-6 text-gray-400" />
                    </div>
                    <Button variant="outline" size="sm">Upload Logo</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Save button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : saved ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Saved
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
