
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ShoppingCart, Coffee, Package, User, Plus, Minus, Trash2, Edit } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { CoffeeProduct, CreateCoffeeProductInput, CartItemWithProduct, OrderWithItems, User as UserType, CreateUserInput } from '../../server/src/schema';

function App() {
  // State management
  const [coffeeProducts, setCoffeeProducts] = useState<CoffeeProduct[]>([]);
  const [cartItems, setCartItems] = useState<CartItemWithProduct[]>([]);
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('products');
  const [isBackendAvailable, setIsBackendAvailable] = useState(true);

  // Filter states
  const [roastFilter, setRoastFilter] = useState<string>('all');
  const [originFilter, setOriginFilter] = useState<string>('all');

  // Form states
  const [productForm, setProductForm] = useState<CreateCoffeeProductInput>({
    name: '',
    description: '',
    price: 0,
    image_url: null,
    origin: '',
    roast_type: 'medium',
    stock_quantity: 0
  });

  const [userForm, setUserForm] = useState<CreateUserInput>({
    email: '',
    name: '',
    role: 'customer'
  });

  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);

  // Demo user for when backend is not available
  const createDemoUser = (role: 'customer' | 'admin' = 'customer'): UserType => ({
    id: 1,
    email: 'demo@brewmaster.com',
    name: 'Demo User',
    role,
    created_at: new Date()
  });

  // Load data functions with error handling
  const loadCoffeeProducts = useCallback(async () => {
    try {
      const products = await trpc.getCoffeeProducts.query();
      setCoffeeProducts(products);
      setIsBackendAvailable(true);
    } catch (error) {
      console.error('Failed to load coffee products:', error);
      setIsBackendAvailable(false);
      // Set demo products for UI demonstration
      setCoffeeProducts([]);
    }
  }, []);

  const loadCartItems = useCallback(async () => {
    if (!currentUser) return;
    try {
      const items = await trpc.getCartItems.query({ userId: currentUser.id });
      setCartItems(items);
    } catch (error) {
      console.error('Failed to load cart items:', error);
      setCartItems([]);
    }
  }, [currentUser]);

  const loadOrders = useCallback(async () => {
    try {
      const orderList = await trpc.getOrders.query({ 
        userId: currentUser?.role === 'admin' ? undefined : currentUser?.id 
      });
      setOrders(orderList);
    } catch (error) {
      console.error('Failed to load orders:', error);
      setOrders([]);
    }
  }, [currentUser]);

  // Initial data load
  useEffect(() => {
    loadCoffeeProducts();
  }, [loadCoffeeProducts]);

  useEffect(() => {
    if (currentUser) {
      loadCartItems();
      loadOrders();
    }
  }, [currentUser, loadCartItems, loadOrders]);

  // Create user and set as current
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isBackendAvailable) {
        const user = await trpc.createUser.mutate(userForm);
        setCurrentUser(user);
      } else {
        // Demo mode - create local user
        const demoUser = createDemoUser(userForm.role);
        demoUser.name = userForm.name;
        demoUser.email = userForm.email;
        setCurrentUser(demoUser);
      }
      setUserForm({ email: '', name: '', role: 'customer' });
      setIsUserDialogOpen(false);
    } catch (error) {
      console.error('Failed to create user:', error);
      // Fallback to demo user
      const demoUser = createDemoUser(userForm.role);
      demoUser.name = userForm.name;
      demoUser.email = userForm.email;
      setCurrentUser(demoUser);
      setUserForm({ email: '', name: '', role: 'customer' });
      setIsUserDialogOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Quick demo login buttons
  const handleDemoLogin = (role: 'customer' | 'admin') => {
    const demoUser = createDemoUser(role);
    if (role === 'admin') {
      demoUser.name = 'Admin User';
      demoUser.email = 'admin@brewmaster.com';
    }
    setCurrentUser(demoUser);
  };

  // Product management
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isBackendAvailable) {
        const product = await trpc.createCoffeeProduct.mutate(productForm);
        setCoffeeProducts((prev: CoffeeProduct[]) => [...prev, product]);
      } else {
        // Demo mode - create local product
        const demoProduct: CoffeeProduct = {
          ...productForm,
          id: Date.now(), // Simple ID generation for demo
          created_at: new Date(),
          updated_at: new Date()
        };
        setCoffeeProducts((prev: CoffeeProduct[]) => [...prev, demoProduct]);
      }
      setProductForm({
        name: '',
        description: '',
        price: 0,
        image_url: null,
        origin: '',
        roast_type: 'medium',
        stock_quantity: 0
      });
      setIsProductDialogOpen(false);
    } catch (error) {
      console.error('Failed to create product:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    try {
      if (isBackendAvailable) {
        await trpc.deleteCoffeeProduct.mutate({ id: productId });
      }
      // Remove from local state regardless
      setCoffeeProducts((prev: CoffeeProduct[]) => prev.filter(p => p.id !== productId));
    } catch (error) {
      console.error('Failed to delete product:', error);
      // Remove from local state even if backend fails
      setCoffeeProducts((prev: CoffeeProduct[]) => prev.filter(p => p.id !== productId));
    }
  };

  // Cart management
  const handleAddToCart = async (productId: number, quantity: number = 1) => {
    if (!currentUser) return;
    try {
      if (isBackendAvailable) {
        await trpc.addToCart.mutate({
          user_id: currentUser.id,
          product_id: productId,
          quantity
        });
        await loadCartItems();
      } else {
        // Demo mode - add to local cart
        const product = coffeeProducts.find(p => p.id === productId);
        if (product) {
          const existingItem = cartItems.find(item => item.product_id === productId);
          if (existingItem) {
            setCartItems((prev: CartItemWithProduct[]) =>
              prev.map(item =>
                item.product_id === productId
                  ? { ...item, quantity: item.quantity + quantity }
                  : item
              )
            );
          } else {
            const newCartItem: CartItemWithProduct = {
              id: Date.now(),
              user_id: currentUser.id,
              product_id: productId,
              quantity,
              created_at: new Date(),
              product
            };
            setCartItems((prev: CartItemWithProduct[]) => [...prev, newCartItem]);
          }
        }
      }
    } catch (error) {
      console.error('Failed to add to cart:', error);
    }
  };

  const handleUpdateCartItem = async (cartItemId: number, quantity: number) => {
    try {
      if (isBackendAvailable) {
        await trpc.updateCartItem.mutate({ id: cartItemId, quantity });
        await loadCartItems();
      } else {
        // Demo mode - update local cart
        setCartItems((prev: CartItemWithProduct[]) =>
          prev.map(item =>
            item.id === cartItemId ? { ...item, quantity } : item
          )
        );
      }
    } catch (error) {
      console.error('Failed to update cart item:', error);
    }
  };

  const handleRemoveFromCart = async (cartItemId: number) => {
    try {
      if (isBackendAvailable) {
        await trpc.removeFromCart.mutate({ cartItemId });
        await loadCartItems();
      } else {
        // Demo mode - remove from local cart
        setCartItems((prev: CartItemWithProduct[]) => prev.filter(item => item.id !== cartItemId));
      }
    } catch (error) {
      console.error('Failed to remove from cart:', error);
    }
  };

  const handleCreateOrder = async () => {
    if (!currentUser) return;
    try {
      if (isBackendAvailable) {
        await trpc.createOrder.mutate({ user_id: currentUser.id });
        await loadCartItems();
        await loadOrders();
      } else {
        // Demo mode - create local order
        const newOrder: OrderWithItems = {
          id: Date.now(),
          user_id: currentUser.id,
          total_amount: cartTotal,
          status: 'pending',
          created_at: new Date(),
          updated_at: new Date(),
          user: currentUser,
          items: cartItems.map(item => ({
            id: Date.now() + Math.random(),
            order_id: Date.now(),
            product_id: item.product_id,
            quantity: item.quantity,
            price_at_time: item.product.price,
            created_at: new Date(),
            product: item.product
          }))
        };
        setOrders((prev: OrderWithItems[]) => [newOrder, ...prev]);
        setCartItems([]);
      }
      setActiveTab('orders');
    } catch (error) {
      console.error('Failed to create order:', error);
    }
  };

  // Filter products
  const filteredProducts = coffeeProducts.filter(product => {
    const roastMatch = roastFilter === 'all' || product.roast_type === roastFilter;
    const originMatch = originFilter === 'all' || product.origin === originFilter;
    return roastMatch && originMatch;
  });

  // Get unique origins for filter
  const uniqueOrigins = Array.from(new Set(coffeeProducts.map(p => p.origin)));

  // Calculate cart total
  const cartTotal = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  // Roast type colors
  const getRoastColor = (roast: string) => {
    switch (roast) {
      case 'light': return 'bg-amber-100 text-amber-800';
      case 'medium': return 'bg-orange-100 text-orange-800';
      case 'dark': return 'bg-amber-800 text-amber-100';
      case 'extra_dark': return 'bg-gray-800 text-gray-100';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-amber-900 flex items-center gap-2">
              <Coffee className="h-8 w-8" />
              ☕ BrewMaster Coffee Shop
            </h1>
            <p className="text-amber-700 mt-2">Premium coffee from around the world</p>
            {!isBackendAvailable && (
              <Badge variant="secondary" className="mt-2">
                🔧 Demo Mode - Backend handlers are stubs
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            {currentUser ? (
              <div className="text-right">
                <p className="font-semibold text-amber-900">Welcome, {currentUser.name}! 👋</p>
                <Badge variant={currentUser.role === 'admin' ? 'destructive' : 'secondary'}>
                  {currentUser.role === 'admin' ? '🔧 Admin' : '☕ Customer'}
                </Badge>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentUser(null)}
                  className="ml-2 mt-1"
                >
                  Logout
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button onClick={() => handleDemoLogin('customer')} variant="outline">
                  ☕ Demo Customer
                </Button>
                <Button onClick={() => handleDemoLogin('admin')} variant="outline">
                  🔧 Demo Admin
                </Button>
                <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-amber-600 hover:bg-amber-700">
                      <User className="h-4 w-4 mr-2" />
                      Sign In / Register
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Account</DialogTitle>
                      <DialogDescription>Join our coffee community!</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateUser} className="space-y-4">
                      <div>
                        <Label htmlFor="name">Name</Label>
                        <Input
                          id="name"
                          value={userForm.name}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setUserForm((prev: CreateUserInput) => ({ ...prev, name: e.target.value }))
                          }
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={userForm.email}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setUserForm((prev: CreateUserInput) => ({ ...prev, email: e.target.value }))
                          }
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="role">Role</Label>
                        <Select
                          value={userForm.role || 'customer'}
                          onValueChange={(value: 'customer' | 'admin') =>
                            setUserForm((prev: CreateUserInput) => ({ ...prev, role: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="customer">☕ Customer</SelectItem>
                            <SelectItem value="admin">🔧 Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <DialogFooter>
                        <Button type="submit" disabled={isLoading} className="bg-amber-600 hover:bg-amber-700">
                          {isLoading ? 'Creating...' : 'Create Account'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        </div>

        {/* Show demo buttons when no user is logged in */}
        {!currentUser && (
          <Card className="mb-8 bg-amber-50 border-amber-200">
            <CardContent className="p-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-amber-900 mb-2">
                  🎭 Try the Demo!
                </h2>
                <p className="text-amber-700 mb-4">
                  Since the backend is in demo mode, you can try the application with these quick login options:
                </p>
                <div className="flex gap-4 justify-center">
                  <Button onClick={() => handleDemoLogin('customer')} className="bg-amber-600 hover:bg-amber-700">
                    ☕ Login as Customer
                  </Button>
                  <Button onClick={() => handleDemoLogin('admin')} className="bg-orange-600 hover:bg-orange-700">
                    🔧 Login as Admin
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {currentUser && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-amber-100">
              <TabsTrigger value="products" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white">
                <Coffee className="h-4 w-4 mr-2" />
                Products
              </TabsTrigger>
              <TabsTrigger value="cart" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Cart ({cartItems.length})
              </TabsTrigger>
              <TabsTrigger value="orders" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white">
                <Package className="h-4 w-4 mr-2" />
                Orders
              </TabsTrigger>
              {currentUser.role === 'admin' && (
                <TabsTrigger value="admin" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white">
                  🔧 Admin
                </TabsTrigger>
              )}
            </TabsList>

            {/* Products Tab */}
            <TabsContent value="products" className="space-y-6">
              <div className="flex gap-4 flex-wrap">
                <Select value={roastFilter} onValueChange={setRoastFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by roast" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roasts</SelectItem>
                    <SelectItem value="light">☀️ Light</SelectItem>
                    <SelectItem value="medium">🟤 Medium</SelectItem>
                    <SelectItem value="dark">⚫ Dark</SelectItem>
                    <SelectItem value="extra_dark">⚫⚫ Extra Dark</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={originFilter} onValueChange={setOriginFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by origin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Origins</SelectItem>
                    {uniqueOrigins.map((origin: string) => (
                      <SelectItem key={origin} value={origin}>🌍 {origin}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.length === 0 ? (
                  <div className="col-span-full text-center py-12">
                    <Coffee className="h-16 w-16 mx-auto text-amber-300 mb-4" />
                    <p className="text-gray-500 text-lg">No coffee products available yet</p>
                    <p className="text-gray-400">
                      {currentUser.role === 'admin' ? 
                        'Use the Admin panel to add some coffee products! 🔧' : 
                        'Check back soon for amazing coffee! ☕'
                      }
                    </p>
                  </div>
                ) : (
                  filteredProducts.map((product: CoffeeProduct) => (
                    <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow border-amber-200">
                      <div className="aspect-video bg-gradient-to-br from-amber-200 to-orange-300 flex items-center justify-center">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <Coffee className="h-12 w-12 text-amber-600" />
                        )}
                      </div>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-amber-900">{product.name}</CardTitle>
                          <Badge className={getRoastColor(product.roast_type)}>
                            {product.roast_type}
                          </Badge>
                        </div>
                        <CardDescription>{product.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <p className="text-sm text-gray-600">🌍 Origin: {product.origin}</p>
                          <div className="flex justify-between items-center">
                            <span className="text-2xl font-bold text-amber-600">${product.price.toFixed(2)}</span>
                            <span className="text-sm text-gray-500">
                              📦 Stock: {product.stock_quantity}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button
                          onClick={() => handleAddToCart(product.id)}
                          disabled={product.stock_quantity === 0}
                          className="w-full bg-amber-600 hover:bg-amber-700"
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          {product.stock_quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
                        </Button>
                      </CardFooter>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Cart Tab */}
            <TabsContent value="cart" className="space-y-6">
              {cartItems.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="h-16 w-16 mx-auto text-amber-300 mb-4" />
                  <p className="text-gray-500 text-lg">Your cart is empty</p>
                  <p className="text-gray-400">Add some delicious coffee to get started! ☕</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cartItems.map((item: CartItemWithProduct) => (
                    <Card key={item.id} className="border-amber-200">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-gradient-to-br from-amber-200 to-orange-300 rounded-lg flex items-center justify-center">
                              <Coffee className="h-8 w-8 text-amber-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-amber-900">{item.product.name}</h3>
                              <p className="text-sm text-gray-600">{item.product.origin}</p>
                              <Badge className={getRoastColor(item.product.roast_type)}>
                                {item.product.roast_type}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateCartItem(item.id, Math.max(1, item.quantity - 1))}
                                disabled={item.quantity <= 1}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center font-semibold">{item.quantity}</span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateCartItem(item.id, item.quantity + 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-amber-600">
                                ${(item.product.price * item.quantity).toFixed(2)}
                              </p>
                              <p className="text-sm text-gray-500">
                                ${item.product.price.toFixed(2)} each
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRemoveFromCart(item.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  <Card className="bg-amber-50 border-amber-300">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-xl font-semibold text-amber-900">Total:</span>
                        <span className="text-2xl font-bold text-amber-600">${cartTotal.toFixed(2)}</span>
                      </div>
                      <Button onClick={handleCreateOrder} className="w-full bg-amber-600 hover:bg-amber-700 text-lg py-6">
                        <Package className="h-5 w-5 mr-2" />
                        Place Order 🎉
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            {/* Orders Tab */}
            <TabsContent value="orders" className="space-y-6">
              {orders.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-16 w-16 mx-auto text-amber-300 mb-4" />
                  <p className="text-gray-500 text-lg">No orders yet</p>
                  <p className="text-gray-400">Place your first order to see it here! 📦</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order: OrderWithItems) => (
                    <Card key={order.id} className="border-amber-200">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-amber-900">Order #{order.id}</CardTitle>
                            <CardDescription>
                              Placed on {order.created_at.toLocaleDateString()} 📅
                              {currentUser.role === 'admin' && (
                                <span className="ml-2">by {order.user.name} ({order.user.email})</span>
                              )}
                            </CardDescription>
                          </div>
                          <div className="text-right">
                            <Badge className={getStatusColor(order.status)}>
                              {order.status}
                            </Badge>
                            <p className="text-lg font-semibold text-amber-600 mt-1">
                              ${order.total_amount.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {order.items.map((item) => (
                            <div key={item.id} className="flex justify-between items-center py-2 border-b border-amber-100 last:border-b-0">
                              <div>
                                <span className="font-medium">{item.product.name}</span>
                                <span className="text-gray-500 ml-2">x{item.quantity}</span>
                              </div>
                              <span className="text-amber-600">${(item.price_at_time * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Admin Tab */}
            {currentUser.role === 'admin' && (
              <TabsContent value="admin" className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-amber-900">🔧 Admin Panel</h2>
                  <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-amber-600 hover:bg-amber-700">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Product
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Add New Coffee Product</DialogTitle>
                        <DialogDescription>Create a new coffee product for your shop</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleCreateProduct} className="space-y-4">
                        <div>
                          <Label htmlFor="name">Name</Label>
                          <Input
                            id="name"
                            value={productForm.name}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setProductForm((prev: CreateCoffeeProductInput) => ({ ...prev, name: e.target.value }))
                            }
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            value={productForm.description}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                              setProductForm((prev: CreateCoffeeProductInput) => ({ ...prev, description: e.target.value }))
                            }
                            required
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="price">Price</Label>
                            <Input
                              id="price"
                              type="number"
                              step="0.01"
                              min="0"
                              value={productForm.price}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setProductForm((prev: CreateCoffeeProductInput) => ({ ...prev, price: parseFloat(e.target.value) || 0 }))
                              }
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="stock">Stock</Label>
                            <Input
                              id="stock"
                              type="number"
                              min="0"
                              value={productForm.stock_quantity}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setProductForm((prev: CreateCoffeeProductInput) => ({ ...prev, stock_quantity: parseInt(e.target.value) || 0 }))
                              }
                              required
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="origin">Origin</Label>
                          <Input
                            id="origin"
                            value={productForm.origin}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setProductForm((prev: CreateCoffeeProductInput) => ({ ...prev, origin: e.target.value }))
                            }
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="roast">Roast Type</Label>
                          <Select
                            value={productForm.roast_type}
                            onValueChange={(value: 'light' | 'medium' | 'dark' | 'extra_dark') =>
                              setProductForm((prev: CreateCoffeeProductInput) => ({ ...prev, roast_type: value }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="light">☀️ Light</SelectItem>
                              <SelectItem value="medium">🟤 Medium</SelectItem>
                              <SelectItem value="dark">⚫ Dark</SelectItem>
                              <SelectItem value="extra_dark">⚫⚫ Extra Dark</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="image_url">Image URL (optional)</Label>
                          <Input
                            id="image_url"
                            type="url"
                            value={productForm.image_url || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setProductForm((prev: CreateCoffeeProductInput) => ({ ...prev, image_url: e.target.value || null }))
                            }
                          />
                        </div>
                        <DialogFooter>
                          <Button type="submit" disabled={isLoading} className="bg-amber-600 hover:bg-amber-700">
                            {isLoading ? 'Creating...' : 'Create Product'}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {coffeeProducts.length === 0 ? (
                    <div className="col-span-full text-center py-12">
                      <Coffee className="h-16 w-16 mx-auto text-amber-300 mb-4" />
                      <p className="text-gray-500 text-lg">No coffee products yet</p>
                      <p className="text-gray-400">Click "Add Product" to create your first coffee product! ☕</p>
                    </div>
                  ) : (
                    coffeeProducts.map((product: CoffeeProduct) => (
                      <Card key={product.id} className="border-amber-200">
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-amber-900">{product.name}</CardTitle>
                              <CardDescription>{product.origin}</CardDescription>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline">
                                <Edit className="h-3 w-3" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="destructive">
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Product</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{product.name}"? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteProduct(product.id)}
                                      className="bg-red-600 hover: bg-red-700"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p><strong>Price:</strong> ${product.price.toFixed(2)}</p>
                              <p><strong>Stock:</strong> {product.stock_quantity}</p>
                            </div>
                            <div>
                              <Badge className={getRoastColor(product.roast_type)}>
                                {product.roast_type}
                              </Badge>
                              <p className="mt-1 text-gray-500">
                                Created: {product.created_at.toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>
            )}
          </Tabs>
        )}
      </div>
    </div>
  );
}

export default App;
