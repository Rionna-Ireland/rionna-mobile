import { Text } from '@/components/ui';

function formatCountdown(postTime: string): string {
  const now = new Date();
  const target = new Date(postTime);
  const diffMs = target.getTime() - now.getTime();

  if (diffMs <= 0)
    return 'Starting soon';

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0)
    return `${days}d ${hours}h`;
  if (hours > 0)
    return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

type CountdownLabelProps = {
  postTime: string;
};

export function CountdownLabel({ postTime }: CountdownLabelProps) {
  return (
    <Text className="text-sm font-semibold text-charcoal-700">
      {formatCountdown(postTime)}
    </Text>
  );
}
