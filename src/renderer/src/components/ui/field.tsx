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
   */
  htmlFor?: string;
  className?: string;
};

export function FieldLabel({ children, htmlFor, className }: LabelProps) {
  const classes = cn(
    'mb-1 block text-label font-medium text-foreground/90',
    className,
  );

  if (htmlFor) {
    return (
      <label className={classes} htmlFor={htmlFor}>
        {children}
      </label>
    );
  }

  return <p className={classes}>{children}</p>;
}

export function SubLabel({ children, htmlFor, className }: LabelProps) {
  const classes = cn(
    'mb-1 block text-sub font-medium text-muted-foreground',
    className,
  );

  if (htmlFor) {
    return (
      <label className={classes} htmlFor={htmlFor}>
        {children}
      </label>
    );
  }

  return <span className={classes}>{children}</span>;
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
