import { pgTable, serial, text, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  customerName: text('customer_name').notNull(),
  phone: text('phone').notNull(),
  items: jsonb('items').notNull(),
  totalCents: integer('total_cents').notNull(),
  status: text('status').notNull().default('pending'),
  paymentStatus: text('payment_status').notNull().default('unpaid'),
  paymentRef: text('payment_ref'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
