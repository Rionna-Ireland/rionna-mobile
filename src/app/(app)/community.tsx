import { Redirect, useLocalSearchParams } from 'expo-router';

export default function CommunityScreen() {
  const params = useLocalSearchParams<{ url?: string }>();
  return <Redirect href={{ pathname: '/community-view', params }} />;
}
