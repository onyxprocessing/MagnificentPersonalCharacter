import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  TooltipProps
} from 'recharts';
import { 
  AreaChart,
  Area,
} from 'recharts';

interface SalesData {
  day: string;
  amount: number;
}

interface SalesChartProps {
  data: SalesData[];
  weeklyTotal: number;
  avgOrderValue: number;
  loading?: boolean;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-2 border border-gray-200 shadow-sm rounded-md">
        <p className="text-sm font-medium">{`${label}: $${payload[0].value}`}</p>
      </div>
    );
  }

  return null;
};

export default function SalesChart({ data, weeklyTotal, avgOrderValue, loading = false }: SalesChartProps) {
  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader className="px-6 py-4 border-b border-gray-200">
          <CardTitle className="text-base font-semibold">Sales Summary</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Skeleton className="h-[240px] w-full" />
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 mt-4">
            <div>
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-6 w-24" />
            </div>
            <div>
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-6 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="px-6 py-4 border-b border-gray-200">
        <CardTitle className="text-base font-semibold">Sales Summary</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="day" 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                hide={true}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="amount" 
                fill="hsl(var(--primary))" 
                radius={[4, 4, 0, 0]}
                barSize={30}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 mt-4">
          <div>
            <p className="text-xs text-gray-500">Weekly Sales</p>
            <p className="text-lg font-semibold text-gray-900">${weeklyTotal.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Avg. Order Value</p>
            <p className="text-lg font-semibold text-gray-900">${avgOrderValue.toLocaleString()}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
