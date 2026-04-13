'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useStore, User, Shop, Review, Bill } from '@/lib/store';
import { authAPI, shopsAPI, billsAPI, reviewsAPI, trustScoreAPI, alertsAPI, adminAPI, reportsAPI } from '@/lib/api';
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
import { ShopDiscoveryMap } from '@/components/shop-discovery-map';
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
  Download,
  Navigation,
  LocateFixed,
  Route,
} from 'lucide-react';
import { toast } from 'sonner';

const CITY_NAME_ALIASES: Record<string, string> = {
  bangalore: 'bengaluru',
};

function normalizeCityName(value?: string | null) {
  if (!value) return '';
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/\bdistrict\b/g, '')
    .replace(/\bcity\b/g, '')
    .replace(/\bmetro(?:politan)?\b/g, '')
    .replace(/\bmunicipal(?:ity| corporation)?\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return CITY_NAME_ALIASES[normalized] || normalized;
}

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
  const [otpPurpose, setOtpPurpose] = useState<'login' | 'register'>('login');
  const [authMessage, setAuthMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [verifiedRegisterEmail, setVerifiedRegisterEmail] = useState<string | null>(null);
  const [shopDetails, setShopDetails] = useState({
    name: '',
    description: '',
    address: '',
    city: '',
    pincode: '',
    phone: '',
    registrationNo: '',
    category: 'OTHER',
  });
  const isRegisterOtpVerified = !!email && verifiedRegisterEmail === email;
  const showRegisterOtpInput =
    otpPurpose === 'register' && !isRegisterOtpVerified;

  const handleSendOTP = async (purpose: 'login' | 'register' = 'login') => {
    if (!email) {
      setAuthMessage({ type: 'error', text: 'Please enter your email first.' });
      toast.error('Please enter your email');
      return;
    }
    setIsLoading(true);
    setAuthMessage(null);
    try {
      setOtpPurpose(purpose);
      const res = await authAPI.sendOTP(email, phone, name);
      if (res.success) {
        setAuthMessage({ type: 'success', text: `OTP sent to ${email}. Enter it below to verify.` });
        toast.success('OTP sent to your email');
        setMode(purpose === 'register' ? 'register' : 'otp');
      }
    } catch (error: unknown) {
      setAuthMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to send OTP.' });
      toast.error(error instanceof Error ? error.message : 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp) {
      setAuthMessage({ type: 'error', text: 'Please enter the OTP.' });
      toast.error('Please enter the OTP');
      return;
    }
    setIsLoading(true);
    setAuthMessage(null);
    try {
      const res = await authAPI.verifyOTP(email, otp);
      if (res.success) {
        if (otpPurpose === 'register') {
          setVerifiedRegisterEmail(email);
          setOtp('');
          setAuthMessage({ type: 'success', text: 'OTP verified successfully. You can complete signup now.' });
          setMode('register');
          toast.success('Email verified. You can complete registration now.');
        } else {
          setAuthMessage({ type: 'success', text: 'OTP verified successfully. Logging you in.' });
          onAuth(res.user, res.token);
          toast.success('Login successful!');
        }
      }
    } catch (error: unknown) {
      setAuthMessage({ type: 'error', text: 'Wrong OTP. Please check the code and try again.' });
      toast.error(error instanceof Error ? error.message : 'Wrong OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email || !password || !name) {
      setAuthMessage({ type: 'error', text: 'Please fill all required fields.' });
      toast.error('Please fill all required fields');
      return;
    }
    if (!isRegisterOtpVerified) {
      setAuthMessage({ type: 'error', text: 'Please verify your email with OTP before registering.' });
      toast.error('Please verify your email with OTP before registering');
      return;
    }
    setIsLoading(true);
    setAuthMessage(null);
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
        setAuthMessage({ type: 'success', text: 'Registration successful.' });
        onAuth(res.user, res.token);
        toast.success('Registration successful!');
      }
    } catch (error: unknown) {
      setAuthMessage({ type: 'error', text: error instanceof Error ? error.message : 'Registration failed.' });
      toast.error(error instanceof Error ? error.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setAuthMessage({ type: 'error', text: 'Please enter email and password.' });
      toast.error('Please enter email and password');
      return;
    }
    setIsLoading(true);
    setAuthMessage(null);
    try {
      const res = await authAPI.login(email, password);
      if (res.success) {
        setAuthMessage({ type: 'success', text: 'Login successful.' });
        onAuth(res.user, res.token);
        toast.success('Login successful!');
      }
    } catch (error: unknown) {
      setAuthMessage({ type: 'error', text: 'Wrong password or login details. Please try again.' });
      toast.error(error instanceof Error ? error.message : 'Wrong password');
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
    setOtpPurpose('login');
    setAuthMessage(null);
    setVerifiedRegisterEmail(null);
    setRole('CUSTOMER');
    setShopDetails({
      name: '',
      description: '',
      address: '',
      city: '',
      pincode: '',
      phone: '',
      registrationNo: '',
      category: 'OTHER',
    });
    setMode('login');
  };

  const renderOtpVerification = () => (
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
        {otpPurpose === 'register' ? 'Verify Email' : 'Verify & Login'}
      </Button>
      <Button variant="ghost" className="w-full" onClick={() => setMode(otpPurpose === 'register' ? 'register' : 'login')}>
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to {otpPurpose === 'register' ? 'Register' : 'Login'}
      </Button>
    </>
  );

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

        <Tabs value={mode === 'otp' ? (otpPurpose === 'register' ? 'register' : 'login') : mode} onValueChange={(v) => setMode(v as typeof mode)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-4">
            <>
              {authMessage && (mode !== 'otp' || otpPurpose === 'login') ? (
                <Alert className={authMessage.type === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}>
                  {authMessage.type === 'error' ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                  <AlertDescription>{authMessage.text}</AlertDescription>
                </Alert>
              ) : null}
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
                  <Button variant="outline" onClick={() => handleSendOTP('login')} disabled={isLoading}>
                    Send OTP
                  </Button>
                </div>
              </div>

              {mode === 'otp' && otpPurpose === 'login' ? (
                <div className="space-y-4 rounded-xl border border-sky-200 bg-sky-50 p-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-900">Verify OTP</p>
                    <p className="text-sm text-slate-600">OTP sent to {email}. Enter the 6-digit code below.</p>
                  </div>
                  <Input
                    id="login-otp"
                    type="text"
                    placeholder="000000"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="text-center text-2xl tracking-widest"
                  />
                  <Button
                    className="w-full bg-gradient-to-r from-slate-800 to-black"
                    onClick={handleVerifyOTP}
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Verify & Login
                  </Button>
                </div>
              ) : null}
            </>
          </TabsContent>

          <TabsContent value="register" className="space-y-4">
            <>
              {authMessage ? (
                <Alert className={authMessage.type === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}>
                  {authMessage.type === 'error' ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                  <AlertDescription>{authMessage.text}</AlertDescription>
                </Alert>
              ) : null}
              <>
                <Alert className={isRegisterOtpVerified ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-sky-200 bg-sky-50'}>
                  <Mail className="h-4 w-4" />
                  <AlertTitle>{isRegisterOtpVerified ? 'Email verified' : 'OTP verification required'}</AlertTitle>
                  <AlertDescription>
                    {isRegisterOtpVerified
                      ? `Your email ${email} has been verified. You can complete signup now.`
                      : 'Verify your email with OTP before registration can be completed.'}
                  </AlertDescription>
                </Alert>
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
                    onChange={(e) => {
                      setEmail(e.target.value);
                    }}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={isRegisterOtpVerified ? 'secondary' : 'outline'}
                    onClick={() => handleSendOTP('register')}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    {isRegisterOtpVerified ? 'Resend OTP' : 'Verify Email with OTP'}
                  </Button>
                  {isRegisterOtpVerified ? (
                    <Badge className="self-center bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                      Verified
                    </Badge>
                  ) : null}
                </div>
                {showRegisterOtpInput ? (
                  <div className="space-y-3 rounded-xl border border-sky-200 bg-sky-50 p-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-900">Enter OTP to verify email</p>
                      <p className="text-sm text-slate-600">We sent a 6-digit code to {email}.</p>
                    </div>
                    <Input
                      id="register-otp"
                      type="text"
                      placeholder="000000"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="text-center text-2xl tracking-widest"
                    />
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 bg-gradient-to-r from-slate-800 to-black"
                        onClick={handleVerifyOTP}
                        disabled={isLoading}
                      >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Verify Email
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setOtp('');
                          setAuthMessage(null);
                          setOtpPurpose('login');
                        }}
                        disabled={isLoading}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : null}
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
                        <Label className="text-xs">Description</Label>
                        <Textarea
                          placeholder="Tell customers what your shop is known for..."
                          value={shopDetails.description}
                          onChange={(e) => setShopDetails({ ...shopDetails, description: e.target.value })}
                          className="min-h-[84px] resize-none bg-white"
                        />
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
                  disabled={isLoading || !isRegisterOtpVerified}
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {isRegisterOtpVerified ? 'Register' : 'Verify Email First'}
                </Button>
              </>
            </>
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
  const [locationScope, setLocationScope] = useState('all');
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [homepageMapShop, setHomepageMapShop] = useState<Shop | null>(null);
  const [homepageDistances, setHomepageDistances] = useState<Record<string, number>>({});
  const [homepageLocateSignal, setHomepageLocateSignal] = useState(0);
  const [homepageUserCoordinates, setHomepageUserCoordinates] = useState<{ lat: number; lon: number } | null>(null);
  const [homepageUserCity, setHomepageUserCity] = useState<string | null>(null);

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
    const normalizedUserCity = normalizeCityName(homepageUserCity);
    if (!searchQuery && categoryFilter === 'all' && locationScope === 'all') return shops;
    return shops.filter((shop) => {
      const matchesSearch = !searchQuery || 
        shop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shop.city.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || shop.category === categoryFilter;
      const normalizedShopCity = normalizeCityName(shop.city);
      const matchesLocation =
        locationScope === 'all' ||
        !normalizedUserCity ||
        (locationScope === 'my-city'
          ? normalizedShopCity === normalizedUserCity
          : normalizedShopCity !== normalizedUserCity);
      return matchesSearch && matchesCategory && matchesLocation;
    });
  }, [shops, searchQuery, categoryFilter, locationScope, homepageUserCity]);

  useEffect(() => {
    if (!homepageUserCoordinates) {
      setHomepageUserCity(null);
      return;
    }

    let cancelled = false;

    const lookupCity = async () => {
      try {
        const query = new URLSearchParams({
          lat: String(homepageUserCoordinates.lat),
          lon: String(homepageUserCoordinates.lon),
        });
        const response = await fetch(`/api/maps/reverse-geocode?${query.toString()}`);
        if (!response.ok) return;
        const data = (await response.json()) as { success: boolean; city?: string | null };
        if (!cancelled) {
          setHomepageUserCity(data.city || null);
        }
      } catch (error) {
        console.error('Failed to detect homepage user city:', error);
      }
    };

    lookupCity();

    return () => {
      cancelled = true;
    };
  }, [homepageUserCoordinates]);

  const homepageExploreShops = useMemo(() => {
    return [...filteredShops]
      .sort((a, b) => {
        const distanceA = homepageDistances[a.id];
        const distanceB = homepageDistances[b.id];

        if (typeof distanceA === 'number' && typeof distanceB === 'number') {
          return distanceA - distanceB;
        }

        if (typeof distanceA === 'number') return -1;
        if (typeof distanceB === 'number') return 1;

        return b.trustScore - a.trustScore;
      })
      .slice(0, 6);
  }, [filteredShops, homepageDistances]);

  useEffect(() => {
    if (!homepageExploreShops.length) {
      setHomepageMapShop(null);
      return;
    }

    setHomepageMapShop((current) => {
      if (current && homepageExploreShops.some((shop) => shop.id === current.id)) {
        return current;
      }
      return homepageExploreShops[0];
    });
  }, [homepageExploreShops]);

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
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-200/70 bg-gradient-to-br from-slate-50 via-white to-sky-50 shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_38%),radial-gradient(circle_at_80%_20%,_rgba(14,165,233,0.12),_transparent_30%),linear-gradient(135deg,_rgba(255,255,255,0.88),_rgba(241,245,249,0.65))]" />
        <div className="hero-map-grid absolute inset-x-0 top-0 h-72 opacity-70" />
        <div className="hero-map-route hero-route-one absolute left-[8%] top-14 h-36 w-48 rounded-full border-2 border-dashed border-sky-300/70" />
        <div className="hero-map-route hero-route-two absolute right-[10%] top-10 h-44 w-56 rounded-full border-2 border-dashed border-blue-200/70" />
        <div className="hero-map-route hero-route-three absolute left-1/2 top-24 h-28 w-72 -translate-x-1/2 rounded-full border-2 border-dashed border-cyan-200/70" />

        <div className="hero-map-pin hidden md:flex absolute left-[14%] top-24">
          <div className="hero-pin-dot bg-slate-900" />
          <div className="hero-pin-card">
            <span className="font-semibold">Singh Fashion Hub</span>
            <span className="text-xs text-slate-500">Jaipur</span>
          </div>
        </div>
        <div className="hero-map-pin hidden md:flex absolute right-[16%] top-20">
          <div className="hero-pin-dot bg-blue-500" />
          <div className="hero-pin-card">
            <span className="font-semibold">Reddy Electronics</span>
            <span className="text-xs text-slate-500">Hyderabad</span>
          </div>
        </div>
        <div className="hero-map-pin hidden md:flex absolute bottom-28 left-1/2 -translate-x-1/2">
          <div className="hero-pin-dot bg-amber-500" />
          <div className="hero-pin-card">
            <span className="font-semibold">Kumar Medical Store</span>
            <span className="text-xs text-slate-500">Bangalore</span>
          </div>
        </div>

        <div className="relative px-5 pb-10 pt-28 md:px-8 md:py-14 lg:px-12 lg:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="mb-4 rounded-full bg-white/90 px-4 py-1 text-slate-700 shadow-sm backdrop-blur">
              Live trust discovery for local shops
            </Badge>
            <h1 className="mx-auto max-w-xl text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl md:max-w-2xl md:text-5xl">
              Find Trusted Local Shops
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-8 text-slate-600 md:mt-5 md:max-w-2xl">
              Discover verified reviews, trust scores, and nearby local businesses with a map-first browsing experience built for real customers.
            </p>
          </div>

          <Card className="relative mx-auto mt-8 max-w-5xl border border-white/80 bg-white/90 shadow-2xl backdrop-blur md:mt-10">
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 md:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    placeholder="Search shops by name or city..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-12 border-2 border-slate-200 bg-white pl-12 text-lg shadow-sm focus:border-slate-800"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-12 w-full border-2 border-slate-200 bg-white md:w-52">
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
                <Select
                  value={locationScope}
                  onValueChange={(value) => {
                    setLocationScope(value);
                    if ((value === 'my-city' || value === 'outside-city') && !homepageUserCoordinates) {
                      setHomepageLocateSignal((current) => current + 1);
                    }
                  }}
                >
                  <SelectTrigger className="h-12 w-full border-2 border-slate-200 bg-white md:w-52">
                    <SelectValue placeholder="Location Scope" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    <SelectItem value="my-city">
                      {homepageUserCity ? `In ${homepageUserCity}` : 'In My City'}
                    </SelectItem>
                    <SelectItem value="outside-city">
                      {homepageUserCity ? `Outside ${homepageUserCity}` : 'Outside My City'}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 border-2 border-slate-200 bg-white md:w-auto"
                  onClick={() => setHomepageLocateSignal((value) => value + 1)}
                >
                  <LocateFixed className="mr-2 h-4 w-4" />
                  Near Me
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        <div className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-600">Explore nearby</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Map-first local discovery</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Browse trusted shops around you, inspect markers on the map, and jump into Google Maps when you are ready to visit.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="hidden border-slate-300 bg-white text-slate-700 sm:inline-flex"
              onClick={() => setHomepageLocateSignal((value) => value + 1)}
            >
              <LocateFixed className="mr-2 h-4 w-4" />
              Find Nearby
            </Button>
          </div>

          <ShopDiscoveryMap
            shops={homepageExploreShops}
            selectedShopId={homepageMapShop?.id ?? null}
            onSelectShop={(shop) => setHomepageMapShop(shop)}
            onDistancesChange={setHomepageDistances}
            onUserLocationChange={setHomepageUserCoordinates}
            locateSignal={homepageLocateSignal}
            title="Explore trusted shops on the map"
            subtitle="Free Leaflet map with OpenStreetMap tiles. Directions open in Google Maps."
            mapHeightClassName="h-[280px] md:h-[360px] xl:h-[430px]"
          />
        </div>

        <div className="space-y-4 xl:max-h-[640px] xl:overflow-y-auto xl:pr-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Suggested stops</p>
              <h3 className="mt-1 text-xl font-semibold text-slate-900">Shops worth exploring</h3>
            </div>
            <Badge className="bg-slate-900 text-white hover:bg-slate-900">
              {homepageExploreShops.length} results
            </Badge>
          </div>

          <div className="grid gap-4">
            {homepageExploreShops.map((shop) => {
              const distance = homepageDistances[shop.id];
              const isActive = homepageMapShop?.id === shop.id;

              return (
                <Card
                  key={shop.id}
                  className={`border transition-all duration-200 ${
                    isActive
                      ? 'border-sky-300 bg-sky-50/80 shadow-lg shadow-sky-100'
                      : 'border-slate-200 bg-white/90 shadow-sm'
                  }`}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 text-sm font-bold text-white shadow-md">
                            {shop.name[0]}
                          </div>
                          <div>
                            <h4 className="text-lg font-semibold text-slate-900">{shop.name}</h4>
                            <p className="flex items-center gap-1 text-sm text-slate-500">
                              <MapPin className="h-3.5 w-3.5" />
                              {shop.city}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">{shop.category}</Badge>
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                            Trust {Math.round(shop.trustScore)}
                          </Badge>
                          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                            {shop.reviewCount} reviews
                          </Badge>
                          {typeof distance === 'number' ? (
                            <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100">
                              {distance.toFixed(1)} km away
                            </Badge>
                          ) : null}
                        </div>

                        <p className="text-sm leading-6 text-slate-600 line-clamp-2">
                          {shop.description || `${shop.address}, ${shop.city}`}
                        </p>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button
                          variant={isActive ? 'default' : 'outline'}
                          className={isActive ? 'bg-slate-900 text-white hover:bg-slate-800' : ''}
                          onClick={() => setHomepageMapShop(shop)}
                        >
                          <MapPin className="mr-2 h-4 w-4" />
                          Show on Map
                        </Button>
                        <Button
                          variant="ghost"
                          className="text-slate-700"
                          onClick={() => setSelectedShop(shop)}
                        >
                          View Shop
                          <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {!homepageExploreShops.length && !isLoading ? (
              <Card className="border border-dashed border-slate-300 bg-white/70">
                <CardContent className="flex flex-col items-center justify-center gap-3 p-8 text-center">
                  <MapPin className="h-8 w-8 text-slate-400" />
                  <div>
                    <h4 className="text-base font-semibold text-slate-900">No shops found for this filter</h4>
                    <p className="mt-1 text-sm text-slate-500">Try another city, category, or use Near Me to explore nearby shops.</p>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      </section>

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
  const logout = useStore((state) => state.logout);
  const [activeTab, setActiveTab] = useState('home');
  const [shops, setShops] = useState<Shop[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [locationScope, setLocationScope] = useState('all');
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [highlightedShopId, setHighlightedShopId] = useState<string | null>(null);
  const [userBills, setUserBills] = useState<Bill[]>([]);
  const [userReviews, setUserReviews] = useState<Review[]>([]);
  const [pendingBills, setPendingBills] = useState<PendingBill[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [editReviewText, setEditReviewText] = useState('');
  const [userCoordinates, setUserCoordinates] = useState<{ lat: number; lon: number } | null>(null);
  const [userCity, setUserCity] = useState<string | null>(null);
  const [distanceByShop, setDistanceByShop] = useState<Record<string, number>>({});

  // Fetch shops
  useEffect(() => {
    const fetchShops = async () => {
      try {
        const normalizedQuery = searchQuery.trim().toLowerCase();
        const res = await shopsAPI.getAll({
          search: normalizedQuery === 'near me' ? undefined : searchQuery,
          limit: 50,
        });
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

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Delete your account permanently? This will remove your customer profile, reviews, bills, and related customer data from the database.'
    );

    if (!confirmed) return;

    setIsLoading(true);
    try {
      const res = await authAPI.deleteAccount(token);
      if (res.success) {
        toast.success('Your account and customer data were deleted successfully.');
        logout();
      } else {
        toast.error(res.error || 'Failed to delete account');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete account');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredShops = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const normalizedUserCity = normalizeCityName(userCity);
    const base = shops.filter((shop) => {
      const matchesSearch =
        !normalizedQuery ||
        normalizedQuery === 'near me' ||
        shop.name.toLowerCase().includes(normalizedQuery) ||
        shop.city.toLowerCase().includes(normalizedQuery);

      const matchesCategory =
        categoryFilter === 'all' || shop.category === categoryFilter;
      const normalizedShopCity = normalizeCityName(shop.city);
      const matchesLocation =
        locationScope === 'all' ||
        !normalizedUserCity ||
        (locationScope === 'my-city'
          ? normalizedShopCity === normalizedUserCity
          : normalizedShopCity !== normalizedUserCity);

      return matchesSearch && matchesCategory && matchesLocation;
    });

    const withDistance = base.map((shop) => ({
      ...shop,
      distanceKm: distanceByShop[shop.id] ?? null,
    }));

    if (userCoordinates || normalizedQuery === 'near me') {
      return [...withDistance].sort((a, b) => {
        const aDistance = a.distanceKm ?? Number.POSITIVE_INFINITY;
        const bDistance = b.distanceKm ?? Number.POSITIVE_INFINITY;
        return aDistance - bDistance;
      });
    }

    return withDistance;
  }, [categoryFilter, distanceByShop, locationScope, searchQuery, shops, userCity, userCoordinates]);

  useEffect(() => {
    if (!userCoordinates) {
      setUserCity(null);
      return;
    }

    let cancelled = false;

    const lookupCity = async () => {
      try {
        const query = new URLSearchParams({
          lat: String(userCoordinates.lat),
          lon: String(userCoordinates.lon),
        });
        const response = await fetch(`/api/maps/reverse-geocode?${query.toString()}`);
        if (!response.ok) return;
        const data = (await response.json()) as { success: boolean; city?: string | null };
        if (!cancelled) {
          setUserCity(data.city || null);
        }
      } catch (error) {
        console.error('Failed to detect user city:', error);
      }
    };

    lookupCity();

    return () => {
      cancelled = true;
    };
  }, [userCoordinates]);

  const handleUseCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported in this browser');
      return;
    }

    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserCoordinates({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
        setSearchQuery('near me');
        toast.success('Showing nearby shops');
        setIsLoading(false);
      },
      () => {
        toast.error('Could not access your location');
        setIsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

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
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-12 w-full sm:w-[220px] border-2 bg-white">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="GROCERY">Grocery</SelectItem>
                    <SelectItem value="RESTAURANT">Restaurant</SelectItem>
                    <SelectItem value="PHARMACY">Pharmacy</SelectItem>
                    <SelectItem value="ELECTRONICS">Electronics</SelectItem>
                    <SelectItem value="CLOTHING">Clothing</SelectItem>
                    <SelectItem value="SERVICE">Service</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={locationScope}
                  onValueChange={(value) => {
                    setLocationScope(value);
                    if ((value === 'my-city' || value === 'outside-city') && !userCoordinates) {
                      handleUseCurrentLocation();
                    }
                  }}
                >
                  <SelectTrigger className="h-12 w-full sm:w-[220px] border-2 bg-white">
                    <SelectValue placeholder="Location Scope" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    <SelectItem value="my-city">
                      {userCity ? `In ${userCity}` : 'In My City'}
                    </SelectItem>
                    <SelectItem value="outside-city">
                      {userCity ? `Outside ${userCity}` : 'Outside My City'}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" className="h-12 px-5" onClick={handleUseCurrentLocation} disabled={isLoading}>
                  <LocateFixed className="mr-2 h-4 w-4" />
                  Near Me
                </Button>
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

              {/* Map + Shops */}
              {filteredShops.length === 0 ? (
                <div className="text-center py-12">
                  <Store className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                  <h3 className="text-lg font-medium text-slate-600">No shops found</h3>
                  <p className="text-slate-400">Try adjusting your search</p>
                </div>
              ) : (
                <div className="grid gap-6 lg:grid-cols-[minmax(320px,0.95fr)_minmax(0,1.25fr)] lg:items-start">
                  <div className="lg:sticky lg:top-24">
                    <ShopDiscoveryMap
                      shops={filteredShops}
                      selectedShopId={highlightedShopId || filteredShops[0]?.id || null}
                      onSelectShop={(shop) => setHighlightedShopId(shop.id)}
                      onUserLocationChange={setUserCoordinates}
                      onDistancesChange={setDistanceByShop}
                    />
                  </div>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {filteredShops.map((shop) => {
                      const isHighlighted = (highlightedShopId || filteredShops[0]?.id) === shop.id;

                      return (
                        <Card
                          key={shop.id}
                          className={`border-0 shadow-md transition-all duration-200 ${isHighlighted ? 'ring-2 ring-slate-900 shadow-lg' : 'hover:shadow-lg'}`}
                          onClick={() => setHighlightedShopId(shop.id)}
                        >
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between gap-3">
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
                          <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <TrustScoreGauge score={shop.trustScore} size="sm" />
                                <span className="text-sm text-slate-500">{shop.reviewCount} reviews</span>
                              </div>
                              {typeof shop.distanceKm === 'number' ? (
                                <Badge variant="outline">{shop.distanceKm.toFixed(1)} km</Badge>
                              ) : (
                                <ChevronRight className="w-5 h-5 text-slate-400" />
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" className="flex-1" onClick={() => setHighlightedShopId(shop.id)}>
                                <MapPin className="mr-2 h-4 w-4" />
                                Show on Map
                              </Button>
                              <Button className="flex-1 bg-gradient-to-r from-slate-800 to-black" onClick={() => setSelectedShop(shop)}>
                                <Navigation className="mr-2 h-4 w-4" />
                                View Shop
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
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
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <h3 className="flex items-center gap-2 text-base font-semibold text-red-800">
                      <AlertTriangle className="h-4 w-4" />
                      Delete customer account
                    </h3>
                    <p className="text-sm text-red-700">
                      This permanently removes your customer account, uploaded bills, reviews, and related personal data.
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    disabled={isLoading}
                    className="sm:min-w-[180px]"
                  >
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                    Delete Account
                  </Button>
                </div>
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
  const [reviewRatings, setReviewRatings] = useState({
    priceRating: 5,
    qualityRating: 5,
    behaviorRating: 5,
    serviceRating: 5,
  });
  const [isLoading, setIsLoading] = useState(false);

  const updateReviewRating = (
    field: 'priceRating' | 'qualityRating' | 'behaviorRating' | 'serviceRating',
    value: string
  ) => {
    const numeric = Number(value);
    setReviewRatings((current) => ({
      ...current,
      [field]: Number.isFinite(numeric) ? numeric : 5,
    }));
  };

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
        setOcrData(res.bill?.ocrData || {});
        setSelectedShopId(res.matchedShop?.id || res.bill?.shopId || selectedShopId || '');
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
      const res = await reviewsAPI.submit(uploadedBill.id, reviewText, reviewRatings, token);
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
        setReviewRatings({
          priceRating: 5,
          qualityRating: 5,
          behaviorRating: 5,
          serviceRating: 5,
        });
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
    setReviewRatings({
      priceRating: 5,
      qualityRating: 5,
      behaviorRating: 5,
      serviceRating: 5,
    });
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
                <AlertDescription className="text-slate-600">You can now rate this shop and submit your review. We&apos;ll combine your ratings with AI sentiment analysis from the text.</AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
                {[
                  ['priceRating', 'Price'],
                  ['qualityRating', 'Quality'],
                  ['behaviorRating', 'Behaviour'],
                  ['serviceRating', 'Service'],
                ].map(([field, label]) => (
                  <div key={field} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>{label}</Label>
                      <span className="text-sm font-semibold text-slate-700">
                        {reviewRatings[field as keyof typeof reviewRatings]}/10
                      </span>
                    </div>
                    <Input
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      value={reviewRatings[field as keyof typeof reviewRatings]}
                      onChange={(e) => updateReviewRating(field as keyof typeof reviewRatings, e.target.value)}
                      className="h-3 cursor-pointer border-0 bg-transparent px-0 shadow-none"
                    />
                  </div>
                ))}
              </div>

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
                  <li>• Your 10-point ratings for price, quality, behaviour, and service will be stored</li>
                  <li>• Shop&apos;s trust score will be recalculated from both ratings and sentiment</li>
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
  generatedBillUrl?: string;
  isExistingCustomer: boolean;
}

function ShopkeeperDashboard({ token }: { user: User; token: string }) {
  const logout = useStore((state) => state.logout);
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
  const [weeklyReport, setWeeklyReport] = useState<{
    weekStart: string;
    weekEnd: string;
    newReviews: number;
    avgSentiment: number;
    trustScoreStart: number;
    trustScoreEnd: number;
    complaints: number;
    resolved: number;
    summary: string;
    strengths: string[];
    improvements: string[];
    metrics: Record<string, number>;
    previousMetrics: Record<string, number>;
    breakdown: Record<string, number>;
  } | null>(null);
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
  const [isEditShopOpen, setIsEditShopOpen] = useState(false);
  const [shopForm, setShopForm] = useState({
    name: '',
    description: '',
    address: '',
    city: '',
    pincode: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const shopRes = await shopsAPI.getMy(token);
        if (shopRes.success) {
          setShop(shopRes.shop);
          setShopForm({
            name: shopRes.shop.name || '',
            description: shopRes.shop.description || '',
            address: shopRes.shop.address || '',
            city: shopRes.shop.city || '',
            pincode: shopRes.shop.pincode || '',
          });
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

          const weeklyReportRes = await reportsAPI.getWeekly(token);
          if (weeklyReportRes.success) {
            setWeeklyReport(weeklyReportRes.report);
          }
        } else {
          toast.error(shopRes.error || 'No shop found');
          logout();
          return;
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
        if (error instanceof Error && error.message.toLowerCase().includes('no shop found')) {
          toast.error('Your shop account no longer exists. Please sign in again if needed.');
          logout();
          return;
        }
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

  const handleDownloadBillPdf = async (bill: GeneratedBill) => {
    if (!bill.generatedBillUrl) {
      toast.error('PDF is not available for this bill yet');
      return;
    }

    try {
      const response = await fetch(bill.generatedBillUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Failed to download bill PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${bill.billNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to download bill PDF');
    }
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

  const handleUpdateShop = async () => {
    if (!shop) return;
    if (!shopForm.name || !shopForm.address || !shopForm.city || !shopForm.pincode) {
      toast.error('Please fill all required shop fields');
      return;
    }

    setIsLoading(true);
    try {
      const res = await shopsAPI.update(
        shop.id,
        {
          name: shopForm.name,
          description: shopForm.description,
          address: shopForm.address,
          city: shopForm.city,
          pincode: shopForm.pincode,
          category: shop.category,
          phone: shop.phone,
          email: (shop as Shop & { email?: string }).email,
          gstNumber: (shop as Shop & { gstNumber?: string }).gstNumber,
        },
        token
      );

      if (res.success) {
        setShop((current) => (current ? { ...current, ...res.shop } : res.shop));
        setIsEditShopOpen(false);
        toast.success('Shop updated successfully');
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to update shop');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteShop = async () => {
    if (!shop) return;
    if (!confirm('Are you sure you want to remove your shop from the database? This will also delete your shopkeeper account and all related shop data.')) {
      return;
    }

    setIsLoading(true);
    try {
      const res = await shopsAPI.delete(shop.id, token);
      if (res.success) {
        logout();
        toast.success(res.accountDeleted ? 'Shop and account deleted successfully' : 'Shop removed successfully');
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete shop');
    } finally {
      setIsLoading(false);
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
                {shop.description ? (
                  <p className="mt-1 text-white/80">{shop.description}</p>
                ) : null}
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
              <Dialog open={isEditShopOpen} onOpenChange={setIsEditShopOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary" className="bg-white text-slate-800 hover:bg-white/90">
                    <Settings className="mr-2 h-4 w-4" />
                    Manage Shop
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Edit Shop Details</DialogTitle>
                    <DialogDescription>
                      Update your shop name, description, and location details. Coordinates will be refreshed automatically in the backend.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-shop-name">Shop Name</Label>
                      <Input
                        id="edit-shop-name"
                        value={shopForm.name}
                        onChange={(e) => setShopForm((current) => ({ ...current, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-shop-description">Description</Label>
                      <Textarea
                        id="edit-shop-description"
                        value={shopForm.description}
                        onChange={(e) => setShopForm((current) => ({ ...current, description: e.target.value }))}
                        className="min-h-[100px] resize-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-shop-address">Address</Label>
                      <Input
                        id="edit-shop-address"
                        value={shopForm.address}
                        onChange={(e) => setShopForm((current) => ({ ...current, address: e.target.value }))}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-shop-city">City</Label>
                        <Input
                          id="edit-shop-city"
                          value={shopForm.city}
                          onChange={(e) => setShopForm((current) => ({ ...current, city: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-shop-pincode">Pincode</Label>
                        <Input
                          id="edit-shop-pincode"
                          value={shopForm.pincode}
                          onChange={(e) => setShopForm((current) => ({ ...current, pincode: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between">
                      <Button
                        variant="destructive"
                        onClick={handleDeleteShop}
                        disabled={isLoading}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Remove Shop
                      </Button>
                      <div className="flex gap-2">
                        <DialogClose asChild>
                          <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button
                          className="bg-gradient-to-r from-slate-800 to-black"
                          onClick={handleUpdateShop}
                          disabled={isLoading}
                        >
                          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
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
                          <div className="mt-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadBillPdf(bill)}
                              disabled={!bill.generatedBillUrl}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download PDF
                            </Button>
                          </div>
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
          {weeklyReport && (
            <Card className="mb-6 border-0 shadow-md bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white">
              <CardHeader>
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <FileText className="h-5 w-5 text-sky-300" />
                      Weekly Improvement Report
                    </CardTitle>
                    <CardDescription className="text-slate-300">
                      {new Date(weeklyReport.weekStart).toLocaleDateString()} to {new Date(weeklyReport.weekEnd).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <Badge className="w-fit bg-white/10 text-white hover:bg-white/10">
                    {weeklyReport.newReviews} new review{weeklyReport.newReviews === 1 ? '' : 's'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-sm leading-7 text-slate-200">{weeklyReport.summary}</p>

                <div className="grid gap-4 md:grid-cols-4">
                  {[
                    ['Price', weeklyReport.metrics.price],
                    ['Quality', weeklyReport.metrics.quality],
                    ['Behaviour', weeklyReport.metrics.behavior],
                    ['Service', weeklyReport.metrics.service],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-300">{label}</p>
                      <p className="mt-2 text-2xl font-semibold text-white">{value}/10</p>
                    </div>
                  ))}
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                    <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-200">What is working well</h4>
                    <div className="mt-3 space-y-2">
                      {weeklyReport.strengths.map((point) => (
                        <div key={point} className="flex gap-2 text-sm text-emerald-50">
                          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                          <span>{point}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
                    <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-200">Where to improve next</h4>
                    <div className="mt-3 space-y-2">
                      {weeklyReport.improvements.map((point) => (
                        <div key={point} className="flex gap-2 text-sm text-amber-50">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                          <span>{point}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Trust Score Change</p>
                    <p className="mt-2 text-xl font-semibold text-white">
                      {weeklyReport.trustScoreStart.toFixed(1)} → {weeklyReport.trustScoreEnd.toFixed(1)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Avg Sentiment</p>
                    <p className="mt-2 text-xl font-semibold text-white">{weeklyReport.avgSentiment.toFixed(2)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Complaints</p>
                    <p className="mt-2 text-xl font-semibold text-white">{weeklyReport.complaints}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Resolved</p>
                    <p className="mt-2 text-xl font-semibold text-white">{weeklyReport.resolved}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
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
              <Button
                className="w-full"
                onClick={() => handleDownloadBillPdf(lastGeneratedBill)}
                disabled={!lastGeneratedBill.generatedBillUrl}
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF Bill
              </Button>
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
      {typeof review.priceRating === 'number' ? (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ['Price', review.priceRating],
            ['Quality', review.qualityRating],
            ['Behaviour', review.behaviorRating],
            ['Service', review.serviceRating],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-center dark:border-slate-700 dark:bg-slate-900/40">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
              <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{value}/10</p>
            </div>
          ))}
        </div>
      ) : null}
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
          <div className="flex flex-col gap-6 md:flex-row md:items-start">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white text-3xl font-bold">
              {shop.name[0]}
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold">{shop.name}</h1>
                  <p className="text-slate-500">{shop.description}</p>
                </div>
                <Badge>{shop.category}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="overflow-hidden border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="h-5 w-5 text-sky-600" />
              Shop Location
            </CardTitle>
            <CardDescription>
              Explore the shop on the map and jump to Google Maps for turn-by-turn directions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 md:grid-cols-2">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sky-600 shadow-sm">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Address</p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">
                    {shop.address}, {shop.city}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sky-600 shadow-sm">
                  <Phone className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Phone</p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">{shop.phone}</p>
                </div>
              </div>
            </div>
            <ShopDiscoveryMap
              shops={[shop]}
              selectedShopId={shop.id}
              onSelectShop={() => {}}
              title="Map preview"
              subtitle="Leaflet + OpenStreetMap preview for this shop"
              mapHeightClassName="h-[220px] md:h-[280px]"
              showLocateButton={false}
            />
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-slate-50 via-white to-sky-50">
          <CardContent className="flex h-full flex-col justify-between gap-5 pt-6">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg">
                  <Route className="h-7 w-7" />
                </div>
                <div className="flex flex-col items-center text-center">
                  <TrustScoreGauge score={shop.trustScore} size="lg" showLabel />
                  <p className="mt-2 text-sm text-slate-500">{shop.reviewCount} reviews</p>
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Plan your visit</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Open this shop directly in Google Maps, get the route, and come back to share a verified review after your visit.
                </p>
              </div>
              <div className="space-y-2 rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm text-slate-600">
                <p className="font-medium text-slate-900">{shop.name}</p>
                <p>{shop.address}</p>
                <p>{shop.city}</p>
                <p>{shop.phone}</p>
              </div>
            </div>

            <Button
              className="w-full bg-gradient-to-r from-slate-800 to-black hover:from-slate-700 hover:to-slate-900"
              onClick={() => {
                const destination = encodeURIComponent(`${shop.address}, ${shop.city}`);
                window.open(
                  `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`,
                  '_blank',
                  'noopener,noreferrer'
                );
              }}
            >
              <Navigation className="mr-2 h-4 w-4" />
              Get Directions
            </Button>
          </CardContent>
        </Card>
      </div>

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
