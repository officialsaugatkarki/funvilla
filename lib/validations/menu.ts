import { z } from 'zod'

export const MenuCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  description: z.string().max(500).optional(),
  image_url: z.string().url().optional().or(z.literal('')),
  sort_order: z.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
})
export type MenuCategoryInput = z.infer<typeof MenuCategorySchema>

export const MenuItemSchema = z.object({
  name: z.string().min(1, 'Item name is required').max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  category_id: z.string().uuid().nullable().optional(),
  description: z.string().max(1000).optional(),
  price: z.number().min(0, 'Price must be 0 or greater'),
  compare_price: z.number().min(0).nullable().optional(),
  image_url: z.string().url().optional().or(z.literal('')).nullable(),
  is_available: z.boolean().default(true),
  is_featured: z.boolean().default(false),
  is_popular: z.boolean().default(false),
  is_vegetarian: z.boolean().default(false),
  is_vegan: z.boolean().default(false),
  spice_level: z.number().int().min(0).max(5).default(0),
  preparation_time: z.number().int().min(0).nullable().optional(),
  calories: z.number().int().min(0).nullable().optional(),
  sort_order: z.number().int().min(0).default(0),
  tags: z.array(z.string()).default([]),
})
export type MenuItemInput = z.infer<typeof MenuItemSchema>
