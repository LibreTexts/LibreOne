import { InstructorVerificationStatus } from '../../server/types/users';

export const isInstructorVerificationStatus = (
  status: string,
): status is InstructorVerificationStatus => {
  return (
    status === 'not_attempted' ||
    status === 'pending' ||
    status === 'needs_review' ||
    status === 'denied' ||
    status === 'verified'
  );
};
