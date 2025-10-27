type RetryHandler = (() => void) | undefined;

let overlay: HTMLDivElement | null = null;
let messageEl: HTMLParagraphElement | null = null;
let retryButton: HTMLButtonElement | null = null;
let currentHandler: RetryHandler = undefined;

const overlayStyles =
  'position:fixed;inset:0;background:rgba(15,23,42,0.85);display:flex;flex-direction:column;' +
  'align-items:center;justify-content:center;gap:16px;padding:24px;z-index:2147483647;text-align:center;color:#fff;';

const buttonStyles =
  'padding:12px 20px;border-radius:8px;background:#2563eb;color:#fff;font-weight:600;' +
  'cursor:pointer;border:none;box-shadow:0 10px 25px rgba(37,99,235,0.35);';

function ensureOverlay(): void {
  if (overlay) {
    return;
  }

  overlay = document.createElement('div');
  overlay.setAttribute('style', overlayStyles);

  const title = document.createElement('h2');
  title.textContent = 'Sunucuya bağlanırken problem oluştu';
  title.setAttribute('style', 'font-size:24px;font-weight:700;margin:0;');

  messageEl = document.createElement('p');
  messageEl.setAttribute('style', 'max-width:520px;line-height:1.6;margin:0;color:#e2e8f0;');

  retryButton = document.createElement('button');
  retryButton.textContent = 'Tekrar dene';
  retryButton.setAttribute('style', buttonStyles);
  retryButton.addEventListener('click', () => {
    if (currentHandler) {
      currentHandler();
    }
  });

  overlay.appendChild(title);
  overlay.appendChild(messageEl);
  overlay.appendChild(retryButton);
  document.body.appendChild(overlay);
}

export function showApiErrorOverlay(message: string, onRetry?: () => void): void {
  ensureOverlay();

  if (!overlay || !messageEl || !retryButton) {
    return;
  }

  messageEl.textContent = message;
  currentHandler = onRetry;
  overlay.style.display = 'flex';
  retryButton.style.display = onRetry ? 'inline-flex' : 'none';
}

export function hideApiErrorOverlay(): void {
  if (overlay) {
    overlay.style.display = 'none';
  }
  currentHandler = undefined;
}
