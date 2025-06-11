import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Search, FilterX } from "lucide-react";

export interface Column<T> {
  header: string;
  accessorKey: keyof T | ((row: T) => React.ReactNode);
  cell?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  pagination?: {
    pageSize: number;
    page: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  searchable?: {
    placeholder?: string;
    onSearch: (query: string) => void;
  };
  filterable?: {
    options: { label: string; value: string }[];
    placeholder?: string;
    onFilter: (filter: string) => void;
  };
  loading?: boolean;
}

export function DataTable<T>({
  data,
  columns,
  pagination,
  searchable,
  filterable,
  loading = false,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchable) {
      searchable.onSearch(searchQuery);
    }
  };

  const renderCell = (row: T, column: Column<T>) => {
    if (column.cell) {
      return column.cell(row);
    }
    
    if (typeof column.accessorKey === 'function') {
      return column.accessorKey(row);
    }
    
    return row[column.accessorKey] as React.ReactNode;
  };

  // Calculate pagination details
  const totalPages = pagination ? Math.ceil(pagination.total / pagination.pageSize) : 1;
  const startItem = pagination ? (pagination.page - 1) * pagination.pageSize + 1 : 1;
  const endItem = pagination ? Math.min(pagination.page * pagination.pageSize, pagination.total) : data.length;

  return (
    <div className="space-y-4">
      {/* Search and filter controls */}
      {(searchable || filterable) && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          {searchable && (
            <form onSubmit={handleSearch} className="w-full sm:w-auto relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchable.placeholder || "Search..."}
                className="pl-10 pr-4 w-full sm:w-64"
              />
            </form>
          )}
          
          {filterable && (
            <div className="flex w-full sm:w-auto">
              <Select onValueChange={filterable.onFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder={filterable.placeholder || "Filter"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Items</SelectItem>
                  {filterable.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column, i) => (
                <TableHead key={i}>{column.header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              // Loading skeleton
              Array(pagination?.pageSize || 5).fill(0).map((_, rowIndex) => (
                <TableRow key={`skeleton-${rowIndex}`}>
                  {columns.map((_, colIndex) => (
                    <TableCell key={`skeleton-${rowIndex}-${colIndex}`}>
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              // Empty state
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center text-gray-500">
                    <FilterX className="h-8 w-8 mb-2" />
                    <p>No results found</p>
                    {(searchable || filterable) && (
                      <p className="text-sm mt-1">Try adjusting your search or filter</p>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              // Data rows
              data.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {columns.map((column, colIndex) => (
                    <TableCell key={`${rowIndex}-${colIndex}`}>
                      {renderCell(row, column)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing <span className="font-medium">{startItem}</span> to{" "}
            <span className="font-medium">{endItem}</span> of{" "}
            <span className="font-medium">{pagination.total}</span> results
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1 || loading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(totalPages, 3) }).map((_, i) => (
              <Button
                key={i}
                variant={pagination.page === i + 1 ? "default" : "outline"}
                size="sm"
                onClick={() => pagination.onPageChange(i + 1)}
                disabled={loading}
              >
                {i + 1}
              </Button>
            ))}
            {totalPages > 3 && pagination.page < totalPages - 1 && (
              <Button variant="outline" size="sm" disabled>
                ...
              </Button>
            )}
            {totalPages > 3 && pagination.page < totalPages && totalPages > 3 && (
              <Button
                variant={pagination.page === totalPages ? "default" : "outline"}
                size="sm"
                onClick={() => pagination.onPageChange(totalPages)}
                disabled={loading}
              >
                {totalPages}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page === totalPages || loading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
