import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Link } from "react-router-dom";

const SignIn = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="max-w-md mx-auto px-4 py-16">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome Back</CardTitle>
            <CardDescription>
              Sign in to your account to continue shopping
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="remember" className="rounded" />
                <Label htmlFor="remember" className="text-sm">Remember me</Label>
              </div>
              <Link to="#" className="text-sm text-primary hover:underline">
                Forgot password?
              </Link>
            </div>

            <Button className="w-full" size="lg">
              Sign In
            </Button>

            <div className="relative">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-muted-foreground text-sm">
                or
              </span>
            </div>

            <Button variant="outline" className="w-full">
              Continue with Google
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/signup" className="text-primary hover:underline">
                Sign up
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default SignIn;