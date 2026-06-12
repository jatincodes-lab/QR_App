"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Gift, Loader2, Plus, Power, RefreshCw } from "lucide-react";
import { AdminShell } from "../../../components/admin-shell";
import { EmptyBranchState, MetricCard, PageError, PageLoading } from "../../../components/admin-page-common";
import { MenuItemImagePicker } from "../../../components/menu-item-image-picker";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import {
  createBranchOffer,
  deactivateBranchOffer,
  getBranchOffers,
  type BranchOffer,
  type CreateBranchOfferInput,
  type OfferDiscountTypeCode
} from "../../../lib/api";
import { useAdminWorkspace } from "../../../lib/admin-workspace";
import { firstInvalid, validateOptionalText, validatePositiveInteger, validateRequired } from "../../../lib/validation";

type OfferForm = {
  title: string;
  subtitle: string;
  discountText: string;
  imageUrl: string;
  imageAltText: string;
  displayOrder: string;
  discountTypeCode: OfferDiscountTypeCode;
  discountValue: string;
  minimumOrderAmount: string;
  maxDiscountAmount: string;
  autoApply: boolean;
};

const EmptyOfferForm: OfferForm = {
  title: "",
  subtitle: "",
  discountText: "",
  imageUrl: "",
  imageAltText: "",
  displayOrder: "1",
  discountTypeCode: "DisplayOnly",
  discountValue: "0",
  minimumOrderAmount: "0",
  maxDiscountAmount: "",
  autoApply: false
};

export default function AdminOffersPage() {
  const workspace = useAdminWorkspace();
  const [offers, setOffers] = useState<BranchOffer[]>([]);
  const [form, setForm] = useState<OfferForm>(EmptyOfferForm);
  const [isLoading, setIsLoading] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const sortedOffers = useMemo(() => [...offers].sort((left, right) => left.displayOrder - right.displayOrder), [offers]);

  useEffect(() => {
    if (!workspace.selectedBranch) {
      setOffers([]);
      return;
    }

    void loadOffers(workspace.selectedBranch.branchId);
  }, [workspace.selectedBranch?.branchId]);

  async function loadOffers(branchId: string) {
    setIsLoading(true);
    try {
      setOffers(await getBranchOffers(branchId));
    } catch (caught) {
      workspace.handleApiError(caught);
    } finally {
      setIsLoading(false);
    }
  }

  async function createOffer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workspace.selectedBranch) {
      return;
    }

    setSavingKey("offer");
    try {
      const validation = validateOfferForm(form);
      if (!validation.isValid) {
        workspace.setWorkspaceError(validation.message);
        return;
      }

      const offer = await createBranchOffer(workspace.selectedBranch.branchId, toOfferInput(form));
      setOffers((current) => [...current, offer]);
      setForm({ ...EmptyOfferForm, displayOrder: String(offers.length + 2) });
    } catch (caught) {
      workspace.handleApiError(caught);
    } finally {
      setSavingKey(null);
    }
  }

  async function turnOffOffer(offer: BranchOffer) {
    if (!workspace.selectedBranch) {
      return;
    }

    setSavingKey(offer.branchOfferId);
    try {
      await deactivateBranchOffer(workspace.selectedBranch.branchId, offer.branchOfferId);
      setOffers((current) => current.filter((item) => item.branchOfferId !== offer.branchOfferId));
    } catch (caught) {
      workspace.handleApiError(caught);
    } finally {
      setSavingKey(null);
    }
  }

  const branchName = workspace.selectedBranch?.name ?? "Offers";

  return (
    <AdminShell
      active="offers"
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
              <Gift size={14} />
              Offers
            </Badge>
            <h1 className="mt-4 text-headline-lg text-primary">Offers and combo banners</h1>
            <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">
              Create customer-facing promotions for the QR menu. Use these for discounts, combo messaging, and seasonal specials.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={() => workspace.selectedBranch && loadOffers(workspace.selectedBranch.branchId)} className="w-full sm:w-auto">
            <RefreshCw size={17} />
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
              <MetricCard icon={<Gift size={20} />} label="Active offers" value={isLoading ? "..." : String(offers.length)} />
              <MetricCard icon={<Plus size={20} />} label="Next order" value={String(offers.length + 1)} />
              <MetricCard icon={<Power size={20} />} label="QR visibility" value="Public menu" />
            </section>

            <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Add offer or combo</CardTitle>
                  <CardDescription>Create promotional banners or auto-applied cart discounts for the QR menu.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={createOffer} className="grid gap-3">
                    <Field label="Title">
                      <Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required placeholder="Lunch combo" />
                    </Field>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Discount text">
                        <Input value={form.discountText} onChange={(event) => setForm({ ...form, discountText: event.target.value })} placeholder="Save Rs 99" />
                      </Field>
                      <Field label="Order">
                        <Input type="number" min="1" value={form.displayOrder} onChange={(event) => setForm({ ...form, displayOrder: event.target.value })} required />
                      </Field>
                    </div>
                    <Field label="Subtitle">
                      <Input value={form.subtitle} onChange={(event) => setForm({ ...form, subtitle: event.target.value })} placeholder="Burger + fries + coke" />
                    </Field>
                    <div className="rounded-lg border border-outline-variant/60 bg-surface-container-low p-3">
                      <p className="text-sm font-extrabold text-on-surface">Discount rule</p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <Field label="Type">
                          <select
                            value={form.discountTypeCode}
                            onChange={(event) => {
                              const discountTypeCode = event.target.value as OfferDiscountTypeCode;
                              setForm({
                                ...form,
                                discountTypeCode,
                                discountValue: discountTypeCode === "DisplayOnly" ? "0" : form.discountValue,
                                minimumOrderAmount: discountTypeCode === "DisplayOnly" ? "0" : form.minimumOrderAmount,
                                maxDiscountAmount: discountTypeCode === "DisplayOnly" ? "" : form.maxDiscountAmount,
                                autoApply: discountTypeCode !== "DisplayOnly" && form.autoApply
                              });
                            }}
                            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                          >
                            <option value="DisplayOnly">Display only</option>
                            <option value="Percentage">Percentage</option>
                            <option value="FixedAmount">Fixed amount</option>
                          </select>
                        </Field>
                        <Field label={form.discountTypeCode === "Percentage" ? "Discount %" : "Discount amount"}>
                          <Input
                            type="number"
                            min="0"
                            max={form.discountTypeCode === "Percentage" ? "100" : undefined}
                            step="0.01"
                            value={form.discountValue}
                            onChange={(event) => setForm({ ...form, discountValue: event.target.value })}
                            disabled={form.discountTypeCode === "DisplayOnly"}
                          />
                        </Field>
                        <Field label="Minimum order">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.minimumOrderAmount}
                            onChange={(event) => setForm({ ...form, minimumOrderAmount: event.target.value })}
                            disabled={form.discountTypeCode === "DisplayOnly"}
                          />
                        </Field>
                        <Field label="Max discount">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.maxDiscountAmount}
                            onChange={(event) => setForm({ ...form, maxDiscountAmount: event.target.value })}
                            placeholder="No cap"
                            disabled={form.discountTypeCode !== "Percentage"}
                          />
                        </Field>
                      </div>
                      <label className="mt-3 flex items-center gap-2 text-sm font-bold text-on-surface">
                        <input
                          type="checkbox"
                          checked={form.autoApply}
                          onChange={(event) => setForm({ ...form, autoApply: event.target.checked })}
                          disabled={form.discountTypeCode === "DisplayOnly"}
                          className="h-4 w-4 rounded border-outline-variant"
                        />
                        Auto-apply best eligible offer in QR cart
                      </label>
                    </div>
                    <Field label="Offer image">
                      <MenuItemImagePicker
                        imageAltText={form.imageAltText}
                        imageUrl={form.imageUrl}
                        itemName={form.title}
                        purpose="offer"
                        onChange={(next) => setForm({ ...form, imageUrl: next.imageUrl, imageAltText: next.imageAltText })}
                      />
                    </Field>
                    <Button type="submit" disabled={savingKey === "offer"} className="w-full justify-self-start sm:w-auto">
                      {savingKey === "offer" ? <Loader2 size={17} className="animate-spin" /> : <Plus size={17} />}
                      Add offer
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Active QR offers</CardTitle>
                  <CardDescription>These appear in the customer QR menu carousel.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {isLoading ? (
                    <PageLoading />
                  ) : sortedOffers.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-outline-variant/70 bg-surface-container-low p-8 text-center">
                      <p className="text-sm font-bold text-on-surface">No active offers</p>
                      <p className="mt-1 text-sm text-on-surface-variant">Add a promotion or combo banner to highlight it on the QR menu.</p>
                    </div>
                  ) : (
                    sortedOffers.map((offer) => (
                      <article key={offer.branchOfferId} className="grid gap-3 rounded-xl border border-outline-variant/60 bg-white p-4 sm:flex sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="break-words text-sm font-extrabold text-on-surface">{offer.title}</p>
                          <p className="mt-1 break-words text-xs leading-5 text-on-surface-variant">{offer.subtitle || offer.discountText || "No subtitle"}</p>
                          <p className="mt-1 text-xs text-on-surface-variant">
                            {formatOfferRule(offer)} - Order {offer.displayOrder}
                          </p>
                        </div>
                        <Button type="button" variant="outline" disabled={savingKey === offer.branchOfferId} onClick={() => turnOffOffer(offer)} className="h-11 w-full sm:w-auto">
                          <Power size={14} />
                          Off
                        </Button>
                      </article>
                    ))
                  )}
                </CardContent>
              </Card>
            </section>
          </>
        )}
      </div>
    </AdminShell>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="grid gap-2">
      <Label className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">{label}</Label>
      {children}
    </div>
  );
}

function toOfferInput(form: OfferForm): CreateBranchOfferInput {
  return {
    title: form.title.trim(),
    subtitle: optional(form.subtitle),
    discountText: optional(form.discountText),
    imageUrl: optional(form.imageUrl),
    imageAltText: form.imageUrl ? optional(form.imageAltText) ?? form.title.trim() : null,
    displayOrder: toPositiveNumber(form.displayOrder),
    startsAtUtc: null,
    endsAtUtc: null,
    discountTypeCode: form.discountTypeCode,
    discountValue: form.discountTypeCode === "DisplayOnly" ? 0 : toMoneyNumber(form.discountValue),
    minimumOrderAmount: form.discountTypeCode === "DisplayOnly" ? 0 : toMoneyNumber(form.minimumOrderAmount),
    maxDiscountAmount: form.discountTypeCode === "Percentage" ? optionalMoney(form.maxDiscountAmount) : null,
    autoApply: form.discountTypeCode !== "DisplayOnly" && form.autoApply
  };
}

function validateOfferForm(form: OfferForm) {
  return firstInvalid(
    validateRequired(form.title, "Title"),
    validateOptionalText(form.subtitle, "Subtitle", 200),
    validateOptionalText(form.discountText, "Discount text", 120),
    validatePositiveInteger(form.displayOrder, "Order"),
    validateOfferRule(form)
  );
}

function validateOfferRule(form: OfferForm) {
  if (form.discountTypeCode === "DisplayOnly") {
    return { isValid: true, message: "" };
  }

  const discountValue = Number(form.discountValue);
  const minimumOrderAmount = Number(form.minimumOrderAmount);
  const maxDiscountAmount = form.maxDiscountAmount.trim() ? Number(form.maxDiscountAmount) : null;

  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    return { isValid: false, message: "Discount value must be greater than 0." };
  }

  if (form.discountTypeCode === "Percentage" && discountValue > 100) {
    return { isValid: false, message: "Percentage discount cannot exceed 100." };
  }

  if (!Number.isFinite(minimumOrderAmount) || minimumOrderAmount < 0) {
    return { isValid: false, message: "Minimum order amount cannot be negative." };
  }

  if (maxDiscountAmount !== null && (!Number.isFinite(maxDiscountAmount) || maxDiscountAmount < 0)) {
    return { isValid: false, message: "Maximum discount amount cannot be negative." };
  }

  return { isValid: true, message: "" };
}

function optional(value: string): string | null {
  const cleaned = value.trim();
  return cleaned.length > 0 ? cleaned : null;
}

function toPositiveNumber(value: string): number {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 1;
}

function toMoneyNumber(value: string): number {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number * 100) / 100 : 0;
}

function optionalMoney(value: string): number | null {
  const cleaned = value.trim();
  if (!cleaned) {
    return null;
  }

  const number = Number(cleaned);
  return Number.isFinite(number) && number >= 0 ? Math.round(number * 100) / 100 : null;
}

function formatOfferRule(offer: BranchOffer): string {
  if (offer.discountTypeCode === "DisplayOnly") {
    return "Display only";
  }

  const value = offer.discountTypeCode === "Percentage" ? `${offer.discountValue}% off` : `Rs ${offer.discountValue} off`;
  const minimum = offer.minimumOrderAmount > 0 ? ` above Rs ${offer.minimumOrderAmount}` : "";
  return `${offer.autoApply ? "Auto" : "Manual"} ${value}${minimum}`;
}
