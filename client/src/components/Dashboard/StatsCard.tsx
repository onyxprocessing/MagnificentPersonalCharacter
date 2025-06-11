import { Card, CardContent } from "@/components/ui/card";
import { 
  ShoppingCart, 
  DollarSign, 
  Users, 
  Package,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  trend?: {
    value: string;
    direction: 'up' | 'down' | 'neutral';
  };
  type: 'orders' | 'revenue' | 'customers' | 'products';
  loading?: boolean;
}

export default function StatsCard({ title, value, trend, type, loading = false }: StatsCardProps) {
  const getIcon = () => {
    switch (type) {
      case 'orders':
        return ShoppingCart;
      case 'revenue':
        return DollarSign;
      case 'customers':
        return Users;
      case 'products':
        return Package;
      default:
        return ShoppingCart;
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'orders':
        return 'border-primary';
      case 'revenue':
        return 'border-secondary';
      case 'customers':
        return 'border-accent';
      case 'products':
        return 'border-emerald-500';
      default:
        return 'border-primary';
    }
  };

  const getIconBgColor = () => {
    switch (type) {
      case 'orders':
        return 'bg-primary/10 text-primary';
      case 'revenue':
        return 'bg-secondary/10 text-secondary';
      case 'customers':
        return 'bg-accent/10 text-accent';
      case 'products':
        return 'bg-emerald-500/10 text-emerald-500';
      default:
        return 'bg-primary/10 text-primary';
    }
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    
    if (trend.direction === 'up') return <TrendingUp className="mr-1 h-3 w-3" />;
    if (trend.direction === 'down') return <TrendingDown className="mr-1 h-3 w-3" />;
    return <Minus className="mr-1 h-3 w-3" />;
  };

  const getTrendColor = () => {
    if (!trend) return '';
    
    if (trend.direction === 'up') return 'text-emerald-500';
    if (trend.direction === 'down') return 'text-red-500';
    return 'text-gray-500';
  };

  const Icon = getIcon();

  return (
    <Card className={cn("border-l-4", getBorderColor())}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            {loading ? (
              <div className="h-8 w-24 mt-1 bg-gray-200 animate-pulse rounded"></div>
            ) : (
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{value}</h3>
            )}
            {trend && !loading && (
              <p className={cn("text-xs flex items-center mt-2", getTrendColor())}>
                {getTrendIcon()}
                {trend.value}
              </p>
            )}
          </div>
          <div className={cn("p-3 rounded-lg", getIconBgColor())}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
