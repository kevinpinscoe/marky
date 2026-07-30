import { ChevronDown } from 'lucide-react';
import { inputClass } from '@renderer/components/ui/field';
import { cn } from '@renderer/lib/utils';

/**
 * A native <select> with the platform's own arrow replaced.
 *
 * Windows draws an arrow that does not match anything else in the app, so
 * `appearance-none` removes it and the chevron is drawn here instead. The
 * element stays a real <select>, which keeps keyboard handling, type-ahead,
 * label association and screen reader support that a div-based replacement
 * would have to reimplement.
 *
 * The open dropdown list is still drawn by the operating system and cannot be
 * styled from here. Only a custom listbox fixes that — see #17.
 */
export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className={cn(inputClass, 'appearance-none pr-9', className)}
        {...props}
      >
        {children}
      </select>
      {/* Decorative: the select already announces itself, and clicks must fall
          through to it rather than landing on the icon. */}
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}
