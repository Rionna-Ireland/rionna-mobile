import { Pressable, Text } from '@/components/ui';

type FollowToggleProps = {
  isFollowing: boolean;
  pending?: boolean;
  onToggle: (following: boolean) => void;
  /** Overlay variant for the horse card's photo; defaults to inline. */
  variant?: 'inline' | 'overlay';
};

/**
 * Explicit follow/unfollow pill ("+ Follow" / "Following"), shared by the
 * Stables card (photo overlay) and the profile header. Follows the stables
 * chip convention: mono uppercase label, bg-primary when active.
 */
export function FollowToggle({
  isFollowing,
  pending = false,
  onToggle,
  variant = 'inline',
}: FollowToggleProps) {
  const position = variant === 'overlay' ? 'absolute right-3 top-3' : '';
  const background = isFollowing
    ? 'bg-primary'
    : variant === 'overlay'
      ? 'bg-black/50'
      : 'bg-muted';
  const labelColor = isFollowing
    ? 'text-on-primary'
    : variant === 'overlay'
      ? 'text-white'
      : 'text-muted-foreground';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isFollowing }}
      accessibilityLabel={isFollowing ? 'Unfollow horse' : 'Follow horse'}
      disabled={pending}
      hitSlop={8}
      onPress={() => onToggle(!isFollowing)}
      className={`rounded-full px-3.5 py-2 ${position} ${background} ${pending ? 'opacity-60' : ''}`}
    >
      <Text className={`font-mono text-[10px] font-bold tracking-widest uppercase ${labelColor}`}>
        {isFollowing ? 'Following' : '+ Follow'}
      </Text>
    </Pressable>
  );
}
