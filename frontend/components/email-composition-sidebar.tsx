"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Loader2, Mail, RefreshCw, Send, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

type EmailTone = "museum" | "university" | "corporate" | "zoo_aquarium";

type InstitutionSummary = {
  id: string;
  name: string;
  category: string;
  location?: string;
  score?: number;
  websiteUrl?: string;
  collectionThemes?: string[];
  targetContactTitle?: string;
};

type DraftResponse = {
  subject: string;
  body: string;
  tone: EmailTone;
  safety_note: string;
};

type EmailCompositionSidebarProps = {
  institution: InstitutionSummary;
  productType: string;
  initialTone?: EmailTone;
  initialDraft?: Partial<DraftResponse>;
};

const toneLabels: Record<EmailTone, string> = {
  museum: "Museum",
  university: "University",
  corporate: "Corporate",
  zoo_aquarium: "Zoo / Aquarium",
};

export function EmailCompositionSidebar({
  institution,
  productType,
  initialTone = "museum",
  initialDraft,
}: EmailCompositionSidebarProps) {
  const [tone, setTone] = useState<EmailTone>(initialTone);
  const [subject, setSubject] = useState(initialDraft?.subject ?? "");
  const [body, setBody] = useState(initialDraft?.body ?? "");
  const [reviewed, setReviewed] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const themeText = useMemo(() => {
    if (!institution.collectionThemes?.length) {
      return "No collection theme captured yet";
    }
    return institution.collectionThemes.join(", ");
  }, [institution.collectionThemes]);

  async function generateDraft() {
    setIsGenerating(true);
    setError(null);
    setReviewed(false);

    try {
      const response = await fetch("/api/v1/crm/generate-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institution_id: institution.id,
          institution_name: institution.name,
          category: institution.category,
          collection_theme_details: institution.collectionThemes ?? [],
          target_contact_title: institution.targetContactTitle,
          product_type: productType,
          tone,
        }),
      });

      if (!response.ok) {
        throw new Error("Draft generation failed.");
      }

      const draft = (await response.json()) as DraftResponse;
      setSubject(draft.subject);
      setBody(draft.body);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to generate draft.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <aside className="grid h-full min-h-[680px] grid-cols-[320px_minmax(0,1fr)] overflow-hidden border-l bg-background">
      <section className="flex min-w-0 flex-col border-r">
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted-foreground">Institution</p>
              <h2 className="mt-1 text-xl font-semibold leading-tight">{institution.name}</h2>
            </div>
            {typeof institution.score === "number" ? (
              <Badge variant={institution.score >= 80 ? "default" : "secondary"}>
                {institution.score}
              </Badge>
            ) : null}
          </div>

          <div className="mt-4 space-y-3 text-sm">
            <InfoRow label="Category" value={institution.category} />
            <InfoRow label="Location" value={institution.location ?? "Unknown"} />
            <InfoRow label="Contact" value={institution.targetContactTitle ?? "Decision maker"} />
            <InfoRow label="Product" value={productType} />
          </div>
        </div>

        <Separator />

        <div className="flex-1 overflow-y-auto p-5">
          <p className="text-sm font-medium text-muted-foreground">Context Used</p>
          <div className="mt-3 rounded-md border bg-muted/35 p-3 text-sm leading-6">
            {themeText}
          </div>

          {institution.websiteUrl ? (
            <a
              href={institution.websiteUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 block truncate text-sm text-primary underline-offset-4 hover:underline"
            >
              {institution.websiteUrl}
            </a>
          ) : null}
        </div>

        <div className="border-t p-5">
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <p>This tool only drafts emails. Sending or Gmail sync requires explicit human review.</p>
          </div>
        </div>
      </section>

      <section className="flex min-w-0 flex-col">
        <div className="flex items-center justify-between gap-3 border-b p-5">
          <div>
            <p className="text-sm font-medium text-muted-foreground">AI Draft</p>
            <h3 className="text-lg font-semibold">Personalized cold email</h3>
          </div>

          <div className="flex items-center gap-2">
            <Select value={tone} onValueChange={(value) => setTone(value as EmailTone)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tone" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(toneLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={generateDraft} disabled={isGenerating}>
              {isGenerating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : subject || body ? (
                <RefreshCw className="mr-2 h-4 w-4" />
              ) : (
                <Mail className="mr-2 h-4 w-4" />
              )}
              {subject || body ? "Regenerate" : "Generate"}
            </Button>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <label className="block space-y-2">
            <span className="text-sm font-medium">Subject</span>
            <Textarea
              value={subject}
              onChange={(event) => {
                setSubject(event.target.value);
                setReviewed(false);
              }}
              className="min-h-12 resize-none"
              placeholder="Generated subject line appears here"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium">Body</span>
            <Textarea
              value={body}
              onChange={(event) => {
                setBody(event.target.value);
                setReviewed(false);
              }}
              className="min-h-[430px] resize-none leading-6"
              placeholder="Generated editable email draft appears here"
            />
          </label>
        </div>

        <div className="flex items-center justify-between gap-3 border-t p-5">
          <Button
            variant={reviewed ? "secondary" : "outline"}
            onClick={() => setReviewed((value) => !value)}
            disabled={!subject.trim() || !body.trim()}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            {reviewed ? "Reviewed" : "Mark Reviewed"}
          </Button>

          <Button disabled={!reviewed || !subject.trim() || !body.trim()}>
            <Send className="mr-2 h-4 w-4" />
            Send / Sync to Gmail
          </Button>
        </div>
      </section>
    </aside>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 break-words font-medium">{value}</p>
    </div>
  );
}
