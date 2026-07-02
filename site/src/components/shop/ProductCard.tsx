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
    <div className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition-all hover:-translate-y-1 hover:border-accent-400/40 hover:shadow-glow">
      {/* Image */}
      <Link href={`/shop/${product.slug}`} className="relative block h-64 overflow-hidden bg-ink-800">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-110"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950/80 via-transparent to-transparent" />
        {product.stock === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink-950/70 backdrop-blur-sm">
            <span className="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-bold text-white">
              Fora de Estoque
            </span>
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="p-4">
        <Link href={`/shop/${product.slug}`}>
          <h3 className="mb-2 line-clamp-2 font-semibold text-white transition-colors hover:text-accent-300">
            {product.name}
          </h3>
        </Link>

        {/* Category */}
        <p className="mb-3 text-xs uppercase tracking-wide text-ink-400">{product.category}</p>

        {/* Rating */}
        <div className="mb-3 flex items-center">
          <div className="flex text-gold-400">
            {[...Array(Math.floor(product.socialProof.rating))].map((_, i) => (
              <span key={i}>★</span>
            ))}
          </div>
          <span className="ml-2 text-xs text-ink-400">({product.socialProof.reviews})</span>
        </div>

        {/* Price */}
        <div className="mb-4">
          <p className="text-2xl font-bold text-white">{formatCurrency(product.price)}</p>
          {product.cost && (
            <p className="text-sm text-ink-500 line-through">{formatCurrency(product.cost)}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleAddToCart}
            disabled={product.stock === 0 || isAdding}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-500 to-accent-600 py-2.5 font-semibold text-white transition-all hover:from-accent-400 hover:to-accent-500 disabled:from-ink-700 disabled:to-ink-700 disabled:text-ink-400"
          >
            <FiShoppingCart size={18} />
            {isAdding ? 'Adicionando...' : 'Comprar'}
          </button>
          <button className="rounded-xl border border-white/15 p-2.5 text-ink-300 transition-colors hover:border-white/30 hover:bg-white/[0.06] hover:text-white">
            <FiHeart size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
