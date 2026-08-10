import { Pressable } from '@/components/ui';
import { Heart } from '@/components/ui/icons';

type FollowToggleProps = {
  isFollowing: boolean;
  pending?: boolean;
  onToggle: (following: boolean) => void;
  /** Overlay variant for the horse card's photo; defaults to inline. */
  variant?: 'inline' | 'overlay';
};

/** Heart follow/unfollow control, shared by the Stables card and the profile header. */
export function FollowToggle({
  isFollowing,
  pending = false,
  onToggle,
  variant = 'inline',
}: FollowToggleProps) {
  const containerClassName
    = variant === 'overlay'
      ? 'absolute right-3 top-3 size-9 items-center justify-center rounded-full bg-black/40'
      : 'size-9 items-center justify-center rounded-full bg-muted';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isFollowing ? 'Unfollow horse' : 'Follow horse'}
      disabled={pending}
      hitSlop={8}
      onPress={() => onToggle(!isFollowing)}
      className={containerClassName}
    >
      <Heart
        width={18}
        height={18}
        filled={isFollowing}
        color={
          isFollowing
            ? '#BE123C'
            : variant === 'overlay'
              ? '#FFFFFF'
              : '#737373'
        }
      />
    </Pressable>
  );
}
