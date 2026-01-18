
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { subscribeToMessages, sendMessage, type Message, type RequestData } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
// Temporarily disabled for build fix
// import { useLocationSharing } from '@/hooks/useLocationSharing';
// import { LiveLocationMap } from './LiveLocationMap';
// import { doc, onSnapshot } from 'firebase/firestore';
// import { db } from '@/lib/firebase';
// import { toast } from 'sonner';

interface ChatWindowProps {
    request: RequestData;
    onClose: () => void;
}

export function ChatWindow({ request, onClose }: ChatWindowProps) {
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Location sharing state
    const [locationSharingEnabled, setLocationSharingEnabled] = useState(false);
    const [sharedLocation, setSharedLocation] = useState<any>(null);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [showLocationMap, setShowLocationMap] = useState(false);
    const { startSharing, stopSharing, currentLocation, error: locationError, isSharing } = useLocationSharing();

    const isBorrower = user?.uid === request.borrowerId;
    const isOwner = user?.uid === request.lenderId;
    const isApproved = request.status === 'accepted';

    useEffect(() => {
        // Subscribe to real-time messages
        const unsubscribe = subscribeToMessages(request.id, (msgs) => {
            setMessages(msgs);
            // Scroll to bottom on new message
            setTimeout(() => {
                if (scrollRef.current) {
                    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                }
            }, 100);
        });

        return () => unsubscribe();
    }, [request.id]);

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!user || !newMessage.trim()) return;

        setSending(true);
        try {
            await sendMessage(request.id, user.uid, newMessage.trim());
            setNewMessage('');
        } catch (error) {
            console.error("Failed to send message:", error);
        } finally {
            setSending(false);
        }
    };

    // Listen to location sharing updates
    useEffect(() => {
        if (!request.id) return;

        const requestRef = doc(db, 'requests', request.id);
        const unsubscribe = onSnapshot(requestRef, (doc) => {
            const data = doc.data();
            if (data?.locationSharing) {
                setLocationSharingEnabled(data.locationSharing.enabled || false);
                setSharedLocation(data.locationSharing.sharedLocation);
                if (data.locationSharing.lastUpdated) {
                    setLastUpdated(data.locationSharing.lastUpdated.toDate());
                }
            }
        });

        return () => unsubscribe();
    }, [request.id]);

    // Auto-update location when sharing is enabled
    useEffect(() => {
        if (isOwner && locationSharingEnabled && currentLocation) {
            updateSharedLocation(request.id, currentLocation).catch(err => {
                console.error('Failed to update location:', err);
            });
        }
    }, [currentLocation, locationSharingEnabled, isOwner, request.id]);

    const handleToggleLocationSharing = async () => {
        if (!isApproved) {
            toast.error('Location sharing only available for approved requests');
            return;
        }

        try {
            if (locationSharingEnabled) {
                await disableLocationSharing(request.id);
                stopSharing();
                toast.success('Location sharing stopped');
            } else {
                await enableLocationSharing(request.id);
                startSharing();
                toast.success('Location sharing enabled');
            }
        } catch (error) {
            toast.error('Failed to toggle location sharing');
            console.error(error);
        }
    };

    const otherPartyName = isBorrower ? request.lenderName : request.borrowerName;

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="fixed inset-y-0 right-0 w-full md:w-[400px] bg-background border-l shadow-2xl z-50 flex flex-col"
        >
            {/* Header */}
            <div className="p-4 border-b bg-card">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h3 className="font-semibold text-lg">{otherPartyName}</h3>
                        <p className="text-sm text-muted-foreground">{request.itemTitle}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {/* Location Sharing Controls */}
                {isApproved && (
                    <div className="flex items-center gap-2">
                        {isOwner && (
                            <Button
                                onClick={handleToggleLocationSharing}
                                variant={locationSharingEnabled ? "default" : "outline"}
                                size="sm"
                                className="flex-1"
                            >
                                <MapPin className="w-4 h-4 mr-2" />
                                {locationSharingEnabled ? 'Stop Sharing Location' : 'Share My Location'}
                            </Button>
                        )}

                        {isBorrower && locationSharingEnabled && sharedLocation && (
                            <Button
                                onClick={() => setShowLocationMap(true)}
                                variant="outline"
                                size="sm"
                                className="flex-1"
                            >
                                <Navigation className="w-4 h-4 mr-2" />
                                View Owner's Location
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                {messages.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                        <p>No messages yet.</p>
                        <p className="text-sm">Start the conversation!</p>
                    </div>
                )}

                {/* Initial Request Message */}
                {request.message && (
                    <div className="flex justify-start">
                        <div className="bg-secondary/50 text-secondary-foreground max-w-[80%] rounded-2xl rounded-tl-none px-4 py-2 border border-border/50">
                            <p className="text-xs text-muted-foreground mb-1">Original Request:</p>
                            {request.message}
                        </div>
                    </div>
                )}

                {messages.map((msg) => {
                    const isMe = msg.senderId === user?.uid;
                    return (
                        <div
                            key={msg.id}
                            className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[80%] rounded-2xl px-4 py-2 ${isMe
                                    ? 'bg-primary text-primary-foreground rounded-tr-none'
                                    : 'bg-secondary text-secondary-foreground rounded-tl-none'
                                    }`}
                            >
                                <p>{msg.content}</p>
                                <p className={`text-[10px] mt-1 ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                    {msg.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t bg-card">
                <form onSubmit={handleSend} className="flex gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 bg-background border rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                        disabled={sending}
                    />
                    <Button
                        type="submit"
                        size="icon"
                        className="rounded-full"
                        disabled={!newMessage.trim() || sending}
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </form>
            </div>

            {/* Live Location Map Modal */}
            {showLocationMap && sharedLocation && (
                <LiveLocationMap
                    isOpen={showLocationMap}
                    onClose={() => setShowLocationMap(false)}
                    ownerLocation={sharedLocation}
                    borrowerLocation={currentLocation || undefined}
                    ownerName={otherPartyName}
                    lastUpdated={lastUpdated}
                />
            )}
        </motion.div>
    );
}
