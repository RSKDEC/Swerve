/** Return an honest status; unsupported/denied clipboard access is not success. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    /* Try older browsers. */
  }
  const input = document.createElement('textarea');
  const focused = document.activeElement as HTMLElement | null;
  input.value = text;
  input.setAttribute('aria-label', 'Result to copy');
  input.style.cssText = 'position:fixed;left:-9999px;top:0';
  document.body.append(input);
  input.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    input.remove();
    focused?.focus();
  }
}

export async function shareText(
  text: string,
): Promise<'shared' | 'cancelled' | 'copied' | 'manual'> {
  if (navigator.share) {
    try {
      await navigator.share({ title: 'swerve. daily', text });
      return 'shared';
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError')
        return 'cancelled';
    }
  }
  return (await copyText(text)) ? 'copied' : 'manual';
}
