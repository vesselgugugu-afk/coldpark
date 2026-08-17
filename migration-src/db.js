import { useAiPhoneBridge } from '@/composables/useAiPhoneBridge'

const bridge = useAiPhoneBridge()

const clone = (value) => {
  try {
    if (typeof structuredClone === 'function') return structuredClone(value)
  } catch {
    // fall through
  }
  try {
    return JSON.parse(JSON.stringify(value))
  } catch {
    return value
  }
}

const asArray = (value) => {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.data)) return value.data
  if (Array.isArray(value?.items)) return value.items
  if (Array.isArray(value?.list)) return value.list
  return []
}

const matches = (item, filters) => {
  return filters.every((filter) => {
    const value = item?.[filter.field]
    switch (filter.type) {
      case 'eq':
        return value === filter.value
      case 'neq':
        return value !== filter.value
      case 'startsWith':
        return typeof value === 'string' && value.startsWith(filter.value)
      case 'anyOf':
        return filter.values.some((candidate) => String(value) === String(candidate))
      default:
        return true
    }
  })
}

const makeQuery = (collectionName, filters = []) => {
  let field = null
  let modifier = null

  const builder = {
    where(value) {
      if (typeof value === 'string') {
        field = value
      } else if (value && typeof value === 'object') {
        Object.entries(value).forEach(([key, val]) => {
          filters.push({ type: 'eq', field: key, value: val })
        })
      }
      return this
    },
    equals(value) {
      const target = field || 'id'
      filters.push({ type: 'eq', field: target, value })
      return this
    },
    notEqual(value) {
      const target = field || 'id'
      filters.push({ type: 'neq', field: target, value })
      return this
    },
    startsWith(value) {
      const target = field || 'id'
      filters.push({ type: 'startsWith', field: target, value: String(value) })
      return this
    },
    anyOf(...values) {
      const target = field || 'id'
      filters.push({ type: 'anyOf', field: target, values })
      return this
    },
    modify(changes) {
      modifier = changes
      return this
    },
    async toArray() {
      const items = asArray(await bridge.dbList(collectionName))
      const filtered = items.filter((item) => matches(item, filters))
      return modifier ? filtered.map((item) => ({ ...item, ...modifier })) : filtered.map(clone)
    },
    async delete() {
      const items = asArray(await bridge.dbList(collectionName))
      const filtered = items.filter((item) => matches(item, filters))
      await Promise.all(filtered.map((item) => bridge.dbDelete(collectionName, item.id)))
      return filtered.length
    }
  }

  builder.modify = builder.modify.bind(builder)
  return builder
}

const makeTable = (collectionName) => ({
  async get(id) {
    return bridge.dbGet(collectionName, id)
  },
  async put(data = {}) {
    const item = clone(data)
    if (!item.id) item.id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    const existing = await bridge.dbGet(collectionName, item.id)
    if (existing) {
      await bridge.dbUpdate(collectionName, item.id, item)
    } else {
      await bridge.dbCreate(collectionName, item)
    }
    return item.id
  },
  async add(data = {}) {
    const item = await bridge.dbCreate(collectionName, data)
    return item?.id
  },
  async update(id, changes = {}) {
    return bridge.dbUpdate(collectionName, id, changes)
  },
  async delete(id) {
    return bridge.dbDelete(collectionName, id)
  },
  async toArray() {
    return asArray(await bridge.dbList(collectionName)).map(clone)
  },
  async bulkAdd(items = []) {
    const ids = []
    for (const item of items) {
      ids.push(await this.add(item))
    }
    return ids
  },
  async bulkPut(items = []) {
    const ids = []
    for (const item of items) {
      ids.push(await this.put(item))
    }
    return ids
  },
  where(value) {
    return makeQuery(collectionName).where(value)
  }
})

export const db = {
  worldbooks: makeTable('worldbooks'),
  characters: makeTable('characters'),
  personas: makeTable('personas'),
  messages: makeTable('messages'),
  memories: makeTable('memories'),
  diaries: makeTable('diaries'),
  memoryBundles: makeTable('memoryBundles'),
  musicLibrary: makeTable('musicLibrary'),
  musicStats: makeTable('musicStats'),
  offlineSessions: makeTable('offlineSessions'),
  offlineMessages: makeTable('offlineMessages'),
  media: makeTable('media'),
  dating_user: makeTable('dating_user'),
  dating_prefs: makeTable('dating_prefs'),
  dating_profiles: makeTable('dating_profiles'),
  dating_chats: makeTable('dating_chats'),
  dating_posts: makeTable('dating_posts'),
  todos: makeTable('todos'),
  todo_results: makeTable('todo_results'),
  pomodoro_records: makeTable('pomodoro_records'),
  daily_reviews: makeTable('daily_reviews'),
  idea_fragments: makeTable('idea_fragments'),
  timeline: makeTable('timeline'),
  reward_logs: makeTable('reward_logs'),
  todo_rpg_state: makeTable('todo_rpg_state')
}

export default db
