import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header Navigation */}
        <div className="flex items-center justify-between mb-8">
          <div className="text-xl font-bold text-primary">SynergySphere</div>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/" className="text-muted-foreground hover:text-foreground">
              Home
            </Link>
            <Link href="/solutions" className="text-muted-foreground hover:text-foreground">
              Solutions
            </Link>
            <Link href="/work" className="text-muted-foreground hover:text-foreground">
              Work
            </Link>
            <Link href="/about" className="text-muted-foreground hover:text-foreground">
              About
            </Link>
            <Link href="/login" className="bg-primary text-primary-foreground px-3 py-1 rounded-md text-sm">
              Login
            </Link>
            <Link href="/signup" className="border border-border px-3 py-1 rounded-md text-sm hover:bg-secondary">
              Sign Up
            </Link>
          </nav>
        </div>

        {/* Login Card */}
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Login into account</CardTitle>
            <CardDescription>
              <Link href="/signup" className="text-primary hover:underline">
                Signup instead
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="Enter your email" className="h-12" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="Enter your password" className="h-12" />
            </div>

            <div className="text-right">
              <Link href="/forgot-password" className="text-sm text-accent hover:underline">
                Forgot password?
              </Link>
            </div>

            <Button className="w-full h-12 text-base font-medium">Login</Button>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-12 grid grid-cols-3 gap-8 text-sm text-muted-foreground">
          <div>
            <div className="border border-border rounded-lg h-20 mb-4"></div>
            <div className="space-y-1">
              <div className="h-2 bg-muted rounded"></div>
              <div className="h-2 bg-muted rounded w-3/4"></div>
              <div className="h-2 bg-muted rounded w-1/2"></div>
            </div>
          </div>
          <div>
            <h4 className="font-medium mb-2">Quick Links</h4>
            <div className="space-y-1">
              <div className="h-2 bg-muted rounded w-2/3"></div>
              <div className="h-2 bg-muted rounded w-3/4"></div>
              <div className="h-2 bg-muted rounded w-1/2"></div>
              <div className="h-2 bg-muted rounded w-5/6"></div>
            </div>
          </div>
          <div>
            <h4 className="font-medium mb-2">Company</h4>
            <div className="space-y-1">
              <div className="h-2 bg-muted rounded w-3/4"></div>
              <div className="h-2 bg-muted rounded w-1/2"></div>
              <div className="h-2 bg-muted rounded w-2/3"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
