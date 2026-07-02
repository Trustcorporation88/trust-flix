'use client';

import { useCart } from '@/lib/store/cartStore';
import { formatCurrency } from '@/lib/utils/formatters';
import Link from 'next/link';
import { FiTrash2, FiMinus, FiPlus, FiShoppingBag } from 'react-icons/fi';

export default function CartPage() {
  const { items, removeItem, updateQuantity, getTotal } = useCart();

  if (items.length === 0) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-ink-950 px-4 py-20">
        <div className="pointer-events-none absolute inset-0 bg-grid-glow opacity-70" />
        <div className="relative text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
            <FiShoppingBag size={28} className="text-ink-300" />
          </div>
          <h1 className="mb-3 font-display text-3xl font-bold text-white sm:text-4xl">Carrinho Vazio</h1>
          <p className="mb-8 text-ink-300">Você não tem nenhum produto no carrinho</p>
          <Link href="/shop" className="btn-primary">
            Continuar Comprando
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-ink-950 py-12">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-grid-glow opacity-60" />
      <div className="relative mx-auto max-w-7xl px-4">
        <h1 className="mb-8 font-display text-3xl font-bold text-white sm:text-4xl">Carrinho</h1>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Items */}
          <div className="lg:col-span-2">
            <div className="table-wrapper card-surface p-6">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 text-ink-400">
                    <th className="py-2 text-left text-sm font-semibold uppercase tracking-wide">Produto</th>
                    <th className="py-2 text-center text-sm font-semibold uppercase tracking-wide">Quantidade</th>
                    <th className="py-2 text-right text-sm font-semibold uppercase tracking-wide">Preço</th>
                    <th className="py-2 text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.productId} className="border-b border-white/5 transition-colors hover:bg-white/[0.03]">
                      <td className="py-4 text-white">Produto #{item.productId}</td>
                      <td className="py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.productId, Math.max(1, item.quantity - 1))}
                            className="rounded-lg border border-white/10 p-1.5 text-ink-300 hover:bg-white/[0.06] hover:text-white"
                          >
                            <FiMinus size={14} />
                          </button>
                          <span className="w-8 text-center text-white">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            className="rounded-lg border border-white/10 p-1.5 text-ink-300 hover:bg-white/[0.06] hover:text-white"
                          >
                            <FiPlus size={14} />
                          </button>
                        </div>
                      </td>
                      <td className="py-4 text-right font-semibold text-white">
                        {formatCurrency(item.price * item.quantity)}
                      </td>
                      <td className="py-4 text-right">
                        <button
                          onClick={() => removeItem(item.productId)}
                          className="text-danger-500 hover:text-danger-600"
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="card-surface p-6">
              <h2 className="mb-4 font-display text-xl font-bold text-white">Resumo</h2>
              <div className="mb-6 space-y-4">
                <div className="flex justify-between">
                  <span className="text-ink-300">Subtotal</span>
                  <span className="font-semibold text-white">{formatCurrency(getTotal())}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-300">Frete</span>
                  <span className="font-semibold text-accent-300">Grátis</span>
                </div>
                <div className="flex justify-between border-t border-white/10 pt-4">
                  <span className="font-bold text-white">Total</span>
                  <span className="font-bold text-xl text-accent-300">{formatCurrency(getTotal())}</span>
                </div>
              </div>
              <button className="btn-primary mb-3 w-full">Finalizar Compra</button>
              <Link href="/shop" className="block py-2 text-center text-sm font-semibold text-accent-300 hover:text-accent-200">
                Continuar Comprando
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
