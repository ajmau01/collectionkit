import React, { useCallback } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = React.memo(({
  value,
  onChangeText,
  placeholder = 'Search...',
}) => {
  const handleClear = useCallback(() => {
    onChangeText('');
  }, [onChangeText]);

  return (
    <View style={styles.searchContainer}>
      <View style={styles.inputWrapper}>
        <Ionicons
          name="search"
          size={18}
          color={COLORS.textDim}
          style={styles.searchIcon}
        />
        <TextInput
          testID="search-bar-input"
          style={styles.searchInput}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textDim}
          value={value}
          onChangeText={onChangeText}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus={true}
          returnKeyType="search"
          clearButtonMode="never"
          enablesReturnKeyAutomatically={true}
          accessibilityRole="search"
          accessibilityLabel="Search collection"
          accessibilityHint="Type to filter your collection"
        />
        {value.length > 0 && (
          <TouchableOpacity
            testID="search-bar-clear-button"
            onPress={handleClear}
            style={styles.clearButton}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            accessibilityHint="Clears the search text"
          >
            <Ionicons name="close-circle" size={20} color={COLORS.textDim} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

SearchBar.displayName = 'SearchBar';

const COLORS = {
  textDim: 'rgba(255,255,255,0.5)',
  white: '#ffffff',
  inputBg: 'rgba(255,255,255,0.1)',
} as const;

const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
} as const;

const styles = StyleSheet.create({
  searchContainer: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    paddingLeft: SPACING.md,
  },
  searchIcon: {
    marginRight: -SPACING.xs,
  },
  searchInput: {
    flex: 1,
    padding: SPACING.md,
    color: COLORS.white,
    fontSize: 16,
  },
  clearButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
});
