import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { addItem } from '@/lib/db';
import { compressImage } from '@/lib/utils';
import { uploadImage } from '@/lib/storage';

interface AddItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function AddItemModal({ isOpen, onClose, onSuccess }: AddItemModalProps) {
    const { user } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: 'Tools',
        image: '',
    });


    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const toastId = toast.loading("Processing image...");
                const compressedBase64 = await compressImage(file);

                // Upload to Firebase Storage
                toast.loading("Uploading...", { id: toastId });

                // Convert Base64 to Blob
                const res = await fetch(compressedBase64);
                const blob = await res.blob();

                // Create unique path
                const filename = `items/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;

                const downloadURL = await uploadImage(blob, filename);

                setFormData(prev => ({ ...prev, image: downloadURL }));
                toast.success("Image uploaded!", { id: toastId });
            } catch (error) {
                console.error("Upload error:", error);
                toast.error("Failed to upload image");
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            if (!formData.title || !formData.description || !formData.image) {
                throw new Error('Please fill all required fields');
            }

            const newItem = {
                ...formData,
                ownerId: user?.uid || 'anonymous',
                owner: {
                    id: user?.uid || 'anonymous',
                    name: user?.displayName || 'Anonymous',
                    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80', // Mock avatar
                    trustScore: 5.0,
                    itemsLentCount: 0,
                    verified: true
                },
                availabilityStatus: 'Available',
                location: {
                    type: 'Point',
                    coordinates: [80.4365, 16.3067] // Default Guntur
                },
                distance: 0, // Calculated by backend or frontend later
                images: [formData.image],
                borrowCount: 0,
                rentPrice: 0 // Default free for now
            };

            const docId = await addItem(newItem);

            // if (!response.ok) throw new Error('Failed to add item'); // addItem throws if fails

            toast.success('Item listed successfully!');
            onSuccess();
            onClose();
            setFormData({ title: '', description: '', category: 'Tools', image: '' });

        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to list item');
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
                        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-lg bg-card border rounded-xl shadow-lg z-10 flex flex-col max-h-[90vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-6 border-b">
                            <h2 className="text-2xl font-bold">List an Item</h2>
                            <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            <form id="add-item-form" onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="image">Item Image</Label>
                                    <div className="flex items-center gap-4">
                                        {formData.image && (
                                            <img src={formData.image} alt="Preview" className="w-20 h-20 object-cover rounded-lg" />
                                        )}
                                        <div className="relative">
                                            <input
                                                type="file"
                                                id="image"
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                                className="hidden"
                                            />
                                            <Button type="button" variant="outline" onClick={() => document.getElementById('image')?.click()}>
                                                <Upload className="w-4 h-4 mr-2" />
                                                Upload Image
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="title">Title</Label>
                                    <Input
                                        id="title"
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="e.g. Cordless Drill"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="category">Category</Label>
                                    <select
                                        id="category"
                                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                                    >
                                        <option value="Tools">Tools</option>
                                        <option value="Electronics">Electronics</option>
                                        <option value="Kitchen">Kitchen</option>
                                        <option value="Books">Books</option>
                                        <option value="Outdoor">Outdoor</option>
                                        <option value="Sports">Sports</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Describe the condition and details..."
                                        required
                                    />
                                </div>
                            </form>
                        </div>

                        <div className="p-6 border-t bg-card rounded-b-xl">
                            <div className="flex gap-3">
                                <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                                    Cancel
                                </Button>
                                <Button type="submit" form="add-item-form" disabled={isSubmitting} className="flex-1">
                                    {isSubmitting ? 'Listing...' : 'List Item'}
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
