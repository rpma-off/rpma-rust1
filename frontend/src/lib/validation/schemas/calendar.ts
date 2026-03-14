/**
 * Zod schemas for Calendar types
 *
 * These schemas mirror the TypeScript types in `@/types/calendar` and are used to
 * validate IPC responses and form inputs at runtime.
 */

import { z } from 'zod';
import type {
  CalendarEvent,
  CreateEventInput,
  UpdateEventInput,
  EventParticipant,
  EventType,
  EventStatus,
  ParticipantStatus,
} from '@/types/calendar';

export const ParticipantStatusSchema = z.enum([
  'accepted',
  'declined',
  'tentative',
  'needsAction',
]) satisfies z.ZodType<ParticipantStatus>;

export const EventTypeSchema = z.enum([
  'meeting',
  'appointment',
  'task',
  'reminder',
  'other',
]) satisfies z.ZodType<EventType>;

export const EventStatusSchema = z.enum([
  'confirmed',
  'tentative',
  'cancelled',
]) satisfies z.ZodType<EventStatus>;

export const EventParticipantSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().optional(),
  status: ParticipantStatusSchema,
}) satisfies z.ZodType<EventParticipant>;

export const CalendarEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),

  // Temporal
  startDatetime: z.string(),
  endDatetime: z.string(),
  allDay: z.boolean(),
  timezone: z.string(),

  // Type and category
  eventType: EventTypeSchema,
  category: z.string().optional(),

  // Relations
  taskId: z.string().optional(),
  clientId: z.string().optional(),
  technicianId: z.string().optional(),

  // Meeting details
  location: z.string().optional(),
  meetingLink: z.string().optional(),
  isVirtual: z.boolean(),

  // Participants
  participants: z.array(EventParticipantSchema),

  // Recurrence
  isRecurring: z.boolean(),
  recurrenceRule: z.string().optional(),
  parentEventId: z.string().optional(),

  // Reminders (minutes before event)
  reminders: z.array(z.number()),

  // Status and metadata
  status: EventStatusSchema,
  color: z.string().optional(),
  tags: z.array(z.string()),
  notes: z.string().optional(),

  // Sync and audit
  synced: z.boolean(),
  lastSyncedAt: z.number().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
  deletedAt: z.number().optional(),
  deletedBy: z.string().optional(),
}) satisfies z.ZodType<CalendarEvent>;

export const CreateEventInputSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  startDatetime: z.string(),
  endDatetime: z.string(),
  allDay: z.boolean().optional(),
  timezone: z.string().optional(),
  eventType: EventTypeSchema.optional(),
  category: z.string().optional(),
  taskId: z.string().optional(),
  clientId: z.string().optional(),
  location: z.string().optional(),
  meetingLink: z.string().optional(),
  isVirtual: z.boolean().optional(),
  participants: z.array(EventParticipantSchema).optional(),
  reminders: z.array(z.number()).optional(),
  color: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
}) satisfies z.ZodType<CreateEventInput>;

export const UpdateEventInputSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  startDatetime: z.string().optional(),
  endDatetime: z.string().optional(),
  allDay: z.boolean().optional(),
  timezone: z.string().optional(),
  eventType: EventTypeSchema.optional(),
  category: z.string().optional(),
  taskId: z.string().optional(),
  clientId: z.string().optional(),
  location: z.string().optional(),
  meetingLink: z.string().optional(),
  isVirtual: z.boolean().optional(),
  participants: z.array(EventParticipantSchema).optional(),
  status: EventStatusSchema.optional(),
  reminders: z.array(z.number()).optional(),
  color: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
}) satisfies z.ZodType<UpdateEventInput>;

/**
 * Validates a CalendarEvent from an IPC response payload.
 * Throws a ZodError if the data does not match the expected shape.
 */
export function validateCalendarEvent(data: unknown): CalendarEvent {
  return CalendarEventSchema.parse(data);
}

/**
 * Validates an array of CalendarEvents from an IPC response payload.
 * Throws a ZodError if the data does not match the expected shape.
 */
export function validateCalendarEventList(data: unknown): CalendarEvent[] {
  return z.array(CalendarEventSchema).parse(data);
}

/**
 * Validates a CreateEventInput before sending to the backend.
 * Throws a ZodError if the input does not match the expected shape.
 */
export function validateCreateEventInput(data: unknown): CreateEventInput {
  return CreateEventInputSchema.parse(data);
}

/**
 * Validates an UpdateEventInput before sending to the backend.
 * Throws a ZodError if the input does not match the expected shape.
 */
export function validateUpdateEventInput(data: unknown): UpdateEventInput {
  return UpdateEventInputSchema.parse(data);
}
