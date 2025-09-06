import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SignupPage() {
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
            <Link href="/login" className="border border-border px-3 py-1 rounded-md text-sm hover:bg-secondary">
              Login
            </Link>
            <Link href="/signup" className="bg-primary text-primary-foreground px-3 py-1 rounded-md text-sm">
              Sign Up
            </Link>
          </nav>
        </div>

        {/* Signup Card */}
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
            <CardDescription>
              <Link href="/login" className="text-primary hover:underline">
                log in instead
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" type="text" placeholder="Enter your first name" className="h-12" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" type="text" placeholder="Enter your last name" className="h-12" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="Enter your email" className="h-12" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="Create a password" className="h-12" />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="terms" />
              <Label htmlFor="terms" className="text-sm text-muted-foreground">
                By creating an account, I agree to the{" "}
                <Link href="/terms" className="text-primary hover:underline">
                  Terms of use
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
              </Label>
            </div>

            <Button className="w-full h-12 text-base font-medium">Create an account</Button>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-12 grid grid-cols-3 gap-8 text-sm text-muted-foreground">
          <div>
            <div className="border border-border rounded-lg h-20 mb-4 bg-card"></div>
            <p className="text-xs">Company's Banner</p>
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
            <p className="text-xs mt-2">Connect with us</p>
          </div>
        </div>
      </div>
    </div>
  )
}
