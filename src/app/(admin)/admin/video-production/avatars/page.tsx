"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  User,
  Upload,
  Loader2,
  Pencil,
  Trash2,
  X,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

// ─── Types ──────────────────────────────────────────────────────────

interface Avatar {
  id: string;
  name: string;
  imageUrl: string;
  gcsPath: string;
  gender?: string;
  tags?: string[];
  isGlobal: boolean;
  createdAt: string;
}

// ─── Component ──────────────────────────────────────────────────────

export default function AvatarManagementPage() {
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [loading, setLoading] = useState(true);
  const [genderFilter, setGenderFilter] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  // Upload form
  const [newName, setNewName] = useState("");
  const [newGender, setNewGender] = useState("");

  const fetchAvatars = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ pageSize: "100" });
      if (genderFilter) params.set("gender", genderFilter);

      const res = await fetch(
        `/api/v1/admin/video-production/avatars?${params.toString()}`
      );
      const json = await res.json();
      if (json.data) setAvatars(json.data);
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  }, [genderFilter]);

  useEffect(() => {
    fetchAvatars();
  }, [fetchAvatars]);

  async function handleFileUpload(file: File) {
    if (!newName.trim()) return;
    setUploading(true);
    try {
      // Get signed URL
      const urlRes = await fetch(
        "/api/v1/admin/video-production/avatars/upload",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            contentType: file.type,
          }),
        }
      );
      const urlJson = await urlRes.json();
      if (!urlRes.ok) throw new Error("Failed to get upload URL");

      // Upload to GCS
      await fetch(urlJson.data.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      // Create avatar record
      await fetch("/api/v1/admin/video-production/avatars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          imageUrl: urlJson.data.publicUrl,
          gcsPath: urlJson.data.gcsPath,
          gender: newGender || undefined,
        }),
      });

      setNewName("");
      setNewGender("");
      setShowUpload(false);
      fetchAvatars();
    } catch {
      // Handle error
    } finally {
      setUploading(false);
    }
  }

  async function handleEdit(id: string) {
    try {
      await fetch(`/api/v1/admin/video-production/avatars/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName }),
      });
      setEditingId(null);
      fetchAvatars();
    } catch {
      // Handle error
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this avatar?")) return;
    try {
      await fetch(`/api/v1/admin/video-production/avatars/${id}`, {
        method: "DELETE",
      });
      fetchAvatars();
    } catch {
      // Handle error
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/video-production">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Avatar Library</h1>
            <p className="text-sm text-gray-500">
              Manage character reference images for video generation
            </p>
          </div>
        </div>
        <Button
          onClick={() => setShowUpload(!showUpload)}
          className="gap-2 bg-brand-500 hover:bg-brand-600"
        >
          {showUpload ? (
            <>
              <X className="h-4 w-4" />
              Cancel
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Upload Avatar
            </>
          )}
        </Button>
      </div>

      {/* Upload form */}
      {showUpload && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <h3 className="text-sm font-medium text-gray-900">
              Upload New Avatar
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                placeholder="Avatar name (e.g., Dr. Kim)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <select
                value={newGender}
                onChange={(e) => setNewGender(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">Gender (optional)</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <label
              className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed py-8 text-sm transition-colors ${
                !newName.trim() || uploading
                  ? "border-gray-200 text-gray-300"
                  : "border-brand-300 text-brand-600 hover:bg-brand-50"
              }`}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5" />
                  Click to choose image (JPG, PNG, WebP)
                </>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={!newName.trim() || uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
            </label>
          </CardContent>
        </Card>
      )}

      {/* Filter bar */}
      <div className="flex gap-2">
        {["", "male", "female"].map((g) => (
          <button
            key={g}
            onClick={() => setGenderFilter(g)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              genderFilter === g
                ? "bg-brand-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {g === "" ? "All" : g === "male" ? "Male" : "Female"}
          </button>
        ))}
      </div>

      {/* Avatar grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      ) : avatars.length === 0 ? (
        <div className="py-12 text-center">
          <User className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-2 text-sm text-gray-500">No avatars found</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {avatars.map((avatar) => (
            <Card key={avatar.id} className="overflow-hidden">
              <div className="aspect-square bg-gray-100">
                <img
                  src={avatar.imageUrl}
                  alt={avatar.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <CardContent className="p-3">
                {editingId === avatar.id ? (
                  <div className="flex items-center gap-1">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-7 text-sm"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => handleEdit(avatar.id)}
                    >
                      <Check className="h-3.5 w-3.5 text-accent-600" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="h-3.5 w-3.5 text-gray-400" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="truncate text-sm font-medium text-gray-900">
                      {avatar.name}
                    </p>
                    <div className="mt-1 flex items-center justify-between">
                      <div className="flex gap-1">
                        {avatar.gender && (
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
                            {avatar.gender}
                          </span>
                        )}
                        {avatar.isGlobal && (
                          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600">
                            global
                          </span>
                        )}
                      </div>
                      <div className="flex gap-0.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            setEditingId(avatar.id);
                            setEditName(avatar.name);
                          }}
                        >
                          <Pencil className="h-3 w-3 text-gray-400" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => handleDelete(avatar.id)}
                        >
                          <Trash2 className="h-3 w-3 text-red-400" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
