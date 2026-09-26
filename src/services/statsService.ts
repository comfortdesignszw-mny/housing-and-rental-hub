import { db } from '../db/db';
import { db as firestoreDb } from '../db/firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';

/**
 * Optimizes and records property listing views and engagement statistics.
 * Tracks expanded detailed views and CTA interactions (Apply, Message, Call, WhatsApp)
 * both in local IndexedDB cache and Firestore cloud.
 */
export async function recordPropertyView(
  propertyId: string,
  _actionType: 'expand_details' | 'cta_click' | 'apply_click' | 'chat_click' = 'expand_details'
): Promise<void> {
  if (!propertyId) return;

  try {
    // 1. Update local reactive IndexedDB cache
    await db.properties.where('id').equals(propertyId).modify(p => {
      p.views = (p.views || 0) + 1;
    });

    // 2. Atomically increment in Firestore cloud
    const propRef = doc(firestoreDb, 'properties', propertyId);
    await updateDoc(propRef, {
      views: increment(1),
    });
  } catch (err) {
    // Fail gracefully without breaking user actions
    console.debug('Stats recording note:', err);
  }
}

/**
 * Records user rating for a property listing
 */
export async function recordPropertyRating(
  propertyId: string,
  newRating: number,
  newCount: number
): Promise<void> {
  if (!propertyId) return;

  try {
    await db.properties.update(propertyId, {
      rating: newRating,
      ratingCount: newCount,
    });

    const propRef = doc(firestoreDb, 'properties', propertyId);
    await updateDoc(propRef, {
      rating: newRating,
      ratingCount: newCount,
    });
  } catch (err) {
    console.debug('Rating recording note:', err);
  }
}
