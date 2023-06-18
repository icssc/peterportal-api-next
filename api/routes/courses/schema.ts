import { z } from 'zod'

export const QuerySchema = z.object({})

export type Query = z.TypeOf<typeof QuerySchema>
