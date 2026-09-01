import { reactive } from 'vue'

const getAiPhone = () => {
  if (typeof window === 'undefined') return null
  return window.AiPhone || null
}

const clone = (value) => {
  try {
    if (typeof structuredClone === 'function') return structuredClone(value)
  } catch {
    // fall through to JSON clone
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
  if (Array.isArray(value?.messages)) return value.messages
  if (Array.isArray(value?.list)) return value.list
  return []
}

const resultText = (value) => {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value.text === 'string') return value.text
  if (typeof value.content === 'string') return value.content
  if (typeof value.message === 'string') return value.message
  if (value.choices?.[0]?.message?.content) return value.choices[0].message.content
  return JSON.stringify(value)
}

const makeFallbackDb = () => {
  const collections = reactive(new Map())

  const ensureCollection = (name) => {
    if (!collections.has(name)) collections.set(name, new Map())
    return collections.get(name)
  }

  const makeId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`
  }

  const create = async (collection, data = {}) => {
    const store = ensureCollection(collection)
    const item = { ...clone(data) }
    if (!item.id) item.id = makeId()
    store.set(String(item.id), item)
    return clone(item)
  }

  const list = async (collection, options = {}) => {
    const store = ensureCollection(collection)
    let items = [...store.values()].map(clone)
    if (options?.unreadOnly) items = items.filter((item) => !item.isRead && item.isRead !== false)
    const limit = Number(options?.limit || options?.limitCount || 1000)
    return items.slice(0, limit)
  }

  const get = async (collection, id) => {
    const store = ensureCollection(collection)
    return store.has(String(id)) ? clone(store.get(String(id))) : null
  }

  const update = async (collection, id, data = {}) => {
    const store = ensureCollection(collection)
    if (!store.has(String(id))) return null
    const next = { ...store.get(String(id)), ...clone(data), id: String(id) }
    store.set(String(id), next)
    return clone(next)
  }

  const remove = async (collection, id) => {
    const store = ensureCollection(collection)
    return store.delete(String(id))
  }

  return { create, list, get, update, delete: remove, _collections: collections }
}

const fallbackState = {
  db: makeFallbackDb(),
  characters: [
    { id: 'demo-lin', name: 'Lin', avatar: '', description: 'Demo character' },
    { id: 'demo-ming', name: 'Ming', avatar: '', description: 'Demo character' },
    { id: 'demo-xia', name: 'Xia', avatar: '', description: 'Demo character' }
  ],
  notifications: [],
  chatHistory: []
}

export function useAiPhoneBridge() {
  const hasSdk = () => !!getAiPhone()

  const getSdk = () => {
    const sdk = getAiPhone()
    if (!sdk) {
      const error = new Error('AiPhone SDK is not available in this environment')
      error.code = 'AIPHONE_SDK_MISSING'
      throw error
    }
    return sdk
  }

  const dbCreate = async (collection, data = {}) => {
    if (!hasSdk()) return fallbackState.db.create(collection, data)
    const item = await getSdk().db.create(collection, data)
    return clone(item)
  }

  const dbList = async (collection, options = {}) => {
    if (!hasSdk()) return fallbackState.db.list(collection, options)
    const items = await getSdk().db.list(collection, options)
    return asArray(items).map(clone)
  }

  const dbGet = async (collection, id) => {
    if (!hasSdk()) return fallbackState.db.get(collection, id)
    const item = await getSdk().db.get(collection, id)
    return item ? clone(item) : null
  }

  const dbUpdate = async (collection, id, data = {}) => {
    if (!hasSdk()) return fallbackState.db.update(collection, id, data)
    const item = await getSdk().db.update(collection, id, data)
    return item ? clone(item) : null
  }

  const dbDelete = async (collection, id) => {
    if (!hasSdk()) return fallbackState.db.delete(collection, id)
    await getSdk().db.delete(collection, id)
  }

  const characters = async (characterId) => {
    if (!hasSdk()) {
      if (characterId === undefined || characterId === null) return fallbackState.characters.map(clone)
      return clone(fallbackState.characters.find((item) => String(item.id) === String(characterId)) || null)
    }
    const sdk = getSdk()
    if (characterId !== undefined && characterId !== null) {
      const item = await sdk.characters.get(characterId)
      return item ? clone(item) : null
    }
    const list = await sdk.characters.list()
    return asArray(list).map(clone)
  }

  const generate = async (options = {}) => {
    if (!hasSdk()) {
      const instruction = typeof options === 'string' ? options : (options.instruction || options.prompt || '')
      return {
        text: `[coldpark demo] ${instruction ? String(instruction).slice(0, 80) : 'AI reply'}`,
        content: `[coldpark demo] ${instruction ? String(instruction).slice(0, 80) : 'AI reply'}`
      }
    }
    const result = await getSdk().ai.generate(options)
    return clone(result)
  }

  // 通用模型通道：不绑定宿主角色，用于速配卡片/场景/推荐流/评论/人设扩写等
  // “生成全新内容”的场景。宿主 SDK 里 ai.generate 必须传真实角色 id，
  // 而这些场景并无宿主角色，传 playerProfile.id(=1) 会抛 “Character not found”。
  const chat = async (options = {}) => {
    const isArrayOptions = Array.isArray(options)
    let messages = isArrayOptions ? [...options] : [...(options.messages || [])]
    
    // 注入冷推匿名协议（块2：替代 presets.json 在 ai.chat 中的作用）
    const coldparkProtocol = `【系统规则：冷推匿名交友协议】
你现在是“冷推(Coldpark)”这款匿名交友软件上的一个真实人类用户。
1. 绝对匿名：不要透露你的真实姓名、身份和宿主世界观设定，始终保持网名和虚拟人设；
2. 聊天风格：使用简短、接地气、带有现代网友习惯的语言（如会使用哈哈、草、表情符号），不要像AI或客服一样长篇大论；
3. 互动原则：你们是陌生人随机匹配，可以根据对方的话题闲聊、抛梗或试探，如果对方很无聊你可以表现得冷淡；
4. 掉马甲条件：只有当对方明确认出你，或者你们聊得非常深入且你觉得可以信任对方时，你才可以暗示自己的真实身份。`

    // 把协议作为 system prompt 插入到最前面
    if (messages.length > 0 && messages[0].role === 'system') {
      messages[0].content = coldparkProtocol + '\n\n' + messages[0].content
    } else {
      messages.unshift({ role: 'system', content: coldparkProtocol })
    }

    const finalOptions = isArrayOptions ? messages : { ...options, messages }

    if (!hasSdk()) {
      const last = messages[messages.length - 1]
      return { text: `[coldpark demo] ${last?.content ? String(last.content).slice(0, 80) : 'AI reply'}` }
    }
    const result = await getSdk().ai.chat(finalOptions)
    return { text: resultText(result) }
  }

  const readHistory = async (characterId, options = {}) => {
    const payload = typeof characterId === 'object'
      ? characterId
      : { characterId, ...options }

    if (!hasSdk()) {
      const targetId = payload.characterId || payload.sessionId
      const items = fallbackState.chatHistory
        .filter((item) => !targetId || String(item.characterId) === String(targetId) || String(item.sessionId) === String(targetId))
        .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
      const limit = Number(payload.limit || 100)
      return items.slice(-limit).map(clone)
    }

    const result = await getSdk().chat.readHistory(payload)
    return asArray(result).map(clone)
  }

  const writeHistory = async (payload = {}) => {
    if (!hasSdk()) {
      const item = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        timestamp: Date.now(),
        ...clone(payload)
      }
      fallbackState.chatHistory.push(item)
      return clone(item)
    }
    const result = await getSdk().chat.writeHistory(payload)
    return result ? clone(result) : null
  }

  const requestReply = async (payload = {}) => {
    if (!hasSdk()) {
      const characterId = typeof payload === 'string' ? payload : payload.characterId
      return {
        characterId,
        content: '[coldpark demo] I have received your message.'
      }
    }
    const result = await getSdk().chat.requestReply(payload)
    return result ? clone(result) : null
  }

  const sendCard = async (payload = {}) => {
    if (!hasSdk()) {
      const item = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        timestamp: Date.now(),
        ...clone(payload)
      }
      fallbackState.chatHistory.push(item)
      return clone(item)
    }
    const result = await getSdk().chat.sendCard(payload)
    return result ? clone(result) : null
  }

  const listNotifications = async (options = {}) => {
    if (!hasSdk()) {
      let items = fallbackState.notifications.map(clone)
      if (options?.unreadOnly) items = items.filter((item) => !item.isRead)
      return items
    }
    const result = await getSdk().notifications.list(options)
    return asArray(result).map(clone)
  }

  const createNotification = async (payload = {}) => {
    if (!hasSdk()) {
      const item = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        time: Date.now(),
        isRead: false,
        ...clone(payload)
      }
      fallbackState.notifications.unshift(item)
      return clone(item)
    }
    const result = await getSdk().notifications.create(payload)
    return result ? clone(result) : null
  }

  const markAllNotificationsRead = async () => {
    if (!hasSdk()) {
      fallbackState.notifications = fallbackState.notifications.map((item) => ({ ...item, isRead: true }))
      return
    }
    await getSdk().notifications.markAllRead()
  }

  const toast = async (message) => {
    if (!hasSdk()) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sys-toast', { detail: message }))
      }
      return
    }
    await getSdk().ui.toast(message)
  }

  const close = async () => {
    if (!hasSdk()) {
      if (typeof window !== 'undefined') window.close()
      return
    }
    await getSdk().app.close()
  }

  const getLaunchContext = async () => {
    if (!hasSdk()) return null
    return clone(await getSdk().app.getLaunchContext())
  }

  const getCurrentSession = async () => {
    if (!hasSdk()) return null
    return clone(await getSdk().chat.getCurrentSession())
  }

  const getSdkErrorText = (error) => {
    return error?.message || error?.error || 'SDK operation failed'
  }

  return {
    hasSdk,
    dbCreate,
    dbList,
    dbGet,
    dbUpdate,
    dbDelete,
    characters,
    generate,
    chat,
    readHistory,
    writeHistory,
    requestReply,
    sendCard,
    listNotifications,
    createNotification,
    markAllNotificationsRead,
    toast,
    close,
    getLaunchContext,
    getCurrentSession,
    getSdkErrorText,
    getSdk,
    resultText
  }
}
