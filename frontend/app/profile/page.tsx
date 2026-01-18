"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ItemCard } from '@/components/ItemCard';
import { Package, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Item } from '@/types';
import { useRouter } from 'next/navigation';
import { fetchUserItems, updateItemStatus, deleteItem } from '@/lib/db';
import { toast } from 'sonner';

interface ProfileData {
    listings: Item[];
    lended: (Item & { request: any })[];
    borrowed: (Item & { request: any })[];
}

export default function ProfilePage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [data, setData] = useState<ProfileData>({ listings: [], lended: [], borrowed: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth');
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (!user) return;
        const loadProfileData = async () => {
            try {
                const userListings = await fetchUserItems(user.uid);
                setData({
                    listings: userListings,
                    lended: [], // Not implemented yet
                    borrowed: [] // Not implemented yet
                });
                setLoading(false);
            } catch (err) {
                console.error(err);
                setLoading(false);
            }
        };
        loadProfileData();
    }, [user]);

    const EmptyState = ({ message }: { message: string }) => (
        <div className="text-center py-12 text-muted-foreground bg-secondary/30 rounded-xl border border-dashed border-border">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>{message}</p>
        </div>
    );

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="min-h-screen bg-background pb-20">
            <Navbar />

            <div className="container mx-auto px-4 py-8 max-w-5xl">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl">
                        {user.displayName?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">{user.displayName}</h1>
                        <p className="text-muted-foreground">{user.email}</p>
                    </div>
                </div>

                <Tabs defaultValue="listings" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-8">
                        <TabsTrigger value="listings">My Listings ({data.listings.length})</TabsTrigger>
                        <TabsTrigger value="lends">Lended Items ({data.lended.length})</TabsTrigger>
                        <TabsTrigger value="borrows">Borrowed Items ({data.borrowed.length})</TabsTrigger>
                    </TabsList>

                    <TabsContent value="listings" className="space-y-6">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <Package className="w-5 h-5" /> Items you are sharing
                        </h2>
                        {data.listings.length > 0 ? (
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {data.listings.map((item, idx) => (
                                    <div key={item.id} className="relative group">
                                        <ItemCard item={item} index={idx} onRequestClick={() => { }} />
                                        <div className="absolute top-2 right-2 flex gap-2 bg-background/90 backdrop-blur-sm rounded-md shadow-sm border p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <select
                                                className="text-xs bg-transparent border-none focus:ring-0 cursor-pointer outline-none"
                                                value={item.status || 'available'}
                                                onChange={async (e) => {
                                                    const newStatus = e.target.value as any;
                                                    try {
                                                        await updateItemStatus(item.id, newStatus);
                                                        setData(prev => ({
                                                            ...prev,
                                                            listings: prev.listings.map(l => l.id === item.id ? { ...l, status: newStatus } : l)
                                                        }));
                                                        toast.success(`Status updated to ${newStatus}`);
                                                    } catch (err) {
                                                        toast.error('Failed to update status');
                                                    }
                                                }}
                                            >
                                                <option value="available">Available</option>
                                                <option value="lended">Lended</option>
                                                <option value="unavailable">Unavailable</option>
                                            </select>
                                            <button
                                                onClick={async () => {
                                                    if (confirm(`Delete "${item.title}"? This cannot be undone.`)) {
                                                        try {
                                                            await deleteItem(item.id);
                                                            setData(prev => ({
                                                                ...prev,
                                                                listings: prev.listings.filter(l => l.id !== item.id)
                                                            }));
                                                            toast.success('Item deleted successfully');
                                                        } catch (err) {
                                                            toast.error('Failed to delete item');
                                                        }
                                                    }
                                                }}
                                                className="text-red-600 hover:text-red-700 px-2 text-xs font-medium"
                                                title="Delete item"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : <EmptyState message="You haven't listed any items yet." />}
                    </TabsContent>

                    <TabsContent value="lends" className="space-y-6">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <ArrowUpRight className="w-5 h-5 text-green-500" /> Items currently lent out
                        </h2>
                        {data.lended.length > 0 ? (
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {data.lended.map((item, idx) => (
                                    <ItemCard key={item.id} item={item} index={idx} onRequestClick={() => { }} />
                                ))}
                            </div>
                        ) : <EmptyState message="No active lending history." />}
                    </TabsContent>

                    <TabsContent value="borrows" className="space-y-6">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <ArrowDownLeft className="w-5 h-5 text-blue-500" /> Items you are borrowing
                        </h2>
                        {data.borrowed.length > 0 ? (
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {data.borrowed.map((item, idx) => (
                                    <ItemCard key={item.id} item={item} index={idx} onRequestClick={() => { }} />
                                ))}
                            </div>
                        ) : <EmptyState message="No active borrowing history." />}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};
