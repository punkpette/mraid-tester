import type { LogSeverity } from '@/mraid';

// Centralized color tokens so severity colors stay consistent across the
// Status Panel, Call Log Panel, and any future UI that needs them.
export const SEVERITY_COLORS: Record<LogSeverity, string> = {
  info: '#3B82F6',
  warning: '#F59E0B',
  error: '#EF4444',
};

export const STATE_COLORS = {
  loading: '#9CA3AF',
  default: '#3B82F6',
  expanded: '#10B981',
  resized: '#8B5CF6',
  hidden: '#6B7280',
} as const;

export const NEUTRAL = {
  background: '#111827',
  surface: '#1F2937',
  border: '#374151',
  textPrimary: '#F9FAFB',
  textSecondary: '#9CA3AF',
} as const;
