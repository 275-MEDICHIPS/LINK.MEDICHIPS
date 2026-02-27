"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, User, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { csrfHeaders } from "@/lib/utils/csrf";

// ─── Types ──────────────────────────────────────────────────────────

interface Avatar {
  id: string;
  name: string;
  imageUrl: string;
  gender?: string;
  tags?: string[];
}

interface AvatarPickerProps {
  selectedAvatarId: string;
  onSelect: (avatarId: string) => void;
}

// ─── Component ──────────────────────────────────────────────────────

export default function AvatarPicker({
  selectedAvatarId,
  onSelect,
}: AvatarPickerProps) {
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newName, setNewName] = useState("");
  const [newGender, setNewGender] = useState<string>("");
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fetchAvatars = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        "/api/v1/admin/video-production/avatars?pageSize=50"
      );
      const json = await res.json();
      if (json.data) setAvatars(json.data);
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAvatars();
  }, [fetchAvatars]);

  async function handleFileUpload(file: File) {
    if (!newName.trim()) return;
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", newName.trim());
      if (newGender) formData.append("gender", newGender);

      const res = await fetch(
        "/api/v1/admin/video-production/avatars/upload",
        {
          method: "POST",
          headers: csrfHeaders(),
          body: formData,
        }
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Upload failed");
      }

      // Refresh list and select new avatar
      await fetchAvatars();
      onSelect(json.data.id);
      setShowUpload(false);
      setNewName("");
      setNewGender("");
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Upload failed. Please try again."
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">
          <User className="mr-1.5 inline h-4 w-4" />
          Avatar Selection
        </h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1 text-xs"
          onClick={() => setShowUpload(!showUpload)}
        >
          {showUpload ? (
            <>
              <X className="h-3 w-3" />
              Cancel
            </>
          ) : (
            <>
              <Plus className="h-3 w-3" />
              Upload New
            </>
          )}
        </Button>
      </div>

      {/* Upload inline form */}
      {showUpload && (
        <div className="space-y-2 rounded-lg border border-dashed border-gray-300 bg-gray-50/50 p-3">
          <Input
            placeholder="Avatar name (e.g., Dr. Kim)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="h-8 text-sm"
          />
          <select
            value={newGender}
            onChange={(e) => setNewGender(e.target.value)}
            className="h-8 w-full rounded-md border border-gray-200 bg-white px-2 text-xs"
          >
            <option value="">Gender (optional)</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
          {uploadError && (
            <p className="text-xs text-red-600">{uploadError}</p>
          )}
          <label
            className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed py-4 text-sm transition-colors ${
              !newName.trim() || uploading
                ? "border-gray-200 text-gray-300"
                : "border-brand-300 text-brand-600 hover:bg-brand-50"
            }`}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Choose image (JPG, PNG, WebP)
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
        </div>
      )}

      {/* No avatar option */}
      <button
        onClick={() => onSelect("")}
        className={`w-full rounded-lg border-2 p-3 text-left text-sm transition-all ${
          selectedAvatarId === ""
            ? "border-brand-500 bg-brand-50/50"
            : "border-gray-200 hover:border-gray-300"
        }`}
      >
        <span className="font-medium text-gray-700">No avatar</span>
        <span className="ml-2 text-xs text-gray-400">
          Veo generates characters automatically
        </span>
      </button>

      {/* Avatar grid */}
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      ) : avatars.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-400">
          No avatars yet. Upload one above.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {avatars.map((avatar) => (
            <button
              key={avatar.id}
              onClick={() => onSelect(avatar.id)}
              className={`group relative overflow-hidden rounded-lg border-2 transition-all ${
                selectedAvatarId === avatar.id
                  ? "border-brand-500 ring-2 ring-brand-200"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="aspect-square bg-gray-100">
                <img
                  src={avatar.imageUrl}
                  alt={avatar.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="bg-white px-1.5 py-1">
                <p className="truncate text-xs font-medium text-gray-900">
                  {avatar.name}
                </p>
                {avatar.gender && (
                  <p className="text-[10px] text-gray-400">{avatar.gender}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
