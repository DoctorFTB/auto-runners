// It's trash, I know... Maybe later I'll do better :) Also, PRs are welcome
export class Logger {
  public static log(...args: unknown[]) {
    console.log(...args);
  }

  public static warn(...args: unknown[]) {
    console.warn(...args);
  }

  public static error(...args: unknown[]) {
    console.error(...args);
  }
}
