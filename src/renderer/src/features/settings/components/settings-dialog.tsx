import { useEffect, useId, useMemo, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import {
  FieldHint,
  FieldLabel,
  SectionHeading,
  SubLabel,
  inputClass,
} from '@renderer/components/ui/field';
import { Modal } from '@renderer/components/ui/modal';
import { cn } from '@renderer/lib/utils';
import type { ExportFont, Locale, PdfPageSize } from '@shared/types';
import {
  fallbackFontOptions,
  loadFontOptions,
  toEditorFontFamilyCss,
  toPreviewFontFamilyCss,
  type FontOption,
  type LoadedFontOptions,
} from '../lib/font-options';
import { THEMES } from '../lib/themes';
import { useSettingsStore } from '../store';
import { useTranslation, type TranslationKeys } from '@renderer/i18n';

const exportFontOptions: Array<{
  value: ExportFont;
  labelKey: keyof TranslationKeys;
}> = [
  { value: 'system', labelKey: 'settings.exportFontSystem' },
  { value: 'serif', labelKey: 'settings.exportFontSerif' },
  { value: 'mono', labelKey: 'settings.exportFontMono' },
];

const fontSizeOptions = [12, 13, 14, 15, 16, 18, 20, 22, 24].map((value) => ({
  value,
  label: `${value}px`,
}));

const pageSizeOptions: Array<{ value: PdfPageSize; label: string }> = [
  { value: 'A4', label: 'A4 (210 x 297 mm)' },
  { value: 'Letter', label: 'Letter (216 x 279 mm)' },
  { value: 'Legal', label: 'Legal (216 x 356 mm)' },
  { value: 'A3', label: 'A3 (297 x 420 mm)' },
];

const languageOptions: Array<{ value: Locale; label: string }> = [
  { value: 'en', label: 'English' },
  { value: 'pt-BR', label: 'Português (Brasil)' },
  { value: 'es', label: 'Español' },
];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <SectionHeading>{title}</SectionHeading>
      {children}
    </div>
  );
}

function ensureSelectedFont(options: FontOption[], value: string) {
  if (!value || options.some((option) => option.value === value)) {
    return options;
  }

  return [{ value, label: value }, ...options];
}

function ensureSelectedFontSize(
  options: Array<{ value: number; label: string }>,
  value: number,
) {
  if (options.some((option) => option.value === value)) {
    return options;
  }

  return [...options, { value, label: `${value}px` }].sort(
    (left, right) => left.value - right.value,
  );
}

function FontField({
  label,
  value,
  fontSize,
  options,
  helper,
  previewText,
  previewFontFamily,
  previewFontSize,
  familyLabel,
  sizeLabel,
  sampleLabel,
  onChange,
  onFontSizeChange,
}: {
  label: string;
  value: string;
  fontSize: number;
  options: FontOption[];
  helper: string;
  previewText: string;
  previewFontFamily: string;
  previewFontSize: number;
  familyLabel: string;
  sizeLabel: string;
  sampleLabel: string;
  onChange: (value: string) => void;
  onFontSizeChange: (value: number) => void;
}) {
  const availableFontSizes = ensureSelectedFontSize(fontSizeOptions, fontSize);
  // Rendered once per font, so the ids have to be unique per instance.
  const fieldId = useId();
  const familyId = `${fieldId}-family`;
  const sizeId = `${fieldId}-size`;

  return (
    <div
      className="space-y-2"
      role="group"
      aria-labelledby={`${fieldId}-label`}
    >
      <FieldLabel id={`${fieldId}-label`}>{label}</FieldLabel>
      <div className="grid grid-cols-[minmax(0,1fr)_7.5rem] gap-2">
        <div className="min-w-0">
          <SubLabel htmlFor={familyId}>{familyLabel}</SubLabel>
          <select
            id={familyId}
            className={inputClass}
            value={value}
            onChange={(event) => onChange(event.target.value)}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <SubLabel htmlFor={sizeId}>{sizeLabel}</SubLabel>
          <select
            id={sizeId}
            className={inputClass}
            aria-label={`${label} size`}
            value={fontSize}
            onChange={(event) => onFontSizeChange(Number(event.target.value))}
          >
            {availableFontSizes.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <FieldHint>{helper}</FieldHint>
      <div className="rounded-2xl border border-border/80 bg-background/70 p-3 shadow-sm">
        <SubLabel className="mb-0">{sampleLabel}</SubLabel>
        <p
          className="mt-2 whitespace-pre-wrap text-foreground/90"
          style={{
            fontFamily: previewFontFamily,
            fontSize: `${previewFontSize}px`,
            lineHeight: 1.7,
          }}
        >
          {previewText}
        </p>
      </div>
    </div>
  );
}

export function SettingsDialog() {
  const { t } = useTranslation();
  const { settings, isOpen, updateSettings, closeDialog } = useSettingsStore();
  const [loadedFontChoices, setLoadedFontChoices] =
    useState<LoadedFontOptions | null>(null);
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let cancelled = false;

    void loadFontOptions({
      editorFontFamily: settings.editorFontFamily,
      previewFontFamily: settings.previewFontFamily,
    }).then((next) => {
      if (!cancelled) {
        setLoadedFontChoices(next);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen, settings.editorFontFamily, settings.previewFontFamily]);

  const fontChoices = useMemo(() => {
    const base =
      loadedFontChoices ??
      fallbackFontOptions({
        editorFontFamily: settings.editorFontFamily,
        previewFontFamily: settings.previewFontFamily,
      });

    return {
      ...base,
      editor: ensureSelectedFont(base.editor, settings.editorFontFamily),
      preview: ensureSelectedFont(base.preview, settings.previewFontFamily),
    };
  }, [
    loadedFontChoices,
    settings.editorFontFamily,
    settings.previewFontFamily,
  ]);

  const fontLibraryHint = useMemo(() => {
    if (fontChoices.usesLocalFonts && fontChoices.editorListIsFiltered) {
      return t('settings.fontHintLocalFiltered');
    }

    if (fontChoices.usesLocalFonts) {
      return t('settings.fontHintLocalFull');
    }

    return t('settings.fontHintFallback');
  }, [fontChoices.editorListIsFiltered, fontChoices.usesLocalFonts, t]);

  if (!isOpen) return null;

  const marginLabels: Record<'top' | 'right' | 'bottom' | 'left', string> = {
    top: t('settings.marginTop'),
    right: t('settings.marginRight'),
    bottom: t('settings.marginBottom'),
    left: t('settings.marginLeft'),
  };

  return (
    <Modal
      title={t('settings.title')}
      subtitle={t('settings.subtitle')}
      className="w-[540px]"
      scrollableBody
      bodyClassName="space-y-6"
      onClose={closeDialog}
    >
      <Section title={t('settings.appearance')}>
        <div>
          <FieldLabel htmlFor="settings-language">
            {t('settings.language')}
          </FieldLabel>
          <select
            id="settings-language"
            className={inputClass}
            value={settings.language}
            onChange={(event) =>
              updateSettings({ language: event.target.value as Locale })
            }
          >
            {languageOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabel id="settings-theme-label">
            {t('settings.theme')}
          </FieldLabel>
          <div
            className="flex gap-2"
            role="group"
            aria-labelledby="settings-theme-label"
          >
            {(['light', 'dark'] as const).map((theme) => (
              <button
                key={theme}
                type="button"
                onClick={() => updateSettings({ theme })}
                aria-pressed={settings.theme === theme}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-xl border py-2 text-sm font-medium transition-colors',
                  settings.theme === theme
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border bg-background text-muted-foreground hover:bg-accent',
                )}
              >
                {theme === 'light' ? (
                  <Sun className="size-4" />
                ) : (
                  <Moon className="size-4" />
                )}
                {theme === 'light' ? t('settings.light') : t('settings.dark')}
              </button>
            ))}
          </div>
        </div>

        <div>
          <FieldLabel id="settings-color-theme-label">
            {t('settings.colorTheme')}
          </FieldLabel>
          <div
            className="grid grid-cols-3 gap-2"
            role="group"
            aria-labelledby="settings-color-theme-label"
          >
            {THEMES.map((option) => (
              <button
                key={option.name}
                type="button"
                onClick={() => updateSettings({ colorTheme: option.name })}
                aria-pressed={settings.colorTheme === option.name}
                className={cn(
                  'flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors',
                  settings.colorTheme === option.name
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border bg-background text-muted-foreground hover:bg-accent',
                )}
              >
                <span
                  className="size-4 shrink-0 rounded-full ring-1 ring-inset ring-black/10"
                  style={{ backgroundColor: option.swatch }}
                />
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </Section>

      <div className="border-t border-border" />

      <Section title={t('settings.writing')}>
        <FieldHint>{fontLibraryHint}</FieldHint>

        <div className="space-y-4">
          <FontField
            label={t('settings.editorFont')}
            value={settings.editorFontFamily}
            fontSize={settings.editorFontSize}
            options={fontChoices.editor}
            helper={t('settings.editorFontHelper')}
            previewFontFamily={toEditorFontFamilyCss(settings.editorFontFamily)}
            previewFontSize={settings.editorFontSize}
            previewText={t('settings.editorPreviewText')}
            familyLabel={t('settings.family')}
            sizeLabel={t('settings.size')}
            sampleLabel={t('settings.sample')}
            onChange={(editorFontFamily) =>
              updateSettings({ editorFontFamily })
            }
            onFontSizeChange={(editorFontSize) =>
              updateSettings({ editorFontSize })
            }
          />

          <FontField
            label={t('settings.previewFont')}
            value={settings.previewFontFamily}
            fontSize={settings.previewFontSize}
            options={fontChoices.preview}
            helper={t('settings.previewFontHelper')}
            previewFontFamily={toPreviewFontFamilyCss(
              settings.previewFontFamily,
            )}
            previewFontSize={settings.previewFontSize}
            previewText={t('settings.previewPreviewText')}
            familyLabel={t('settings.family')}
            sizeLabel={t('settings.size')}
            sampleLabel={t('settings.sample')}
            onChange={(previewFontFamily) =>
              updateSettings({ previewFontFamily })
            }
            onFontSizeChange={(previewFontSize) =>
              updateSettings({ previewFontSize })
            }
          />
        </div>
      </Section>

      <div className="border-t border-border" />

      <Section title={t('settings.export')}>
        <div>
          <FieldLabel htmlFor="settings-export-font">
            {t('settings.documentFont')}
          </FieldLabel>
          <select
            id="settings-export-font"
            className={inputClass}
            value={settings.exportFont}
            onChange={(event) =>
              updateSettings({ exportFont: event.target.value as ExportFont })
            }
          >
            {exportFontOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.labelKey)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabel htmlFor="settings-pdf-page-size">
            {t('settings.pdfPageSize')}
          </FieldLabel>
          <select
            id="settings-pdf-page-size"
            className={inputClass}
            value={settings.pdfPageSize}
            onChange={(event) =>
              updateSettings({ pdfPageSize: event.target.value as PdfPageSize })
            }
          >
            {pageSizeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabel id="settings-pdf-margins-label">
            {t('settings.pdfMargins')}
          </FieldLabel>
          <div
            className="grid grid-cols-2 gap-2"
            role="group"
            aria-labelledby="settings-pdf-margins-label"
          >
            {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
              <div key={side}>
                <SubLabel htmlFor={`settings-margin-${side}`}>
                  {marginLabels[side]}
                </SubLabel>
                <input
                  id={`settings-margin-${side}`}
                  type="number"
                  min={0}
                  max={100}
                  className={inputClass}
                  value={settings.pdfMargins[side]}
                  onChange={(event) =>
                    updateSettings({
                      pdfMargins: {
                        ...settings.pdfMargins,
                        [side]: Math.max(0, Number(event.target.value)),
                      },
                    })
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </Section>
    </Modal>
  );
}
