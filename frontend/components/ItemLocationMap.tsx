"use client";

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, MapPin } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { GeoJSONPoint } from '@/types';

interface ItemLocationMapProps {
    isOpen: boolean;
    onClose: () => void;
    itemLocation: GeoJSONPoint;
    itemTitle: string;
    ownerName: string;
    distance: string;
}

export default function ItemLocationMap({
    isOpen,
    onClose,
    itemLocation,
    itemTitle,
    ownerName,
    distance
}: ItemLocationMapProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);

    useEffect(() => {
        if (!isOpen || !mapRef.current || mapInstanceRef.current) return;

        const center: [number, number] = [
            itemLocation.coordinates[1],
            itemLocation.coordinates[0]
        ];

        const map = L.map(mapRef.current, {
            center,
            zoom: 14,
            zoomControl: true
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '© OpenStreetMap © CARTO'
        }).addTo(map);

        // Item location marker
        const markerIcon = L.divIcon({
            className: 'item-location-marker',
            html: `
        <div style="position: relative">
          <div style="
            width: 40px;
            height: 40px;
            background: #d97706;
            border: 4px solid white;
            border-radius: 50%;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
              <circle cx="12" cy="9" r="2.5"/>
            </svg>
          </div>
        </div>
      `,
            iconSize: [40, 40],
            iconAnchor: [20, 40]
        });

        L.marker(center, { icon: markerIcon })
            .addTo(map)
            .bindPopup(`<b>${itemTitle}</b><br>Owner: ${ownerName}<br>${distance}`);

        mapInstanceRef.current = map;

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [isOpen, itemLocation, itemTitle, ownerName, distance]);

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
                className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl h-[500px] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b bg-card">
                    <div className="flex items-center gap-3">
                        <MapPin className="w-5 h-5 text-primary" />
                        <div>
                            <h3 className="font-semibold text-lg">{itemTitle}</h3>
                            <p className="text-xs text-muted-foreground">
                                {ownerName} • {distance}
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
            </motion.div>
        </motion.div>
    );
}
