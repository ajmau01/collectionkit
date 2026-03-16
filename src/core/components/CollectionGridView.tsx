import React, { useCallback } from 'react';
import { FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { CollectionItem } from '../types/CollectionItem';
import { CollectionConfig } from '../types/CollectionConfig';
import { EmptyCollectionState } from './EmptyCollectionState';

export interface CollectionGridViewProps<T extends CollectionItem> {
  items: T[];
  config: CollectionConfig<T>;
  onItemPress: (item: T) => void;
  ListHeaderComponent?: React.ReactElement;
  /** Number of columns in the grid. Defaults to 2. */
  numColumns?: number;
  /** Show a loading spinner in the footer */
  loading?: boolean;
  /** Message shown when the list is empty */
  emptyMessage?: string;
  /** Called when the user pulls to refresh */
  onRefresh?: () => void;
}

export function CollectionGridView<T extends CollectionItem>({
  items,
  config,
  onItemPress,
  ListHeaderComponent,
  numColumns = 2,
  loading = false,
  emptyMessage,
  onRefresh,
}: CollectionGridViewProps<T>): React.ReactElement {
  const { ItemCard } = config;

  const keyExtractor = useCallback((item: T) => String(item.id), []);

  const renderItem = useCallback(
    ({ item }: { item: T }) => (
      <ItemCard item={item} onPress={onItemPress} />
    ),
    [ItemCard, onItemPress],
  );

  const renderFooter = useCallback(() => {
    if (!loading || items.length === 0) return null;
    return <ActivityIndicator color={COLORS.primary} style={styles.footer} />;
  }, [loading, items.length]);

  const renderEmpty = useCallback(() => {
    if (loading) return null;
    return <EmptyCollectionState message={emptyMessage} onRefresh={onRefresh} />;
  }, [loading, emptyMessage, onRefresh]);

  return (
    <FlatList
      testID="collection-grid-list"
      data={items}
      numColumns={numColumns}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={renderFooter()}
      ListEmptyComponent={renderEmpty()}
      accessibilityRole="list"
      accessibilityLabel="Collection grid"
    />
  );
}

CollectionGridView.displayName = 'CollectionGridView';

const COLORS = {
  primary: '#6366f1',
} as const;

const SPACING = {
  xs: 4,
  md: 16,
} as const;

const COLLECTION_BOTTOM_PADDING = 120;

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: SPACING.xs,
    paddingBottom: COLLECTION_BOTTOM_PADDING,
  },
  footer: {
    marginVertical: SPACING.md,
  },
});
