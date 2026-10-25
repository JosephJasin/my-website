import { sqliteTable, text, integer, real, primaryKey } from 'drizzle-orm/sqlite-core';
export const progress = sqliteTable('machine_progress', {
 userId:text('user_id').notNull(),machineId:text('machine_id').notNull(),
 status:text('status').notNull().default('new'),availability:text('availability').notNull().default('unknown'),
 seat:text('seat').notNull().default(''),weight:text('weight').notNull().default(''),notes:text('notes').notNull().default(''),updatedAt:text('updated_at').notNull(),
},t=>[primaryKey({columns:[t.userId,t.machineId]})]);
export const preferences=sqliteTable('preferences',{userId:text('user_id').primaryKey(),pace:integer('pace').notNull().default(2),visitsPerWeek:integer('visits_per_week').notNull().default(2)});
export const visits=sqliteTable('visits',{id:text('id').notNull(),userId:text('user_id').notNull(),machineIds:text('machine_ids').notNull(),startedAt:text('started_at').notNull(),finishedAt:text('finished_at')},t=>[primaryKey({columns:[t.userId,t.id]})]);
export const profile=sqliteTable('profile',{userId:text('user_id').primaryKey(),age:integer('age'),heightCm:real('height_cm'),startingWeightKg:real('starting_weight_kg')});
