'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useStore, User, Shop, Review, Bill } from '@/lib/store';
import { authAPI, shopsAPI, billsAPI, reviewsAPI, trustScoreAPI, alertsAPI, adminAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search,
  Upload,
  Star,
  TrendingUp,
  TrendingDown,
  Minus,
  Store,
  User as UserIcon,
  Shield,
  Bell,
  Settings,
  LogOut,
  ChevronRight,
  MessageSquare,
  BarChart3,
  Users,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  UploadCloud,
  Camera,
  Award,
  ThumbsUp,
  ThumbsDown,
  Filter,
  MapPin,
  Phone,
  Mail,
  Building,
  ShoppingBag,
  ArrowLeft,
  Loader2,
  Eye,
  Send,
  X,
  LogIn,
  Menu,
  Home,
  BadgeCheck,
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================
// MAIN APP COMPONENT
// ============================================

export default function TrustScoringPlatform() {
  const {
    user,
    token,
    isAuthenticated,
    setUser,
    setToken,
    logout,
  } = useStore();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'otp'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Check for existing session on mount
  useEffect(() => {
    if (token && !user) {
      authAPI.getMe(token)
        .then((data) => {
          if (data.success) {
            setUser(data.user);
          }
        })
        .catch(() => {
          logout();
        });
    }
  }, [token, user, setUser, logout]);

  const handleLogin = (userData: User, userToken: string) => {
    setUser(userData);
    setToken(userToken);
    setShowAuthModal(false);
  };

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-black text-white shadow-lg">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">TrustScore</h1>
                <p className="text-xs text-slate-500 hidden sm:block">Verified Reviews Platform</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isAuthenticated && user ? (
                <>
                  <Badge
                    variant={user.role === 'ADMIN' ? 'destructive' : user.role === 'SHOPKEEPER' ? 'default' : 'secondary'}
                    className="hidden sm:flex"
                  >
                    {user.role}
                  </Badge>
                  <div className="hidden md:flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-slate-200 text-slate-800">
                        {user?.name?.[0] || user?.email[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{user?.name || 'User'}</p>
                      <p className="text-xs text-slate-500">{user?.email}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLogout}
                    title="Logout"
                  >
                    <LogOut className="w-5 h-5" />
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => setShowAuthModal(true)}
                  className="bg-gradient-to-r from-slate-800 to-black hover:from-slate-700 hover:to-slate-900"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Login
                </Button>
              )}

              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <Menu className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Mobile user info */}
          {isAuthenticated && user && mobileMenuOpen && (
            <div className="md:hidden pt-3 pb-2 border-t mt-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-slate-200 text-slate-800">
                    {user?.name?.[0] || user?.email[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{user?.name || 'User'}</p>
                  <p className="text-sm text-slate-500">{user?.email}</p>
                  <Badge variant="secondary" className="mt-1">{user.role}</Badge>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6">
        {!isAuthenticated ? (
          <PublicDashboard onLoginRequired={() => setShowAuthModal(true)} />
        ) : user?.role === 'CUSTOMER' ? (
          <CustomerDashboard user={user} token={token!} />
        ) : user?.role === 'SHOPKEEPER' ? (
          <ShopkeeperDashboard user={user} token={token!} />
        ) : (
          <AdminDashboard user={user} token={token!} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-slate-500">
            <p>© 2024 TrustScore Platform - Verified Reviews System</p>
            <p className="flex items-center gap-1">
              <Shield className="w-4 h-4" /> AI-Powered Sentiment Analysis
            </p>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuth={handleLogin}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
        mode={authMode}
        setMode={setAuthMode}
      />
    </div>
  );
}

// ============================================
// AUTH MODAL COMPONENT
// ============================================

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onAuth: (user: User, token: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  mode: 'login' | 'register' | 'otp';
  setMode: (mode: 'login' | 'register' | 'otp') => void;
}

function AuthModal({ open, onClose, onAuth, isLoading, setIsLoading, mode, setMode }: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'CUSTOMER' | 'SHOPKEEPER'>('CUSTOMER');
  const [otp, setOtp] = useState('');
  const [shopDetails, setShopDetails] = useState({
    name: '',
    address: '',
    city: '',
    pincode: '',
    phone: '',
    registrationNo: '',
    category: 'OTHER',
  });

  const handleSendOTP = async () => {
    if (!email) {
      toast.error('Please enter your email');
      return;
    }
    setIsLoading(true);
    try {
      const res = await authAPI.sendOTP(email, phone, name);
      if (res.success) {
        toast.success('OTP sent to your email');
        setMode('otp');
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp) {
      toast.error('Please enter the OTP');
      return;
    }
    setIsLoading(true);
    try {
      const res = await authAPI.verifyOTP(email, otp);
      if (res.success) {
        onAuth(res.user, res.token);
        toast.success('Login successful!');
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Invalid OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email || !password || !name) {
      toast.error('Please fill all required fields');
      return;
    }
    setIsLoading(true);
    try {
      const res = await authAPI.register({
        email,
        password,
        name,
        role,
        phone,
        shopDetails: role === 'SHOPKEEPER' ? shopDetails : undefined,
      });
      if (res.success) {
        onAuth(res.user, res.token);
        toast.success('Registration successful!');
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }
    setIsLoading(true);
    try {
      const res = await authAPI.login(email, password);
      if (res.success) {
        onAuth(res.user, res.token);
        toast.success('Login successful!');
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setPhone('');
    setOtp('');
    setRole('CUSTOMER');
    setShopDetails({
      name: '',
      address: '',
      city: '',
      pincode: '',
      phone: '',
      registrationNo: '',
      category: 'OTHER',
    });
    setMode('login');
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) { resetForm(); onClose(); } }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-800 to-black text-white mx-auto mb-3">
            <Shield className="w-7 h-7" />
          </div>
          <DialogTitle className="text-center text-xl">Welcome to TrustScore</DialogTitle>
          <DialogDescription className="text-center">
            Sign in to submit reviews and manage your account
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode === 'otp' ? 'login' : mode} onValueChange={(v) => setMode(v as typeof mode)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-4">
            {mode === 'otp' ? (
              <>
                <Alert>
                  <Mail className="h-4 w-4" />
                  <AlertTitle>Check your email</AlertTitle>
                  <AlertDescription>
                    We&apos;ve sent a 6-digit OTP to {email}
                  </AlertDescription>
                </Alert>
                <div className="space-y-2">
                  <Label htmlFor="otp">Enter OTP</Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="000000"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="text-center text-2xl tracking-widest"
                  />
                </div>
                <Button
                  className="w-full bg-gradient-to-r from-slate-800 to-black"
                  onClick={handleVerifyOTP}
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Verify & Login
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => setMode('login')}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back to Login
                </Button>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button
                  className="w-full bg-gradient-to-r from-slate-800 to-black"
                  onClick={handleLogin}
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Login
                </Button>
                <div className="relative my-3">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white dark:bg-slate-950 px-2 text-muted-foreground">or</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Login with OTP</Label>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="Email for OTP"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <Button variant="outline" onClick={handleSendOTP} disabled={isLoading}>
                      Send OTP
                    </Button>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="register" className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  placeholder="+91..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-email">Email</Label>
              <Input
                id="reg-email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-password">Password</Label>
              <Input
                id="reg-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>I am a</Label>
              <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CUSTOMER">Customer</SelectItem>
                  <SelectItem value="SHOPKEEPER">Shopkeeper</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {role === 'SHOPKEEPER' && (
              <div className="space-y-3 p-3 border rounded-lg bg-slate-50 dark:bg-slate-800">
                <h4 className="font-medium flex items-center gap-2 text-sm">
                  <Store className="w-4 h-4" /> Shop Details
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Shop Name</Label>
                    <Input
                      placeholder="My Shop"
                      value={shopDetails.name}
                      onChange={(e) => setShopDetails({ ...shopDetails, name: e.target.value })}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Category</Label>
                    <Select
                      value={shopDetails.category}
                      onValueChange={(v) => setShopDetails({ ...shopDetails, category: v })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GROCERY">Grocery</SelectItem>
                        <SelectItem value="RESTAURANT">Restaurant</SelectItem>
                        <SelectItem value="PHARMACY">Pharmacy</SelectItem>
                        <SelectItem value="ELECTRONICS">Electronics</SelectItem>
                        <SelectItem value="CLOTHING">Clothing</SelectItem>
                        <SelectItem value="SERVICE">Service</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Address</Label>
                    <Input
                      placeholder="123 Main St"
                      value={shopDetails.address}
                      onChange={(e) => setShopDetails({ ...shopDetails, address: e.target.value })}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">City</Label>
                    <Input
                      placeholder="Mumbai"
                      value={shopDetails.city}
                      onChange={(e) => setShopDetails({ ...shopDetails, city: e.target.value })}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Pincode</Label>
                    <Input
                      placeholder="400001"
                      value={shopDetails.pincode}
                      onChange={(e) => setShopDetails({ ...shopDetails, pincode: e.target.value })}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Shop Phone</Label>
                    <Input
                      placeholder="+91..."
                      value={shopDetails.phone}
                      onChange={(e) => setShopDetails({ ...shopDetails, phone: e.target.value })}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Registration No.</Label>
                    <Input
                      placeholder="REG123456"
                      value={shopDetails.registrationNo}
                      onChange={(e) => setShopDetails({ ...shopDetails, registrationNo: e.target.value })}
                      className="h-9"
                    />
                  </div>
                </div>
              </div>
            )}

            <Button
              className="w-full bg-gradient-to-r from-slate-800 to-black"
              onClick={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Register
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// PUBLIC DASHBOARD (No Auth Required)
// ============================================

function PublicDashboard({ onLoginRequired }: { onLoginRequired: () => void }) {
  const [shops, setShops] = useState<Shop[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch shops
  useEffect(() => {
    const fetchShops = async () => {
      try {
        const res = await shopsAPI.getAll({
          search: searchQuery,
          category: categoryFilter === 'all' ? undefined : categoryFilter,
          limit: 50
        });
        if (res.success) {
          setShops(res.shops);
        }
      } catch (error) {
        console.error('Failed to fetch shops:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchShops();
  }, [searchQuery, categoryFilter]);

  const filteredShops = useMemo(() => {
    if (!searchQuery && categoryFilter === 'all') return shops;
    return shops.filter((shop) => {
      const matchesSearch = !searchQuery || 
        shop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shop.city.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || shop.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [shops, searchQuery, categoryFilter]);

  if (selectedShop) {
    return (
      <ShopDetailView
        shop={selectedShop}
        onBack={() => setSelectedShop(null)}
        onLoginRequired={onLoginRequired}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="text-center py-8 md:py-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-slate-800 to-black bg-clip-text text-transparent">
          Find Trusted Local Shops
        </h1>
        <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto text-sm md:text-base">
          Discover verified reviews and trust scores for local shops. Make informed decisions before you buy.
        </p>
      </div>

      {/* Search Section */}
      <Card className="border-0 shadow-lg bg-white dark:bg-slate-900">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Search shops by name or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 text-lg border-2 focus:border-slate-800"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-48 h-12 border-2">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="GROCERY">🛒 Grocery</SelectItem>
                <SelectItem value="RESTAURANT">🍽️ Restaurant</SelectItem>
                <SelectItem value="PHARMACY">💊 Pharmacy</SelectItem>
                <SelectItem value="ELECTRONICS">📱 Electronics</SelectItem>
                <SelectItem value="CLOTHING">👕 Clothing</SelectItem>
                <SelectItem value="SERVICE">🔧 Service</SelectItem>
                <SelectItem value="OTHER">📦 Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-md bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-800 text-white flex items-center justify-center">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{shops.length}</p>
                <p className="text-xs text-slate-500">Verified Shops</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500 text-white flex items-center justify-center">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{shops.reduce((acc, s) => acc + s.reviewCount, 0)}</p>
                <p className="text-xs text-slate-500">Reviews</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500 text-white flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">AI</p>
                <p className="text-xs text-slate-500">Sentiment Analysis</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500 text-white flex items-center justify-center">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">100%</p>
                <p className="text-xs text-slate-500">Verified Reviews</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shops Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-slate-700" />
        </div>
      ) : filteredShops.length === 0 ? (
        <div className="text-center py-20">
          <Store className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <h3 className="text-xl font-medium text-slate-600">No shops found</h3>
          <p className="text-slate-400">Try adjusting your search criteria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredShops.map((shop) => (
            <Card
              key={shop.id}
              className="cursor-pointer hover:shadow-xl transition-all duration-300 border-0 shadow-md hover:-translate-y-1"
              onClick={() => setSelectedShop(shop)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-bold text-lg shadow-md">
                      {shop.name[0]}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{shop.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {shop.city}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">{shop.category}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500 line-clamp-2 mb-3">{shop.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <TrustScoreGauge score={shop.trustScore} size="sm" />
                    <span className="text-sm text-slate-500">
                      {shop.reviewCount} review{shop.reviewCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* CTA Section */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-slate-800 to-black text-white">
        <CardContent className="pt-6 pb-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold mb-1">Are you a shop owner?</h3>
              <p className="text-white/80">Register your shop and start building trust with customers today!</p>
            </div>
            <Button
              variant="secondary"
              size="lg"
              onClick={onLoginRequired}
              className="bg-white text-slate-800 hover:bg-white/90"
            >
              Register Your Shop
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// CUSTOMER DASHBOARD (After Login)
// ============================================

interface PendingBill extends Bill {
  items?: { name: string; quantity: number; price: number }[];
}

function CustomerDashboard({ user, token }: { user: User; token: string }) {
  const [activeTab, setActiveTab] = useState('home');
  const [shops, setShops] = useState<Shop[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [userBills, setUserBills] = useState<Bill[]>([]);
  const [userReviews, setUserReviews] = useState<Review[]>([]);
  const [pendingBills, setPendingBills] = useState<PendingBill[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [editReviewText, setEditReviewText] = useState('');

  // Fetch shops
  useEffect(() => {
    const fetchShops = async () => {
      try {
        const res = await shopsAPI.getAll({ search: searchQuery, limit: 50 });
        if (res.success) {
          setShops(res.shops);
        }
      } catch (error) {
        console.error('Failed to fetch shops:', error);
      }
    };
    fetchShops();
  }, [searchQuery]);

  // Fetch user bills and reviews
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [billsRes, reviewsRes] = await Promise.all([
          billsAPI.getMy(token),
          reviewsAPI.getMy(token),
        ]);
        if (billsRes.success) {
          setUserBills(billsRes.bills);
          // Filter pending bills (bills generated by shopkeepers waiting for verification)
          setPendingBills(billsRes.bills.filter((b: PendingBill) => b.status === 'PENDING' && b.items && b.items.length > 0));
        }
        if (reviewsRes.success) setUserReviews(reviewsRes.reviews);
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      }
    };
    fetchData();
  }, [token]);

  const handleVerifyBill = async (billId: string, verified: boolean, editedItems?: { name: string; quantity: number; price: number }[]) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/bills/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ billId, verified, editedItems }),
      });
      const data = await res.json();
      if (data.success) {
        if (verified) {
          toast.success('Bill verified! You can now submit a review.');
          setActiveTab('upload');
        } else {
          toast.success('Bill rejected.');
        }
        setPendingBills((prev) => prev.filter((b) => b.id !== billId));
        // Refresh bills
        const billsRes = await billsAPI.getMy(token);
        if (billsRes.success) setUserBills(billsRes.bills);
      } else {
        toast.error(data.error || 'Failed to verify bill');
      }
    } catch {
      toast.error('Failed to verify bill');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditReview = async (reviewId: string) => {
    if (!editReviewText || editReviewText.trim().length < 10) {
      toast.error('Review must be at least 10 characters');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/reviews/${reviewId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reviewText: editReviewText }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Review updated successfully!');
        setEditingReview(null);
        setEditReviewText('');
        // Refresh reviews
        const reviewsRes = await reviewsAPI.getMy(token);
        if (reviewsRes.success) setUserReviews(reviewsRes.reviews);
      } else {
        toast.error(data.error || 'Failed to update review');
      }
    } catch {
      toast.error('Failed to update review');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete this review?')) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Review deleted successfully!');
        setUserReviews((prev) => prev.filter((r) => r.id !== reviewId));
      } else {
        toast.error(data.error || 'Failed to delete review');
      }
    } catch {
      toast.error('Failed to delete review');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredShops = useMemo(() => {
    if (!searchQuery) return shops;
    return shops.filter(
      (shop) =>
        shop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shop.city.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [shops, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Pending Bills Alert */}
      {pendingBills.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">
                    {pendingBills.length} pending bill{pendingBills.length > 1 ? 's' : ''} awaiting verification
                  </p>
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">
                    Verify bills from shopkeepers to submit reviews
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                onClick={() => setActiveTab('pending')}
              >
                View Bills
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="home" className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">Browse</span>
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">Pending</span>
            {pendingBills.length > 0 && (
              <Badge className="ml-1 bg-yellow-500 text-white text-xs">{pendingBills.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Upload Bill</span>
          </TabsTrigger>
          <TabsTrigger value="reviews" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">My Reviews</span>
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <UserIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
        </TabsList>

        {/* Browse Shops Tab */}
        <TabsContent value="home" className="mt-6">
          {selectedShop ? (
            <ShopDetailView
              shop={selectedShop}
              onBack={() => setSelectedShop(null)}
              isAuthenticated={true}
              token={token}
            />
          ) : (
            <div className="space-y-6">
              {/* Search */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    placeholder="Search shops by name or city..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 h-12 border-2"
                  />
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="border-dashed border-2 cursor-pointer hover:border-slate-800 hover:bg-slate-50/50 transition-colors" onClick={() => setActiveTab('upload')}>
                  <CardContent className="pt-6 pb-6 text-center">
                    <UploadCloud className="w-10 h-10 mx-auto text-slate-700 mb-2" />
                    <p className="font-medium">Upload Bill</p>
                    <p className="text-xs text-slate-500">Submit a review</p>
                  </CardContent>
                </Card>
                <Card className="border-dashed border-2 cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-colors" onClick={() => setActiveTab('reviews')}>
                  <CardContent className="pt-6 pb-6 text-center">
                    <MessageSquare className="w-10 h-10 mx-auto text-blue-500 mb-2" />
                    <p className="font-medium">My Reviews</p>
                    <p className="text-xs text-slate-500">{userReviews.length} submitted</p>
                  </CardContent>
                </Card>
              </div>

              {/* Shops Grid */}
              {filteredShops.length === 0 ? (
                <div className="text-center py-12">
                  <Store className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                  <h3 className="text-lg font-medium text-slate-600">No shops found</h3>
                  <p className="text-slate-400">Try adjusting your search</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredShops.map((shop) => (
                    <Card
                      key={shop.id}
                      className="cursor-pointer hover:shadow-lg transition-shadow border-0 shadow-md"
                      onClick={() => setSelectedShop(shop)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-bold">
                              {shop.name[0]}
                            </div>
                            <div>
                              <CardTitle className="text-lg">{shop.name}</CardTitle>
                              <CardDescription className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {shop.city}
                              </CardDescription>
                            </div>
                          </div>
                          <Badge variant="secondary">{shop.category}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <TrustScoreGauge score={shop.trustScore} size="sm" />
                            <span className="text-sm text-slate-500">{shop.reviewCount} reviews</span>
                          </div>
                          <ChevronRight className="w-5 h-5 text-slate-400" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Upload Bill Tab */}
        <TabsContent value="upload" className="mt-6">
          <BillUploadFlow
            token={token}
            shops={shops}
            onUploadSuccess={(bill) => {
              setUserBills((prev) => [bill, ...prev]);
              toast.success('Bill uploaded successfully!');
            }}
          />
        </TabsContent>

        {/* Pending Bills Tab */}
        <TabsContent value="pending" className="mt-6">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Pending Bills
              </CardTitle>
              <CardDescription>Bills from shopkeepers waiting for your verification</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingBills.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-medium text-slate-600">All caught up!</h3>
                  <p className="text-slate-400">No pending bills to verify</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingBills.map((bill) => (
                    <Card key={bill.id} className="border-yellow-200 bg-yellow-50/50">
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium">{bill.shop?.name || 'Unknown Shop'}</p>
                              <p className="text-xs text-slate-500">{bill.billNumber}</p>
                              <p className="text-xs text-slate-500">
                                {new Date(bill.billDate).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold">₹{bill.totalAmount.toFixed(2)}</p>
                              <Badge className="bg-yellow-100 text-yellow-700">Pending</Badge>
                            </div>
                          </div>

                          {/* Items List */}
                          {bill.items && bill.items.length > 0 && (
                            <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border">
                              <p className="text-sm font-medium mb-2">Items:</p>
                              <div className="space-y-1">
                                {bill.items.map((item, i) => (
                                  <div key={i} className="flex justify-between text-sm">
                                    <span>{item.name} x{item.quantity}</span>
                                    <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="flex gap-3">
                            <Button
                              variant="outline"
                              className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                              onClick={() => handleVerifyBill(bill.id, false)}
                              disabled={isLoading}
                            >
                              <XCircle className="w-4 h-4 mr-2" /> Reject
                            </Button>
                            <Button
                              className="flex-1 bg-gradient-to-r from-slate-800 to-black"
                              onClick={() => handleVerifyBill(bill.id, true)}
                              disabled={isLoading}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" /> Verify & Review
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* My Reviews Tab */}
        <TabsContent value="reviews" className="mt-6">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                My Reviews
              </CardTitle>
              <CardDescription>Your verified reviews and sentiment analysis</CardDescription>
            </CardHeader>
            <CardContent>
              {userReviews.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                  <h3 className="text-lg font-medium text-slate-600">No reviews yet</h3>
                  <p className="text-slate-400 mb-4">Upload a bill and submit your first review!</p>
                  <Button onClick={() => setActiveTab('upload')}>Upload Bill</Button>
                </div>
              ) : (
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-4">
                    {userReviews.map((review) => (
                      <div key={review.id} className="relative">
                        {editingReview?.id === review.id ? (
                          <Card className="border-slate-300">
                            <CardContent className="pt-6 space-y-4">
                              <Textarea
                                value={editReviewText}
                                onChange={(e) => setEditReviewText(e.target.value)}
                                rows={4}
                                placeholder="Edit your review..."
                              />
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  onClick={() => { setEditingReview(null); setEditReviewText(''); }}
                                  disabled={isLoading}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  className="bg-gradient-to-r from-slate-800 to-black"
                                  onClick={() => handleEditReview(review.id)}
                                  disabled={isLoading || editReviewText.trim().length < 10}
                                >
                                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                  Save Changes
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ) : (
                          <ReviewCard
                            review={review}
                            showShop
                            showActions
                            onEdit={() => {
                              setEditingReview(review);
                              setEditReviewText(review.reviewText);
                            }}
                            onDelete={() => handleDeleteReview(review.id)}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profile Tab */}
        <TabsContent value="profile" className="mt-6">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="w-5 h-5" />
                My Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarFallback className="bg-slate-200 text-slate-800 text-2xl">
                    {user?.name?.[0] || user?.email[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-2xl font-bold">{user?.name || 'Customer'}</h2>
                  <p className="text-slate-500">{user?.email}</p>
                  <p className="text-slate-500">{user?.phone || 'No phone'}</p>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-slate-50 dark:bg-slate-800 border-0">
                  <CardContent className="pt-6">
                    <div className="text-3xl font-bold text-slate-700">{userBills.length}</div>
                    <p className="text-sm text-slate-500">Bills Uploaded</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-50 dark:bg-slate-800 border-0">
                  <CardContent className="pt-6">
                    <div className="text-3xl font-bold text-slate-700">{userReviews.length}</div>
                    <p className="text-sm text-slate-500">Reviews Given</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================
// BILL UPLOAD FLOW COMPONENT
// ============================================

function BillUploadFlow({
  token,
  shops,
  onUploadSuccess,
}: {
  token: string;
  shops: Shop[];
  onUploadSuccess: (bill: Bill) => void;
}) {
  const [step, setStep] = useState<'upload' | 'verify' | 'review'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedBill, setUploadedBill] = useState<Bill | null>(null);
  const [ocrData, setOcrData] = useState<Record<string, unknown>>({});
  const [selectedShopId, setSelectedShopId] = useState<string>('');
  const [reviewText, setReviewText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a bill image');
      return;
    }
    setIsLoading(true);
    try {
      const res = await billsAPI.upload(selectedFile, selectedShopId || null, token);
      if (res.success) {
        setUploadedBill(res.bill);
        setOcrData(res.ocrData || {});
        setStep('verify');
        toast.success('Bill uploaded! Please verify the details.');
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload bill');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!uploadedBill || !selectedShopId) {
      toast.error('Please select a shop');
      return;
    }
    setIsLoading(true);
    try {
      const res = await billsAPI.verify(uploadedBill.id, selectedShopId, token);
      if (res.success && res.verified) {
        setStep('review');
        toast.success('Bill verified! You can now submit your review.');
      } else {
        toast.error(res.errors?.join(', ') || 'Verification failed');
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!uploadedBill || !reviewText.trim()) {
      toast.error('Please write your review');
      return;
    }
    if (reviewText.trim().length < 10) {
      toast.error('Review must be at least 10 characters');
      return;
    }
    setIsLoading(true);
    try {
      const res = await reviewsAPI.submit(uploadedBill.id, reviewText, token);
      if (res.success) {
        toast.success('Review submitted successfully!');
        onUploadSuccess(uploadedBill);
        setStep('upload');
        setSelectedFile(null);
        setPreviewUrl(null);
        setUploadedBill(null);
        setOcrData({});
        setSelectedShopId('');
        setReviewText('');
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit review');
    } finally {
      setIsLoading(false);
    }
  };

  const resetFlow = () => {
    setStep('upload');
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadedBill(null);
    setOcrData({});
    setSelectedShopId('');
    setReviewText('');
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-8">
        {['Upload', 'Verify', 'Review'].map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                step === s.toLowerCase()
                  ? 'border-slate-500 bg-slate-700 text-white'
                  : i < ['upload', 'verify', 'review'].indexOf(step)
                    ? 'border-slate-500 bg-slate-200 text-slate-800'
                    : 'border-slate-300 text-slate-400'
              }`}
            >
              {i < ['upload', 'verify', 'review'].indexOf(step) ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                i + 1
              )}
            </div>
            <span className={`ml-2 hidden sm:inline ${step === s.toLowerCase() ? 'font-medium' : 'text-slate-400'}`}>
              {s}
            </span>
            {i < 2 && (
              <div className={`w-12 sm:w-24 h-0.5 mx-2 ${i < ['upload', 'verify', 'review'].indexOf(step) ? 'bg-slate-700' : 'bg-slate-200'}`} />
            )}
          </div>
        ))}
      </div>

      <Card className="border-0 shadow-md">
        <CardContent className="pt-6">
          {step === 'upload' && (
            <div className="space-y-6">
              <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${selectedFile ? 'border-slate-500 bg-slate-100' : 'border-slate-300'}`}>
                {previewUrl ? (
                  <div className="space-y-4">
                    <img src={previewUrl} alt="Bill preview" className="max-h-64 mx-auto rounded-lg shadow-md" />
                    <p className="text-sm text-slate-500">{selectedFile?.name}</p>
                    <Button variant="outline" size="sm" onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}>
                      <X className="w-4 h-4 mr-2" /> Remove
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <UploadCloud className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                    <p className="text-lg font-medium">Drop your bill image here</p>
                    <p className="text-sm text-slate-500 mb-4">or click to browse</p>
                    <Input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                    <Button variant="outline">
                      <Camera className="w-4 h-4 mr-2" /> Select Image
                    </Button>
                  </label>
                )}
              </div>

              <div className="space-y-2">
                <Label>Select Shop (Optional - AI will try to detect)</Label>
                <Select value={selectedShopId} onValueChange={setSelectedShopId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Search and select shop..." />
                  </SelectTrigger>
                  <SelectContent>
                    {shops.map((shop) => (
                      <SelectItem key={shop.id} value={shop.id}>
                        {shop.name} - {shop.city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button className="w-full bg-gradient-to-r from-slate-800 to-black" onClick={handleUpload} disabled={!selectedFile || isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                Upload Bill
              </Button>
            </div>
          )}

          {step === 'verify' && (
            <div className="space-y-6">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Bill Uploaded!</AlertTitle>
                <AlertDescription>Please verify the extracted information and select the correct shop.</AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div>
                  <Label className="text-xs text-slate-500">Bill Number</Label>
                  <p className="font-medium">{uploadedBill?.billNumber || 'Not detected'}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Date</Label>
                  <p className="font-medium">{uploadedBill?.billDate ? new Date(uploadedBill.billDate).toLocaleDateString() : 'Not detected'}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Total Amount</Label>
                  <p className="font-medium">₹{uploadedBill?.totalAmount || '0'}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Detected Shop</Label>
                  <p className="font-medium">{(ocrData.shopName as string) || 'Not detected'}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Confirm Shop *</Label>
                <Select value={selectedShopId} onValueChange={setSelectedShopId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select the correct shop" />
                  </SelectTrigger>
                  <SelectContent>
                    {shops.map((shop) => (
                      <SelectItem key={shop.id} value={shop.id}>
                        {shop.name} - {shop.city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={resetFlow} className="flex-1">Cancel</Button>
                <Button className="flex-1 bg-gradient-to-r from-slate-800 to-black" onClick={handleVerify} disabled={!selectedShopId || isLoading}>
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Verify Bill
                </Button>
              </div>
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-6">
              <Alert className="border-slate-300 bg-slate-100">
                <CheckCircle className="h-4 w-4 text-slate-700" />
                <AlertTitle className="text-slate-800">Bill Verified!</AlertTitle>
                <AlertDescription className="text-slate-600">You can now submit your review. Our AI will analyze the sentiment.</AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label>Your Review *</Label>
                <Textarea
                  placeholder="Share your experience with this shop. Mention quality, price, service, behavior..."
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  rows={5}
                  className="resize-none"
                />
                <p className="text-xs text-slate-500">{reviewText.length} characters (minimum 10)</p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4" /> What happens next?
                </h4>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li>• AI will analyze your review sentiment</li>
                  <li>• Aspects like price, quality, service will be scored</li>
                  <li>• Shop&apos;s trust score will be updated</li>
                  <li>• Your review helps other customers!</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={resetFlow} className="flex-1">Cancel</Button>
                <Button className="flex-1 bg-gradient-to-r from-slate-800 to-black" onClick={handleSubmitReview} disabled={reviewText.trim().length < 10 || isLoading}>
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                  Submit Review
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// SHOPKEEPER DASHBOARD
// ============================================

interface BillItem {
  name: string;
  quantity: number;
  price: number;
}

interface GeneratedBill {
  id: string;
  billNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  items: BillItem[];
  totalAmount: number;
  billDate: Date;
  status: string;
  isExistingCustomer: boolean;
}

function ShopkeeperDashboard({ token }: { user: User; token: string }) {
  const [shop, setShop] = useState<Shop | null>(null);
  const [trustScoreData, setTrustScoreData] = useState<{
    score: number;
    totalReviews: number;
    positiveCount: number;
    neutralCount: number;
    negativeCount: number;
    trend: string;
  } | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [complaints, setComplaints] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Bill generation state
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [billItems, setBillItems] = useState<BillItem[]>([{ name: '', quantity: 1, price: 0 }]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedBills, setGeneratedBills] = useState<GeneratedBill[]>([]);
  const [customerHistory, setCustomerHistory] = useState<{
    customer: { name: string; phone: string; isRegular: boolean };
    stats: { totalPurchases: number; totalSpent: number; reviewsGiven: number };
  } | null>(null);
  const [showBillPreview, setShowBillPreview] = useState(false);
  const [lastGeneratedBill, setLastGeneratedBill] = useState<GeneratedBill | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const shopRes = await shopsAPI.getMy(token);
        if (shopRes.success) {
          setShop(shopRes.shop);
          setTrustScoreData({
            score: shopRes.shop.trustScore,
            totalReviews: shopRes.shop.trustScoreData?.totalReviews || 0,
            positiveCount: shopRes.shop.trustScoreData?.positiveCount || 0,
            neutralCount: shopRes.shop.trustScoreData?.neutralCount || 0,
            negativeCount: shopRes.shop.trustScoreData?.negativeCount || 0,
            trend: shopRes.shop.trustScoreData?.trend || 'stable',
          });

          const reviewsRes = await reviewsAPI.getShopReviews(shopRes.shop.id, { limit: 50 });
          if (reviewsRes.success) {
            setReviews(reviewsRes.reviews);
            setComplaints(reviewsRes.reviews.filter((r: Review) => r.isComplaint && r.complaintStatus === 'pending'));
          }
        }

        // Fetch generated bills
        const billsRes = await fetch('/api/bills/generate', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const billsData = await billsRes.json();
        if (billsData.success) {
          setGeneratedBills(billsData.bills);
        }
      } catch (error) {
        console.error('Failed to fetch shop data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [token]);

  // Lookup customer history when phone is entered
  const lookupCustomerHistory = async (phone: string) => {
    if (phone.length < 10) {
      setCustomerHistory(null);
      return;
    }
    try {
      const res = await fetch(`/api/customers/history?phone=${phone}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.stats.totalPurchases > 0) {
        setCustomerHistory({
          customer: data.customer,
          stats: data.stats,
        });
        if (data.customer.name && !customerName) {
          setCustomerName(data.customer.name);
        }
      } else {
        setCustomerHistory(null);
      }
    } catch {
      setCustomerHistory(null);
    }
  };

  const addItem = () => {
    setBillItems([...billItems, { name: '', quantity: 1, price: 0 }]);
  };

  const removeItem = (index: number) => {
    if (billItems.length > 1) {
      setBillItems(billItems.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof BillItem, value: string | number) => {
    const updated = [...billItems];
    updated[index] = { ...updated[index], [field]: value };
    setBillItems(updated);
  };

  const calculateTotal = () => {
    return billItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
  };

  const handleGenerateBill = async () => {
    if (!customerName && !customerPhone && !customerEmail) {
      toast.error('Please enter customer name, phone, or email');
      return;
    }
    if (billItems.some((item) => !item.name || item.price <= 0)) {
      toast.error('Please fill all item details');
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch('/api/bills/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customerName,
          customerPhone,
          customerEmail,
          items: billItems,
          totalAmount: calculateTotal(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Bill generated successfully!');
        setLastGeneratedBill(data.bill);
        setShowBillPreview(true);
        setGeneratedBills([data.bill, ...generatedBills]);
        // Reset form
        setCustomerName('');
        setCustomerPhone('');
        setCustomerEmail('');
        setBillItems([{ name: '', quantity: 1, price: 0 }]);
        setCustomerHistory(null);
      } else {
        toast.error(data.error || 'Failed to generate bill');
      }
    } catch {
      toast.error('Failed to generate bill');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRespondToComplaint = async (reviewId: string, response: string) => {
    try {
      const res = await reviewsAPI.respond(reviewId, response, token);
      if (res.success) {
        toast.success('Response submitted!');
        setComplaints((prev) => prev.filter((c) => c.id !== reviewId));
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit response');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-700" />
      </div>
    );
  }

  if (!shop) {
    return (
      <Card className="max-w-lg mx-auto border-0 shadow-md">
        <CardContent className="pt-6 text-center">
          <Store className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <h2 className="text-xl font-bold mb-2">No Shop Registered</h2>
          <p className="text-slate-500 mb-4">You haven&apos;t registered a shop yet. Contact admin to set up your shop.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Shop Header */}
      <Card className="border-0 shadow-md bg-gradient-to-r from-slate-800 to-black text-white">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-bold">
                {shop.name[0]}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{shop.name}</h1>
                <p className="text-white/80 flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> {shop.address}, {shop.city}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <TrustScoreGauge score={trustScoreData?.score || 50} size="lg" showLabel />
              {trustScoreData?.trend === 'up' && (
                <Badge className="bg-slate-700 text-white"><TrendingUp className="w-3 h-3 mr-1" /> Improving</Badge>
              )}
              {trustScoreData?.trend === 'down' && (
                <Badge className="bg-red-400 text-red-900"><TrendingDown className="w-3 h-3 mr-1" /> Declining</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="bills">Generate Bill</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="complaints">
            Complaints
            {complaints.length > 0 && <Badge className="ml-2 bg-red-500">{complaints.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-0 shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                    <ThumbsUp className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{trustScoreData?.positiveCount || 0}</p>
                    <p className="text-sm text-slate-500">Positive</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-yellow-100 text-yellow-600 flex items-center justify-center">
                    <Minus className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{trustScoreData?.neutralCount || 0}</p>
                    <p className="text-sm text-slate-500">Neutral</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                    <ThumbsDown className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{trustScoreData?.negativeCount || 0}</p>
                    <p className="text-sm text-slate-500">Negative</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{trustScoreData?.totalReviews || 0}</p>
                    <p className="text-sm text-slate-500">Total Reviews</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-md">
            <CardHeader><CardTitle>Recent Reviews</CardTitle></CardHeader>
            <CardContent>
              {reviews.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No reviews yet</p>
              ) : (
                <div className="space-y-4">
                  {reviews.slice(0, 5).map((review) => (
                    <ReviewCard key={review.id} review={review} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Generate Bill Tab */}
        <TabsContent value="bills" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bill Generation Form */}
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Generate New Bill
                </CardTitle>
                <CardDescription>Create a bill for your customer</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Customer Info */}
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-slate-500">Customer Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Customer Name</Label>
                      <Input
                        placeholder="John Doe"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone Number</Label>
                      <Input
                        placeholder="+91..."
                        value={customerPhone}
                        onChange={(e) => {
                          setCustomerPhone(e.target.value);
                          lookupCustomerHistory(e.target.value);
                        }}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Email (Optional)</Label>
                    <Input
                      placeholder="customer@email.com"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                    />
                  </div>

                  {/* Customer History */}
                  {customerHistory && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border">
                      <div className="flex items-center gap-2 mb-2">
                        <Award className="w-4 h-4 text-slate-600" />
                        <span className="font-medium text-sm">
                          {customerHistory.customer.isRegular ? 'Regular Customer!' : 'Returning Customer'}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-slate-500">Purchases:</span>
                          <span className="ml-1 font-medium">{customerHistory.stats.totalPurchases}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Total Spent:</span>
                          <span className="ml-1 font-medium">₹{customerHistory.stats.totalSpent.toFixed(0)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Reviews:</span>
                          <span className="ml-1 font-medium">{customerHistory.stats.reviewsGiven}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Items */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm text-slate-500">Items</h4>
                    <Button variant="outline" size="sm" onClick={addItem}>
                      + Add Item
                    </Button>
                  </div>
                  
                  {billItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-5 space-y-1">
                        <Label className="text-xs">Item Name</Label>
                        <Input
                          placeholder="Product name"
                          value={item.name}
                          onChange={(e) => updateItem(index, 'name', e.target.value)}
                        />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs">Qty</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div className="col-span-3 space-y-1">
                        <Label className="text-xs">Price (₹)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={item.price || ''}
                          onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-2">
                        {billItems.length > 1 && (
                          <Button variant="ghost" size="icon" onClick={() => removeItem(index)}>
                            <X className="w-4 h-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Total */}
                  <div className="flex justify-between items-center pt-4 border-t">
                    <span className="font-medium">Total Amount:</span>
                    <span className="text-2xl font-bold">₹{calculateTotal().toFixed(2)}</span>
                  </div>
                </div>

                <Button
                  className="w-full bg-gradient-to-r from-slate-800 to-black"
                  onClick={handleGenerateBill}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <FileText className="w-4 h-4 mr-2" />
                  )}
                  Generate Bill
                </Button>
              </CardContent>
            </Card>

            {/* Recent Bills */}
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle>Recent Bills</CardTitle>
                <CardDescription>Bills waiting for customer verification</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px] pr-4">
                  {generatedBills.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No bills generated yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {generatedBills.map((bill) => (
                        <div
                          key={bill.id}
                          className={`p-4 rounded-lg border ${
                            bill.status === 'PENDING' ? 'bg-yellow-50 border-yellow-200' :
                            bill.status === 'VERIFIED' ? 'bg-green-50 border-green-200' :
                            bill.status === 'REJECTED' ? 'bg-red-50 border-red-200' :
                            'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium">{bill.customerName || 'Walk-in Customer'}</p>
                              <p className="text-xs text-slate-500">{bill.billNumber}</p>
                            </div>
                            <Badge className={
                              bill.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                              bill.status === 'VERIFIED' ? 'bg-green-100 text-green-700' :
                              bill.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                              'bg-slate-100 text-slate-700'
                            }>
                              {bill.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600">{bill.items?.length || 0} items • ₹{bill.totalAmount.toFixed(2)}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            {new Date(bill.billDate).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews" className="mt-6">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>All Reviews</CardTitle>
              <CardDescription>View all customer reviews with AI sentiment analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <ReviewCard key={review.id} review={review} showActions />
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Complaints Tab */}
        <TabsContent value="complaints" className="mt-6">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Pending Complaints
              </CardTitle>
              <CardDescription>Address customer complaints to improve your trust score</CardDescription>
            </CardHeader>
            <CardContent>
              {complaints.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-medium">All caught up!</h3>
                  <p className="text-slate-500">No pending complaints</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {complaints.map((complaint) => (
                    <ComplaintCard key={complaint.id} complaint={complaint} onRespond={handleRespondToComplaint} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-0 shadow-md">
              <CardHeader><CardTitle>Sentiment Distribution</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['positive', 'neutral', 'negative'].map((label) => {
                    const count = label === 'positive' ? trustScoreData?.positiveCount : label === 'neutral' ? trustScoreData?.neutralCount : trustScoreData?.negativeCount;
                    return (
                      <div key={label} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="capitalize">{label}</span>
                          <span>{count || 0}</span>
                        </div>
                        <Progress
                          value={trustScoreData?.totalReviews ? ((count || 0) / trustScoreData.totalReviews) * 100 : 0}
                          className={`h-3 bg-slate-100 ${label === 'positive' ? '[&>div]:bg-green-500' : label === 'negative' ? '[&>div]:bg-red-500' : '[&>div]:bg-yellow-500'}`}
                        />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardHeader><CardTitle>Trust Score</CardTitle></CardHeader>
              <CardContent className="flex items-center justify-center">
                <TrustScoreGauge score={trustScoreData?.score || 50} size="xl" showLabel />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Bill Preview Dialog */}
      <Dialog open={showBillPreview} onOpenChange={setShowBillPreview}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Bill Generated!
            </DialogTitle>
            <DialogDescription>Share this bill with your customer</DialogDescription>
          </DialogHeader>
          {lastGeneratedBill && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border">
                <div className="text-center mb-4">
                  <p className="font-bold text-lg">{shop.name}</p>
                  <p className="text-xs text-slate-500">{shop.address}, {shop.city}</p>
                </div>
                <Separator className="my-2" />
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Bill No:</span>
                    <span className="font-mono">{lastGeneratedBill.billNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Date:</span>
                    <span>{new Date(lastGeneratedBill.billDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Customer:</span>
                    <span>{lastGeneratedBill.customerName}</span>
                  </div>
                </div>
                <Separator className="my-2" />
                <div className="space-y-1">
                  {lastGeneratedBill.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span>{item.name} x{item.quantity}</span>
                      <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-bold">
                  <span>Total:</span>
                  <span>₹{lastGeneratedBill.totalAmount.toFixed(2)}</span>
                </div>
              </div>
              <p className="text-xs text-center text-slate-500">
                Customer can verify this bill in the TrustScore app using their phone number
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================
// ADMIN DASHBOARD
// ============================================

function AdminDashboard({ token }: { user: User; token: string }) {
  const [stats, setStats] = useState<{
    totalUsers: number;
    totalShops: number;
    totalBills: number;
    totalReviews: number;
    pendingVerifications: number;
    pendingComplaints: number;
    avgTrustScore: number;
    sentimentDistribution: Record<string, number>;
    userRoleDistribution: Record<string, number>;
    topShops: Array<{ id: string; name: string; city: string; trustScore: number; reviewCount: number }>;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await adminAPI.getStats(token);
        if (res.success) setStats(res.stats);
      } catch (error) {
        console.error('Failed to fetch admin stats:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, [token]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-700" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white">
          <Shield className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-slate-500">Platform overview and management</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Users, label: 'Total Users', value: stats?.totalUsers || 0, color: 'blue' },
          { icon: Store, label: 'Total Shops', value: stats?.totalShops || 0, color: 'slate' },
          { icon: FileText, label: 'Total Reviews', value: stats?.totalReviews || 0, color: 'purple' },
          { icon: ShoppingBag, label: 'Bills Processed', value: stats?.totalBills || 0, color: 'orange' },
        ].map((item) => (
          <Card key={item.label} className="border-0 shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl bg-${item.color}-100 text-${item.color}-600 flex items-center justify-center`}>
                  <item.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{item.value}</p>
                  <p className="text-sm text-slate-500">{item.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-amber-600" />
              <div>
                <p className="text-2xl font-bold text-amber-700">{stats?.pendingVerifications || 0}</p>
                <p className="text-sm text-amber-600">Pending Verifications</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-red-600" />
              <div>
                <p className="text-2xl font-bold text-red-700">{stats?.pendingComplaints || 0}</p>
                <p className="text-sm text-red-600">Pending Complaints</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-500 bg-slate-100">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Award className="w-8 h-8 text-slate-700" />
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats?.avgTrustScore.toFixed(1) || '50.0'}</p>
                <p className="text-sm text-slate-700">Avg Trust Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            Top Performing Shops
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Rank</th>
                  <th className="text-left py-3 px-4">Shop Name</th>
                  <th className="text-left py-3 px-4">City</th>
                  <th className="text-left py-3 px-4">Trust Score</th>
                  <th className="text-left py-3 px-4">Reviews</th>
                </tr>
              </thead>
              <tbody>
                {stats?.topShops.map((shop, i) => (
                  <tr key={shop.id} className="border-b">
                    <td className="py-3 px-4">
                      <Badge className={i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-amber-600' : ''}>
                        #{i + 1}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-medium">{shop.name}</td>
                    <td className="py-3 px-4">{shop.city}</td>
                    <td className="py-3 px-4"><TrustScoreGauge score={shop.trustScore} size="sm" /></td>
                    <td className="py-3 px-4">{shop.reviewCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// HELPER COMPONENTS
// ============================================

function TrustScoreGauge({ score, size = 'md', showLabel = false }: { score: number; size?: 'sm' | 'md' | 'lg' | 'xl'; showLabel?: boolean }) {
  const sizeClasses = { sm: 'w-12 h-12 text-xs', md: 'w-16 h-16 text-sm', lg: 'w-24 h-24 text-lg', xl: 'w-40 h-40 text-2xl' };
  const getScoreColor = (s: number) => s >= 70 ? 'text-green-500' : s >= 40 ? 'text-yellow-500' : 'text-red-500';
  const getBgColor = (s: number) => s >= 70 ? 'from-green-100 to-green-200' : s >= 40 ? 'from-yellow-100 to-yellow-200' : 'from-red-100 to-red-200';

  return (
    <div className={`relative rounded-full bg-gradient-to-br ${getBgColor(score)} flex items-center justify-center ${sizeClasses[size]}`}>
      <span className={`font-bold ${getScoreColor(score)}`}>{Math.round(score)}</span>
      {showLabel && <span className="absolute -bottom-5 text-xs text-slate-500">Trust Score</span>}
    </div>
  );
}

function ReviewCard({ 
  review, 
  showShop = false, 
  showActions = false,
  onEdit,
  onDelete 
}: { 
  review: Review & { 
    shop?: { id: string; name: string }; 
    customer?: { name: string; isVerified?: boolean; purchaseCount?: number };
    isVerifiedPurchase?: boolean;
  }; 
  showShop?: boolean;
  showActions?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const getSentimentIcon = (label: string) => {
    switch (label) {
      case 'POSITIVE': return <ThumbsUp className="w-4 h-4 text-green-500" />;
      case 'NEGATIVE': return <ThumbsDown className="w-4 h-4 text-red-500" />;
      default: return <Minus className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getSentimentBadge = (label: string) => {
    switch (label) {
      case 'POSITIVE': return 'bg-green-100 text-green-700';
      case 'NEGATIVE': return 'bg-red-100 text-red-700';
      default: return 'bg-yellow-100 text-yellow-700';
    }
  };

  const customerName = review.customer?.name || 'Anonymous';
  const customerInitial = customerName.charAt(0).toUpperCase();
  const isVerifiedCustomer = review.customer?.isVerified || false;
  const purchaseCount = review.customer?.purchaseCount || 0;
  const isVerifiedPurchase = review.isVerifiedPurchase ?? true;

  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">{customerInitial}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm">{customerName}</p>
              {isVerifiedCustomer && (
                <Badge className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.5 flex items-center gap-1 border border-blue-200">
                  <BadgeCheck className="w-3 h-3" />
                  Verified Customer
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>{new Date(review.createdAt).toLocaleDateString()}</span>
              {isVerifiedPurchase && (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="w-3 h-3" /> Verified Purchase
                </span>
              )}
              {purchaseCount > 0 && (
                <span className="text-slate-400">• {purchaseCount} purchases</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getSentimentBadge(review.sentimentLabel)}>
            {getSentimentIcon(review.sentimentLabel)}
            <span className="ml-1">{review.sentimentLabel.toLowerCase()}</span>
          </Badge>
          <span className="text-xs text-slate-500">{review.sentimentScore.toFixed(2)}</span>
        </div>
      </div>
      {showShop && review.shop && (
        <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
          <Store className="w-3 h-3" /> {review.shop.name}
        </p>
      )}
      <p className="text-sm text-slate-700 dark:text-slate-300">{review.reviewText}</p>
      {review.aspects && Object.keys(review.aspects).length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {Object.entries(review.aspects).map(([aspect, score]) => (
            <Badge key={aspect} variant="outline" className="text-xs">
              {aspect}: {(score as number).toFixed(2)}
            </Badge>
          ))}
        </div>
      )}
      {review.isComplaint && (
        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200">
          <p className="text-xs font-medium text-red-700 dark:text-red-400">⚠️ Complaint</p>
        </div>
      )}
      {review.complaintResponse && (
        <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200">
          <p className="text-xs font-medium text-green-700 dark:text-green-400">Shop Response:</p>
          <p className="text-sm text-green-600 dark:text-green-300">{review.complaintResponse}</p>
        </div>
      )}
      {showActions && (onEdit || onDelete) && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
          {onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              Edit
            </Button>
          )}
          {onDelete && (
            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={onDelete}>
              Delete
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function ComplaintCard({ complaint, onRespond }: { complaint: Review & { customer?: { name: string } }; onRespond: (reviewId: string, response: string) => void }) {
  const [response, setResponse] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const customerName = complaint.customer?.name || 'Anonymous';
  const customerInitial = customerName.charAt(0).toUpperCase();

  return (
    <Card className="border-red-200 bg-red-50">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{customerInitial}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{customerName}</p>
                <p className="text-xs text-slate-500">{new Date(complaint.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
            <Badge className="bg-red-100 text-red-700">Score: {complaint.sentimentScore.toFixed(2)}</Badge>
          </div>
          <p className="text-slate-700">{complaint.reviewText}</p>

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                <Send className="w-4 h-4 mr-2" /> Respond to Complaint
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Respond to Complaint</DialogTitle>
                <DialogDescription>Address this customer&apos;s concerns to improve your trust score.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-sm text-slate-600">{complaint.reviewText}</p>
                </div>
                <Textarea placeholder="Write your response..." value={response} onChange={(e) => setResponse(e.target.value)} rows={4} />
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1">Cancel</Button>
                  <Button
                    className="flex-1 bg-gradient-to-r from-slate-800 to-black"
                    onClick={() => { onRespond(complaint.id, response); setIsOpen(false); setResponse(''); }}
                    disabled={response.trim().length < 10}
                  >
                    Submit Response
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}

function ShopDetailView({ shop, onBack, isAuthenticated, token, onLoginRequired }: {
  shop: Shop;
  onBack: () => void;
  isAuthenticated?: boolean;
  token?: string;
  onLoginRequired?: () => void;
}) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [trustScoreInfo, setTrustScoreInfo] = useState<{
    score: number;
    sentimentBreakdown: Record<string, number>;
    aspectAnalysis: Record<string, number>;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sentimentFilter, setSentimentFilter] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [reviewsRes, trustRes] = await Promise.all([
          reviewsAPI.getShopReviews(shop.id, { sentiment: sentimentFilter === 'all' ? undefined : sentimentFilter, limit: 20 }),
          trustScoreAPI.get(shop.id),
        ]);
        if (reviewsRes.success) setReviews(reviewsRes.reviews);
        if (trustRes.success) {
          setTrustScoreInfo({
            score: trustRes.trustScore.score,
            sentimentBreakdown: trustRes.sentimentBreakdown,
            aspectAnalysis: trustRes.aspectAnalysis,
          });
        }
      } catch (error) {
        console.error('Failed to fetch shop details:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [shop.id, sentimentFilter]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-700" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Shops
      </Button>

      {/* Shop Header */}
      <Card className="border-0 shadow-md">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white text-3xl font-bold">
              {shop.name[0]}
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold">{shop.name}</h1>
                  <p className="text-slate-500">{shop.description}</p>
                </div>
                <Badge>{shop.category}</Badge>
              </div>
              <div className="flex flex-wrap gap-4 mt-4 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" /> {shop.address}, {shop.city}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="w-4 h-4" /> {shop.phone}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-center">
              <TrustScoreGauge score={shop.trustScore} size="lg" showLabel />
              <p className="mt-2 text-sm text-slate-500">{shop.reviewCount} reviews</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Write Review CTA (if not authenticated) */}
      {!isAuthenticated && onLoginRequired && (
        <Card className="border-0 shadow-md bg-gradient-to-r from-slate-800 to-black text-white">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold">Had an experience with this shop?</h3>
                <p className="text-white/80">Login to upload your bill and share your review!</p>
              </div>
              <Button variant="secondary" onClick={onLoginRequired} className="bg-white text-slate-700 hover:bg-white/90">
                <LogIn className="w-4 h-4 mr-2" /> Login to Review
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Row */}
      {trustScoreInfo && (
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(trustScoreInfo.sentimentBreakdown).map(([label, count]) => (
            <Card key={label} className="border-0 shadow-md">
              <CardContent className="pt-6 text-center">
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-sm text-slate-500 capitalize">{label.toLowerCase()}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Reviews */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle>Customer Reviews</CardTitle>
            <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by sentiment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reviews</SelectItem>
                <SelectItem value="POSITIVE">Positive</SelectItem>
                <SelectItem value="NEUTRAL">Neutral</SelectItem>
                <SelectItem value="NEGATIVE">Negative</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {reviews.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">No reviews yet</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {reviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
