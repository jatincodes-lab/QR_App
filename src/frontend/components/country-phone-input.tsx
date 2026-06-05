import { ChevronDown } from "lucide-react";
import { DialCountries, findDialCountry, formatPhoneForCountry, getLocalPhoneNumber } from "../lib/country-phone";
import { cn } from "../lib/utils";
import { Label } from "./ui/label";

export function CountryPhoneInput({
  className,
  countryCode,
  label = "Phone number",
  onChange,
  onCountryChange,
  required = false,
  value
}: {
  className?: string;
  countryCode: string;
  label?: string;
  onChange: (value: string) => void;
  onCountryChange: (countryCode: string, value: string) => void;
  required?: boolean;
  value: string;
}) {
  const country = findDialCountry(countryCode);
  const localNumber = getLocalPhoneNumber(value, country.iso2);

  function handleCountryChange(nextCountryCode: string) {
    const nextLocalNumber = getLocalPhoneNumber(value, country.iso2);
    onCountryChange(nextCountryCode, formatPhoneForCountry(nextCountryCode, nextLocalNumber));
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Label className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">{label}{required ? " *" : ""}</Label>
      <div className="grid h-12 grid-cols-[30%_70%] overflow-hidden rounded-xl border border-input bg-white shadow-sm transition-colors focus-within:border-primary/30 focus-within:ring-2 focus-within:ring-ring/20">
        <div className="relative min-w-0 border-r border-input bg-white">
          <select
            value={country.iso2}
            onChange={(event) => handleCountryChange(event.target.value)}
            className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
            aria-label={`${label} country`}
          >
            {DialCountries.map((option) => (
              <option key={option.iso2} value={option.iso2}>
                {option.iso2} {option.dialCode}
              </option>
            ))}
          </select>
          <span className="pointer-events-none flex h-full min-w-0 items-center justify-center gap-1 px-1 text-[11px] font-bold text-on-surface sm:text-xs">
            <span className="min-w-0 truncate">{country.iso2} {country.dialCode}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-on-surface-variant" aria-hidden="true" />
          </span>
        </div>
        <input
          value={localNumber}
          onChange={(event) => onChange(formatPhoneForCountry(country.iso2, event.target.value))}
          inputMode="tel"
          autoComplete="tel"
          placeholder="Mobile number"
          className="h-full min-w-0 bg-transparent px-3 text-[15px] font-semibold text-on-surface outline-none placeholder:text-muted-foreground sm:text-base"
          required={required}
        />
      </div>
    </div>
  );
}
