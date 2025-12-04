
export enum CategoryType {
  FastFood = 'Fast Food',
  Beverages = 'Beverages',
  Meals = 'Meals',
  Notebooks = 'Notebooks',
  Pens = 'Pens',
  Files = 'Files',
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: CategoryType;
  restaurantId: string;
  isVeg: boolean;
  rating: number;
  votes?: number; // Number of ratings
}

export interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  deliveryTime: string;
  location: string;
  image: string;
  coverImage?: string; // Larger image for detail view
}

export interface CartItem extends MenuItem {
  quantity: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  count: number;
}

export interface DeliveryPartner {
  id: string;
  name: string;
  phone: string;
  status: 'available' | 'busy' | 'offline';
  earnings: number;
  totalDeliveries: number;
  avatar: string;
}

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  status: 'placed' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';
  date: Date;
  address: string;
  // New fields for delivery management
  partnerId?: string;
  customerName?: string;
  customerPhone?: string;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}
