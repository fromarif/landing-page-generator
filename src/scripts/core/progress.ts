// See docs/loader-gating.md before changing this.

let total = 0;
let settled = 0;
const listeners = new Set<(ratio: number) => void>();

function emit() {
  const value = assetRatio();
  listeners.forEach((listener) => listener(value));
}

export function expectAssets(count: number) {
  total += count;
  emit();
}

export function assetSettled() {
  settled += 1;
  emit();
}

export function assetRatio(): number {
  return total ? Math.min(settled / total, 1) : 1;
}

export function assetsPending(): boolean {
  return settled < total;
}

export function onAssetProgress(listener: (ratio: number) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function whenAssetsSettled(timeoutMs = 10000): Promise<void> {
  if (!assetsPending()) return Promise.resolve();

  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      off();
      resolve();
    };
    const off = onAssetProgress(() => {
      if (!assetsPending()) finish();
    });
    const timer = setTimeout(finish, timeoutMs);
  });
}
