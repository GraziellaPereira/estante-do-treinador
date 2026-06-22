function isObject(v: any) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

function maskValue(val: any) {
  if (typeof val !== 'string') return val;
  // mask common password/token patterns inside strings
  return val
    .replace(/("?senha"?\s*:\s*")([^"\n]+)(")/gi, '$1****$3')
    .replace(/("?password"?\s*:\s*")([^"\n]+)(")/gi, '$1****$3')
    .replace(/(password=)[^&\s]+/gi, '$1****')
    .replace(/(senha=)[^&\s]+/gi, '$1****');
}

function maskObject(obj: any): any {
  if (!isObject(obj)) return obj;
  const out: any = Array.isArray(obj) ? [] : {};
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (/password|senha|token|secret|key/i.test(k)) {
      out[k] = typeof v === 'string' ? '****' : null;
    } else if (isObject(v)) {
      out[k] = maskObject(v);
    } else if (Array.isArray(v)) {
      out[k] = v.map((it: any) => (isObject(it) ? maskObject(it) : maskValue(it)));
    } else {
      out[k] = maskValue(v);
    }
  }
  return out;
}

export function safeLog(...args: any[]) {
  try {
    const safe = args.map((a) => {
      if (isObject(a)) return maskObject(a);
      if (typeof a === 'string') return maskValue(a);
      return a;
    });
    // Always output masked logs (helps tests and devs) but avoid leaking originals
    // Use console.debug to be less noisy; fallback to console.log if missing
    if (console && typeof console.debug === 'function') {
      console.debug(...safe);
    } else {
      console.log(...safe);
    }
  } catch (e) {
    // If masking fails, avoid printing sensitive data: print generic message
    console.debug('safeLog failed to serialize args');
  }
}

export default safeLog;
