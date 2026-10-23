import type { Endpoint, PayloadRequest } from 'payload'

/**
 * Формування CORS-заголовків для крос-доменних запитів фронтенду
 */
function getCorsHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': process.env.FRONTEND_URL || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

/**
 * Нормалізація об'єкта зображення з колекції Media у плоску структуру { src, alt }
 */
function normalizeMedia(image: unknown): { src: string; alt: string } {
  if (image && typeof image === 'object') {
    const mediaObj = image as { url?: string; src?: string; alt?: string }
    const rawUrl = mediaObj.url || mediaObj.src || ''
    const baseUrl = process.env.CMS_URL || ''
    const src = rawUrl.startsWith('http') ? rawUrl : `${baseUrl}${rawUrl}`
    return {
      src,
      alt: mediaObj.alt || 'MCU Inventory System',
    }
  }
  return {
    src: '/mcu-hero-board.svg',
    alt: 'MCU Inventory System',
  }
}

/**
 * Трансформація блоків Payload CMS (blockType -> type) у чисту плоску структуру для фронтенду
 */
function normalizeBlock(rawBlock: Record<string, unknown>): Record<string, unknown> {
  const { blockType, id, blockName, ...rest } = rawBlock
  const type = (blockType as string) || (rawBlock.type as string) || 'unknown'

  if (type === 'hero') {
    return {
      id,
      type: 'hero',
      anchor: rest.anchor || 'hero',
      badge: rest.badge || '',
      title: rest.title || '',
      subtitle: rest.subtitle || '',
      image: normalizeMedia(rest.image),
      buttons: Array.isArray(rest.buttons)
        ? rest.buttons.map((btn: Record<string, unknown>) => ({
            text: String(btn.text || ''),
            link: String(btn.link || '#'),
            variant: (btn.variant as string) || 'primary',
          }))
        : [],
      metrics: Array.isArray(rest.metrics)
        ? rest.metrics.map((m: Record<string, unknown>) => ({
            value: String(m.value || ''),
            label: String(m.label || ''),
          }))
        : [],
    }
  }

  if (type === 'features') {
    return {
      id,
      type: 'features',
      anchor: rest.anchor || 'features',
      badge: rest.badge || '',
      title: rest.title || '',
      subtitle: rest.subtitle || '',
      items: Array.isArray(rest.items)
        ? rest.items.map((item: Record<string, unknown>) => ({
            icon: String(item.icon || '⚡'),
            moduleTag: String(item.moduleTag || 'Каталог та Pinout'),
            title: String(item.title || ''),
            text: String(item.text || ''),
            highlights: Array.isArray(item.highlights)
              ? item.highlights.map((h: unknown) =>
                  typeof h === 'string' ? h : String((h as Record<string, unknown>).point || '')
                )
              : [],
          }))
        : [],
    }
  }

  return {
    id,
    type,
    ...rest,
  }
}

/**
 * Обробник отримання наскрізних налаштувань із сутності Globals (Common)
 */
async function handleGetCommon(req: PayloadRequest): Promise<Response> {
  try {
    const common = await req.payload.findGlobal({
      slug: 'common',
      depth: 1,
    })

    const flatCommon = {
      siteName: common.siteName || 'MCU Inventory System',
      headerPhone: common.headerPhone || '+380 (32) 258-12-40',
      dbStatus: common.dbStatus || 'online',
      menu: Array.isArray(common.menu)
        ? common.menu.map((item) => ({
            label: item.label,
            link: item.link,
          }))
        : [],
      footer: {
        text:
          common.footer?.text ||
          'Єдина лабораторна веб-платформа обліку мікроконтролерів, складських комірок та специфікацій BOM.',
        systemInfo:
          common.footer?.systemInfo || 'Payload CMS 3.0 • Neon PostgreSQL • Vite + TypeScript',
      },
    }

    return Response.json(flatCommon, {
      status: 200,
      headers: getCorsHeaders(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    return Response.json(
      { error: `Failed to load common settings: ${message}` },
      { status: 500, headers: getCorsHeaders() }
    )
  }
}

/**
 * Обробник отримання структури сторінки за параметром ?path=...
 */
async function handleGetPage(req: PayloadRequest): Promise<Response> {
  try {
    const url = new URL(req.url || 'http://localhost:3000/api/page')
    const pagePath = url.searchParams.get('path') || (req.query?.path as string) || '/'

    const result = await req.payload.find({
      collection: 'pages',
      where: {
        path: {
          equals: pagePath,
        },
      },
      depth: 2,
      limit: 1,
    })

    const pageDoc = result.docs[0]

    if (!pageDoc) {
      return Response.json(
        {
          error: `Сторінку за шляхом "${pagePath}" не знайдено в Payload CMS`,
          path: pagePath,
          statusCode: 404,
        },
        { status: 404, headers: getCorsHeaders() }
      )
    }

    const rawBlocks = Array.isArray(pageDoc.blocks) ? pageDoc.blocks : []
    const flatPage = {
      path: pageDoc.path,
      title: pageDoc.title,
      blocks: rawBlocks.map((block) => normalizeBlock(block as unknown as Record<string, unknown>)),
    }

    return Response.json(flatPage, {
      status: 200,
      headers: getCorsHeaders(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    return Response.json(
      { error: `Failed to load page: ${message}` },
      { status: 500, headers: getCorsHeaders() }
    )
  }
}

/**
 * Кастомний ендпоінт /api/common (та аліас /api/settings)
 */
export const commonEndpoint: Endpoint = {
  path: '/common',
  method: 'get',
  handler: handleGetCommon,
}

export const settingsEndpoint: Endpoint = {
  path: '/settings',
  method: 'get',
  handler: handleGetCommon,
}

/**
 * Кастомний ендпоінт /api/page?path=... (та аліас /api/pages?path=...)
 */
export const pageEndpoint: Endpoint = {
  path: '/page',
  method: 'get',
  handler: handleGetPage,
}

export const pagesEndpoint: Endpoint = {
  path: '/pages',
  method: 'get',
  handler: handleGetPage,
}
