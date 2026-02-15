'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Package, TrendingUp, DollarSign } from 'lucide-react';
import { useInventoryStats } from '@/hooks/useInventoryStats';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export function InventoryDashboard() {
  const { stats, loading, error } = useInventoryStats();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <Card className="rpma-shell">
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Error loading inventory stats: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card className="rpma-shell">
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            No inventory data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total Materials */}
      <Card className="rpma-shell">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Materials
          </CardTitle>
          <Package className="h-4 w-4 text-[hsl(var(--rpma-teal))]" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            {stats.total_materials}
          </div>
          <p className="text-xs text-muted-foreground">
            {stats.active_materials} active
          </p>
        </CardContent>
      </Card>

      {/* Low Stock Alert */}
      <Card className="rpma-shell">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Low Stock Items
          </CardTitle>
          <AlertTriangle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            {stats.low_stock_materials}
          </div>
          <p className="text-xs text-muted-foreground">
            Requires attention
          </p>
        </CardContent>
      </Card>

      {/* Total Value */}
      <Card className="rpma-shell">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Inventory Value
          </CardTitle>
          <DollarSign className="h-4 w-4 text-[hsl(var(--rpma-teal))]" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            €{stats.total_value.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-muted-foreground">
            Total material value
          </p>
        </CardContent>
      </Card>

      {/* Stock Turnover */}
      <Card className="rpma-shell">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Stock Turnover
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            {stats.stock_turnover_rate.toFixed(1)}
          </div>
          <p className="text-xs text-muted-foreground">
            Annual turnover rate
          </p>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card className="rpma-shell md:col-span-2 lg:col-span-4">
        <CardHeader>
          <CardTitle className="text-foreground">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.recent_transactions.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No recent transactions
              </p>
            ) : (
              stats.recent_transactions.slice(0, 5).map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 bg-[hsl(var(--rpma-surface))] rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex flex-col">
                      <span className="text-foreground font-medium">
                        {transaction.transaction_type.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className="text-muted-foreground text-sm">
                        {transaction.quantity > 0 ? '+' : ''}{transaction.quantity} units
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={
                        transaction.transaction_type === 'stock_in' ? 'default' :
                        transaction.transaction_type === 'stock_out' ? 'destructive' :
                        'secondary'
                      }
                      className="text-xs"
                    >
                      {transaction.transaction_type}
                    </Badge>
                    <p className="text-muted-foreground text-xs mt-1">
                      {new Date(transaction.performed_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
