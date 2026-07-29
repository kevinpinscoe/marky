import { useEffect, useMemo, useRef, useState } from 'react';
import { FolderOpen, TriangleAlert } from 'lucide-react';
import { Button } from '@renderer/components/ui/button';
import {
  FieldHint,
  FieldLabel,
  inputClass,
} from '@renderer/components/ui/field';
import { Modal } from '@renderer/components/ui/modal';
import { useTranslation } from '@renderer/i18n';
import { relativeToFile } from '@renderer/lib/paths';

export type InsertAssetRequest = {
  type: 'link' | 'image';
  initialText: string;
};

export type InsertAssetDialogState = InsertAssetRequest | null;

export type InsertAssetPayload =
  | {
      type: 'link';
      text: string;
      url: string;
    }
  | {
      type: 'image';
      altText: string;
      url: string;
    };

type InsertAssetDialogProps = {
  dialog: InsertAssetDialogState;
  documentPath?: string | null;
  onClose: () => void;
  onInsert: (payload: InsertAssetPayload) => void;
};

function isLocalPath(value: string): boolean {
  if (!value.trim()) return false;
  try {
    new URL(value);
    return false;
  } catch {
    return !value.startsWith('data:');
  }
}

function isOutsideDocumentFolder(
  absoluteImagePath: string,
  documentPath: string,
): boolean {
  const relative = relativeToFile(absoluteImagePath, documentPath);
  return relative === absoluteImagePath;
}

export function InsertAssetDialog({
  dialog,
  documentPath,
  onClose,
  onInsert,
}: InsertAssetDialogProps) {
  if (!dialog) return null;

  return (
    <InsertAssetDialogContent
      key={`${dialog.type}:${dialog.initialText}`}
      dialog={dialog}
      documentPath={documentPath}
      onClose={onClose}
      onInsert={onInsert}
    />
  );
}

type InsertAssetDialogContentProps = {
  dialog: Exclude<InsertAssetDialogState, null>;
  documentPath?: string | null;
  onClose: () => void;
  onInsert: (payload: InsertAssetPayload) => void;
};

function InsertAssetDialogContent({
  dialog,
  documentPath,
  onClose,
  onInsert,
}: InsertAssetDialogContentProps) {
  const { t } = useTranslation();
  const urlInputRef = useRef<HTMLInputElement | null>(null);
  const [url, setUrl] = useState('');
  const [textValue, setTextValue] = useState(dialog.initialText);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      urlInputRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  const isLink = dialog.type === 'link';
  const isImage = dialog.type === 'image';
  const title = isLink
    ? t('insertAsset.insertLink')
    : t('insertAsset.insertImage');
  const textLabel = isLink
    ? t('insertAsset.linkText')
    : t('insertAsset.altText');
  const textPlaceholder = isLink
    ? t('insertAsset.linkTextPlaceholder')
    : t('insertAsset.altTextPlaceholder');
  const submitLabel = isLink
    ? t('insertAsset.insertLink')
    : t('insertAsset.insertImage');
  const urlLabel = isImage
    ? t('insertAsset.imagePathOrUrl')
    : t('insertAsset.url');

  const imageWarning = useMemo(() => {
    if (!isImage || !url.trim()) return null;
    if (!isLocalPath(url)) return null;
    if (!documentPath) return t('insertAsset.warnUnsaved');
    if (isOutsideDocumentFolder(url, documentPath))
      return t('insertAsset.warnOutsideFolder');
    return null;
  }, [isImage, url, documentPath, t]);

  async function handleBrowse() {
    const picked = await window.marky.pickImage();
    if (!picked) return;

    if (documentPath) {
      setUrl(relativeToFile(picked, documentPath));
    } else {
      setUrl(picked);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;

    if (isLink) {
      onInsert({
        type: 'link',
        text: textValue.trim() || trimmedUrl,
        url: trimmedUrl,
      });
      return;
    }

    onInsert({
      type: 'image',
      altText: textValue.trim(),
      url: trimmedUrl,
    });
  }

  return (
    <Modal title={title} className="w-full max-w-md" onClose={onClose}>
      <form className="space-y-4 px-5 py-5" onSubmit={handleSubmit}>
        <div>
          <FieldLabel htmlFor="insert-asset-url">{urlLabel}</FieldLabel>
          <div className={isImage ? 'flex gap-2' : ''}>
            <input
              id="insert-asset-url"
              ref={urlInputRef}
              type={isLink ? 'url' : 'text'}
              className={inputClass}
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder={
                isLink
                  ? t('insertAsset.linkPlaceholder')
                  : t('insertAsset.imagePlaceholder')
              }
            />
            {isImage && (
              <Button
                type="button"
                variant="outline"
                className="shrink-0"
                onClick={handleBrowse}
                aria-label={t('insertAsset.browse')}
              >
                <FolderOpen className="mr-1.5 size-4" />
                {t('insertAsset.browse')}
              </Button>
            )}
          </div>
          {isImage && (
            <FieldHint className="mt-1.5">
              {t('insertAsset.localImageHint')}
            </FieldHint>
          )}
          {imageWarning && (
            <p className="mt-1.5 flex items-start gap-1.5 text-hint text-amber-600 dark:text-amber-400">
              <TriangleAlert className="mt-px size-3.5 shrink-0" />
              <span>{imageWarning}</span>
            </p>
          )}
        </div>

        <div>
          <FieldLabel htmlFor="insert-asset-text">{textLabel}</FieldLabel>
          <input
            id="insert-asset-text"
            type="text"
            className={inputClass}
            value={textValue}
            onChange={(event) => setTextValue(event.target.value)}
            placeholder={textPlaceholder}
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="ghost" type="button" onClick={onClose}>
            {t('insertAsset.cancel')}
          </Button>
          <Button type="submit" disabled={url.trim().length === 0}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
