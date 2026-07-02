'use client';

import { useState, useEffect } from 'react';
import { productService } from '@/services/productService';
import { ProductCard } from '@/components/shop/ProductCard';
import { useCart } from '@/lib/store/cartStore';
import { Product } from '@/types';
import toast from 'react-hot-toast';
import { FiSearch } from 'react-icons/fi';

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('all');
  const { addItem } = useCart();

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      const response = await productService.getAll({ page: 1, limit: 12 });
      setProducts(response.data);
    } catch (error) {
      toast.error('Erro ao carregar produtos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCart = (product: Product, quantity: number) => {
    addItem({
      productId: product.id,
      quantity,
      price: product.price,
    });
    toast.success('Produto adicionado ao carrinho!');
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = category === 'all' || p.category === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="relative min-h-screen bg-ink-950">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-grid-glow opacity-70" />

      {/* Header */}
      <div className="relative border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-14">
          <span className="section-badge">Catálogo</span>
          <h1 className="mt-4 font-display text-4xl font-bold text-white sm:text-5xl">Loja</h1>
          <p className="mt-3 text-ink-300">Explore nossos produtos e comece a comprar</p>
        </div>
      </div>

      {/* Filters */}
      <div className="relative mx-auto max-w-7xl px-4 py-10">
        <div className="mb-8 flex flex-col gap-4 md:flex-row">
          {/* Search */}
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" size={18} />
            <input
              type="text"
              placeholder="Buscar produtos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-dark pl-10"
            />
          </div>

          {/* Category Filter */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input-dark md:w-64 [&>option]:bg-ink-900"
          >
            <option value="all">Todas as Categorias</option>
            <option value="electronics">Eletrônicos</option>
            <option value="clothing">Roupas</option>
            <option value="books">Livros</option>
          </select>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-80 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />
            ))}
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} onAddToCart={handleAddToCart} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] py-16 text-center">
            <p className="text-lg text-ink-300">Nenhum produto encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
}
