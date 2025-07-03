export type FeedbackType = 'bug' | 'suggestion' | 'confusion';

export type FeedbackStatus = 'pending' | 'acknowledged' | 'resolved' | 'wontfix';

export type FeedbackContext = {
  userAgent: string;
  currentUrl: string;
  viewport: {
    width: number;
    height: number;
  };
  timestamp: Date;
};

export type Feedback = {
  id: string;
  userId: string;
  userEmail?: string;
  userDisplayName: string;
  type: FeedbackType;
  message: string;
  context: FeedbackContext;
  status: FeedbackStatus;
  createdAt: Date;
  updatedAt: Date;
  adminNotes?: string;
};

export type CreateFeedbackInput = {
  type: FeedbackType;
  message: string;
};

export type FeedbackSubmissionResult = {
  success: boolean;
  feedbackId?: string;
  error?: string;
};