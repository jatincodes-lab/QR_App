"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Clock, Megaphone, MessageCircle, RefreshCw, Send, Users } from "lucide-react";
import { AdminShell } from "../../../components/admin-shell";
import { EmptyBranchState, MetricCard, PageError, PageLoading } from "../../../components/admin-page-common";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { createCampaign, getCampaigns, previewCampaignRecipients, type Campaign, type CampaignTargetSegment } from "../../../lib/api";
import { useAdminWorkspace } from "../../../lib/admin-workspace";
import { firstInvalid, invalid, validateRequired, valid, type ValidationResult } from "../../../lib/validation";

type CampaignForm = {
  name: string;
  targetSegment: CampaignTargetSegment;
  messageText: string;
};

const SegmentOptions: Array<{ value: CampaignTargetSegment; label: string; helper: string }> = [
  { value: "AllOptedIn", label: "All opted-in customers", helper: "Every customer who accepted WhatsApp marketing." },
  { value: "RepeatCustomers", label: "Repeat customers", helper: "Customers with two or more visits." },
  { value: "InactiveCustomers", label: "Inactive customers", helper: "Customers not seen in the last 30 days." },
  { value: "HighValueCustomers", label: "High-value customers", helper: "Customers with total spend of 1000 or more." }
];

export default function AdminCampaignsPage() {
  const workspace = useAdminWorkspace();
  const [form, setForm] = useState<CampaignForm>({
    name: "Weekend WhatsApp campaign",
    targetSegment: "AllOptedIn",
    messageText: ""
  });
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [recipientCount, setRecipientCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const branchName = workspace.selectedBranch?.name ?? "Campaigns";
  const selectedSegment = useMemo(() => SegmentOptions.find((segment) => segment.value === form.targetSegment) ?? SegmentOptions[0], [form.targetSegment]);
  const queuedCount = campaigns.filter((campaign) => campaign.statusCode === "Queued").length;
  const totalRecipients = campaigns.reduce((total, campaign) => total + campaign.recipientCount, 0);

  useEffect(() => {
    if (!workspace.selectedBranch) {
      setCampaigns([]);
      setRecipientCount(0);
      return;
    }

    void loadCampaigns();
    void loadPreview(form.targetSegment);
  }, [workspace.selectedBranch?.branchId]);

  async function loadCampaigns() {
    if (!workspace.selectedBranchId) return;

    setIsLoading(true);
    try {
      setCampaigns(await getCampaigns(workspace.selectedBranchId));
    } catch (caught) {
      workspace.handleApiError(caught);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadPreview(targetSegment: CampaignTargetSegment) {
    if (!workspace.selectedBranchId) return;

    setIsPreviewing(true);
    try {
      const preview = await previewCampaignRecipients(workspace.selectedBranchId, targetSegment);
      setRecipientCount(preview.recipientCount);
    } catch (caught) {
      workspace.handleApiError(caught);
    } finally {
      setIsPreviewing(false);
    }
  }

  async function submitCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validation = firstInvalid(
      validateRequiredWithMin(form.name, "Campaign name", 3, 120),
      validateRequiredWithMin(form.messageText, "Message", 5, 1000),
      recipientCount > 0 ? valid() : invalid("No opted-in customers match this campaign.")
    );

    if (!validation.isValid) {
      workspace.setWorkspaceError(validation.message);
      return;
    }

    setIsCreating(true);
    try {
      const campaign = await createCampaign({
        branchId: workspace.selectedBranchId,
        name: form.name,
        targetSegment: form.targetSegment,
        messageText: form.messageText
      });
      setCampaigns((current) => [campaign, ...current]);
      setForm((current) => ({ ...current, name: "", messageText: "" }));
      setRecipientCount(campaign.recipientCount);
    } catch (caught) {
      workspace.handleApiError(caught);
    } finally {
      setIsCreating(false);
    }
  }

  function updateSegment(targetSegment: CampaignTargetSegment) {
    setForm((current) => ({ ...current, targetSegment }));
    void loadPreview(targetSegment);
  }

  return (
    <AdminShell
      active="campaigns"
      branchName={branchName}
      branches={workspace.activeBranches}
      onLogout={workspace.logout}
      onSelectedBranchChange={workspace.setSelectedBranchId}
      selectedBranchId={workspace.selectedBranchId}
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge variant="secondary" className="gap-2">
              <Megaphone size={14} />
              Campaigns
            </Badge>
            <h1 className="mt-4 text-headline-lg text-primary">WhatsApp campaigns</h1>
            <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">
              Queue one message for opted-in customers. Provider sending will connect from this campaign queue.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={loadCampaigns} disabled={isLoading || !workspace.selectedBranch}>
            {isLoading ? <RefreshCw size={17} className="animate-spin" /> : <RefreshCw size={17} />}
            Refresh
          </Button>
        </header>

        <PageError message={workspace.workspaceError} />

        {workspace.isLoadingBranches ? (
          <PageLoading />
        ) : !workspace.selectedBranch ? (
          <EmptyBranchState />
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-3">
              <MetricCard icon={<Users size={20} />} label="Current audience" value={isPreviewing ? "..." : String(recipientCount)} />
              <MetricCard icon={<Clock size={20} />} label="Queued campaigns" value={String(queuedCount)} />
              <MetricCard icon={<MessageCircle size={20} />} label="Queued recipients" value={String(totalRecipients)} />
            </section>

            <Card>
              <CardHeader>
                <CardTitle>Create campaign</CardTitle>
                <p className="mt-1 text-sm text-on-surface-variant">Only customers with WhatsApp marketing consent are included.</p>
              </CardHeader>
              <CardContent>
                <form onSubmit={submitCampaign} className="grid gap-5">
                  <div className="grid gap-4 lg:grid-cols-[minmax(14rem,0.8fr)_minmax(16rem,1fr)]">
                    <label className="grid gap-2">
                      <span className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">Campaign name</span>
                      <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Weekend offer" className="h-11 bg-white" />
                    </label>
                    <label className="grid gap-2">
                      <span className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">Audience</span>
                      <select
                        value={form.targetSegment}
                        onChange={(event) => updateSegment(event.target.value as CampaignTargetSegment)}
                        className="h-11 w-full rounded-lg border border-input bg-white px-3 text-sm font-semibold text-on-surface outline-none transition-colors focus:border-primary/30 focus:ring-2 focus:ring-ring/20"
                      >
                        {SegmentOptions.map((segment) => (
                          <option key={segment.value} value={segment.value}>{segment.label}</option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="rounded-lg border border-outline-variant/70 bg-surface-container-low px-4 py-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-extrabold text-on-surface">{selectedSegment.label}</p>
                        <p className="mt-1 text-sm text-on-surface-variant">{selectedSegment.helper}</p>
                      </div>
                      <Badge variant="outline" className="h-9 justify-center px-3">
                        {isPreviewing ? "Checking..." : `${recipientCount} recipients`}
                      </Badge>
                    </div>
                  </div>

                  <label className="grid gap-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">Message</span>
                    <textarea
                      value={form.messageText}
                      onChange={(event) => setForm({ ...form, messageText: event.target.value })}
                      placeholder={`Hi {{name}}, we have a fresh offer at ${branchName}. Visit us today.`}
                      className="min-h-36 w-full resize-y rounded-lg border border-input bg-white px-3 py-3 text-sm font-medium text-on-surface outline-none transition-colors placeholder:text-on-surface-variant/45 focus:border-primary/30 focus:ring-2 focus:ring-ring/20"
                      maxLength={1000}
                    />
                    <span className="text-right text-xs font-semibold text-on-surface-variant">{form.messageText.length}/1000</span>
                  </label>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-on-surface-variant">
                      This creates a queue. Actual WhatsApp delivery needs a Business API provider connection.
                    </p>
                    <Button type="submit" disabled={isCreating || isPreviewing || recipientCount === 0}>
                      {isCreating ? <RefreshCw size={17} className="animate-spin" /> : <Send size={17} />}
                      Queue campaign
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Campaign history</CardTitle>
                  <p className="mt-1 text-sm text-on-surface-variant">{campaigns.length} campaigns for {workspace.selectedBranch.name}.</p>
                </div>
                <Badge variant="outline">{workspace.selectedBranch.name}</Badge>
              </CardHeader>
              <CardContent>
                {isLoading ? <PageLoading /> : <CampaignList campaigns={campaigns} />}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminShell>
  );
}

function CampaignList({ campaigns }: { campaigns: Campaign[] }) {
  if (campaigns.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-outline-variant/70 bg-surface-container-low p-8 text-center">
        <Megaphone size={28} className="mx-auto text-on-surface-variant/70" />
        <p className="mt-3 text-sm font-extrabold text-on-surface">No campaigns yet</p>
        <p className="mt-1 text-sm text-on-surface-variant">Create the first campaign when customers have opted in.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-outline-variant/70">
      <div className="hidden grid-cols-[1.1fr_0.8fr_0.7fr_0.6fr_0.8fr] gap-4 border-b border-outline-variant/70 bg-surface-container-low px-4 py-3 text-xs font-bold uppercase tracking-wide text-on-surface-variant lg:grid">
        <span>Name</span>
        <span>Audience</span>
        <span>Status</span>
        <span>Recipients</span>
        <span>Created</span>
      </div>
      <div className="divide-y divide-outline-variant/70">
        {campaigns.map((campaign) => (
          <div key={campaign.campaignId} className="grid gap-3 px-4 py-4 lg:grid-cols-[1.1fr_0.8fr_0.7fr_0.6fr_0.8fr] lg:items-center">
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold text-on-surface">{campaign.name}</p>
              <p className="mt-1 line-clamp-1 text-sm text-on-surface-variant">{campaign.messageText}</p>
            </div>
            <p className="text-sm font-semibold text-on-surface">{segmentLabel(campaign.targetSegment)}</p>
            <Badge variant={campaign.statusCode === "Queued" ? "secondary" : "outline"} className="w-fit">{campaign.statusCode}</Badge>
            <p className="text-sm font-extrabold text-on-surface">{campaign.recipientCount}</p>
            <p className="text-sm text-on-surface-variant">{formatDate(campaign.createdAtUtc)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function segmentLabel(segment: CampaignTargetSegment) {
  return SegmentOptions.find((option) => option.value === segment)?.label ?? segment;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function validateRequiredWithMin(value: string, label: string, minLength: number, maxLength: number): ValidationResult {
  const required = validateRequired(value, label, maxLength);
  if (!required.isValid) {
    return required;
  }

  return value.trim().length < minLength ? invalid(`${label} must be at least ${minLength} characters.`) : valid();
}
