
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, ShoppingBag, Menu, Home, UtensilsCrossed, PenTool, 
  User, Plus, Minus, X, ChevronRight, Star, Clock, MapPin, 
  Sparkles, Send, Trash2, Settings, Heart, ArrowLeft, CheckCircle2,
  Bike, ChefHat, Timer, CreditCard, Sun, Moon, Zap, ShieldCheck,
  LayoutDashboard, Users, Truck, DollarSign, Package, LogOut, Navigation
} from 'lucide-react';
import { INITIAL_MENU_ITEMS, INITIAL_RESTAURANTS, CATEGORIES, INITIAL_DELIVERY_PARTNERS } from './constants';
import { MenuItem, Restaurant, CartItem, CategoryType, Order, Toast as ToastType, DeliveryPartner } from './types';
import { getAIResponse } from './services/geminiService';

// --- Shared Utility Components ---

const Badge = ({ children, className = '' }: { children?: React.ReactNode, className?: string }) => (
  <span className={`px-2.5 py-1 rounded-md text-xs font-semibold tracking-wide ${className}`}>
    {children}
  </span>
);

const Button = ({ 
  children, 
  variant = 'primary', 
  onClick, 
  className = '',
  size = 'md',
  disabled = false,
  type = 'button'
}: { 
  children?: React.ReactNode, 
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger',
  size?: 'sm' | 'md' | 'lg',
  onClick?: () => void,
  className?: string,
  disabled?: boolean,
  type?: 'button' | 'submit'
}) => {
  const baseStyle = "font-medium rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 select-none";
  const variants = {
    primary: "bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-900/20",
    secondary: "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700",
    outline: "border border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500 text-zinc-600 dark:text-zinc-300 bg-transparent",
    ghost: "hover:bg-zinc-100 dark:hover:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white",
    danger: "bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20"
  };
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3.5 text-base"
  };
  
  return (
    <button 
      type={type}
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className} ${disabled ? 'opacity-50 cursor-not-allowed active:scale-100' : ''}`}
    >
      {children}
    </button>
  );
};

export default function App() {
  // --- Global State ---
  const [currentRole, setCurrentRole] = useState<'customer' | 'admin' | 'partner'>('customer');
  const [activePartnerId, setActivePartnerId] = useState<string>('dp1'); // Simulated logged-in partner
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

  // Shared Data State
  const [restaurants, setRestaurants] = useState<Restaurant[]>(INITIAL_RESTAURANTS);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(INITIAL_MENU_ITEMS);
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveryPartners, setDeliveryPartners] = useState<DeliveryPartner[]>(INITIAL_DELIVERY_PARTNERS);
  
  // Customer Specific State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  
  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      return saved ? saved === 'dark' : true; // Default to dark
    }
    return true;
  });

  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  // Toast State
  const [toasts, setToasts] = useState<ToastType[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const ToastContainer = () => (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <div 
          key={toast.id}
          className={`animate-slide-in pointer-events-auto min-w-[300px] p-4 rounded-xl shadow-2xl border flex items-center gap-3 backdrop-blur-md ${
            toast.type === 'success' ? 'bg-zinc-100/90 dark:bg-zinc-900/90 border-green-500/50 text-green-600 dark:text-green-400' :
            toast.type === 'error' ? 'bg-zinc-100/90 dark:bg-zinc-900/90 border-red-500/50 text-red-600 dark:text-red-400' :
            'bg-zinc-100/90 dark:bg-zinc-900/90 border-brand-500/50 text-brand-600 dark:text-brand-400'
          }`}
        >
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
          {toast.type === 'error' && <X className="w-5 h-5" />}
          {toast.type === 'info' && <Sparkles className="w-5 h-5" />}
          <p className="text-sm font-medium text-zinc-900 dark:text-white">{toast.message}</p>
        </div>
      ))}
    </div>
  );

  // --- Sub-Applications based on Role ---

  const AdminDashboard = () => {
    const [adminTab, setAdminTab] = useState<'overview' | 'products' | 'orders' | 'partners'>('overview');
    
    // Admin Actions
    const assignPartner = (orderId: string, partnerId: string) => {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, partnerId, status: 'confirmed' } : o));
      setDeliveryPartners(prev => prev.map(p => p.id === partnerId ? { ...p, status: 'busy' } : p));
      showToast('Partner assigned successfully', 'success');
    };

    const deleteProduct = (id: string) => {
       setMenuItems(prev => prev.filter(i => i.id !== id));
       showToast('Product deleted', 'info');
    };

    const stats = {
      totalOrders: orders.length,
      revenue: orders.reduce((acc, o) => acc + o.total, 0),
      activePartners: deliveryPartners.filter(p => p.status !== 'offline').length,
    };

    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 flex">
        {/* Sidebar */}
        <div className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-10">
            <LayoutDashboard className="w-6 h-6 text-brand-600" />
            <h1 className="text-xl font-bold">Admin Panel</h1>
          </div>
          
          <nav className="space-y-2 flex-1">
             <button onClick={() => setAdminTab('overview')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${adminTab === 'overview' ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500'}`}>
                <Home className="w-5 h-5" /> Overview
             </button>
             <button onClick={() => setAdminTab('products')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${adminTab === 'products' ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500'}`}>
                <ShoppingBag className="w-5 h-5" /> Products
             </button>
             <button onClick={() => setAdminTab('orders')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${adminTab === 'orders' ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500'}`}>
                <CreditCard className="w-5 h-5" /> Orders
             </button>
             <button onClick={() => setAdminTab('partners')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${adminTab === 'partners' ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500'}`}>
                <Bike className="w-5 h-5" /> Partners
             </button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8 overflow-y-auto">
          {adminTab === 'overview' && (
             <div className="animate-fade-in space-y-6">
                <h2 className="text-2xl font-bold mb-6">Dashboard Overview</h2>
                <div className="grid grid-cols-3 gap-6">
                   <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                      <div className="flex justify-between items-start mb-4">
                         <div className="bg-blue-100 dark:bg-blue-900/20 p-3 rounded-xl text-blue-600"><ShoppingBag /></div>
                      </div>
                      <h3 className="text-zinc-500 text-sm">Total Orders</h3>
                      <p className="text-3xl font-bold">{stats.totalOrders}</p>
                   </div>
                   <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                      <div className="flex justify-between items-start mb-4">
                         <div className="bg-green-100 dark:bg-green-900/20 p-3 rounded-xl text-green-600"><DollarSign /></div>
                      </div>
                      <h3 className="text-zinc-500 text-sm">Total Revenue</h3>
                      <p className="text-3xl font-bold">₹{stats.revenue}</p>
                   </div>
                   <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                      <div className="flex justify-between items-start mb-4">
                         <div className="bg-orange-100 dark:bg-orange-900/20 p-3 rounded-xl text-orange-600"><Bike /></div>
                      </div>
                      <h3 className="text-zinc-500 text-sm">Active Partners</h3>
                      <p className="text-3xl font-bold">{stats.activePartners}</p>
                   </div>
                </div>
                
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
                   <h3 className="font-bold mb-4">Recent Orders</h3>
                   <div className="space-y-4">
                     {orders.slice(0, 5).map(order => (
                       <div key={order.id} className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl">
                          <div>
                             <p className="font-bold">{order.id}</p>
                             <p className="text-sm text-zinc-500">{order.items.length} items • ₹{order.total}</p>
                          </div>
                          <Badge className="bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">{order.status}</Badge>
                       </div>
                     ))}
                     {orders.length === 0 && <p className="text-zinc-500 text-center py-4">No orders yet.</p>}
                   </div>
                </div>
             </div>
          )}

          {adminTab === 'products' && (
             <div className="animate-fade-in">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">Menu Management</h2>
                  <Button size="sm"><Plus className="w-4 h-4" /> Add Product</Button>
                </div>
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                   <table className="w-full text-left text-sm">
                     <thead className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
                        <tr>
                          <th className="p-4 font-medium text-zinc-500">Product</th>
                          <th className="p-4 font-medium text-zinc-500">Category</th>
                          <th className="p-4 font-medium text-zinc-500">Price</th>
                          <th className="p-4 font-medium text-zinc-500">Restaurant</th>
                          <th className="p-4 font-medium text-zinc-500">Actions</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {menuItems.map(item => (
                          <tr key={item.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-950/50">
                             <td className="p-4 flex items-center gap-3">
                               <img src={item.image} className="w-10 h-10 rounded-lg object-cover" alt=""/>
                               <span className="font-medium">{item.name}</span>
                             </td>
                             <td className="p-4 text-zinc-500">{item.category}</td>
                             <td className="p-4 font-bold">₹{item.price}</td>
                             <td className="p-4 text-zinc-500">{restaurants.find(r => r.id === item.restaurantId)?.name}</td>
                             <td className="p-4">
                               <button onClick={() => deleteProduct(item.id)} className="text-red-500 hover:bg-red-500/10 p-2 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                             </td>
                          </tr>
                        ))}
                     </tbody>
                   </table>
                </div>
             </div>
          )}

          {adminTab === 'orders' && (
             <div className="animate-fade-in">
                <h2 className="text-2xl font-bold mb-6">Active Orders</h2>
                <div className="space-y-4">
                   {orders.map(order => (
                     <div key={order.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                           <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-bold text-lg">Order #{order.id}</h3>
                                <Badge className={`${order.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{order.status}</Badge>
                              </div>
                              <p className="text-zinc-500 text-sm">{order.address}</p>
                           </div>
                           <p className="font-bold text-xl">₹{order.total}</p>
                        </div>
                        
                        <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
                           <div className="text-sm text-zinc-500">
                              {order.items.length} Items • {new Date(order.date).toLocaleTimeString()}
                           </div>
                           
                           {order.partnerId ? (
                              <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-lg">
                                 <Bike className="w-4 h-4 text-zinc-500" />
                                 <span className="text-sm font-medium">{deliveryPartners.find(p => p.id === order.partnerId)?.name}</span>
                              </div>
                           ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-red-500 font-medium">Unassigned</span>
                                <select 
                                  className="bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-sm outline-none focus:border-brand-500"
                                  onChange={(e) => {
                                     if(e.target.value) assignPartner(order.id, e.target.value);
                                  }}
                                  defaultValue=""
                                >
                                   <option value="" disabled>Assign Partner</option>
                                   {deliveryPartners.filter(p => p.status === 'available').map(p => (
                                     <option key={p.id} value={p.id}>{p.name}</option>
                                   ))}
                                </select>
                              </div>
                           )}
                        </div>
                     </div>
                   ))}
                   {orders.length === 0 && <p className="text-center text-zinc-500 mt-10">No active orders found.</p>}
                </div>
             </div>
          )}

          {adminTab === 'partners' && (
             <div className="animate-fade-in">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">Delivery Partners</h2>
                  <Button size="sm"><Plus className="w-4 h-4" /> Add Partner</Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {deliveryPartners.map(partner => (
                      <div key={partner.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl flex items-center gap-4">
                         <img src={partner.avatar} className="w-16 h-16 rounded-full object-cover" alt="" />
                         <div>
                            <h3 className="font-bold">{partner.name}</h3>
                            <div className="flex items-center gap-2 mb-2">
                               <span className={`w-2 h-2 rounded-full ${
                                 partner.status === 'available' ? 'bg-green-500' : 
                                 partner.status === 'busy' ? 'bg-yellow-500' : 'bg-red-500'
                               }`}></span>
                               <span className="text-xs text-zinc-500 capitalize">{partner.status}</span>
                            </div>
                            <p className="text-xs text-zinc-400">{partner.totalDeliveries} Deliveries • ₹{partner.earnings} Earned</p>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
          )}
        </div>
      </div>
    );
  };

  const DeliveryPartnerApp = () => {
    const partner = deliveryPartners.find(p => p.id === activePartnerId);
    if (!partner) return <div>Partner not found</div>;

    const myOrders = orders.filter(o => o.partnerId === partner.id && o.status !== 'delivered');
    const pastDeliveries = orders.filter(o => o.partnerId === partner.id && o.status === 'delivered');

    const updateDeliveryStatus = (orderId: string, newStatus: Order['status']) => {
       setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
       if (newStatus === 'delivered') {
          setDeliveryPartners(prev => prev.map(p => p.id === partner.id ? { 
             ...p, 
             status: 'available', 
             earnings: p.earnings + 40,
             totalDeliveries: p.totalDeliveries + 1
          } : p));
          showToast('Order Delivered! Earnings updated.', 'success');
       } else {
         showToast(`Status updated to ${newStatus}`, 'info');
       }
    };

    return (
      <div className="min-h-screen bg-zinc-950 text-white pb-20 max-w-md mx-auto border-x border-zinc-800">
         {/* Header */}
         <div className="bg-brand-600 p-6 rounded-b-3xl shadow-lg mb-6">
            <div className="flex justify-between items-center mb-4">
               <div className="flex items-center gap-3">
                  <img src={partner.avatar} className="w-12 h-12 rounded-full border-2 border-white/20" alt="" />
                  <div>
                     <h2 className="font-bold text-lg">{partner.name}</h2>
                     <div className="flex items-center gap-1 text-xs text-brand-100">
                        <span className={`w-2 h-2 rounded-full bg-green-400`}></span> Online
                     </div>
                  </div>
               </div>
               <div className="text-right">
                  <p className="text-brand-200 text-xs">Today's Earnings</p>
                  <p className="text-2xl font-bold">₹{partner.earnings}</p>
               </div>
            </div>
         </div>

         {/* Content */}
         <div className="px-4 space-y-6">
            <div className="flex gap-2 mb-4">
              <span className="bg-zinc-800 text-white px-4 py-1.5 rounded-full text-sm font-medium border border-zinc-700">Active ({myOrders.length})</span>
              <span className="text-zinc-500 px-4 py-1.5 text-sm font-medium">History</span>
            </div>

            {myOrders.length === 0 ? (
               <div className="text-center py-20 opacity-50">
                  <Bike className="w-16 h-16 mx-auto mb-4" />
                  <p>No active orders</p>
                  <p className="text-sm">Wait for new assignments</p>
               </div>
            ) : (
               myOrders.map(order => (
                  <div key={order.id} className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl relative overflow-hidden">
                     {/* Map Placeholder */}
                     <div className="h-32 bg-zinc-800 -mx-5 -mt-5 mb-4 relative flex items-center justify-center">
                        <div className="absolute inset-0 opacity-20" style={{backgroundImage: 'radial-gradient(circle, #333 1px, transparent 1px)', backgroundSize: '10px 10px'}}></div>
                        <MapPin className="text-brand-500 w-8 h-8" />
                        <span className="absolute bottom-2 right-2 bg-black/50 px-2 py-1 rounded text-xs">Simulated Map</span>
                     </div>

                     <div className="flex justify-between items-start mb-4">
                        <div>
                           <h3 className="font-bold text-lg">Order #{order.id}</h3>
                           <p className="text-zinc-400 text-sm">{order.address}</p>
                        </div>
                        <div className="bg-brand-500/10 text-brand-500 px-2 py-1 rounded text-xs font-bold uppercase">{order.status}</div>
                     </div>

                     <div className="space-y-2 mb-6">
                        {order.items.map(item => (
                           <div key={item.id} className="flex justify-between text-sm text-zinc-400">
                              <span>{item.quantity}x {item.name}</span>
                              {/* <span>₹{item.price * item.quantity}</span> */}
                           </div>
                        ))}
                     </div>

                     {/* Action Buttons */}
                     <div className="grid grid-cols-1 gap-3">
                        {order.status === 'confirmed' && (
                           <Button onClick={() => updateDeliveryStatus(order.id, 'out_for_delivery')} className="w-full bg-brand-600 hover:bg-brand-500">
                              Slide to Start Delivery
                           </Button>
                        )}
                        {order.status === 'out_for_delivery' && (
                           <Button onClick={() => updateDeliveryStatus(order.id, 'delivered')} className="w-full bg-green-600 hover:bg-green-500">
                              Mark Delivered
                           </Button>
                        )}
                     </div>
                  </div>
               ))
            )}
         </div>
      </div>
    );
  };

  const CustomerApp = () => {
    // --- Global State Mapped to Local ---
    // In a real app, this would be context. Here we use the props passed down or access parent state directly.
    // Since everything is in one file, we access parent state directly.
    const [activeTab, setActiveTab] = useState<'home' | 'food' | 'stationery' | 'orders'>('home');
    const [view, setView] = useState<'main' | 'restaurant'>('main'); // Sub-navigation state
    const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isVegOnly, setIsVegOnly] = useState(false);
    
    // UI State
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [isAiOpen, setIsAiOpen] = useState(false);
    
    // AI State
    const [chatMessages, setChatMessages] = useState<{role: 'user' | 'ai', text: string}[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isAiThinking, setIsAiThinking] = useState(false);
  
    // Checkout Form State
    const [checkoutDetails, setCheckoutDetails] = useState({ hostel: '', room: '', phone: '' });

    // Hero Slideshow State
    const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
    const heroImages = useMemo(() => [
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=2070&auto=format&fit=crop", // Food Dark
      "https://images.unsplash.com/photo-1552566626-52f8b828add9?q=80&w=2070&auto=format&fit=crop", // Restaurant
      "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?q=80&w=2070&auto=format&fit=crop", // Stationery
      "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=2070&auto=format&fit=crop", // Books/Library
      "https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=2070&auto=format&fit=crop"  // Fresh Bowl
    ], []);

    useEffect(() => {
      const interval = setInterval(() => {
        setCurrentHeroIndex((prev) => (prev + 1) % heroImages.length);
      }, 5000);
      return () => clearInterval(interval);
    }, [heroImages.length]);

    // --- Helpers ---
    const toggleFavorite = (e: React.MouseEvent, itemId: string) => {
      e.stopPropagation();
      setFavorites(prev => {
        const next = new Set(prev);
        if (next.has(itemId)) {
          next.delete(itemId);
          showToast("Removed from favorites", "info");
        } else {
          next.add(itemId);
          showToast("Added to favorites", "success");
        }
        return next;
      });
    };
  
    // --- Derived State ---
    const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const deliveryFee = 20;
    
    const filteredItems = useMemo(() => {
      let items = menuItems;
      
      // 1. Restaurant Filter
      if (view === 'restaurant' && selectedRestaurantId) {
        items = items.filter(i => i.restaurantId === selectedRestaurantId);
      }
      
      // 2. Search Filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        items = items.filter(item => 
          item.name.toLowerCase().includes(q) || 
          item.category.toLowerCase().includes(q) ||
          restaurants.find(r => r.id === item.restaurantId)?.name.toLowerCase().includes(q)
        );
      }
  
      // 3. Tab Category Filter (if on main view)
      if (view === 'main' && activeTab === 'food') {
         items = items.filter(item => [CategoryType.FastFood, CategoryType.Beverages, CategoryType.Meals].includes(item.category));
      } else if (view === 'main' && activeTab === 'stationery') {
         items = items.filter(item => [CategoryType.Notebooks, CategoryType.Pens, CategoryType.Files].includes(item.category));
      }
  
      // 4. Veg Filter
      if (isVegOnly) {
        items = items.filter(item => item.isVeg);
      }
  
      return items;
    }, [menuItems, searchQuery, activeTab, view, selectedRestaurantId, isVegOnly, restaurants]);
  
    const selectedRestaurant = useMemo(() => 
      restaurants.find(r => r.id === selectedRestaurantId), 
    [restaurants, selectedRestaurantId]);
  
    // --- Actions ---
    const handleAddToCart = (item: MenuItem, e?: React.MouseEvent) => {
      if(e) e.stopPropagation();
      setCart(prev => {
        const existing = prev.find(i => i.id === item.id);
        if (existing) {
          return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
        }
        showToast(`Added ${item.name} to cart`, 'success');
        return [...prev, { ...item, quantity: 1 }];
      });
    };
  
    const handleUpdateQuantity = (itemId: string, delta: number, e?: React.MouseEvent) => {
      if(e) e.stopPropagation();
      setCart(prev => prev.map(item => {
        if (item.id === itemId) {
          return { ...item, quantity: Math.max(0, item.quantity + delta) };
        }
        return item;
      }).filter(item => item.quantity > 0));
    };
  
    const getItemQuantity = (itemId: string) => {
      return cart.find(i => i.id === itemId)?.quantity || 0;
    };
  
    const handleRestaurantClick = (id: string) => {
      setSelectedRestaurantId(id);
      setView('restaurant');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
  
    const handlePlaceOrder = () => {
      if (!checkoutDetails.hostel || !checkoutDetails.room) {
        showToast("Please fill in delivery details", "error");
        return;
      }
  
      const newOrder: Order = {
        id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
        items: [...cart],
        total: cartTotal + deliveryFee,
        status: 'placed',
        date: new Date(),
        address: `${checkoutDetails.hostel}, Room ${checkoutDetails.room}`
      };
  
      setOrders([newOrder, ...orders]);
      setCart([]);
      setIsCheckoutOpen(false);
      setIsCartOpen(false);
      setActiveTab('orders');
      setView('main');
      showToast("Order Placed Successfully!", "success");
    };

    // Sub Components specific to Customer App
    const AddButton: React.FC<{ item: MenuItem, className?: string }> = ({ item, className = '' }) => {
      const qty = getItemQuantity(item.id);
      if (qty === 0) {
        return (
          <button 
            onClick={(e) => handleAddToCart(item, e)}
            className={`bg-brand-50 dark:bg-brand-500/10 px-6 py-2 rounded-xl text-brand-600 dark:text-brand-400 font-bold text-sm hover:bg-brand-100 dark:hover:bg-brand-500/20 transition-colors shadow-sm uppercase tracking-wide border border-brand-200 dark:border-brand-500/30 ${className}`}
          >
            Add
          </button>
        );
      }
      return (
        <div className={`flex items-center bg-brand-600 rounded-xl shadow-md h-9 ${className}`}>
          <button 
            onClick={(e) => handleUpdateQuantity(item.id, -1, e)}
            className="w-8 h-full flex items-center justify-center text-white hover:bg-brand-700 rounded-l-xl transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="w-8 text-center text-white font-bold text-sm">{qty}</span>
          <button 
            onClick={(e) => handleUpdateQuantity(item.id, 1, e)}
            className="w-8 h-full flex items-center justify-center text-white hover:bg-brand-700 rounded-r-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      );
    };

    const ItemCard: React.FC<{ item: MenuItem }> = ({ item }) => (
      <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-sm rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800/50 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-xl hover:shadow-black/5 transition-all flex flex-col group relative">
        <div className="absolute top-3 right-3 z-10">
          <button 
            onClick={(e) => toggleFavorite(e, item.id)}
            className="p-2 bg-white/40 dark:bg-black/40 backdrop-blur-md rounded-full hover:bg-white/60 dark:hover:bg-black/60 transition-colors shadow-sm"
          >
            <Heart className={`w-4 h-4 ${favorites.has(item.id) ? 'fill-brand-500 text-brand-500' : 'text-zinc-900 dark:text-white'}`} />
          </button>
        </div>
        
        <div className="relative aspect-[5/4] overflow-hidden">
          <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
          <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
               <div className="flex items-center gap-2">
                   {item.isVeg ? (
                       <div className="w-4 h-4 border-2 border-green-500 flex items-center justify-center rounded-[4px] bg-green-950/30">
                         <div className="w-2 h-2 rounded-full bg-green-500"></div>
                       </div>
                   ) : (
                      <div className="w-4 h-4 border-2 border-red-500 flex items-center justify-center rounded-[4px] bg-red-950/30">
                         <div className="w-2 h-2 rounded-full bg-red-500"></div>
                       </div>
                   )}
                   {item.rating && (
                     <div className="flex items-center gap-1 bg-yellow-500/20 px-1.5 py-0.5 rounded text-[10px] text-yellow-400 font-bold border border-yellow-500/30">
                        <Star className="w-3 h-3 fill-yellow-400" /> {item.rating}
                     </div>
                   )}
               </div>
          </div>
        </div>
        
        <div className="p-4 flex flex-col flex-grow">
          <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-base leading-tight mb-1">{item.name}</h3>
          <p className="text-zinc-500 dark:text-zinc-500 text-xs line-clamp-2 mb-4 flex-grow">{item.description}</p>
          
          <div className="flex items-center justify-between mt-auto pt-3 border-t border-zinc-100 dark:border-zinc-800/50">
            <div>
              <span className="text-zinc-400 text-xs block mb-0.5">Price</span>
              <span className="text-zinc-900 dark:text-white font-bold text-lg">₹{item.price}</span>
            </div>
            <AddButton item={item} />
          </div>
        </div>
      </div>
    );

    const OrderCard: React.FC<{ order: Order }> = ({ order }) => {
      const steps = ['placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered'];
      const currentStepIndex = steps.indexOf(order.status);
      
      return (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 mb-4 shadow-lg shadow-zinc-200/50 dark:shadow-black/50">
          <div className="flex justify-between items-start mb-4 border-b border-zinc-100 dark:border-zinc-800 pb-4">
             <div>
               <div className="flex items-center gap-2 mb-1">
                 <h3 className="font-bold text-zinc-900 dark:text-white text-lg">Order #{order.id}</h3>
                 <Badge className={
                   order.status === 'delivered' ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400'
                 }>
                   {order.status.replace(/_/g, ' ').toUpperCase()}
                 </Badge>
               </div>
               <p className="text-zinc-500 dark:text-zinc-400 text-xs">{order.date.toLocaleString()}</p>
             </div>
             <p className="text-xl font-bold text-zinc-900 dark:text-white">₹{order.total}</p>
          </div>
  
          <div className="mb-6">
             <div className="flex justify-between items-center relative z-10">
               {steps.map((step, idx) => {
                 const isActive = idx <= currentStepIndex;
                 const icons: any = {
                   placed: CreditCard,
                   confirmed: CheckCircle2,
                   preparing: ChefHat,
                   out_for_delivery: Bike,
                   delivered: Home
                 };
                 const Icon = icons[step];
  
                 return (
                   <div key={step} className="flex flex-col items-center gap-2 flex-1">
                     <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 ${
                       isActive ? 'bg-brand-600 text-white scale-110 shadow-lg shadow-brand-500/30' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600'
                     }`}>
                       <Icon className="w-4 h-4" />
                     </div>
                     <span className={`text-[10px] font-medium hidden sm:block ${isActive ? 'text-brand-600 dark:text-brand-500' : 'text-zinc-400 dark:text-zinc-600'}`}>
                       {step.replace(/_/g, ' ')}
                     </span>
                   </div>
                 );
               })}
               <div className="absolute top-4 left-0 w-full h-0.5 bg-zinc-200 dark:bg-zinc-800 -z-10"></div>
               <div 
                 className="absolute top-4 left-0 h-0.5 bg-brand-600 -z-10 transition-all duration-1000"
                 style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
               ></div>
             </div>
          </div>
  
          <div className="space-y-2">
            {order.items.map(item => (
              <div key={item.id} className="flex justify-between text-sm text-zinc-600 dark:text-zinc-300">
                 <span className="flex items-center gap-2">
                   <span className="bg-zinc-100 dark:bg-zinc-800 px-1.5 rounded text-xs text-zinc-500 dark:text-zinc-400">x{item.quantity}</span> 
                   {item.name}
                 </span>
                 <span>₹{item.price * item.quantity}</span>
              </div>
            ))}
          </div>
        </div>
      );
    };
    
    // ... Customer App Layout & Views (Hero, Restaurant Details, etc.) ...
    // Reuse the exact same UI structure as before, wrapped here.
    
    const RestaurantDetailView = () => {
        if (!selectedRestaurant) return null;
    
        const restaurantItems = menuItems.filter(i => i.restaurantId === selectedRestaurant.id);
        const categories = Array.from(new Set(restaurantItems.map(i => i.category)));
    
        return (
          <div className="animate-fade-in min-h-screen bg-zinc-50 dark:bg-black">
            {/* Header */}
            <div className="relative h-64 md:h-80">
              <img src={selectedRestaurant.image} className="w-full h-full object-cover" alt="" />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-50 dark:from-zinc-950 via-zinc-900/60 to-transparent"></div>
              
              <div className="absolute bottom-0 left-0 right-0 p-4 max-w-7xl mx-auto w-full">
                <button 
                  onClick={() => { setView('main'); setSelectedRestaurantId(null); }}
                  className="absolute top-[-200px] left-4 bg-white/40 dark:bg-black/40 backdrop-blur-md p-2 rounded-full text-white hover:bg-white/60 dark:hover:bg-black/60 transition-colors"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
    
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div>
                    <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-2">{selectedRestaurant.name}</h1>
                    <p className="text-zinc-200 dark:text-zinc-300 text-lg mb-4">{selectedRestaurant.cuisine}</p>
                    <div className="flex flex-wrap items-center gap-4 text-sm font-medium">
                       <div className="bg-green-600/20 text-green-400 border border-green-600/30 px-3 py-1 rounded-full flex items-center gap-1 backdrop-blur-md">
                         <Star className="w-4 h-4 fill-green-400" /> {selectedRestaurant.rating} Rating
                       </div>
                       <div className="bg-white/10 dark:bg-zinc-800/80 text-white dark:text-zinc-300 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1 border border-white/10">
                         <Clock className="w-4 h-4" /> {selectedRestaurant.deliveryTime}
                       </div>
                       <div className="bg-white/10 dark:bg-zinc-800/80 text-white dark:text-zinc-300 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1 border border-white/10">
                         <MapPin className="w-4 h-4" /> {selectedRestaurant.location}
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
    
            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 py-8">
               <div className="sticky top-20 z-30 bg-zinc-50/80 dark:bg-black/80 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800 py-4 mb-8 -mx-4 px-4 overflow-x-auto no-scrollbar flex items-center gap-3">
                  <span className="text-zinc-500 text-sm font-medium mr-2">Jump to:</span>
                  {categories.map(cat => (
                    <a 
                      key={cat} 
                      href={`#cat-${cat}`}
                      className="px-4 py-2 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-brand-600 dark:hover:text-white hover:border-brand-500 whitespace-nowrap text-sm transition-all shadow-sm"
                    >
                      {cat}
                    </a>
                  ))}
                  <div className="h-6 w-px bg-zinc-300 dark:bg-zinc-800 mx-2"></div>
                  <div className="flex items-center gap-2">
                     <span className={`text-sm ${isVegOnly ? 'text-green-600 dark:text-green-500 font-bold' : 'text-zinc-400'}`}>Veg Only</span>
                     <button 
                      onClick={() => setIsVegOnly(!isVegOnly)}
                      className={`w-10 h-5 rounded-full relative transition-colors ${isVegOnly ? 'bg-green-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                     >
                       <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${isVegOnly ? 'left-5.5' : 'left-0.5'}`}></div>
                     </button>
                  </div>
               </div>
    
               <div className="space-y-12">
                 {categories.map(cat => {
                   const itemsInCat = filteredItems.filter(i => i.category === cat);
                   if (itemsInCat.length === 0) return null;
    
                   return (
                     <div key={cat} id={`cat-${cat}`} className="scroll-mt-40">
                       <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-6 flex items-center gap-3">
                         {cat} <span className="text-zinc-500 dark:text-zinc-600 text-base font-normal">({itemsInCat.length})</span>
                       </h2>
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                         {itemsInCat.map(item => (
                           <ItemCard key={item.id} item={item} />
                         ))}
                       </div>
                     </div>
                   );
                 })}
               </div>
            </div>
          </div>
        );
      };

    return (
        <div className="bg-zinc-50 dark:bg-black min-h-screen text-zinc-900 dark:text-zinc-100 font-sans selection:bg-brand-500/30">
            {/* Nav */}
            <nav className="sticky top-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center gap-3 cursor-pointer group" onClick={() => { setActiveTab('home'); setView('main'); }}>
                  <div className="bg-gradient-to-tr from-brand-600 to-brand-500 p-2 rounded-xl shadow-lg shadow-brand-500/20 group-hover:scale-110 transition-transform">
                    <ShoppingBag className="text-white w-5 h-5" />
                  </div>
                  <span className="text-xl font-bold tracking-tighter text-zinc-900 dark:text-white">PU<span className="text-brand-600 dark:text-brand-500">Pulse</span></span>
                </div>
    
                <div className="flex-1 max-w-xl mx-8 hidden md:block">
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-zinc-400 group-focus-within:text-brand-500 transition-colors" />
                    </div>
                    <input
                      type="text"
                      className="block w-full pl-10 pr-3 py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl leading-5 bg-zinc-100 dark:bg-zinc-900/50 text-zinc-900 dark:text-zinc-300 placeholder-zinc-500 focus:outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 sm:text-sm transition-all shadow-inner"
                      placeholder="Search for food, restaurant, or stationery..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
    
                <div className="flex items-center gap-2 sm:gap-4">
                  <button 
                    onClick={toggleTheme}
                    className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-all"
                  >
                    {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  </button>
    
                  <button 
                    className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-500/10 rounded-full transition-all relative group"
                    onClick={() => setIsAiOpen(true)}
                  >
                    <Sparkles className="w-5 h-5" />
                  </button>
                  
                  <div className="hidden md:flex bg-zinc-100 dark:bg-zinc-900/50 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800/50">
                    {['Home', 'Food', 'Stationery', 'Orders'].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => { setActiveTab(tab.toLowerCase() as any); setView('main'); }}
                        className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
                          activeTab === tab.toLowerCase() 
                            ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' 
                            : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
    
                  <button 
                    className="relative p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                    onClick={() => setIsCartOpen(true)}
                  >
                    <div className="relative">
                       <ShoppingBag className="w-6 h-6" />
                       {cart.length > 0 && (
                         <span className="absolute -top-2 -right-2 bg-brand-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white dark:border-black min-w-[18px] text-center">
                           {cart.length}
                         </span>
                       )}
                    </div>
                  </button>
                  
                  <button className="md:hidden text-zinc-500 dark:text-zinc-400 p-2">
                     <Menu className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>
            </nav>

            {/* Main Content Area */}
            {view === 'restaurant' ? (
                <RestaurantDetailView />
            ) : (
                <main className="pb-20">
                {activeTab === 'home' && (
                    <>
                    <div className="relative overflow-hidden bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 mb-8 min-h-[500px] flex items-center group">
                        <div className="absolute inset-0 z-0">
                            {heroImages.map((img, index) => (
                                <img 
                                    key={img}
                                    src={img} 
                                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${
                                        index === currentHeroIndex ? 'opacity-60 dark:opacity-40' : 'opacity-0'
                                    }`} 
                                    alt={`Hero background ${index + 1}`}
                                />
                            ))}
                            {/* Gradients */}
                            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-transparent/20"></div>
                            <div className="absolute inset-0 bg-gradient-to-t from-zinc-5 dark:from-zinc-950 via-transparent to-transparent"></div>
                        </div>
                        {/* Dots Indicator */}
                        <div className="absolute bottom-8 right-8 z-20 flex gap-2">
                            {heroImages.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => setCurrentHeroIndex(index)}
                                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                        index === currentHeroIndex ? 'bg-brand-500 w-6' : 'bg-white/30 hover:bg-white/50'
                                    }`}
                                />
                            ))}
                        </div>
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10 w-full">
                            <div className="max-w-2xl animate-slide-in">
                            <Badge className="bg-brand-500 text-white mb-6 inline-flex items-center gap-1 shadow-lg shadow-brand-500/20">
                                <Sparkles className="w-3 h-3" /> PU Pulse Exclusive
                            </Badge>
                            <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight mb-6 leading-tight">
                                Food & Stationery <br/>
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-600">Delivered Fast</span>
                            </h1>
                            <p className="text-xl text-zinc-300 mb-8 max-w-lg leading-relaxed font-light">
                                Order from your favorite food courts and get stationery essentials delivered right to your hostel. Campus-wide delivery in minutes.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <Button size="lg" onClick={() => setActiveTab('food')} className="px-8 shadow-brand-500/25">
                                Order Food
                                </Button>
                                <Button size="lg" variant="secondary" onClick={() => setActiveTab('stationery')} className="px-8 bg-white/10 backdrop-blur border-white/10 hover:bg-white/20 text-white border-white/20">
                                Buy Stationery
                                </Button>
                            </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 relative z-20 mb-16">
                        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl shadow-zinc-200/50 dark:shadow-black/50">
                            <h3 className="text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-wider mb-4">Browse Categories</h3>
                            <div className="flex gap-4 overflow-x-auto no-scrollbar">
                            {CATEGORIES.map(cat => {
                                const icons: any = { Pizza: UtensilsCrossed, CupSoda: ShoppingBag, Utensils: UtensilsCrossed, Book: PenTool, Pen: PenTool, Folder: PenTool };
                                const Icon = icons[cat.icon] || ShoppingBag;
                                return (
                                <div 
                                    key={cat.id}
                                    onClick={() => { setSearchQuery(cat.name); setActiveTab(cat.id.startsWith('c4') || cat.id.startsWith('c5') || cat.id.startsWith('c6') ? 'stationery' : 'food'); }}
                                    className="flex flex-col items-center gap-3 p-4 min-w-[100px] hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl cursor-pointer transition-all group"
                                >
                                    <div className="w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 group-hover:border-brand-500/50 group-hover:bg-brand-500/10 flex items-center justify-center transition-all group-hover:scale-110">
                                    <Icon className="w-6 h-6 text-zinc-400 dark:text-zinc-400 group-hover:text-brand-600 dark:group-hover:text-brand-500 transition-colors" />
                                    </div>
                                    <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white">{cat.name}</span>
                                </div>
                                )
                            })}
                            </div>
                        </div>
                    </div>

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
                        <section>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                            <span className="w-1 h-8 bg-brand-500 rounded-full"></span>
                            Food Courts
                            </h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {restaurants.filter(r => r.name !== 'Stationery Depot').map(r => (
                            <div 
                                key={r.id} 
                                onClick={() => handleRestaurantClick(r.id)}
                                className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600 transition-all cursor-pointer group hover:-translate-y-1 hover:shadow-xl hover:shadow-black/10 dark:hover:shadow-black/50"
                            >
                                <div className="relative h-48 overflow-hidden">
                                <img src={r.image} alt={r.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent opacity-60"></div>
                                <div className="absolute bottom-4 left-4">
                                    <h3 className="font-bold text-white text-xl shadow-black drop-shadow-md">{r.name}</h3>
                                    <p className="text-zinc-200 text-sm">{r.cuisine}</p>
                                </div>
                                <div className="absolute top-4 right-4 bg-green-900/80 backdrop-blur text-green-400 text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                                    <Star className="w-3 h-3 fill-green-400" /> {r.rating}
                                </div>
                                </div>
                                <div className="p-4 flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-medium">
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {r.deliveryTime}</span>
                                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {r.location}</span>
                                </div>
                            </div>
                            ))}
                        </div>
                        </section>

                        <section>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                            <span className="w-1 h-8 bg-brand-500 rounded-full"></span>
                            Trending Items
                            </h2>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {menuItems.slice(0, 4).map(item => (
                            <ItemCard key={item.id} item={item} />
                            ))}
                        </div>
                        </section>

                        <section className="py-8">
                        <div className="text-center mb-10">
                            <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mb-4">Why Choose PU Pulse?</h2>
                            <p className="text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto">
                            We're committed to making campus life easier with quick deliveries, quality products, and student-friendly prices.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl flex items-start gap-4 hover:border-brand-500/30 transition-colors">
                            <div className="bg-orange-100 dark:bg-orange-900/20 p-3 rounded-xl text-brand-600 dark:text-brand-500 shrink-0">
                                <Zap className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-1">Lightning Fast Delivery</h3>
                                <p className="text-zinc-500 dark:text-zinc-400 text-sm">Get your orders delivered within 15-20 minutes across campus</p>
                            </div>
                            </div>
                            <div className="bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl flex items-start gap-4 hover:border-brand-500/30 transition-colors">
                            <div className="bg-orange-100 dark:bg-orange-900/20 p-3 rounded-xl text-brand-600 dark:text-brand-500 shrink-0">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-1">Safe & Hygienic</h3>
                                <p className="text-zinc-500 dark:text-zinc-400 text-sm">All vendors follow strict hygiene and safety protocols</p>
                            </div>
                            </div>
                            <div className="bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl flex items-start gap-4 hover:border-brand-500/30 transition-colors">
                            <div className="bg-orange-100 dark:bg-orange-900/20 p-3 rounded-xl text-brand-600 dark:text-brand-500 shrink-0">
                                <Clock className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-1">Extended Hours</h3>
                                <p className="text-zinc-500 dark:text-zinc-400 text-sm">Order from 8 AM to 10 PM, seven days a week</p>
                            </div>
                            </div>
                            <div className="bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl flex items-start gap-4 hover:border-brand-500/30 transition-colors">
                            <div className="bg-orange-100 dark:bg-orange-900/20 p-3 rounded-xl text-brand-600 dark:text-brand-500 shrink-0">
                                <MapPin className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-1">Campus Wide Coverage</h3>
                                <p className="text-zinc-500 dark:text-zinc-400 text-sm">Delivery to all hostels, departments, and common areas</p>
                            </div>
                            </div>
                        </div>
                        </section>

                        <section className="py-8">
                        <div className="bg-gradient-to-r from-brand-500 to-brand-600 rounded-3xl p-8 md:p-12 text-center text-white relative overflow-hidden shadow-2xl shadow-brand-500/20">
                            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-black/10 rounded-full blur-3xl"></div>
                            <div className="relative z-10 max-w-2xl mx-auto">
                            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Order?</h2>
                            <p className="text-brand-100 mb-8 text-lg">Browse through our wide selection of food and stationery items. Fast delivery guaranteed!</p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <button onClick={() => setActiveTab('food')} className="bg-zinc-900 text-white hover:bg-black px-8 py-3 rounded-xl font-bold transition-transform active:scale-95 shadow-lg flex items-center justify-center gap-2">
                                <UtensilsCrossed className="w-4 h-4" /> Order Food
                                </button>
                                <button onClick={() => setActiveTab('stationery')} className="bg-white/20 hover:bg-white/30 text-white border border-white/40 px-8 py-3 rounded-xl font-bold transition-colors backdrop-blur-sm flex items-center justify-center gap-2">
                                <PenTool className="w-4 h-4" /> Shop Stationery
                                </button>
                            </div>
                            </div>
                        </div>
                        </section>
                    </div>
                    </>
                )}

                {(activeTab === 'food' || activeTab === 'stationery') && (
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                        <div>
                        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white capitalize flex items-center gap-3">
                            {activeTab === 'food' ? <UtensilsCrossed className="w-8 h-8 text-brand-500" /> : <PenTool className="w-8 h-8 text-brand-500" />}
                            {activeTab} Delivery
                        </h1>
                        <p className="text-zinc-500 dark:text-zinc-400 mt-1">Found {filteredItems.length} items</p>
                        </div>
                        
                        <div className="flex items-center gap-3 bg-zinc-100 dark:bg-zinc-900 p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
                        <button 
                            onClick={() => setIsVegOnly(false)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${!isVegOnly ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'}`}
                        >
                            All
                        </button>
                        {activeTab === 'food' && (
                            <button 
                            onClick={() => setIsVegOnly(true)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${isVegOnly ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-900' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'}`}
                            >
                            <div className="w-3 h-3 border border-current flex items-center justify-center rounded-[2px]"><div className="w-1.5 h-1.5 rounded-full bg-current"></div></div>
                            Veg Only
                            </button>
                        )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredItems.map(item => (
                        <ItemCard key={item.id} item={item} />
                        ))}
                    </div>
                    
                    {filteredItems.length === 0 && (
                        <div className="text-center py-20">
                        <div className="bg-zinc-100 dark:bg-zinc-900 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search className="w-8 h-8 text-zinc-400 dark:text-zinc-600" />
                        </div>
                        <h3 className="text-zinc-900 dark:text-white font-bold text-lg">No items found</h3>
                        <p className="text-zinc-500">Try adjusting your filters or search query</p>
                        </div>
                    )}
                    </div>
                )}

                {activeTab === 'orders' && (
                    <div className="max-w-3xl mx-auto px-4 py-8 animate-fade-in min-h-[60vh]">
                        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-8">Your Orders</h1>
                        
                        {orders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-zinc-50/50 dark:bg-zinc-900/30">
                            <ShoppingBag className="w-16 h-16 text-zinc-300 dark:text-zinc-700 mb-4" />
                            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">No Past Orders</h2>
                            <p className="text-zinc-500 mb-6 max-w-sm">Looks like you haven't ordered anything yet. Hungry? Grab a bite!</p>
                            <Button onClick={() => setActiveTab('food')}>Order Now</Button>
                        </div>
                        ) : (
                        <div className="space-y-6">
                            {orders.map(order => (
                            <OrderCard key={order.id} order={order} />
                            ))}
                        </div>
                        )}
                    </div>
                )}
                </main>
            )}

            {/* Modals & Drawers */}
            {/* Cart Drawer */}
            <>
                {isCartOpen && <div className="fixed inset-0 bg-black/60 dark:bg-black/60 backdrop-blur-sm z-50 transition-opacity" onClick={() => setIsCartOpen(false)} />}
                <div className={`fixed inset-y-0 right-0 w-full sm:w-[450px] bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl z-50 transform transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="flex flex-col h-full">
                    <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-900">
                    <div>
                        <h2 className="font-bold text-zinc-900 dark:text-white text-xl">Your Cart</h2>
                        <p className="text-zinc-500 dark:text-zinc-500 text-sm">{cart.length} items from {new Set(cart.map(i => i.restaurantId)).size} spots</p>
                    </div>
                    <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-6">
                        <div className="w-24 h-24 bg-zinc-100 dark:bg-zinc-800/50 rounded-full flex items-center justify-center animate-pulse">
                            <ShoppingBag className="w-10 h-10 opacity-30" />
                        </div>
                        <div className="text-center">
                            <p className="text-lg font-medium text-zinc-900 dark:text-white">Your cart is empty</p>
                            <p className="text-sm">Looks like you haven't added anything yet.</p>
                        </div>
                        <Button variant="outline" onClick={() => setIsCartOpen(false)}>Start Ordering</Button>
                        </div>
                    ) : (
                        cart.map(item => (
                        <div key={item.id} className="flex gap-4 bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                            <img src={item.image} className="w-20 h-20 rounded-xl object-cover" alt="" />
                            <div className="flex-1 flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-start">
                                <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-1 line-clamp-1">{item.name}</h3>
                                <span className="text-sm font-bold text-zinc-900 dark:text-white">₹{item.price * item.quantity}</span>
                                </div>
                                <p className="text-xs text-zinc-500 mb-2">{restaurants.find(r => r.id === item.restaurantId)?.name}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-1">
                                <button 
                                    onClick={() => handleUpdateQuantity(item.id, -1)}
                                    className="w-6 h-6 flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
                                >
                                    <Minus className="w-3 h-3" />
                                </button>
                                <span className="text-sm font-bold text-zinc-900 dark:text-white w-4 text-center">{item.quantity}</span>
                                <button 
                                    onClick={() => handleUpdateQuantity(item.id, 1)}
                                    className="w-6 h-6 flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
                                >
                                    <Plus className="w-3 h-3" />
                                </button>
                                </div>
                            </div>
                            </div>
                        </div>
                        ))
                    )}
                    </div>

                    {cart.length > 0 && (
                    <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4">
                        <div className="space-y-2 text-sm">
                        <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                            <span>Item Total</span>
                            <span>₹{cartTotal}</span>
                        </div>
                        <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                            <span>Delivery Fee</span>
                            <span>₹{deliveryFee}</span>
                        </div>
                        <div className="flex justify-between text-zinc-900 dark:text-white font-bold text-xl pt-4 border-t border-zinc-200 dark:border-zinc-800">
                            <span>Total Pay</span>
                            <span>₹{cartTotal + deliveryFee}</span>
                        </div>
                        </div>
                        
                        <Button className="w-full py-4 text-lg" onClick={() => setIsCheckoutOpen(true)}>
                        Proceed to Checkout
                        </Button>
                    </div>
                    )}
                </div>
                </div>
            </>

            {/* Checkout Modal */}
            {isCheckoutOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden animate-scale-in">
                    <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                        <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Delivery Details</h2>
                        <button onClick={() => setIsCheckoutOpen(false)} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white"><X /></button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Hostel / Building</label>
                            <select 
                            className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 text-zinc-900 dark:text-white focus:border-brand-500 outline-none"
                            value={checkoutDetails.hostel}
                            onChange={e => setCheckoutDetails({...checkoutDetails, hostel: e.target.value})}
                            >
                            <option value="">Select Location</option>
                            <option value="Boys Hostel 1">Boys Hostel 1</option>
                            <option value="Girls Hostel 3">Girls Hostel 3</option>
                            <option value="Admin Block">Admin Block</option>
                            <option value="Library">Library</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Room Number</label>
                            <input 
                            type="text" 
                            placeholder="e.g. 304-B" 
                            className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 text-zinc-900 dark:text-white focus:border-brand-500 outline-none"
                            value={checkoutDetails.room}
                            onChange={e => setCheckoutDetails({...checkoutDetails, room: e.target.value})}
                            />
                        </div>
                        <div className="bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-500/20 p-4 rounded-xl flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center text-brand-600 dark:text-brand-500">
                            <CreditCard className="w-5 h-5" />
                            </div>
                            <div>
                            <p className="text-sm font-bold text-zinc-900 dark:text-white">Pay on Delivery</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">UPI / Cash available</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-black/20">
                        <Button className="w-full py-3" onClick={handlePlaceOrder}>
                            Confirm Order • ₹{cartTotal + deliveryFee}
                        </Button>
                    </div>
                </div>
                </div>
            )}

            {/* AI Chat Modal */}
            {isAiOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden flex flex-col h-[600px] animate-scale-in">
                    <div className="p-4 bg-gradient-to-r from-brand-500 to-brand-600 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Sparkles className="text-white w-5 h-5" />
                        <h3 className="font-bold text-white">Ask Pulse AI</h3>
                    </div>
                    <button onClick={() => setIsAiOpen(false)} className="text-white/80 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50 dark:bg-zinc-900">
                    {chatMessages.length === 0 && (
                        <div className="text-center text-zinc-500 mt-20">
                            <div className="bg-zinc-100 dark:bg-zinc-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Sparkles className="w-8 h-8 text-brand-500" />
                            </div>
                            <p className="text-sm mb-6">Hi! I can help you decide what to eat or find stationery.</p>
                            <div className="flex flex-wrap gap-2 justify-center">
                                <button onClick={() => setChatInput("Suggest a spicy snack")} className="text-xs bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 px-3 py-1.5 rounded-full text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 shadow-sm">🌶️ Spicy Snacks</button>
                                <button onClick={() => setChatInput("I need exam supplies")} className="text-xs bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 px-3 py-1.5 rounded-full text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 shadow-sm">📝 Exam Supplies</button>
                            </div>
                        </div>
                    )}
                    {chatMessages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                            msg.role === 'user' 
                            ? 'bg-brand-600 text-white rounded-br-none shadow-md' 
                            : 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-bl-none border border-zinc-200 dark:border-zinc-700 shadow-sm'
                        }`}>
                            {msg.text}
                        </div>
                        </div>
                    ))}
                    {isAiThinking && (
                        <div className="flex justify-start">
                        <div className="bg-white dark:bg-zinc-800 rounded-xl rounded-bl-none px-4 py-3 flex gap-1 items-center border border-zinc-200 dark:border-zinc-700 shadow-sm">
                            <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce"></span>
                            <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce delay-100"></span>
                            <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce delay-200"></span>
                        </div>
                        </div>
                    )}
                    </div>

                    <form onSubmit={async (e) => {
                    e.preventDefault();
                    if(!chatInput.trim()) return;
                    const msg = chatInput;
                    setChatMessages(prev => [...prev, {role: 'user', text: msg}]);
                    setChatInput('');
                    setIsAiThinking(true);
                    const res = await getAIResponse(msg, menuItems, restaurants, chatMessages.map(m=>m.text));
                    setChatMessages(prev => [...prev, {role: 'ai', text: res}]);
                    setIsAiThinking(false);
                    }} className="p-4 border-t border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 flex gap-2">
                    <input 
                        type="text" 
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Ask for recommendations..."
                        className="flex-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-brand-500 transition-colors"
                    />
                    <button 
                        type="submit" 
                        disabled={!chatInput.trim() || isAiThinking}
                        className="bg-brand-600 disabled:opacity-50 hover:bg-brand-500 text-white p-2.5 rounded-xl transition-colors shadow-lg shadow-brand-900/20"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                    </form>
                </div>
                </div>
            )}

            {/* Footer */}
            <footer className="bg-zinc-100 dark:bg-zinc-950 py-12 border-t border-zinc-200 dark:border-zinc-800 text-center md:text-left transition-colors">
                <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-4 gap-8">
                    <div className="col-span-2">
                        <div className="flex items-center gap-2 mb-4 justify-center md:justify-start">
                            <div className="bg-brand-600 p-1.5 rounded-lg">
                            <ShoppingBag className="text-white w-5 h-5" />
                            </div>
                            <span className="text-xl font-bold text-zinc-900 dark:text-white">PU <span className="text-brand-600 dark:text-brand-500">Pulse</span></span>
                        </div>
                        <p className="text-zinc-500 dark:text-zinc-500 text-sm max-w-md mx-auto md:mx-0">
                            The fastest delivery service in Panjab University. From Student Center to your hostel doorsteps in minutes.
                        </p>
                    </div>
                    <div>
                        <h4 className="text-zinc-900 dark:text-white font-bold mb-4">Quick Links</h4>
                        <ul className="space-y-2 text-sm text-zinc-500 dark:text-zinc-500">
                            <li><button onClick={() => {setActiveTab('food'); setView('main')}} className="hover:text-brand-600 dark:hover:text-brand-500">Order Food</button></li>
                            <li><button onClick={() => {setActiveTab('stationery'); setView('main')}} className="hover:text-brand-600 dark:hover:text-brand-500">Stationery</button></li>
                            <li><button onClick={() => {setActiveTab('orders'); setView('main')}} className="hover:text-brand-600 dark:hover:text-brand-500">Track Order</button></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-zinc-900 dark:text-white font-bold mb-4">Contact</h4>
                        <ul className="space-y-2 text-sm text-zinc-500 dark:text-zinc-500">
                            <li>help@pupulse.com</li>
                            <li>+91 98765 43210</li>
                            <li>Student Center, PU</li>
                        </ul>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto px-4 mt-12 pt-8 border-t border-zinc-200 dark:border-zinc-900 text-center text-zinc-500 dark:text-zinc-600 text-xs">
                    © 2024 PU Pulse. All rights reserved. Designed with ❤️ for PU Students.
                </div>
            </footer>
        </div>
    );
  };

  // --- Role Switcher (For Demo) ---
  const RoleSwitcher = () => (
    <div className="fixed bottom-6 left-6 z-[100]">
       <button 
          onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
          className="bg-zinc-900 text-white p-3 rounded-full shadow-2xl border border-zinc-700 hover:scale-110 transition-transform"
       >
          <Settings className={`w-6 h-6 transition-transform duration-300 ${isSwitcherOpen ? 'rotate-90' : ''}`} />
       </button>
       
       {isSwitcherOpen && (
         <div className="absolute bottom-full left-0 mb-4 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-2 min-w-[200px] animate-scale-in origin-bottom-left">
            <div className="flex justify-between items-center px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 mb-1">
                <p className="text-xs font-bold text-zinc-500 uppercase">Switch View Mode</p>
                <button onClick={() => setIsSwitcherOpen(false)}><X className="w-3 h-3 text-zinc-400" /></button>
            </div>
            <button onClick={() => { setCurrentRole('customer'); setIsSwitcherOpen(false); }} className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${currentRole === 'customer' ? 'bg-brand-50 text-brand-600' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:text-zinc-300'}`}>
               <User className="w-4 h-4" /> Customer
            </button>
            <button onClick={() => { setCurrentRole('admin'); setIsSwitcherOpen(false); }} className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${currentRole === 'admin' ? 'bg-brand-50 text-brand-600' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:text-zinc-300'}`}>
               <LayoutDashboard className="w-4 h-4" /> Admin Dashboard
            </button>
            <button onClick={() => { setCurrentRole('partner'); setIsSwitcherOpen(false); }} className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${currentRole === 'partner' ? 'bg-brand-50 text-brand-600' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:text-zinc-300'}`}>
               <Bike className="w-4 h-4" /> Delivery Partner
            </button>
         </div>
       )}
    </div>
  );

  return (
    <>
      <ToastContainer />
      <RoleSwitcher />
      {currentRole === 'customer' && <CustomerApp />}
      {currentRole === 'admin' && <AdminDashboard />}
      {currentRole === 'partner' && <DeliveryPartnerApp />}
    </>
  );
}
