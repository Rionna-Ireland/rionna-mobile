import * as React from 'react';
import { View } from 'react-native';

import { Card, Skeleton, SkeletonGroup, SkeletonText, SkeletonTone } from '@/components/ui';
import { SkeletonSwap, useSkeletonShown } from '@/lib/motion';

/**
 * Home block skeletons (S14-03 §1): each mirrors its card's frame (variant,
 * padding, fixed heights, text line boxes) so the crossfade moves nothing.
 */

/** Hero carousel: the 239pt navy slide. */
export function HeroSkeleton({ width }: { width: number }) {
  return (
    <SkeletonTone value="dark">
      <SkeletonGroup testID="home-hero-skeleton">
        <Card variant="navy" className="justify-between" style={{ width, height: 239 }}>
          <SkeletonText variant="display-md" lines={2} width="85%" />
          <View className="gap-4">
            <View className="gap-1 pr-10">
              <SkeletonText variant="body-sm" width={96} />
              <SkeletonText variant="body" width="80%" />
            </View>
            <Skeleton width={112} height={30} radius={6} />
          </View>
        </Card>
      </SkeletonGroup>
    </SkeletonTone>
  );
}

/** My horses: label + a row of 41pt avatars. */
export function MyHorsesSkeleton() {
  return (
    <SkeletonGroup testID="home-my-horses-skeleton">
      <Card className="gap-2.5">
        <SkeletonText variant="label-sm" width={72} />
        <View className="flex-row" style={{ gap: 9 }}>
          {[0, 1, 2, 3, 4].map(i => <Skeleton key={i} width={41} height={41} radius={20.5} />)}
        </View>
      </Card>
    </SkeletonGroup>
  );
}

/** Inside Track: the 183pt photo card, dark until the photo arrives. */
export function InsideTrackSkeleton() {
  return (
    <SkeletonTone value="dark">
      <SkeletonGroup testID="home-inside-track-skeleton">
        <Card variant="navy" className="justify-between" style={{ height: 183 }}>
          <View className="gap-2.5 pr-20">
            <SkeletonText variant="label-sm" width={88} />
            <SkeletonText variant="display-md" lines={2} />
          </View>
          <Skeleton width={32} height={32} radius={16} />
        </Card>
      </SkeletonGroup>
    </SkeletonTone>
  );
}

/** Charity snapshot: the plum pattern card (min 204pt), € total and wallet button. */
export function CharitySkeleton() {
  return (
    <SkeletonTone value="dark">
      <SkeletonGroup testID="home-charity-skeleton">
        <Card variant="plum" className="min-h-[204px] justify-between">
          <View className="gap-2.5">
            <SkeletonText variant="label-sm" width={112} />
            <SkeletonText variant="display-xl" width="55%" />
          </View>
          <View className="flex-row items-end justify-between gap-4">
            <SkeletonText variant="body-sm" width="50%" />
            <Skeleton width={46} height={46} radius={8} />
          </View>
        </Card>
      </SkeletonGroup>
    </SkeletonTone>
  );
}

/** Upcoming event: label, then slots / title / date. */
export function UpcomingEventSkeleton() {
  return (
    <SkeletonGroup testID="home-event-skeleton">
      <Card className="gap-8">
        <SkeletonText variant="label-sm" width={104} />
        <View className="gap-1.5">
          <SkeletonText variant="body-lg" width="75%" />
          <SkeletonText variant="body-sm" width={120} />
        </View>
      </Card>
    </SkeletonGroup>
  );
}

type HomeBlockProps = {
  /** First load with no cache (`isFirstLoad`). */
  loading: boolean;
  skeleton: React.ReactNode;
  /** The card has something to show (a hidden card leaves no gap). */
  visible: boolean;
  /** Renders the card with its S14-02 entrance index, or −1 (none) after a skeleton. */
  children: (entranceIndex: number) => React.ReactNode;
  entranceIndex: number;
};

/**
 * One Home block: skeleton on first load, crossfading to the card. After a
 * skeleton the card's own fade-up stands down (index −1 = no entrance).
 */
export function HomeBlock({ loading, skeleton, visible, children, entranceIndex }: HomeBlockProps) {
  const hadSkeleton = useSkeletonShown(loading);
  return (
    <SkeletonSwap loading={loading} skeleton={skeleton}>
      {visible ? children(hadSkeleton ? -1 : entranceIndex) : null}
    </SkeletonSwap>
  );
}
