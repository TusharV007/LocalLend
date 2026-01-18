import { db } from "./firebase";
import {
    collection,
    addDoc,
    getDocs,
    getDoc,
    doc,
    updateDoc,
    query,
    where,
    orderBy,
    limit,
    Timestamp,
    type DocumentData,
    or,
    onSnapshot,
    deleteDoc
} from "firebase/firestore";
import type { Item, GeoJSONPoint } from "@/types";

const ITEMS_COLLECTION = "items";
const REQUESTS_COLLECTION = "requests";

export const addItem = async (item: Omit<Item, "id" | "createdAt" | "distance" | "status" | "borrowCount">) => {
    try {
        const docRef = await addDoc(collection(db, ITEMS_COLLECTION), {
            ...item,
            createdAt: Timestamp.now(),
            distance: 0, // Calculated client-side
            borrowCount: 0,
            status: 'available'
        });
        return docRef.id;
    } catch (error) {
        console.error("Error adding item:", error);
        throw error;
    }
};

export const updateItemStatus = async (itemId: string, status: 'available' | 'lended' | 'unavailable') => {
    try {
        const docRef = doc(db, ITEMS_COLLECTION, itemId);
        await updateDoc(docRef, { status });
    } catch (error) {
        console.error("Error updating item status:", error);
        throw error;
    }
};

/**
 * Cascade delete an item along with all related requests and messages
 * This ensures no orphaned data remains in borrower/lender accounts
 * 
 * @param itemId - The ID of the item to delete
 */
export const deleteItem = async (itemId: string) => {
    try {
        console.log(`Starting cascade delete for item: ${itemId}`);

        // Step 1: Find all requests related to this item
        const requestsQuery = query(
            collection(db, REQUESTS_COLLECTION),
            where("itemId", "==", itemId)
        );
        const requestsSnapshot = await getDocs(requestsQuery);

        console.log(`Found ${requestsSnapshot.size} related requests to delete`);

        // Step 2: Delete all messages in each request (subcollection)
        // and collect request delete promises
        const deletePromises: Promise<void>[] = [];

        for (const requestDoc of requestsSnapshot.docs) {
            // Get messages subcollection
            const messagesRef = collection(
                db,
                REQUESTS_COLLECTION,
                requestDoc.id,
                MESSAGES_SUBCOLLECTION
            );
            const messagesSnapshot = await getDocs(messagesRef);

            // Delete each message
            messagesSnapshot.docs.forEach(msgDoc => {
                deletePromises.push(deleteDoc(msgDoc.ref));
            });

            // Add request deletion to promises
            deletePromises.push(deleteDoc(requestDoc.ref));
        }

        // Step 3: Execute all deletions in parallel for better performance
        await Promise.all(deletePromises);

        console.log(`Deleted ${deletePromises.length} related documents (requests + messages)`);

        // Step 4: Delete the item itself
        const itemRef = doc(db, ITEMS_COLLECTION, itemId);
        await deleteDoc(itemRef);

        console.log(`Successfully completed cascade delete for item: ${itemId}`);
    } catch (error) {
        console.error("Error in cascade delete:", error);
        throw error;
    }
};

export const fetchItems = async (limitCount = 20, searchQuery = ''): Promise<Item[]> => {
    try {
        let q;
        if (searchQuery) {
            // Basic "start with" search on title
            // Note: Firestore is case-sensitive and simple. 
            // For production, Algolia or similar is recommended.
            q = query(
                collection(db, ITEMS_COLLECTION),
                where('title', '>=', searchQuery),
                where('title', '<=', searchQuery + '\uf8ff'),
                limit(limitCount)
            );
        } else {
            q = query(
                collection(db, ITEMS_COLLECTION),
                orderBy("createdAt", "desc"),
                limit(limitCount)
            );
        }

        const querySnapshot = await getDocs(q);

        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                // Convert Firestore Timestamp to Date if needed, 
                // but Item interface uses Date. Firestore returns Timestamp objects.
                // We need to convert them.
                createdAt: data.createdAt?.toDate() || new Date(),
                // Ensure other fields match interface
            } as Item;
        });
    } catch (error) {
        console.error("Error fetching items:", error);
        // If index is missing for orderBy, fallback to no order
        if ((error as any)?.code === 'failed-precondition') {
            console.warn("Missing index, fetching without sort");
            const fallbackQ = query(collection(db, ITEMS_COLLECTION), limit(limitCount));
            const snap = await getDocs(fallbackQ);
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Item));
        }
        throw error;
    }
};

export const fetchUserItems = async (userId: string): Promise<Item[]> => {
    try {
        const q = query(collection(db, ITEMS_COLLECTION), where("owner.id", "==", userId));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date()
        } as Item));
    } catch (error) {
        console.error("Error fetching user items:", error);
        throw error;
    }
};

export interface RequestData {
    id: string;
    itemId: string;
    itemTitle: string;
    borrowerId: string;
    borrowerName: string;
    lenderId: string;
    lenderName: string;
    message: string;
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: Date;
}

export const createRequest = async (request: Omit<RequestData, "id" | "createdAt" | "status">) => {
    try {
        const docRef = await addDoc(collection(db, REQUESTS_COLLECTION), {
            ...request,
            status: 'pending',
            createdAt: Timestamp.now()
        });
        return docRef.id;
    } catch (error) {
        console.error("Error creating request:", error);
        throw error;
    }
};

export const fetchUserRequests = async (userId: string): Promise<RequestData[]> => {
    try {
        // Fetch where user is either borrower or lender
        const q = query(
            collection(db, REQUESTS_COLLECTION),
            or(
                where("borrowerId", "==", userId),
                where("lenderId", "==", userId)
            ),
            orderBy("createdAt", "desc")
        );

        const querySnapshot = await getDocs(q);

        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate() || new Date()
            } as RequestData;
        });
    } catch (error) {
        console.error("Error fetching requests:", error);
        // Fallback for missing index error
        if ((error as any)?.code === 'failed-precondition') {
            const qSimplified = query(
                collection(db, REQUESTS_COLLECTION),
                or(where("borrowerId", "==", userId), where("lenderId", "==", userId))
            );
            const snap = await getDocs(qSimplified);
            return snap.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date()
            } as RequestData));
        }
        throw error;
    }
};

export const updateRequestStatus = async (requestId: string, status: 'accepted' | 'rejected') => {
    try {
        const docRef = doc(db, REQUESTS_COLLECTION, requestId);
        await updateDoc(docRef, { status });

        // If accepted, increment the item's borrow count
        if (status === 'accepted') {
            // First get the request to find the itemId
            const requestDoc = await getDoc(docRef);
            if (requestDoc.exists()) {
                const requestData = requestDoc.data();
                const itemId = requestData.itemId;

                if (itemId) {
                    const itemRef = doc(db, ITEMS_COLLECTION, itemId);
                    const itemDoc = await getDoc(itemRef);

                    if (itemDoc.exists()) {
                        const currentCount = itemDoc.data().borrowCount || 0;
                        await updateDoc(itemRef, { borrowCount: currentCount + 1 });
                    }
                }
            }
        }
    } catch (error) {
        console.error("Error updating request status:", error);
        throw error;
    }
};

// Chat Functions
const MESSAGES_SUBCOLLECTION = "messages";

export interface Message {
    id: string;
    requestId: string;
    senderId: string;
    content: string;
    createdAt: Date;
}

export const sendMessage = async (requestId: string, senderId: string, content: string) => {
    try {
        const messagesRef = collection(db, REQUESTS_COLLECTION, requestId, MESSAGES_SUBCOLLECTION);
        await addDoc(messagesRef, {
            requestId,
            senderId,
            content,
            createdAt: Timestamp.now()
        });
    } catch (error) {
        console.error("Error sending message:", error);
        throw error;
    }
};

export const subscribeToMessages = (requestId: string, callback: (messages: Message[]) => void) => {
    const messagesRef = collection(db, REQUESTS_COLLECTION, requestId, MESSAGES_SUBCOLLECTION);
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    return onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date()
        } as Message));
        callback(messages);
    });
};
