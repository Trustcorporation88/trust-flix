'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Product } from '@/types';
import { formatCurrency } from '@/lib/utils/formatters';
import { FiShoppingCart, FiArrowRight } from 'react-icons/fi';
import { useState } from 'react';

type ShopProduct = Product & {
  href?: string;
  checkoutUrl?: string;
  kind?: string;
};

interface ProductCardProps {
  product: ShopProduct;
  onAddToCart?: (product: Product, quantity: number) => void;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const detailHref = product.href || `/shop/${product.slug}`;
  const isCourse = product.kind === 'course' || product.category === 'cursos';

  const handleAddToCart = async () => {
    if (onAddToCart && !isCourse) {
      setIsAdding(true);
      try {
        onAddToCart(product, 1);
      } finally {
        setIsAdding(false);
      }
    }
  };

  return (
    <div className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition-all hover:-translate-y-1 hover:border-signal-500/40">
      <Link href={detailHref} className="relative block h-64 overflow-hidden bg-ink-800">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950/80 via-transparent to-transparent" />
        {isCourse && (
          <span className="absolute left-3 top-3 rounded-md bg-signal-500 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
            Curso
          </span>
        )}
      </Link>

      <div className="p-4">
        <Link href={detailHref}>
          <h3 className="mb-2 line-clamp-2 font-semibold text-white transition-colors hover:text-signal-400">
            {product.name}
          </h3>
        </Link>
        <p className="mb-3 text-xs uppercase tracking-wide text-ink-400">{product.category}</p>

        <div className="mb-3 flex items-center">
          <div className="flex text-amber-400">
            {[...Array(Math.floor(product.socialProof.rating))].map((_, i) => (
              <span key={i}>★</span>
            ))}
          </div>
          <span className="ml-2 text-xs text-ink-400">({product.socialProof.reviews})</span>
        </div>

        <div className="mb-4">
          <p className="text-2xl font-bold text-white">{formatCurrency(product.price)}</p>
          {product.cost && (
            <p className="text-sm text-ink-500 line-through">{formatCurrency(product.cost)}</p>
          )}
        </div>

        {isCourse ? (
          <Link
            href={detailHref}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-signal-500 py-2.5 font-semibold text-white transition-colors hover:bg-signal-600"
          >
            Ver curso <FiArrowRight />
          </Link>
        ) : (
          <button
            onClick={handleAddToCart}
            disabled={product.stock === 0 || isAdding}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-signal-500 py-2.5 font-semibold text-white transition-colors hover:bg-signal-600 disabled:bg-ink-700 disabled:text-ink-400"
          >
            <FiShoppingCart size={18} />
            {isAdding ? 'Adicionando...' : 'Comprar'}
          </button>
        )}
      </div>
    </div>
  );
}
