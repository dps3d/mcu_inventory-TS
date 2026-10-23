import configPromise from '@payload-config'
import { getPayload } from 'payload'

export const GET = async (request: Request) => {
  const payload = await getPayload({
    config: configPromise,
  })

  try {
    const newPage = await payload.create({
      collection: 'pages',
      data: {
        title: 'Тестова',
        path: '/test',
        blocks: [
          {
            blockType: 'hero',
            title: 'Hero Title',
            subtitle: 'Hero Subtitle',
            // image: ?
          }
        ],
      },
    })
    return Response.json({ success: true, newPage })
  } catch (err: any) {
    return Response.json({ error: err.message, errors: err.errors }, { status: 500 })
  }
}
