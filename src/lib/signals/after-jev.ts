export function afterJev(signal: { kept: boolean; soWhatSettled?: boolean }, needsTranslate: boolean) {
  return {
    translate: signal.kept && needsTranslate,
    polish: signal.kept && signal.soWhatSettled === false,
  };
}
