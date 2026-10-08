import type {KidsScript} from './types';
import type {Schedule} from './timing';

export interface SubscriptionReminderSlot {
  placement: 'middle' | 'end';
  from: number;
  duration: number;
}
export function subscriptionReminders(script: KidsScript, schedule: Schedule, fps?: number): SubscriptionReminderSlot[];
