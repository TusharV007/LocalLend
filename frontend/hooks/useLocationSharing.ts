import { useEffect, useState, useCallback } from 'react';
import type { GeoJSONPoint } from '@/types';

interface UseLocationSharingReturn {
    startSharing: () => void;
    stopSharing: () => void;
    currentLocation: GeoJSONPoint | null;
    error: string | null;
    isSharing: boolean;
}

export function useLocationSharing(): UseLocationSharingReturn {
    const [currentLocation, setCurrentLocation] = useState<GeoJSONPoint | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSharing, setIsSharing] = useState(false);
    const [watchId, setWatchId] = useState<number | null>(null);

    const startSharing = useCallback(() => {
        // SSR safety - check if we're in browser
        if (typeof window === 'undefined' || !navigator?.geolocation) {
            setError('Geolocation is not supported');
            return;
        }

        setError(null);

        const id = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const location: GeoJSONPoint = {
                    type: 'Point',
                    coordinates: [longitude, latitude]
                };
                setCurrentLocation(location);
                setIsSharing(true);
                setError(null);
            },
            (err) => {
                console.error('Geolocation error:', err);
                switch (err.code) {
                    case err.PERMISSION_DENIED:
                        setError('Location permission denied');
                        break;
                    case err.POSITION_UNAVAILABLE:
                        setError('Location unavailable');
                        break;
                    case err.TIMEOUT:
                        setError('Location request timed out');
                        break;
                    default:
                        setError('Unknown error getting location');
                }
                setIsSharing(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );

        setWatchId(id);
    }, []);

    const stopSharing = useCallback(() => {
        if (typeof window !== 'undefined' && watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
            setWatchId(null);
        }
        setIsSharing(false);
        setCurrentLocation(null);
    }, [watchId]);

    useEffect(() => {
        return () => {
            if (typeof window !== 'undefined' && watchId !== null) {
                navigator.geolocation.clearWatch(watchId);
            }
        };
    }, [watchId]);

    return {
        startSharing,
        stopSharing,
        currentLocation,
        error,
        isSharing
    };
}
