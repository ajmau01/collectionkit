import React, { useCallback, useMemo } from 'react';
import {
  SectionList,
  ActivityIndicator,
  Text,
  View,
  StyleSheet,
  SectionListRenderItemInfo,
} from 'react-native';
import { CollectionItem } from '../types/CollectionItem';
import { CollectionConfig } from '../types/CollectionConfig';
import { CollectionSection } from '../types/index';
import { EmptyCollectionState } from './EmptyCollectionState';

export interface CollectionSectionViewProps<T extends CollectionItem> {
  sections: CollectionSection<T>[];
  config: CollectionConfig<T>;
  onItemPress: (item: T) => void;
  ListHeaderComponent?: React.ReactElement;
  /** Show a loading spinner in the footer */
  loading?: boolean;
  /** Message shown when the list is empty */
  emptyMessage?: string;
  /** Called when the user pulls to refresh */
  onRefresh?: () => void;
}

/**
 * Internal: SectionList requires data to be an array; we wrap each section's
 * item array in another array so that one renderItem call handles the full row.
 */
interface TransformedSection<T> {
  title: string;
  data: T[][];
}

export function CollectionSectionView<T extends CollectionItem>({
  sections,
  config,
  onItemPress,
  ListHeaderComponent,
  loading = false,
  emptyMessage,
  onRefresh,
}: CollectionSectionViewProps<T>): React.ReactElement {
  const { ItemCard } = config;

  // Wrap each section's items in an array so each section becomes a single row.
  const transformedSections = useMemo<TransformedSection<T>[]>(
    () => sections.map(s => ({ title: s.title, data: [s.data] })),
    [sections],
  );

  const keyExtractor = useCallback(
    (_item: T[], index: number) => {
      const section = sections[index];
      return section ? `section-${section.title}-${section.data.length}` : `section-${index}`;
    },
    [sections],
  );

  const renderItem = useCallback(
    ({ item, section }: SectionListRenderItemInfo<T[], TransformedSection<T>>) => (
      <View>
        {item.map(collectionItem => (
          <ItemCard
            key={String(collectionItem.id)}
            item={collectionItem}
            onPress={onItemPress}
          />
        ))}
      </View>
    ),
    [ItemCard, onItemPress],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: TransformedSection<T> }) => (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>{section.title}</Text>
      </View>
    ),
    [],
  );

  const renderFooter = useCallback(() => {
    if (!loading || sections.length === 0) return null;
    return <ActivityIndicator color={COLORS.primary} style={styles.footer} />;
  }, [loading, sections.length]);

  const renderEmpty = useCallback(() => {
    if (loading) return null;
    return <EmptyCollectionState message={emptyMessage} onRefresh={onRefresh} />;
  }, [loading, emptyMessage, onRefresh]);

  return (
    <SectionList
      testID="collection-section-list"
      sections={transformedSections}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      renderSectionHeader={renderSectionHeader}
      contentContainerStyle={styles.listContent}
      stickySectionHeadersEnabled={false}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={renderFooter()}
      ListEmptyComponent={renderEmpty()}
      accessibilityRole="list"
      accessibilityLabel="Collection list"
    />
  );
}

CollectionSectionView.displayName = 'CollectionSectionView';

const COLORS = {
  primary: '#6366f1',
  white: '#ffffff',
  textDim: 'rgba(255,255,255,0.5)',
  sectionHeaderBg: 'rgba(255,255,255,0.05)',
} as const;

const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
} as const;

const COLLECTION_BOTTOM_PADDING = 120;

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: SPACING.xs,
    paddingBottom: COLLECTION_BOTTOM_PADDING,
  },
  sectionHeader: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.sectionHeaderBg,
  },
  sectionHeaderText: {
    color: COLORS.textDim,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  footer: {
    marginVertical: SPACING.md,
  },
});
