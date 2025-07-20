import { boolean, integer, pgTable, varchar } from 'drizzle-orm/pg-core';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';

export const productsTable = pgTable('products', {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	itemId: varchar('item_id', { length: 255 }).notNull().unique(),
	inStock: boolean('in_stock').notNull().default(true),
});

export type Product = InferSelectModel<typeof productsTable>;
export type NewProduct = InferInsertModel<typeof productsTable>;
