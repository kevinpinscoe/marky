import { cn } from '@renderer/lib/utils';

/**
 * Shared form typography for dialogs.
 *
 * One uppercase tier only — the section heading. Everything below it is
 * sentence case and leans on size, weight and colour for hierarchy, so a
 * nested sub-label never shouts louder than the field it sits under.
 *
 * 13px is the floor: nothing on a dialog surface renders smaller. Sizes come
 * from the `fontSize` tokens in tailwind.config.ts — never a raw `text-[13px]`,
 * which is what let the old styles drift apart in the first place.
 *
 *   text-section  13px  semibold  uppercase  muted
 *   text-label    14px  medium    sentence   foreground/90
 *   text-sub      13px  medium    sentence   muted
 *   text-hint     13px  normal    sentence   muted
 */

export const inputClass =
  'w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring';

export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-section font-semibold uppercase text-muted-foreground">
      {children}
    </h3>
  );
}

type LabelProps = {
  children: React.ReactNode;
  /**
   * Binds a real <label> to this control. Omit when the label heads a group
   * of controls (button rows, margin grids) that no single id can stand for —
   * a label pointing at nothing helps nobody, so those render as plain text.
   * Give those an `id` instead and point the group's `aria-labelledby` at it.
   */
  htmlFor?: string;
  id?: string;
  /**
   * Set on a label that names a group through `aria-labelledby`. The group
   * already carries the text as its accessible name, so leaving the label in
   * the tree as well makes screen readers say it twice — once as loose text,
   * then again on entering the group.
   *
   * Safe to hide: the accessible name computation still reads hidden elements
   * referenced by `aria-labelledby`.
   */
  'aria-hidden'?: boolean;
  className?: string;
};

export function FieldLabel({
  children,
  htmlFor,
  id,
  className,
  'aria-hidden': ariaHidden,
}: LabelProps) {
  const classes = cn(
    'mb-1 block text-label font-medium text-foreground/90',
    className,
  );

  if (htmlFor) {
    return (
      <label className={classes} htmlFor={htmlFor} id={id}>
        {children}
      </label>
    );
  }

  return (
    <p className={classes} id={id} aria-hidden={ariaHidden}>
      {children}
    </p>
  );
}

export function SubLabel({ children, htmlFor, id, className }: LabelProps) {
  const classes = cn(
    'mb-1 block text-sub font-medium text-muted-foreground',
    className,
  );

  if (htmlFor) {
    return (
      <label className={classes} htmlFor={htmlFor} id={id}>
        {children}
      </label>
    );
  }

  return (
    <span className={classes} id={id}>
      {children}
    </span>
  );
}

export function FieldHint({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={cn('text-hint text-muted-foreground', className)}>
      {children}
    </p>
  );
}
