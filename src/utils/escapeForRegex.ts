export function escapeForRegex(s: string) {
  return String(s || '').replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
}

export default escapeForRegex;
