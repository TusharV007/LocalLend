"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Navbar } from '@/components/Navbar';
import { HeroSection } from '@/components/HeroSection';
import { CategoryFilter } from '@/components/CategoryFilter';
import { ItemCard } from '@/components/ItemCard';
import dynamic from 'next/dynamic';

const NeighborhoodMap = dynamic(() => import('@/components/NeighborhoodMap').then(mod => mod.NeighborhoodMap), {
  ssr: false,
  loading: () => <div className="w-full h-[500px] bg-secondary animate-pulse rounded-2xl" />
});
import { RequestModal } from '@/components/RequestModal';
import { useStore } from '@/store/useStore';
import { fetchNearbyItems as fetchMockNearbyItems, mockUsers, DEFAULT_USER_LOCATION } from '@/data/mockData';
import { fetchItems } from '@/lib/db';
import type { Item, ItemCategory } from '@/types';

import { AddItemModal } from '@/components/AddItemModal';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [mapItems, setMapItems] = useState<Item[]>([]); // Items for the map (global)

  const {
    userLocation, setUserLocation,
    nearbyItems, setNearbyItems,
    selectedCategory, setSelectedCategory,
    selectedItem, setSelectedItem,
    isRequestModalOpen, setRequestModalOpen,
    setCurrentUser
  } = useStore();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    }
  }, [user, authLoading, router]);

  const fetchItemsData = async (location = userLocation || DEFAULT_USER_LOCATION, pageNum = 1, query = '') => {
    try {
      setLoadingMore(true);
      // 1. Fetch real items from backend (Firestore)
      const realItems = await fetchItems(12, query);

      // Calculate real distance if we have user location
      const realItemsWithDistance = realItems.map(item => {
        if (!location || !item.location) return { ...item, distance: 0 };

        const R = 6371e3; // metres
        const lat1 = location.coordinates[1] * Math.PI / 180;
        const lat2 = item.location.coordinates[1] * Math.PI / 180;
        const dLat = (item.location.coordinates[1] - location.coordinates[1]) * Math.PI / 180;
        const dLon = (item.location.coordinates[0] - location.coordinates[0]) * Math.PI / 180;

        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1) * Math.cos(lat2) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const dist = Math.floor(R * c); // in meters

        return { ...item, distance: dist };
      });

      // 2. Mock items (only on first page to avoid duplicates/confusion if real items are empty initially)
      let mockItems: Item[] = [];
      if (pageNum === 1 && realItems.length === 0) {
        mockItems = fetchMockNearbyItems(
          location.coordinates[1],
          location.coordinates[0],
          2000,
          selectedCategory || undefined
        );
      }

      // Combine
      if (pageNum === 1) {
        setNearbyItems([...realItemsWithDistance, ...mockItems]);
      } else {
        setNearbyItems([...nearbyItems, ...realItemsWithDistance]);
      }

      setHasMore(realItems.length === 12); // Simple pagination check

    } catch (error) {
      console.error('Failed to fetch items:', error);
      // Fallback
      if (pageNum === 1) {
        setNearbyItems([]);
      }
    } finally {
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    setLoadingMore(true);
    fetchItemsData(userLocation || DEFAULT_USER_LOCATION, nextPage);
  };

  // Fetch all items for the map (Global View)
  useEffect(() => {
    if (!user) return;
    const fetchMapItems = async () => {
      try {
        // Use same Firestore fetch with higher limit for map
        const allItems = await fetchItems(100);
        setMapItems(allItems);
      } catch (error) {
        console.error('Failed to fetch map items:', error);
      }
    };
    fetchMapItems();
  }, [user]);

  // Initialize with data and location
  useEffect(() => {
    if (!user) return;
    setCurrentUser(mockUsers[0]);
    // Reset page on initial load or category change (if we watched category, but we do this manually)
    setPage(1);

    // Request Location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const userPos = { type: 'Point' as const, coordinates: [longitude, latitude] as [number, number] };
          setUserLocation(userPos); // Update store
          toast.success("Location found!", { description: "Showing items near you." });
          fetchItemsData(userPos, 1); // Fetch page 1
        },
        (error) => {
          console.error("Location access denied or error:", error);
          toast.error("Location access denied", { description: "Using default location (Guntur)." });
          setUserLocation(DEFAULT_USER_LOCATION);
          fetchItemsData(DEFAULT_USER_LOCATION, 1);
        }
      );
    } else {
      toast.error("Geolocation not supported");
      setUserLocation(DEFAULT_USER_LOCATION);
      fetchItemsData(DEFAULT_USER_LOCATION, 1);
    }
  }, [user, selectedCategory, setUserLocation, setCurrentUser, setNearbyItems]);

  // Handle search with debounce
  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => {
      setPage(1);
      fetchItemsData(userLocation || DEFAULT_USER_LOCATION, 1, searchQuery);
    }, 500); // 500ms debounce
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleExploreClick = () => {
    const mapSection = document.getElementById('map-section');
    mapSection?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleItemSelect = (item: Item) => {
    setSelectedItem(item);
  };

  const handleRequestClick = (item: Item) => {
    setSelectedItem(item);
    setRequestModalOpen(true);
  };

  const handleRequestSubmit = (message: string) => {
    toast.success('Request sent!', {
      description: `Your request for "${selectedItem?.title}" has been sent to ${selectedItem?.owner.name}.`,
    });
    setRequestModalOpen(false);
    setSelectedItem(null);
  };

  const handleCategoryChange = (category: ItemCategory | null) => {
    setSelectedCategory(category);
  };

  const handleAddItemSuccess = () => {
    fetchItemsData(userLocation || DEFAULT_USER_LOCATION, 1); // Refresh list
  };

  // Filter items for display (available items first)
  const sortedItems = [...nearbyItems].sort((a, b) => {
    const statusA = a.status || 'available';
    const statusB = b.status || 'available';
    if (statusA === 'available' && statusB !== 'available') return -1;
    if (statusA !== 'available' && statusB === 'available') return 1;
    return (a.distance || 0) - (b.distance || 0);
  });

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar onAddItemClick={() => setIsAddItemModalOpen(true)} onSearch={handleSearch} />

      {/* Hero Section */}
      <HeroSection onExploreClick={handleExploreClick} />

      {/* Main Content */}
      <main id="map-section" className="container mx-auto px-4 py-12 space-y-12">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-4"
        >
          <h2 className="text-3xl font-bold text-foreground">
            Items Near You
          </h2>
          <p className="text-muted-foreground max-w-2xl">
            Browse items available for borrowing in your neighborhood. Click on map markers
            or cards to learn more and send a borrow request.
          </p>
        </motion.div>

        {/* Category Filter */}
        <CategoryFilter
          selectedCategory={selectedCategory}
          onCategoryChange={handleCategoryChange}
        />

        {/* Map and Items Grid */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Map */}
          {userLocation && (
            <div className="lg:sticky lg:top-24 h-fit">
              <NeighborhoodMap
                userLocation={userLocation}
                items={mapItems}
                onItemSelect={handleItemSelect}
                onRequestClick={handleRequestClick}
              />
            </div>
          )}

          {/* Items Grid */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{nearbyItems.length}</span> items
                {selectedCategory && (
                  <> in <span className="font-semibold text-primary">{selectedCategory}</span></>
                )}
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {sortedItems.map((item, index) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  index={index}
                  onRequestClick={handleRequestClick}
                />
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-6 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-full text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {loadingMore ? 'Loading...' : 'Load More Items'}
                </button>
              </div>
            )}

            {nearbyItems.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <p className="text-muted-foreground">
                  No items found in this category. Try selecting a different filter.
                </p>
              </motion.div>
            )}
          </div>
        </div>
      </main>

      {/* Request Modal */}
      <RequestModal
        item={selectedItem}
        isOpen={isRequestModalOpen}
        onClose={() => {
          setRequestModalOpen(false);
          setSelectedItem(null);
        }}
        onSubmit={handleRequestSubmit}
      />

      {/* Add Item Modal */}
      <AddItemModal
        isOpen={isAddItemModalOpen}
        onClose={() => setIsAddItemModalOpen(false)}
        onSuccess={handleAddItemSuccess}
      />
    </div>
  );
};
