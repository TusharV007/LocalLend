"use client";

import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Navigation, MapPin as MapPinIcon } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { GeoJSONPoint } from '@/types';

interface LiveLocationMapProps {
    isOpen: boolean;
    onClose: () => void;
    ownerLocation: GeoJSONPoint;
    borrowerLocation?: GeoJSONPoint;
    ownerName: string;
    lastUpdated: Date;
}

export function LiveLocationMap({
    isOpen,
    onClose,
    ownerLocation,
    borrowerLocation,
    ownerName,
    lastUpdated
}: LiveLocationMapProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const [timeSinceUpdate, setTimeSinceUpdate] = useState('');

    // Calculate time since last update
    useEffect(() => {
        const updateTime = () => {
            const seconds = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
            if (seconds < 60) {
                setTimeSinceUpdate(`${seconds} seconds ago`);
            } else {
                const minutes = Math.floor(seconds / 60);
                setTimeSinceUpdate(`${minutes} minute${minutes > 1 ? 's' : ''} ago`);
            }
        };

        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    }, [lastUpdated]);

    // Initialize map
    useEffect(() => {
        if (!isOpen || !mapRef.current || mapInstanceRef.current) return;

        const center: [number, number] = [
            ownerLocation.coordinates[1],
            ownerLocation.coordinates[0]
        ];

        const map = L.map(mapRef.current, {
            center,
            zoom: 15,
            zoomControl: true
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '© OpenStreetMap © CARTO'
        }).addTo(map);

        // Owner marker (pulsing)
        const ownerIcon = L.divIcon({
            className: 'owner-location-marker',
            html: `
        <div style="position: relative">
          <div style="
            width: 40px;
            height: 40px;
            background: #d97706;
            border: 4px solid white;
            border-radius: 50%;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: pulse 2s infinite;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
              <circle cx="12" cy="9" r="2.5"/>
            </svg>
          </div>
          <style>
            @keyframes pulse {
              0%, 100% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.1); opacity: 0.8; }
            }
          </style>
        </div>
      `,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        });

        L.marker(center, { icon: ownerIcon })
            .addTo(map)
            .bindPopup(`<b>${ownerName}</b><br>Current location`);

        // Borrower marker if available
        if (borrowerLocation) {
            const yourPosition: [number, number] = [
                borrowerLocation.coordinates[1],
                borrowerLocation.coordinates[0]
            ];

            const borrowerIcon = L.divIcon({
                className: 'borrower-location-marker',
                html: `
          <div style="
            width: 20px;
            height: 20px;
            background: #166534;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          "></div>
        `,
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });

            L.marker(yourPosition, { icon: borrowerIcon })
                .addTo(map)
                .bindPopup('<b>You</b><br>Your location');

            // Fit bounds to show both markers
            map.fitBounds([center, yourPosition], { padding: [50, 50] });
        }

        mapInstanceRef.current = map;

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [isOpen, ownerLocation, borrowerLocation, ownerName]);

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-card rounded-2xl shadow-2xl w-full max-w-4xl h-[600px] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b bg-card">
                    <div className="flex items-center gap-3">
                        <Navigation className="w-5 h-5 text-primary" />
                        <div>
                            <h3 className="font-semibold text-lg">{ownerName}'s Location</h3>
                            <p className="text-xs text-muted-foreground">
                                Last updated: {timeSinceUpdate}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-secondary rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Map */}
                <div ref={mapRef} className="flex-1 w-full" />

                {/* Legend */}
                <div className="p-4 border-t bg-card flex items-center justify-around text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-primary border-2 border-white"></div>
                        <span>Owner's location</span>
                    </div>
                    {borrowerLocation && (
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-700 border-2 border-white"></div>
                            <span>Your location</span>
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}
