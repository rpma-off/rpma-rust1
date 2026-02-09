import { render, screen } from '@testing-library/react';
import { StockLevelIndicator } from '../../StockLevelIndicator';

describe('StockLevelIndicator', () => {
  describe('Optimal stock levels', () => {
    it('displays optimal stock with green color', () => {
      render(
        <StockLevelIndicator
          currentStock={50}
          minimumStock={10}
          maximumStock={500}
          unitOfMeasure="meter"
        />
      );

      expect(screen.getByText('50')).toBeInTheDocument();
      expect(screen.getByText('meter')).toBeInTheDocument();
      
      // Check for green color indication
      const indicator = screen.getByTestId('stock-indicator');
      expect(indicator).toHaveClass('text-green-600');
      expect(indicator).toHaveClass('bg-green-100');
    });

    it('displays stock percentage correctly', () => {
      render(
        <StockLevelIndicator
          currentStock={50}
          minimumStock={10}
          maximumStock={100}
          unitOfMeasure="meter"
        />
      );

      // 50 is 50% of the range (10-100)
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('displays stock status text', () => {
      render(
        <StockLevelIndicator
          currentStock={80}
          minimumStock={20}
          maximumStock={100}
          unitOfMeasure="meter"
        />
      );

      expect(screen.getByText('Optimal')).toBeInTheDocument();
    });
  });

  describe('Low stock levels', () => {
    it('displays low stock with yellow color', () => {
      render(
        <StockLevelIndicator
          currentStock={15}
          minimumStock={20}
          maximumStock={100}
          unitOfMeasure="liter"
        />
      );

      expect(screen.getByText('15')).toBeInTheDocument();
      expect(screen.getByText('liter')).toBeInTheDocument();
      
      // Check for yellow color indication
      const indicator = screen.getByTestId('stock-indicator');
      expect(indicator).toHaveClass('text-yellow-600');
      expect(indicator).toHaveClass('bg-yellow-100');
    });

    it('displays low stock warning text', () => {
      render(
        <StockLevelIndicator
          currentStock={15}
          minimumStock={20}
          maximumStock={100}
          unitOfMeasure="meter"
        />
      );

      expect(screen.getByText('Low Stock')).toBeInTheDocument();
      expect(screen.getByText('Reorder recommended')).toBeInTheDocument();
    });

    it('displays reorder suggestion', () => {
      render(
        <StockLevelIndicator
          currentStock={15}
          minimumStock={20}
          maximumStock={100}
          unitOfMeasure="meter"
        />
      );

      expect(screen.getByText(/Order at least 5 more meters/)).toBeInTheDocument();
    });
  });

  describe('Critical stock levels', () => {
    it('displays critical stock with red color', () => {
      render(
        <StockLevelIndicator
          currentStock={5}
          minimumStock={20}
          maximumStock={100}
          unitOfMeasure="meter"
        />
      );

      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('meter')).toBeInTheDocument();
      
      // Check for red color indication
      const indicator = screen.getByTestId('stock-indicator');
      expect(indicator).toHaveClass('text-red-600');
      expect(indicator).toHaveClass('bg-red-100');
    });

    it('displays critical stock warning text', () => {
      render(
        <StockLevelIndicator
          currentStock={5}
          minimumStock={20}
          maximumStock={100}
          unitOfMeasure="meter"
        />
      );

      expect(screen.getByText('Critical')).toBeInTheDocument();
      expect(screen.getByText('Immediate reorder required')).toBeInTheDocument();
    });

    it('displays urgent reorder suggestion', () => {
      render(
        <StockLevelIndicator
          currentStock={5}
          minimumStock={20}
          maximumStock={100}
          unitOfMeasure="meter"
        />
      );

      expect(screen.getByText(/Order at least 15 more meters/)).toBeInTheDocument();
    });
  });

  describe('Overstock levels', () => {
    it('displays overstock with blue color', () => {
      render(
        <StockLevelIndicator
          currentStock={450}
          minimumStock={20}
          maximumStock={400}
          unitOfMeasure="meter"
        />
      );

      expect(screen.getByText('450')).toBeInTheDocument();
      expect(screen.getByText('meter')).toBeInTheDocument();
      
      // Check for blue color indication
      const indicator = screen.getByTestId('stock-indicator');
      expect(indicator).toHaveClass('text-blue-600');
      expect(indicator).toHaveClass('bg-blue-100');
    });

    it('displays overstock text', () => {
      render(
        <StockLevelIndicator
          currentStock={450}
          minimumStock={20}
          maximumStock={400}
          unitOfMeasure="meter"
        />
      );

      expect(screen.getByText('Overstock')).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('handles zero stock correctly', () => {
      render(
        <StockLevelIndicator
          currentStock={0}
          minimumStock={20}
          maximumStock={100}
          unitOfMeasure="meter"
        />
      );

      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('meter')).toBeInTheDocument();
      expect(screen.getByText('Critical')).toBeInTheDocument();
    });

    it('handles missing minimum stock', () => {
      render(
        <StockLevelIndicator
          currentStock={50}
          minimumStock={undefined}
          maximumStock={100}
          unitOfMeasure="meter"
        />
      );

      expect(screen.getByText('50')).toBeInTheDocument();
      expect(screen.getByText('meter')).toBeInTheDocument();
      
      // Should show optimal when minimum is not defined
      expect(screen.getByText('Optimal')).toBeInTheDocument();
    });

    it('handles missing maximum stock', () => {
      render(
        <StockLevelIndicator
          currentStock={50}
          minimumStock={20}
          maximumStock={undefined}
          unitOfMeasure="meter"
        />
      );

      expect(screen.getByText('50')).toBeInTheDocument();
      expect(screen.getByText('meter')).toBeInTheDocument();
      
      // Should show optimal when maximum is not defined
      expect(screen.getByText('Optimal')).toBeInTheDocument();
    });

    it('handles zero minimum and maximum', () => {
      render(
        <StockLevelIndicator
          currentStock={50}
          minimumStock={0}
          maximumStock={0}
          unitOfMeasure="meter"
        />
      );

      expect(screen.getByText('50')).toBeInTheDocument();
      expect(screen.getByText('meter')).toBeInTheDocument();
      
      // Should show optimal when min and max are both 0
      expect(screen.getByText('Optimal')).toBeInTheDocument();
    });

    it('handles different units of measure', () => {
      render(
        <StockLevelIndicator
          currentStock={10}
          minimumStock={5}
          maximumStock={50}
          unitOfMeasure="kg"
        />
      );

      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('kg')).toBeInTheDocument();
    });

    it('handles decimal values', () => {
      render(
        <StockLevelIndicator
          currentStock={15.5}
          minimumStock={10}
          maximumStock={50}
          unitOfMeasure="meter"
        />
      );

      expect(screen.getByText('15.5')).toBeInTheDocument();
      expect(screen.getByText('meter')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(
        <StockLevelIndicator
          currentStock={15}
          minimumStock={20}
          maximumStock={100}
          unitOfMeasure="meter"
        />
      );

      const indicator = screen.getByTestId('stock-indicator');
      expect(indicator).toHaveAttribute('role', 'status');
      expect(indicator).toHaveAttribute('aria-live', 'polite');
    });

    it('has descriptive title attribute', () => {
      render(
        <StockLevelIndicator
          currentStock={15}
          minimumStock={20}
          maximumStock={100}
          unitOfMeasure="meter"
        />
      );

      const indicator = screen.getByTestId('stock-indicator');
      expect(indicator).toHaveAttribute('title', 'Low Stock: 15 meters (below minimum of 20 meters)');
    });
  });

  describe('Visual indicators', () => {
    it('displays appropriate icon for each status', () => {
      const { rerender } = render(
        <StockLevelIndicator
          currentStock={50}
          minimumStock={10}
          maximumStock={100}
          unitOfMeasure="meter"
        />
      );

      // Optimal status
      expect(screen.getByTestId('optimal-icon')).toBeInTheDocument();

      // Low stock
      rerender(
        <StockLevelIndicator
          currentStock={15}
          minimumStock={20}
          maximumStock={100}
          unitOfMeasure="meter"
        />
      );
      expect(screen.getByTestId('low-stock-icon')).toBeInTheDocument();

      // Critical
      rerender(
        <StockLevelIndicator
          currentStock={5}
          minimumStock={20}
          maximumStock={100}
          unitOfMeasure="meter"
        />
      );
      expect(screen.getByTestId('critical-icon')).toBeInTheDocument();

      // Overstock
      rerender(
        <StockLevelIndicator
          currentStock={90}
          minimumStock={20}
          maximumStock={80}
          unitOfMeasure="meter"
        />
      );
      expect(screen.getByTestId('overstock-icon')).toBeInTheDocument();
    });

    it('displays progress bar for stock levels', () => {
      render(
        <StockLevelIndicator
          currentStock={50}
          minimumStock={20}
          maximumStock={100}
          unitOfMeasure="meter"
        />
      );

      const progressBar = screen.getByTestId('stock-progress-bar');
      expect(progressBar).toBeInTheDocument();
      
      // 50 is 37.5% of the range (20-100)
      expect(progressBar).toHaveStyle('width: 37.5%');
    });
  });

  describe('Customization', () => {
    it('applies custom className', () => {
      render(
        <StockLevelIndicator
          currentStock={50}
          minimumStock={20}
          maximumStock={100}
          unitOfMeasure="meter"
          className="custom-indicator"
        />
      );

      const indicator = screen.getByTestId('stock-indicator');
      expect(indicator).toHaveClass('custom-indicator');
    });

    it('handles compact mode', () => {
      render(
        <StockLevelIndicator
          currentStock={50}
          minimumStock={20}
          maximumStock={100}
          unitOfMeasure="meter"
          compact={true}
        />
      );

      expect(screen.getByText('50')).toBeInTheDocument();
      expect(screen.queryByText('Optimal')).not.toBeInTheDocument();
      expect(screen.queryByText('meter')).not.toBeInTheDocument();
    });

    it('displays custom status messages', () => {
      render(
        <StockLevelIndicator
          currentStock={50}
          minimumStock={20}
          maximumStock={100}
          unitOfMeasure="meter"
          customStatusMessages={{
            optimal: 'All good',
            low_stock: 'Need more',
            critical: 'Out soon',
            overstock: 'Too much',
          }}
        />
      );

      expect(screen.getByText('All good')).toBeInTheDocument();
    });
  });
});