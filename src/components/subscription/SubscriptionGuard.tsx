export interface SubscriptionGuardProps {
  children: React.ReactNode
  allowedStatuses?: Array<'active' | 'inactive' | 'suspended' | 'expired'>
}

/**
 * SubscriptionGuard Component
 * For individual app - no subscription checks needed
 */
export const SubscriptionGuard = ({ children }: SubscriptionGuardProps) => {
  return <>{children}</>
}

/**
 * SubscriptionBanner Component
 * For individual app - no subscription warnings
 */
export const SubscriptionBanner = () => {
  return null
}
