import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, Check, Loader2 } from "lucide-react";

interface ImageUploadSelectorProps {
  value: string;
  onChange: (url: string) => void;
}

export const ImageUploadSelector = ({ value, onChange }: ImageUploadSelectorProps) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [selectedTab, setSelectedTab] = useState("url");

  useEffect(() => {
    fetchExistingImages();
  }, []);

  const fetchExistingImages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from('product-images')
        .list('', { limit: 50 });

      if (error) throw error;

      const imageUrls = data
        .filter(file => file.name.match(/\.(jpg|jpeg|png|webp)$/i))
        .map(file => {
          const { data: { publicUrl } } = supabase.storage
            .from('product-images')
            .getPublicUrl(file.name);
          return publicUrl;
        });

      setExistingImages(imageUrls);
    } catch (error) {
      console.error('Error fetching images:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      onChange(publicUrl);
      await fetchExistingImages(); // Refresh the list
      
      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Label>Product Image</Label>
      
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="url">URL</TabsTrigger>
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="existing">Select Existing</TabsTrigger>
        </TabsList>
        
        <TabsContent value="url" className="space-y-2">
          <Input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://example.com/image.jpg"
          />
        </TabsContent>
        
        <TabsContent value="upload" className="space-y-2">
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-6">
            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-2">
              Click to upload an image
            </p>
            <Input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={uploading}
              className="w-auto"
            />
            {uploading && (
              <div className="flex items-center mt-2">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm">Uploading...</span>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="existing">
          <ScrollArea className="h-48 border rounded-lg p-2">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : existingImages.length === 0 ? (
              <p className="text-center text-muted-foreground">No images found</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {existingImages.map((imageUrl, index) => (
                  <div
                    key={index}
                    className={`relative cursor-pointer border-2 rounded-lg overflow-hidden ${
                      value === imageUrl ? 'border-primary' : 'border-border'
                    }`}
                    onClick={() => onChange(imageUrl)}
                  >
                    <img
                      src={imageUrl}
                      alt={`Product ${index + 1}`}
                      className="w-full h-20 object-cover"
                    />
                    {value === imageUrl && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <Check className="h-4 w-4 text-primary" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
      
      {value && (
        <div className="mt-4">
          <Label className="text-sm">Preview:</Label>
          <img
            src={value}
            alt="Preview"
            className="mt-2 w-full h-32 object-cover rounded-lg border"
          />
        </div>
      )}
    </div>
  );
};