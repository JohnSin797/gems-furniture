import Navigation from "@/components/Navigation";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { User, Mail, Calendar, Shield, MapPin } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface ProfileData {
  id: string;
  first_name: string | null;
  last_name: string | null;
  street_address: string | null;
  barangay: string | null;
  city: string | null;
  province: string | null;
  zip_code: string | null;
}

const Profile = () => {
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState({
    street: "",
    barangay: "",
    city: "",
    province: "",
    zipCode: "",
  });
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const { user, userRole } = useAuth();
  const { toast } = useToast();

  const fetchProfile = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        throw error;
      }

      if (data) {
        setProfileData(data);
        setFullName(`${data.first_name || ''} ${data.last_name || ''}`.trim());
        setAddress({
          street: data.street_address || "",
          barangay: data.barangay || "",
          city: data.city || "",
          province: data.province || "",
          zipCode: data.zip_code || "",
        });
      } else {
        // Profile doesn't exist yet, set defaults
        setFullName(user?.user_metadata?.full_name || "");
        setAddress({
          street: user?.user_metadata?.address?.street || "",
          barangay: user?.user_metadata?.address?.barangay || "",
          city: user?.user_metadata?.address?.city || "",
          province: user?.user_metadata?.address?.province || "",
          zipCode: user?.user_metadata?.address?.zipCode || "",
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user, fetchProfile]);

  const handleUpdateProfile = async () => {
    if (!user) return;

    setUpdating(true);
    try {
      // Split full name into first and last name
      const nameParts = fullName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || null;

      const profileUpdate = {
        first_name: firstName,
        last_name: lastName,
        street_address: address.street || null,
        barangay: address.barangay || null,
        city: address.city || null,
        province: address.province || null,
        zip_code: address.zipCode || null,
        email: user.email,
        updated_at: new Date().toISOString(),
      };

      if (profileData) {
        // Update existing profile
        const { error } = await supabase
          .from('profiles')
          .update(profileUpdate)
          .eq('id', profileData.id);

        if (error) throw error;
      } else {
        // Create new profile
        const { error } = await supabase
          .from('profiles')
          .insert({
            ...profileUpdate,
            user_id: user.id,
          });

        if (error) throw error;
      }

      // Refresh profile data
      await fetchProfile();

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return userRole === 'admin' ? (
      <AdminLayout>
        <div className="text-center">Loading profile...</div>
      </AdminLayout>
    ) : (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">Loading profile...</div>
        </main>
      </div>
    );
  }

  const content = (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">My Profile</h1>
          <p className="text-muted-foreground">Manage your account information</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Information */}
          <div className="lg:col-span-2 space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Personal Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      value={user?.email || ""}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      Email cannot be changed
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Account Created</Label>
                    <div className="flex items-center space-x-2 p-3 bg-muted rounded-md">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Account Role</Label>
                    <div className="flex items-center space-x-2 p-3 bg-muted rounded-md">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm capitalize">
                        {userRole || 'User'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Address Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5" />
                  <span>Address Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="street">Street Address</Label>
                    <Input
                      id="street"
                      value={address.street}
                      onChange={(e) => setAddress(prev => ({ ...prev, street: e.target.value }))}
                      placeholder="Enter your street address"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="barangay">Barangay</Label>
                    <Input
                      id="barangay"
                      value={address.barangay}
                      onChange={(e) => setAddress(prev => ({ ...prev, barangay: e.target.value }))}
                      placeholder="Enter your barangay"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City/Municipality</Label>
                    <Input
                      id="city"
                      value={address.city}
                      onChange={(e) => setAddress(prev => ({ ...prev, city: e.target.value }))}
                      placeholder="Enter your city or municipality"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="province">Province</Label>
                    <Input
                      id="province"
                      value={address.province}
                      onChange={(e) => setAddress(prev => ({ ...prev, province: e.target.value }))}
                      placeholder="Enter your province"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zipCode">ZIP Code</Label>
                    <Input
                      id="zipCode"
                      value={address.zipCode}
                      onChange={(e) => setAddress(prev => ({ ...prev, zipCode: e.target.value }))}
                      placeholder="Enter your ZIP code"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Update Button */}
            <div className="flex justify-end pt-4">
              <Button
                onClick={handleUpdateProfile}
                disabled={updating}
                size="lg"
              >
                {updating ? "Updating..." : "Save Changes"}
              </Button>
            </div>
          </div>

          {/* Account Summary */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Mail className="h-5 w-5" />
                  <span>Account Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="w-16 h-16 bg-sage/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <User className="h-8 w-8 text-sage" />
                  </div>
                  <h3 className="font-semibold text-lg">
                    {fullName || user?.email?.split('@')[0] || 'User'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {userRole === 'admin' ? 'Administrator' : 'Customer'}
                  </p>
                </div>

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span>{user?.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Member since:</span>
                    <span>
                      {user?.created_at ? new Date(user.created_at).getFullYear() : 'N/A'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
    </main>
  );

  return userRole === 'admin' ? <AdminLayout>{content}</AdminLayout> : (
    <div className="min-h-screen bg-background">
      <Navigation />
      {content}
    </div>
  );
};

export default Profile;