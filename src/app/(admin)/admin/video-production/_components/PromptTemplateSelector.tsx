"use client";

import { useState, useEffect, useCallback } from "react";
import { FileText, Loader2 } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────

interface PromptTemplate {
  id: string;
  name: string;
  category: string;
  description?: string;
  promptTemplate: string;
  defaultConfig?: {
    riskLevel?: string;
    duration?: number;
  };
  locale: string;
}

interface PromptTemplateSelectorProps {
  onSelect: (template: PromptTemplate) => void;
  locale?: string;
}

// ─── Category labels ────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  clinical_skills: "Clinical Skills",
  patient_care: "Patient Care",
  emergency: "Emergency",
  infection_control: "Infection Control",
  medication: "Medication",
  general: "General",
};

// ─── Component ──────────────────────────────────────────────────────

export default function PromptTemplateSelector({
  onSelect,
  locale,
}: PromptTemplateSelectorProps) {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string>("");

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (locale) params.set("locale", locale);
      const res = await fetch(
        `/api/v1/admin/video-production/templates?${params.toString()}`
      );
      const json = await res.json();
      if (json.data) setTemplates(json.data);
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Group templates by category
  const grouped = templates.reduce<Record<string, PromptTemplate[]>>(
    (acc, t) => {
      const cat = t.category || "general";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(t);
      return acc;
    },
    {}
  );

  function handleSelect(template: PromptTemplate) {
    setSelectedId(template.id);
    onSelect(template);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
      </div>
    );
  }

  if (templates.length === 0) {
    return null; // No templates, don't show selector
  }

  return (
    <div className="space-y-2">
      <h4 className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
        <FileText className="h-3.5 w-3.5" />
        Quick Template
      </h4>
      <div className="max-h-48 space-y-3 overflow-y-auto">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <p className="mb-1 text-xs font-medium text-gray-400 uppercase">
              {CATEGORY_LABELS[category] || category}
            </p>
            <div className="space-y-1">
              {items.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleSelect(t)}
                  className={`w-full rounded-md border px-3 py-2 text-left text-sm transition-all ${
                    selectedId === t.id
                      ? "border-brand-500 bg-brand-50/50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <span className="font-medium text-gray-900">{t.name}</span>
                  {t.description && (
                    <span className="ml-2 text-xs text-gray-400">
                      {t.description}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
