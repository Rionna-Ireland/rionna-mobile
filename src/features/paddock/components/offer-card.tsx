import type { Offer } from '@/features/paddock/types';

import * as React from 'react';

import { Card, colors, IconButton, Image, MotionPressable, Text, View } from '@/components/ui';
import { CaretRightV2 } from '@/components/ui/icons/v2';
import { getInitials } from '@/components/ui/initials';
import { CopyIcon } from '@/features/paddock/components/paddock-icons';
import { formatValidTo } from '@/features/paddock/lib/format-valid-to';
import { translate } from '@/lib/i18n';

type OfferCardProps = {
  offer: Offer;
  onCopyCode: (code: string) => void;
  onOpenLink: (url: string) => void;
};

export function OfferCard({ offer, onCopyCode, onOpenLink }: OfferCardProps) {
  const [open, setOpen] = React.useState(false);
  const validTo = formatValidTo(offer.validUntil);
  const hasDetails = Boolean(offer.description || offer.discountCode || offer.howToRedeem);
  const subline = [offer.title, validTo].filter(Boolean).join('; ');

  return (
    <Card testID={`offer-card-${offer.id}`} className="gap-3">
      <MotionPressable
        size="flat"
        pressedOpacity={0.85}
        dimDisabled={false}
        testID={`offer-toggle-${offer.id}`}
        accessibilityRole={hasDetails ? 'button' : undefined}
        accessibilityState={hasDetails ? { expanded: open } : undefined}
        disabled={!hasDetails}
        onPress={() => setOpen(v => !v)}
        className="flex-row items-center gap-4"
      >
        <Image
          source={offer.imageUrl ? { uri: `${offer.imageUrl}?width=160&quality=80` } : undefined}
          className="size-12 rounded-lg"
          contentFit="cover"
          fallback={{ colourway: 'plum', initials: getInitials(offer.partnerName) }}
        />
        <View className="flex-1">
          <Text variant="body-lg" numberOfLines={1}>{offer.partnerName}</Text>
          <Text variant="body-sm" className="text-ink-variant" numberOfLines={2}>{subline}</Text>
        </View>
        {offer.discountCode
          ? (
              <IconButton
                testID={`offer-copy-${offer.id}`}
                variant="circle-light"
                className="bg-ice"
                accessibilityLabel={translate('paddock.offer.copyCode')}
                onPress={() => onCopyCode(offer.discountCode ?? '')}
              >
                <CopyIcon color={colors.ink} />
              </IconButton>
            )
          : offer.redeemUrl
            ? (
                <IconButton
                  testID={`offer-link-${offer.id}`}
                  variant="circle-light"
                  className="bg-ice"
                  accessibilityLabel={translate('paddock.offer.open')}
                  onPress={() => onOpenLink(offer.redeemUrl ?? '')}
                >
                  <CaretRightV2 size={20} color={colors.ink} />
                </IconButton>
              )
            : null}
      </MotionPressable>
      {open
        ? (
            <View testID={`offer-details-${offer.id}`} className="gap-2 border-t border-outline-variant pt-3">
              {offer.description ? <Text variant="body">{offer.description}</Text> : null}
              {offer.discountCode ? <Text selectable variant="label" className="text-ink">{offer.discountCode}</Text> : null}
              {offer.howToRedeem ? <Text variant="body-sm" className="text-ink-variant">{offer.howToRedeem}</Text> : null}
              {offer.redeemUrl && offer.discountCode
                ? (
                    <MotionPressable size="small" testID={`offer-link-${offer.id}`} accessibilityRole="link" onPress={() => onOpenLink(offer.redeemUrl ?? '')}>
                      <Text variant="body-sm" className="font-sans-semibold text-primary">{translate('paddock.offer.open')}</Text>
                    </MotionPressable>
                  )
                : null}
            </View>
          )
        : null}
    </Card>
  );
}
