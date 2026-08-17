const memory = new Map()

function getNativeStorage() {
  try {
    const ls = window.localStorage
    ls.getItem('__coldpark_probe__')
    return ls
  } catch {
    return null
  }
}

export const safeStorage = {
  getItem(key) {
    const native = getNativeStorage()
    if (native) {
      try {
        return native.getItem(key)
      } catch {
        // fall through to memory
      }
    }
    return memory.has(key) ? memory.get(key) : null
  },
  setItem(key, value) {
    const native = getNativeStorage()
    if (native) {
      try {
        native.setItem(key, String(value))
        return
      } catch {
        // fall through to memory
      }
    }
    memory.set(key, String(value))
  },
  removeItem(key) {
    const native = getNativeStorage()
    if (native) {
      try {
        native.removeItem(key)
        return
      } catch {
        // fall through to memory
      }
    }
    memory.delete(key)
  }
}

export function safeParse(key, fallback) {
  const raw = safeStorage.getItem(key)
  if (raw === null || raw === undefined) return fallback
  try {
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function safeSetJson(key, value) {
  safeStorage.setItem(key, JSON.stringify(value))
}
