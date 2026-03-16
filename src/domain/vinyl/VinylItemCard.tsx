import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { VinylItem } from './types';

interface VinylItemCardProps {
  item: VinylItem;
  onPress: (item: VinylItem) => void;
}

/**
 * Reference card component for a single VinylItem.
 *
 * Layout: album art (square thumbnail) | title + creator + year | badges
 * Theme: dark background, muted borders — consistent with Social Vinyl's aesthetic.
 */
const VinylItemCard: React.FC<VinylItemCardProps> = ({ item, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      {/* Album Art */}
      {item.thumbUrl ? (
        <Image
          source={{ uri: item.thumbUrl }}
          style={styles.thumb}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]}>
          <Text style={styles.thumbPlaceholderText}>♪</Text>
        </View>
      )}

      {/* Text block */}
      <View style={styles.textBlock}>
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.creator} numberOfLines={1}>
          {item.creator}
        </Text>
        {item.year ? (
          <Text style={styles.year}>{item.year}</Text>
        ) : null}
      </View>

      {/* Badge row */}
      <View style={styles.badges}>
        {item.isSaved ? (
          <Text style={styles.badge}>🔖</Text>
        ) : null}
        {item.isNotable ? (
          <Text style={styles.badge}>⭐</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#333',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 4,
    backgroundColor: '#2A2A2A',
    marginRight: 12,
  },
  thumbPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbPlaceholderText: {
    fontSize: 20,
    color: '#555',
  },
  textBlock: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EFEFEF',
    marginBottom: 2,
  },
  creator: {
    fontSize: 12,
    color: '#AAAAAA',
    marginBottom: 1,
  },
  year: {
    fontSize: 11,
    color: '#666',
  },
  badges: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 2,
  },
  badge: {
    fontSize: 12,
  },
});

export default VinylItemCard;
