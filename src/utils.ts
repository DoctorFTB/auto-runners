export async function sleep(ms: number) {
  return await new Promise<void>((r) => setTimeout(() => r(), ms));
}
