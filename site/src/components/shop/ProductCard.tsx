'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Product } from '@/types';
import { formatCurrency } from '@/lib/utils/formatters';
import { FiShoppingCart, FiHeart } from 'react-icons/fi';
import { useState } from 'react';

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product, quantity: number) => void;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const handleAddToCart = async () => {
    if (onAddToCart) {
      setIsAdding(true);
      try {
        onAddToCart(product, quantity);
        setQuantity(1);
      } finally {
        setIsAdding(false);
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {/* Image */}
      <Link href={`/shop/${product.slug}`} className="relative h-64 block overflow-hidden bg-gray-100">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover hover:scale-105 transition-transform"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white font-bold">Fora de Estoque</span>
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="p-4">
        <Link href={`/shop/${product.slug}`}>
          <h3 className="font-semibold text-gray-900 mb-2 hover:text-blue-600 line-clamp-2">
            {product.name}
          </h3>
        </Link>

        {/* Category */}
        <p className="text-xs text-gray-500 mb-3">{product.category}</p>

        {/* Rating */}
        <div className="flex items-center mb-3">
          <div className="flex text-yellow-400">
            {[...Array(Math.floor(product.socialProof.rating))].map((_, i) => (
              <span key={i}>★</span>
            ))}
          </div>
          <span className="text-xs text-gray-600 ml-2">({product.socialProof.reviews})</span>
        </div>

        {/* Price */}
        <div className="mb-4">
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(product.price)}
          </p>
          {product.cost && (
            <p className="text-sm text-gray-500 line-through">
              {formatCurrency(product.cost)}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleAddToCart}
            disabled={product.stock === 0 || isAdding}
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2 transition-colors"
          >
            <FiShoppingCart size={18} />
            {isAdding ? 'Adicionando...' : 'Comprar'}
          </button>
          <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors">
            <FiHeart size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
