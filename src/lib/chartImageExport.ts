import { toBlob } from 'html-to-image';

export const CHART_EXPORT_EXCLUDE_ATTR = 'data-chart-export-exclude';

export function shouldIncludeInChartExport(node: Node): boolean {
  if (!(node instanceof HTMLElement)) {
    return true;
  }

  let current: HTMLElement | null = node;
  while (current) {
    if (current.hasAttribute(CHART_EXPORT_EXCLUDE_ATTR)) {
      return false;
    }
    current = current.parentElement;
  }

  return true;
}

export function buildChartImageFilename(
  title: string | undefined,
  vizType: string,
  chartId: string,
): string {
  const sanitizedTitle = (title ?? '')
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 80);

  if (sanitizedTitle) {
    return `${sanitizedTitle}.png`;
  }

  const shortId = chartId.slice(0, 8);
  return `chart-${vizType}-${shortId}.png`;
}

export async function captureChartImage(element: HTMLElement): Promise<Blob> {
  const blob = await toBlob(element, {
    cacheBust: true,
    pixelRatio: 2,
    filter: shouldIncludeInChartExport,
  });

  if (!blob) {
    throw new Error('Failed to capture chart image.');
  }

  return blob;
}

export async function downloadChartImage(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  const blob = await captureChartImage(element);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function copyChartImageToClipboard(
  element: HTMLElement,
): Promise<void> {
  if (
    typeof navigator === 'undefined' ||
    !navigator.clipboard?.write ||
    typeof ClipboardItem === 'undefined'
  ) {
    throw new Error('Clipboard image copy is not supported in this browser.');
  }

  const blob = await captureChartImage(element);
  await navigator.clipboard.write([
    new ClipboardItem({ 'image/png': blob }),
  ]);
}
