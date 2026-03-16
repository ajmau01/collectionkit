import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { CollectionItem } from '../types/CollectionItem';
import { CollectionConfig } from '../types/CollectionConfig';
import { SearchBar } from './SearchBar';

export interface CollectionHeaderProps<T extends CollectionItem> {
  config: CollectionConfig<T>;
  activeViewMode: string;
  onViewModeChange: (key: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  /** Optional slot for domain-specific action buttons rendered after the chips */
  actionButton?: React.ReactElement;
}

export function CollectionHeader<T extends CollectionItem>({
  config,
  activeViewMode,
  onViewModeChange,
  searchQuery,
  onSearchChange,
  actionButton,
}: CollectionHeaderProps<T>): React.ReactElement {
  const handleChipPress = useCallback(
    (key: string) => {
      onViewModeChange(key);
    },
    [onViewModeChange],
  );

  return (
    <View>
      {/* View mode chips row */}
      <View style={styles.chipsRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScrollContent}
          style={styles.chipsScroll}
        >
          {config.viewModes.map(viewMode => {
            const isActive = viewMode.key === activeViewMode;
            return (
              <TouchableOpacity
                key={viewMode.key}
                testID={`view-mode-chip-${viewMode.key}`}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => handleChipPress(viewMode.key)}
                accessibilityRole="button"
                accessibilityLabel={viewMode.label}
                accessibilityState={{ selected: isActive }}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {viewMode.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Optional action button slot (e.g. random pick, import trigger) */}
        {actionButton && (
          <View style={styles.actionButtonSlot}>{actionButton}</View>
        )}
      </View>

      {/* Search bar — always visible */}
      <SearchBar
        value={searchQuery}
        onChangeText={onSearchChange}
        placeholder={`Search by ${config.creatorLabel.toLowerCase()} or title…`}
      />
    </View>
  );
}

CollectionHeader.displayName = 'CollectionHeader';

const COLORS = {
  white: '#ffffff',
  textDim: 'rgba(255,255,255,0.5)',
  primary: '#6366f1',
  chipBg: 'rgba(255,255,255,0.1)',
  chipActiveBg: '#6366f1',
} as const;

const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
} as const;

const styles = StyleSheet.create({
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  chipsScroll: {
    flex: 1,
  },
  chipsScrollContent: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: 20,
    backgroundColor: COLORS.chipBg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  chipActive: {
    backgroundColor: COLORS.chipActiveBg,
    borderColor: COLORS.chipActiveBg,
  },
  chipText: {
    color: COLORS.textDim,
    fontSize: 13,
    fontWeight: '500',
  },
  chipTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  actionButtonSlot: {
    paddingRight: SPACING.md,
  },
});
