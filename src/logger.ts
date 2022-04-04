function getTimestamp(): string {
  const localeStringOptions = {
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    day: '2-digit',
    month: '2-digit',
  };
  return new Date(Date.now()).toLocaleString(
    undefined,
    localeStringOptions as Intl.DateTimeFormatOptions,
  );
}

// It's trash, I know... Maybe later I'll do better :) Also, PRs are welcome
export class Logger {
  public static log(...args: unknown[]) {
    console.log(`[${getTimestamp()}]`, ...args);
  }

  public static warn(...args: unknown[]) {
    console.warn(`[${getTimestamp()}]`, ...args);
  }

  public static error(...args: unknown[]) {
    console.error(`[${getTimestamp()}]`, ...args);
  }
}
