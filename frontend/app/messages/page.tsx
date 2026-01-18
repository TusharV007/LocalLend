"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navbar } from '@/components/Navbar';
import { ChatWindow } from '@/components/ChatWindow';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { MessageCircle, Check, X, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter } from 'next/navigation';
import { fetchUserRequests, updateRequestStatus } from '@/lib/db';

interface Request {
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

export default function MessagesPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [requests, setRequests] = useState<Request[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth');
        }
    }, [user, authLoading, router]);

    const fetchRequests = async () => {
        if (!user) return;
        try {
            const data = await fetchUserRequests(user.uid);
            // Map Firestore data to local Request interface if needed (though they should align mostly)
            // Local Request interface uses 'createdAt: string', but db returns Date. 
            // We need to map it or update local interface.
            const mappedData = data.map(r => ({
                ...r,
                createdAt: r.createdAt.toISOString()
            })) as unknown as Request[];

            setRequests(mappedData);
        } catch (error) {
            console.error('Failed to fetch requests', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchRequests();
            // Polling is less ideal with Firestore (realtime listeners are better), 
            // but keeping simple polling for now to match structure.
            const interval = setInterval(fetchRequests, 10000);
            return () => clearInterval(interval);
        }
    }, [user]);

    const handleStatusUpdate = async (requestId: string, newStatus: 'accepted' | 'rejected') => {
        try {
            await updateRequestStatus(requestId, newStatus);
            toast.success(`Request ${newStatus}`);
            fetchRequests();
        } catch (error) {
            toast.error('Failed to update request status');
        }
    };

    if (authLoading || (!user && loading)) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!user) return null;

    const incomingRequests = requests.filter(r => r.lenderId === user.uid);
    const outgoingRequests = requests.filter(r => r.borrowerId === user.uid);

    return (
        <div className="min-h-screen bg-background pb-20">
            <Navbar />

            <div className="container mx-auto px-4 py-8 max-w-2xl">
                <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
                    <MessageCircle className="w-8 h-8 text-primary" />
                    Messages
                </h1>

                <Tabs defaultValue="incoming" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                        <TabsTrigger value="incoming">
                            Inbox ({incomingRequests.filter(r => r.status === 'pending').length})
                        </TabsTrigger>
                        <TabsTrigger value="outgoing">My Requests</TabsTrigger>
                    </TabsList>

                    <TabsContent value="incoming" className="space-y-4">
                        {incomingRequests.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">No incoming requests.</p>
                        ) : (
                            incomingRequests.map(req => (
                                <RequestCard
                                    key={req.id}
                                    request={req}
                                    isIncoming={true}
                                    onStatusUpdate={handleStatusUpdate}
                                    onChatOpen={() => setSelectedRequest(req)}
                                />
                            ))
                        )}
                    </TabsContent>

                    <TabsContent value="outgoing" className="space-y-4">
                        {outgoingRequests.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">No active requests.</p>
                        ) : (
                            outgoingRequests.map(req => (
                                <RequestCard
                                    key={req.id}
                                    request={req}
                                    isIncoming={false}
                                    onStatusUpdate={handleStatusUpdate}
                                    onChatOpen={() => setSelectedRequest(req)}
                                />
                            ))
                        )}
                    </TabsContent>
                </Tabs>
            </div>

            <AnimatePresence>
                {selectedRequest && (
                    <ChatWindow
                        request={selectedRequest}
                        onClose={() => setSelectedRequest(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

const RequestCard = ({
    request,
    isIncoming,
    onStatusUpdate,
    onChatOpen
}: {
    request: Request;
    isIncoming: boolean;
    onStatusUpdate: (id: string, status: 'accepted' | 'rejected') => void;
    onChatOpen: () => void;
}) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-start justify-between gap-4"
    >
        <div className="flex-1 w-full">
            <div className="flex items-center gap-2 mb-1">
                <Badge variant={
                    request.status === 'accepted' ? 'default' :
                        request.status === 'rejected' ? 'destructive' : 'secondary'
                }>
                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(request.createdAt).toLocaleDateString()}
                </span>
            </div>

            <h3 className="font-semibold text-foreground">
                {request.itemTitle}
            </h3>

            <p className="text-sm text-muted-foreground mt-1">
                {isIncoming ? (
                    <>From: <span className="font-medium text-foreground">{request.borrowerName}</span></>
                ) : (
                    <>To: <span className="font-medium text-foreground">{request.lenderName}</span></>
                )}
            </p>

            {request.message && (
                <div className="mt-3 bg-secondary/50 p-3 rounded-lg text-sm italic text-muted-foreground">
                    "{request.message}"
                </div>
            )}
        </div>

        <div className="flex flex-row md:flex-col gap-2 w-full md:w-auto mt-2 md:mt-0">
            <Button
                size="sm"
                variant="outline"
                onClick={onChatOpen}
                className="w-full md:w-auto"
            >
                <MessageCircle className="w-4 h-4 mr-2" />
                Chat
            </Button>

            {isIncoming && request.status === 'pending' && (
                <>
                    <Button
                        size="sm"
                        variant="default"
                        className="bg-green-600 hover:bg-green-700 text-white w-full md:w-auto"
                        onClick={() => onStatusUpdate(request.id, 'accepted')}
                    >
                        <Check className="w-4 h-4 mr-1" /> Accept
                    </Button>
                    <Button
                        size="sm"
                        variant="destructive"
                        className="w-full md:w-auto"
                        onClick={() => onStatusUpdate(request.id, 'rejected')}
                    >
                        <X className="w-4 h-4 mr-1" /> Reject
                    </Button>
                </>
            )}
        </div>
    </motion.div>
);
