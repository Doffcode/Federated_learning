/**
 * Notification Service
 *
 * Handles:
 * 1. Fetching notifications from backend
 * 2. Caching in AsyncStorage for offline access
 * 3. Syncing between backend and frontend
 * 4. Marking notifications as read
 * 5. Deleting notifications
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

const CACHE_KEY = 'notifications_cache';
const LAST_SYNC_KEY = 'notifications_last_sync';

export interface Notification {
  id: string;
  user_id: string;
  vehicle_id: string;
  type: 'service_required' | 'model_updated' | 'training_complete';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  metadata?: Record<string, any>;
}

/**
 * Fetch notifications with smart caching
 *
 * Strategy:
 * 1. Load cached notifications (instant UI)
 * 2. Fetch fresh from backend in background
 * 3. Merge: keep newer ones, avoid duplicates
 * 4. Save merged to cache
 * 5. Return merged list
 */
export async function fetchNotifications(): Promise<Notification[]> {
  try {
    // Load from cache first (instant)
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    const cachedNotifs: Notification[] = cached ? JSON.parse(cached) : [];

    console.log('📲 Loading notifications from cache:', cachedNotifs.length);

    // Fetch fresh from backend (background)
    try {
      const response = await api.get('/notifications');
      const freshNotifs: Notification[] = response.data;

      console.log('📡 Fetched fresh notifications:', freshNotifs.length);

      // Merge: use fresh, but keep cached if not in fresh
      const merged = mergeNotifications(cachedNotifs, freshNotifs);

      // Save merged to cache
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(merged));
      console.log('✓ Notifications synced and cached');

      return merged;
    } catch (error) {
      console.warn('⚠️ Failed to fetch fresh notifications, using cache:', error);
      // If fresh fetch fails, return cached
      return cachedNotifs;
    }
  } catch (error) {
    console.error('❌ Notification fetch failed:', error);
    return [];
  }
}

/**
 * Smart merge: use fresh data, keep cached if missing in fresh
 */
function mergeNotifications(cached: Notification[], fresh: Notification[]): Notification[] {
  // Create map of fresh notifications
  const freshMap = new Map(fresh.map(n => [n.id, n]));

  // Add cached notifications that aren't in fresh
  for (const c of cached) {
    if (!freshMap.has(c.id)) {
      freshMap.set(c.id, c);
    }
  }

  // Convert to array and sort by date (newest first)
  return Array.from(freshMap.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

/**
 * Mark a notification as read
 */
export async function markAsRead(notificationId: string): Promise<void> {
  try {
    // Update on backend
    await api.put(`/notifications/${notificationId}/mark-read`);
    console.log(`✓ Marked as read: ${notificationId}`);

    // Update cache
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached) {
      const notifs = JSON.parse(cached) as Notification[];
      const idx = notifs.findIndex(n => n.id === notificationId);
      if (idx >= 0) {
        notifs[idx].is_read = true;
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(notifs));
      }
    }
  } catch (error) {
    console.error(`❌ Failed to mark as read: ${error}`);
    throw error;
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  try {
    // Delete on backend
    await api.delete(`/notifications/${notificationId}`);
    console.log(`✓ Deleted: ${notificationId}`);

    // Update cache
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached) {
      const notifs = JSON.parse(cached) as Notification[];
      const filtered = notifs.filter(n => n.id !== notificationId);
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(filtered));
    }
  } catch (error) {
    console.error(`❌ Failed to delete: ${error}`);
    throw error;
  }
}

/**
 * Get unread count
 */
export async function getUnreadCount(): Promise<number> {
  const notifs = await fetchNotifications();
  return notifs.filter(n => !n.is_read).length;
}

/**
 * Clear all cached notifications (for testing)
 */
export async function clearCache(): Promise<void> {
  await AsyncStorage.removeItem(CACHE_KEY);
  await AsyncStorage.removeItem(LAST_SYNC_KEY);
  console.log('✓ Notification cache cleared');
}
