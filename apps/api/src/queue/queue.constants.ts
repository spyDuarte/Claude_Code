export const QUEUE_NAMES = {
  MESSAGE_PROCESSING: 'message-processing',
  REPLY_SEND: 'reply-send',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
