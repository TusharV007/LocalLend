import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, MessageSquare, Star, Shield, MapPin } from 'lucide-react';
import type { Item } from '@/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { createRequest } from '@/lib/db';

import { useAuth } from '@/contexts/AuthContext';

interface RequestModalProps {
  item: Item | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (message: string) => void;
}

export function RequestModal({ item, isOpen, onClose, onSubmit }: RequestModalProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!item) return null;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const requestData = {
        itemId: item.id,
        itemTitle: item.title,
        borrowerId: user?.uid || 'anonymous',
        borrowerName: user?.displayName || 'Anonymous',
        lenderId: item.owner.id,
        lenderName: item.owner.name,
        message: message,
      };

      /*
      const response = await fetch('http://localhost:5000/api/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) throw new Error('Failed to send request');
      */

      await createRequest({
        ...requestData
      });

      onSubmit(message);
      setMessage('');
      onClose();
    } catch (error) {
      console.error('Request failed:', error);
      // alert('Failed to send request'); // Optional UI feedback
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-foreground/50 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg bg-card rounded-2xl shadow-hover z-10 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with image */}
            <div className="relative h-48">
              <img
                src={item.images[0]}
                alt={item.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />

              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full bg-background/20 backdrop-blur-sm text-primary-foreground hover:bg-background/30 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Item info overlay */}
              <div className="absolute bottom-4 left-4 right-4">
                <h2 className="text-2xl font-bold text-primary-foreground">{item.title}</h2>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-1.5 text-primary-foreground/80 text-sm">
                    <MapPin className="w-4 h-4" />
                    {item.distance ? `${item.distance}m away` : 'Nearby'}
                  </div>
                  <div className="flex items-center gap-1.5 text-primary-foreground/80 text-sm">
                    <Calendar className="w-4 h-4" />
                    Available now
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Owner card */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary">
                <img
                  src={item.owner.avatar}
                  alt={item.owner.name}
                  className="w-14 h-14 rounded-full object-cover border-2 border-primary/20"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-card-foreground">{item.owner.name}</span>
                    {item.owner.verified && (
                      <Shield className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-accent fill-accent" />
                      <span className="text-sm font-medium">{item.owner.trustScore.toFixed(1)}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {item.owner.itemsLentCount} items shared
                    </span>
                  </div>
                </div>
              </div>

              {/* Message input */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-card-foreground">
                  <MessageSquare className="w-4 h-4" />
                  Send a message (optional)
                </label>
                <Textarea
                  placeholder="Hi! I'd love to borrow this for my weekend project. When would be a good time to pick it up?"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-[100px] resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Cancel
                </Button>
                <Button
                  variant="accent"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? 'Sending...' : 'Send Request'}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
