"use client";

import { ChangeEvent, useRef, useState } from "react";
import { ChefHat, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { ApiError, uploadMedia } from "../lib/api";
import { Button } from "./ui/button";

const AllowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const MaxImageBytes = 5 * 1024 * 1024;

type MenuItemImagePickerProps = {
  disabled?: boolean;
  imageAltText: string;
  imageUrl: string;
  itemName: string;
  onChange: (next: { imageAltText: string; imageUrl: string }) => void;
};

export function MenuItemImagePicker({ disabled = false, imageAltText, imageUrl, itemName, onChange }: MenuItemImagePickerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!AllowedImageTypes.has(file.type)) {
      setError("Only JPG, PNG, or WebP images are supported.");
      return;
    }

    if (file.size > MaxImageBytes) {
      setError("Image size must be 5 MB or less.");
      return;
    }

    setIsUploading(true);
    setError(null);
    try {
      const uploaded = await uploadMedia(file, "menu-item");
      onChange({
        imageUrl: uploaded.url,
        imageAltText: imageAltText.trim() || itemName.trim()
      });
    } catch (caught) {
      setError(caught instanceof ApiError || caught instanceof Error ? caught.message : "Image upload failed.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-3 rounded-xl border border-outline-variant/70 bg-white p-3">
        <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-primary-fixed text-primary">
          {imageUrl ? <img src={imageUrl} alt={imageAltText || itemName || "Menu item"} className="h-full w-full object-cover" /> : <ChefHat size={24} />}
        </div>
        <div className="min-w-0 flex-1">
          <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFileChange} className="hidden" disabled={disabled || isUploading} />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={disabled || isUploading}>
              {isUploading ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
              {imageUrl ? "Replace Image" : "Upload Image"}
            </Button>
            {imageUrl ? (
              <Button type="button" variant="outline" onClick={() => onChange({ imageUrl: "", imageAltText: "" })} disabled={disabled || isUploading} className="border-destructive/30 text-destructive">
                <Trash2 size={16} />
                Remove
              </Button>
            ) : null}
          </div>
          {error ? <p className="mt-2 text-xs font-semibold text-destructive">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
