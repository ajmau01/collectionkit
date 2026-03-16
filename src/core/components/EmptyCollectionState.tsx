import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface EmptyCollectionStateProps {
  message?: string;
  onRefresh?: () => void;
}

export const EmptyCollectionState: React.FC<EmptyCollectionStateProps> = React.memo(({
  message = 'No items found',
  onRefresh,
}) => {
  return (
    <View testID="empty-collection-state" style={styles.container}>
      <Ionicons name="file-tray-outline" size={64} color={COLORS.textDim} />
      <Text style={styles.message}>{message}</Text>
      {onRefresh && (
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
          accessibilityRole="button"
          accessibilityLabel="Refresh collection"
        >
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

EmptyCollectionState.displayName = 'EmptyCollectionState';

const COLORS = {
  white: '#ffffff',
  textDim: 'rgba(255,255,255,0.5)',
  primary: '#6366f1',
} as const;

const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
} as const;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 100,
  },
  message: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  refreshButton: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },
});
